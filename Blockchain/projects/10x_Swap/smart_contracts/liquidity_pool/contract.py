"""
Liquidity Pool Contract - Constant Product AMM (x * y = k)

This contract implements a decentralized liquidity pool for token swaps.
Follows the constant product market maker model (Uniswap V2 style).

Features:
- Pool creation with two assets
- Add/Remove liquidity
- Token swaps with configurable fees
- LP token management
- Fee collection
"""

from algopy import (
    ARC4Contract,
    Account,
    Asset,
    Bytes,
    Global,
    Txn,
    UInt64,
    arc4,
    gtxn,
    itxn,
    log,
    op,
    subroutine,
)


# Constants
BASIS_POINTS = 10000
MIN_LIQUIDITY = 1000  # Minimum liquidity to prevent division by zero
MAX_FEE_BPS = 1000    # Maximum 10% fee


class PoolState(arc4.Struct):
    """Pool state information"""
    asset_1_id: arc4.UInt64         # First asset ID
    asset_2_id: arc4.UInt64         # Second asset ID
    reserve_1: arc4.UInt64          # Reserve of asset 1
    reserve_2: arc4.UInt64          # Reserve of asset 2
    total_liquidity: arc4.UInt64    # Total LP tokens issued
    fee_bps: arc4.UInt16            # Fee in basis points (e.g., 30 = 0.3%)
    lp_token_id: arc4.UInt64        # LP token asset ID
    initialized: arc4.Bool          # Whether pool is initialized


class LiquidityPoolContract(ARC4Contract):
    """
    Automated Market Maker Liquidity Pool

    Implements constant product (x * y = k) formula for decentralized trading.
    """

    def __init__(self) -> None:
        """Initialize contract state"""
        # Pool configuration
        self.asset_1_id = UInt64(0)
        self.asset_2_id = UInt64(0)
        self.fee_bps = UInt64(0)

        # Pool reserves
        self.reserve_1 = UInt64(0)
        self.reserve_2 = UInt64(0)

        # Liquidity tracking
        self.total_liquidity = UInt64(0)
        self.lp_token_id = UInt64(0)

        # State
        self.initialized = False

    @arc4.abimethod(allow_actions=["NoOp"])
    def create_pool(
        self,
        asset_1: Asset,
        asset_2: Asset,
        fee_bps: arc4.UInt16,
    ) -> arc4.String:
        """
        Initialize a new liquidity pool

        Args:
            asset_1: First asset in the pair
            asset_2: Second asset in the pair
            fee_bps: Fee in basis points (e.g., 30 = 0.3%)

        Returns:
            Success message with pool address
        """
        # Verify not already initialized
        assert not self.initialized, "Pool already initialized"

        # Verify caller is creator
        assert Txn.sender == Global.creator_address, "Only creator can initialize"

        # Verify assets are different
        assert asset_1.id != asset_2.id, "Assets must be different"

        # Verify fee is reasonable
        assert fee_bps.native <= MAX_FEE_BPS, "Fee too high"

        # Store pool configuration
        self.asset_1_id = asset_1.id
        self.asset_2_id = asset_2.id
        self.fee_bps = fee_bps.native
        self.initialized = True

        # Opt into assets via inner transactions (skip if ALGO)
        if asset_1.id != 0:
            itxn.AssetTransfer(
                xfer_asset=asset_1.id,
                asset_receiver=Global.current_application_address,
                asset_amount=0,
            ).submit()

        if asset_2.id != 0:
            itxn.AssetTransfer(
                xfer_asset=asset_2.id,
                asset_receiver=Global.current_application_address,
                asset_amount=0,
            ).submit()

        # Log pool creation
        log(
            arc4.String("POOL_CREATED").bytes
            + op.itob(asset_1.id)
            + op.itob(asset_2.id)
            + op.itob(fee_bps.native)
        )

        return arc4.String("Pool created successfully")

    @arc4.abimethod(allow_actions=["NoOp"])
    def create_lp_token(
        self,
        total: arc4.UInt64,
        decimals: arc4.UInt32,
        name: arc4.String,
        unit_name: arc4.String,
    ) -> arc4.UInt64:
        """
        Create the LP token for this pool

        Args:
            total: Total supply of LP tokens
            decimals: Decimal places for LP token
            name: LP token name
            unit_name: LP token unit name

        Returns:
            LP token asset ID
        """
        assert self.initialized, "Pool not initialized"
        assert self.lp_token_id == 0, "LP token already created"
        assert Txn.sender == Global.creator_address, "Only creator can create LP token"

        # Create the LP token and capture the result
        result = itxn.AssetConfig(
            total=total.native,
            decimals=decimals.native,
            asset_name=name.native,
            unit_name=unit_name.native,
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
            default_frozen=False,
        ).submit()

        # Get the created asset ID from the result
        self.lp_token_id = result.created_asset.id

        log(arc4.String("LP_TOKEN_CREATED").bytes + op.itob(self.lp_token_id))

        return arc4.UInt64(self.lp_token_id)

    @arc4.abimethod(allow_actions=["NoOp"])
    def add_liquidity(
        self,
        asset_1_payment: gtxn.AssetTransferTransaction,
        asset_2_payment: gtxn.AssetTransferTransaction,
        min_lp_tokens: arc4.UInt64,
    ) -> arc4.UInt64:
        """
        Add liquidity to the pool and receive LP tokens

        Args:
            asset_1_payment: Payment transaction for asset 1
            asset_2_payment: Payment transaction for asset 2
            min_lp_tokens: Minimum LP tokens to receive (slippage protection)

        Returns:
            Amount of LP tokens minted
        """
        assert self.initialized, "Pool not initialized"
        assert self.lp_token_id != 0, "LP token not created"

        # Verify payments
        assert asset_1_payment.asset_receiver == Global.current_application_address
        assert asset_2_payment.asset_receiver == Global.current_application_address
        assert asset_1_payment.xfer_asset.id == self.asset_1_id
        assert asset_2_payment.xfer_asset.id == self.asset_2_id

        amount_1 = asset_1_payment.asset_amount
        amount_2 = asset_2_payment.asset_amount

        assert amount_1 > 0, "Amount 1 must be positive"
        assert amount_2 > 0, "Amount 2 must be positive"

        # Calculate LP tokens to mint
        lp_tokens_to_mint = UInt64(0)

        if self.total_liquidity == 0:
            # First liquidity provision
            # Use geometric mean: sqrt(amount_1 * amount_2)
            lp_tokens_to_mint = self._sqrt(amount_1 * amount_2) - MIN_LIQUIDITY
            assert lp_tokens_to_mint > 0, "Insufficient initial liquidity"

            # Lock minimum liquidity forever
            self.total_liquidity = lp_tokens_to_mint + MIN_LIQUIDITY
        else:
            # Subsequent liquidity provision
            # Calculate proportional share
            lp_from_amount_1 = (amount_1 * self.total_liquidity) // self.reserve_1
            lp_from_amount_2 = (amount_2 * self.total_liquidity) // self.reserve_2

            # Take the minimum to maintain ratio
            lp_tokens_to_mint = lp_from_amount_1 if lp_from_amount_1 < lp_from_amount_2 else lp_from_amount_2
            assert lp_tokens_to_mint > 0, "Insufficient liquidity"

            self.total_liquidity += lp_tokens_to_mint

        # Verify slippage tolerance
        assert lp_tokens_to_mint >= min_lp_tokens.native, "Slippage exceeded"

        # Update reserves
        self.reserve_1 += amount_1
        self.reserve_2 += amount_2

        # Send LP tokens to user
        itxn.AssetTransfer(
            xfer_asset=self.lp_token_id,
            asset_amount=lp_tokens_to_mint,
            asset_receiver=Txn.sender,
        ).submit()

        # Log liquidity addition
        log(
            arc4.String("LIQUIDITY_ADDED").bytes
            + op.itob(amount_1)
            + op.itob(amount_2)
            + op.itob(lp_tokens_to_mint)
        )

        return arc4.UInt64(lp_tokens_to_mint)

    @arc4.abimethod(allow_actions=["NoOp"])
    def remove_liquidity(
        self,
        lp_token_payment: gtxn.AssetTransferTransaction,
        min_asset_1: arc4.UInt64,
        min_asset_2: arc4.UInt64,
    ) -> arc4.Tuple[arc4.UInt64, arc4.UInt64]:
        """
        Remove liquidity from the pool by burning LP tokens

        Args:
            lp_token_payment: Payment of LP tokens to burn
            min_asset_1: Minimum asset 1 to receive (slippage protection)
            min_asset_2: Minimum asset 2 to receive (slippage protection)

        Returns:
            Tuple of (asset_1_amount, asset_2_amount) returned
        """
        assert self.initialized, "Pool not initialized"
        assert self.lp_token_id != 0, "LP token not created"

        # Verify LP token payment
        assert lp_token_payment.asset_receiver == Global.current_application_address
        assert lp_token_payment.xfer_asset.id == self.lp_token_id

        lp_tokens = lp_token_payment.asset_amount
        assert lp_tokens > 0, "LP tokens must be positive"
        assert lp_tokens <= self.total_liquidity, "Insufficient liquidity"

        # Calculate share of pool
        amount_1 = (lp_tokens * self.reserve_1) // self.total_liquidity
        amount_2 = (lp_tokens * self.reserve_2) // self.total_liquidity

        # Verify slippage tolerance
        assert amount_1 >= min_asset_1.native, "Asset 1 slippage exceeded"
        assert amount_2 >= min_asset_2.native, "Asset 2 slippage exceeded"

        # Update state
        self.total_liquidity -= lp_tokens
        self.reserve_1 -= amount_1
        self.reserve_2 -= amount_2

        # Send assets back to user
        itxn.AssetTransfer(
            xfer_asset=self.asset_1_id,
            asset_amount=amount_1,
            asset_receiver=Txn.sender,
        ).submit()

        itxn.AssetTransfer(
            xfer_asset=self.asset_2_id,
            asset_amount=amount_2,
            asset_receiver=Txn.sender,
        ).submit()

        # Log liquidity removal
        log(
            arc4.String("LIQUIDITY_REMOVED").bytes
            + op.itob(lp_tokens)
            + op.itob(amount_1)
            + op.itob(amount_2)
        )

        return arc4.Tuple((arc4.UInt64(amount_1), arc4.UInt64(amount_2)))

    @arc4.abimethod(allow_actions=["NoOp"])
    def swap(
        self,
        asset_in_payment: gtxn.AssetTransferTransaction,
        asset_out_id: arc4.UInt64,
        min_amount_out: arc4.UInt64,
    ) -> arc4.UInt64:
        """
        Swap one asset for another using constant product formula

        Args:
            asset_in_payment: Payment of input asset
            asset_out_id: ID of output asset to receive
            min_amount_out: Minimum output amount (slippage protection)

        Returns:
            Amount of output asset sent
        """
        assert self.initialized, "Pool not initialized"
        assert self.reserve_1 > 0 and self.reserve_2 > 0, "No liquidity"

        # Verify payment
        assert asset_in_payment.asset_receiver == Global.current_application_address

        asset_in_id = asset_in_payment.xfer_asset.id
        amount_in = asset_in_payment.asset_amount
        assert amount_in > 0, "Amount in must be positive"

        # Determine swap direction
        swap_1_to_2 = asset_in_id == self.asset_1_id and asset_out_id.native == self.asset_2_id
        swap_2_to_1 = asset_in_id == self.asset_2_id and asset_out_id.native == self.asset_1_id
        assert swap_1_to_2 or swap_2_to_1, "Invalid asset pair"

        # Calculate output amount using constant product formula
        # Output = (amount_in * (1 - fee) * reserve_out) / (reserve_in + amount_in * (1 - fee))

        if swap_1_to_2:
            reserve_in = self.reserve_1
            reserve_out = self.reserve_2
        else:
            reserve_in = self.reserve_2
            reserve_out = self.reserve_1

        # Apply fee
        amount_in_with_fee = amount_in * (BASIS_POINTS - self.fee_bps)

        # Calculate output
        numerator = amount_in_with_fee * reserve_out
        denominator = (reserve_in * BASIS_POINTS) + amount_in_with_fee
        amount_out = numerator // denominator

        # Verify slippage tolerance
        assert amount_out >= min_amount_out.native, "Slippage exceeded"
        assert amount_out < reserve_out, "Insufficient liquidity"

        # Update reserves
        if swap_1_to_2:
            self.reserve_1 += amount_in
            self.reserve_2 -= amount_out
        else:
            self.reserve_2 += amount_in
            self.reserve_1 -= amount_out

        # Send output asset to user
        itxn.AssetTransfer(
            xfer_asset=asset_out_id.native,
            asset_amount=amount_out,
            asset_receiver=Txn.sender,
        ).submit()

        # Log swap
        log(
            arc4.String("SWAP").bytes
            + op.itob(asset_in_id)
            + op.itob(amount_in)
            + op.itob(asset_out_id.native)
            + op.itob(amount_out)
        )

        return arc4.UInt64(amount_out)

    @arc4.abimethod(readonly=True)
    def get_pool_info(self) -> PoolState:
        """Get current pool state"""
        return PoolState(
            asset_1_id=arc4.UInt64(self.asset_1_id),
            asset_2_id=arc4.UInt64(self.asset_2_id),
            reserve_1=arc4.UInt64(self.reserve_1),
            reserve_2=arc4.UInt64(self.reserve_2),
            total_liquidity=arc4.UInt64(self.total_liquidity),
            fee_bps=arc4.UInt16(self.fee_bps),
            lp_token_id=arc4.UInt64(self.lp_token_id),
            initialized=arc4.Bool(self.initialized),
        )

    @arc4.abimethod(readonly=True)
    def get_swap_quote(
        self,
        asset_in_id: arc4.UInt64,
        asset_out_id: arc4.UInt64,
        amount_in: arc4.UInt64,
    ) -> arc4.UInt64:
        """
        Get quote for a swap without executing

        Args:
            asset_in_id: Input asset ID
            asset_out_id: Output asset ID
            amount_in: Amount of input asset

        Returns:
            Expected output amount
        """
        assert self.initialized, "Pool not initialized"
        assert self.reserve_1 > 0 and self.reserve_2 > 0, "No liquidity"

        # Determine swap direction
        swap_1_to_2 = asset_in_id.native == self.asset_1_id and asset_out_id.native == self.asset_2_id
        swap_2_to_1 = asset_in_id.native == self.asset_2_id and asset_out_id.native == self.asset_1_id
        assert swap_1_to_2 or swap_2_to_1, "Invalid asset pair"

        if swap_1_to_2:
            reserve_in = self.reserve_1
            reserve_out = self.reserve_2
        else:
            reserve_in = self.reserve_2
            reserve_out = self.reserve_1

        # Calculate output
        amount_in_with_fee = amount_in.native * (BASIS_POINTS - self.fee_bps)
        numerator = amount_in_with_fee * reserve_out
        denominator = (reserve_in * BASIS_POINTS) + amount_in_with_fee
        amount_out = numerator // denominator

        return arc4.UInt64(amount_out)

    @subroutine
    def _sqrt(self, x: UInt64) -> UInt64:
        """Calculate square root using Newton's method"""
        if x == 0:
            return UInt64(0)

        # Initial guess
        z = x
        y = (x + 1) // 2

        # Newton's method iterations
        while y < z:
            z = y
            y = (x // y + y) // 2

        return z

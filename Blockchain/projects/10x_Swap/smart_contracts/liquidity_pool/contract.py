"""
Liquidity Pool Factory Contract - Constant Product AMM (x * y = k)

This contract implements a factory for multiple decentralized liquidity pools.
Each pool follows the constant product market maker model (Uniswap V2 style).

Features:
- Multiple pool support via box storage
- Pool creation with two assets
- Add/Remove liquidity per pool
- Token swaps with configurable fees per pool
- LP token management per pool
- Fee collection
"""

from algopy import (
    ARC4Contract,
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


class PoolData(arc4.Struct):
    """Pool data stored in box storage"""
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
    Automated Market Maker Liquidity Pool Factory

    Implements constant product (x * y = k) formula for decentralized trading.
    Supports multiple pools via box storage.
    """

    def __init__(self) -> None:
        """Initialize contract state"""
        # Track total number of pools
        self.total_pools = UInt64(0)

    @subroutine
    def get_pool_key(self, asset_1_id: UInt64, asset_2_id: UInt64) -> Bytes:
        """
        Generate a unique pool key from asset IDs
        Assets are sorted to ensure same key regardless of order
        """
        # Sort asset IDs to ensure consistent key
        if asset_1_id < asset_2_id:
            key_data = op.itob(asset_1_id) + op.itob(asset_2_id)
        else:
            key_data = op.itob(asset_2_id) + op.itob(asset_1_id)
        
        # Use first 32 bytes of sha256 hash as key
        return op.sha256(key_data)

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
            Pool ID (hex encoded key)
        """
        # Verify caller is creator
        assert Txn.sender == Global.creator_address, "Only creator can create pools"

        # Verify assets are different
        assert asset_1.id != asset_2.id, "Assets must be different"

        # Verify fee is reasonable
        assert fee_bps.native <= MAX_FEE_BPS, "Fee too high"

        # Generate pool key
        pool_key = self.get_pool_key(asset_1.id, asset_2.id)

        # Check if pool already exists
        _existing_data, exists = op.Box.get(pool_key)
        assert not exists, "Pool already exists for this pair"

        # Create pool data
        pool_data = PoolData(
            asset_1_id=arc4.UInt64(asset_1.id),
            asset_2_id=arc4.UInt64(asset_2.id),
            reserve_1=arc4.UInt64(0),
            reserve_2=arc4.UInt64(0),
            total_liquidity=arc4.UInt64(0),
            fee_bps=fee_bps,
            lp_token_id=arc4.UInt64(0),
            initialized=arc4.Bool(True),
        )

        # Store in box
        op.Box.put(pool_key, pool_data.bytes)

        # Increment pool count
        self.total_pools += 1

        # Opt contract into assets via inner transactions (skip if ALGO)
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
            + pool_key
            + op.itob(asset_1.id)
            + op.itob(asset_2.id)
            + op.itob(fee_bps.native)
        )

        # Return pool ID - just return the raw bytes as string representation
        # The pool_key is already Bytes, we can convert it to an arc4.String directly
        # by getting its hex representation through the bytes property
        return arc4.String.from_bytes(pool_key)

    @arc4.abimethod(allow_actions=["NoOp"])
    def create_lp_token(
        self,
        pool_id: arc4.DynamicBytes,
        total: arc4.UInt64,
        decimals: arc4.UInt32,
        name: arc4.String,
        unit_name: arc4.String,
    ) -> arc4.UInt64:
        """
        Create the LP token for a specific pool

        Args:
            pool_id: Pool identifier (raw 32-byte hash)
            total: Total supply of LP tokens
            decimals: Decimal places for LP token
            name: LP token name
            unit_name: LP token unit name

        Returns:
            LP token asset ID
        """
        assert Txn.sender == Global.creator_address, "Only creator can create LP token"

        # Extract raw bytes from arc4.DynamicBytes (no length prefix)
        pool_key = pool_id.native

        # Get pool data from box
        pool_data_bytes, exists = op.Box.get(pool_key)
        assert exists, "Pool does not exist"

        # Load pool data
        pool_data = PoolData.from_bytes(pool_data_bytes)
        assert pool_data.initialized.native, "Pool not initialized"
        assert pool_data.lp_token_id.native == 0, "LP token already created"

        # Create the LP token
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

        # Update pool data with LP token ID
        pool_data.lp_token_id = arc4.UInt64(result.created_asset.id)
        op.Box.put(pool_key, pool_data.bytes)

        # Log LP token creation
        log(arc4.String("LP_TOKEN_CREATED").bytes + pool_key + op.itob(result.created_asset.id))

        return arc4.UInt64(result.created_asset.id)

    @arc4.abimethod(allow_actions=["NoOp"])
    def add_liquidity(
        self,
        pool_id: arc4.DynamicBytes,
        asset_1_payment: gtxn.AssetTransferTransaction,
        asset_2_payment: gtxn.AssetTransferTransaction,
        min_lp_tokens: arc4.UInt64,
    ) -> arc4.UInt64:
        """
        Add liquidity to a specific pool and receive LP tokens

        Args:
            pool_id: Pool identifier
            asset_1_payment: Payment transaction for asset 1
            asset_2_payment: Payment transaction for asset 2
            min_lp_tokens: Minimum LP tokens to receive (slippage protection)

        Returns:
            Amount of LP tokens minted
        """
        # Decode pool ID - extract bytes from arc4.String
        pool_key = pool_id.native

        # Get pool data from box
        pool_data_bytes, exists = op.Box.get(pool_key)
        assert exists, "Pool does not exist"

        # Load pool data
        pool_data = PoolData.from_bytes(pool_data_bytes)
        assert pool_data.initialized.native, "Pool not initialized"
        assert pool_data.lp_token_id.native != 0, "LP token not created"

        # Verify payments
        assert asset_1_payment.asset_receiver == Global.current_application_address
        assert asset_2_payment.asset_receiver == Global.current_application_address
        assert asset_1_payment.xfer_asset.id == pool_data.asset_1_id.native
        assert asset_2_payment.xfer_asset.id == pool_data.asset_2_id.native

        amount_1 = asset_1_payment.asset_amount
        amount_2 = asset_2_payment.asset_amount

        assert amount_1 > 0, "Amount 1 must be positive"
        assert amount_2 > 0, "Amount 2 must be positive"

        # Calculate LP tokens to mint
        lp_tokens_to_mint = UInt64(0)

        if pool_data.total_liquidity.native == 0:
            # First liquidity provision
            lp_tokens_to_mint = self._sqrt(amount_1 * amount_2) - MIN_LIQUIDITY
            assert lp_tokens_to_mint > 0, "Insufficient initial liquidity"

            # Lock minimum liquidity forever
            pool_data.total_liquidity = arc4.UInt64(lp_tokens_to_mint + MIN_LIQUIDITY)
        else:
            # Subsequent liquidity provision
            lp_from_amount_1 = (amount_1 * pool_data.total_liquidity.native) // pool_data.reserve_1.native
            lp_from_amount_2 = (amount_2 * pool_data.total_liquidity.native) // pool_data.reserve_2.native

            # Take the minimum to maintain ratio
            lp_tokens_to_mint = lp_from_amount_1 if lp_from_amount_1 < lp_from_amount_2 else lp_from_amount_2
            assert lp_tokens_to_mint > 0, "Insufficient liquidity"

            pool_data.total_liquidity = arc4.UInt64(pool_data.total_liquidity.native + lp_tokens_to_mint)

        # Verify slippage tolerance
        assert lp_tokens_to_mint >= min_lp_tokens.native, "Slippage exceeded"

        # Update reserves
        pool_data.reserve_1 = arc4.UInt64(pool_data.reserve_1.native + amount_1)
        pool_data.reserve_2 = arc4.UInt64(pool_data.reserve_2.native + amount_2)

        # Save updated pool data
        op.Box.put(pool_key, pool_data.bytes)

        # Send LP tokens to user
        itxn.AssetTransfer(
            xfer_asset=pool_data.lp_token_id.native,
            asset_amount=lp_tokens_to_mint,
            asset_receiver=Txn.sender,
        ).submit()

        # Log liquidity addition
        log(
            arc4.String("LIQUIDITY_ADDED").bytes
            + pool_key
            + op.itob(amount_1)
            + op.itob(amount_2)
            + op.itob(lp_tokens_to_mint)
        )

        return arc4.UInt64(lp_tokens_to_mint)

    @arc4.abimethod(allow_actions=["NoOp"])
    def remove_liquidity(
        self,
        pool_id: arc4.DynamicBytes,
        lp_token_payment: gtxn.AssetTransferTransaction,
        min_asset_1: arc4.UInt64,
        min_asset_2: arc4.UInt64,
    ) -> arc4.Tuple[arc4.UInt64, arc4.UInt64]:
        """
        Remove liquidity from a pool by burning LP tokens

        Args:
            pool_id: Pool identifier
            lp_token_payment: Payment of LP tokens to burn
            min_asset_1: Minimum asset 1 to receive (slippage protection)
            min_asset_2: Minimum asset 2 to receive (slippage protection)

        Returns:
            Tuple of (asset_1_amount, asset_2_amount) returned
        """
        # Decode pool ID - extract bytes from arc4.String
        pool_key = pool_id.native

        # Get pool data from box
        pool_data_bytes, exists = op.Box.get(pool_key)
        assert exists, "Pool does not exist"

        # Load pool data
        pool_data = PoolData.from_bytes(pool_data_bytes)
        assert pool_data.initialized.native, "Pool not initialized"
        assert pool_data.lp_token_id.native != 0, "LP token not created"

        # Verify LP token payment
        assert lp_token_payment.asset_receiver == Global.current_application_address
        assert lp_token_payment.xfer_asset.id == pool_data.lp_token_id.native

        lp_tokens = lp_token_payment.asset_amount
        assert lp_tokens > 0, "LP tokens must be positive"
        assert lp_tokens <= pool_data.total_liquidity.native, "Insufficient liquidity"

        # Calculate share of pool
        amount_1 = (lp_tokens * pool_data.reserve_1.native) // pool_data.total_liquidity.native
        amount_2 = (lp_tokens * pool_data.reserve_2.native) // pool_data.total_liquidity.native

        # Verify slippage tolerance
        assert amount_1 >= min_asset_1.native, "Asset 1 slippage exceeded"
        assert amount_2 >= min_asset_2.native, "Asset 2 slippage exceeded"

        # Update state
        pool_data.total_liquidity = arc4.UInt64(pool_data.total_liquidity.native - lp_tokens)
        pool_data.reserve_1 = arc4.UInt64(pool_data.reserve_1.native - amount_1)
        pool_data.reserve_2 = arc4.UInt64(pool_data.reserve_2.native - amount_2)

        # Save updated pool data
        op.Box.put(pool_key, pool_data.bytes)

        # Send assets back to user
        itxn.AssetTransfer(
            xfer_asset=pool_data.asset_1_id.native,
            asset_amount=amount_1,
            asset_receiver=Txn.sender,
        ).submit()

        itxn.AssetTransfer(
            xfer_asset=pool_data.asset_2_id.native,
            asset_amount=amount_2,
            asset_receiver=Txn.sender,
        ).submit()

        # Log liquidity removal
        log(
            arc4.String("LIQUIDITY_REMOVED").bytes
            + pool_key
            + op.itob(lp_tokens)
            + op.itob(amount_1)
            + op.itob(amount_2)
        )

        return arc4.Tuple((arc4.UInt64(amount_1), arc4.UInt64(amount_2)))

    @arc4.abimethod(allow_actions=["NoOp"])
    def swap(
        self,
        pool_id: arc4.DynamicBytes,
        asset_in_payment: gtxn.AssetTransferTransaction,
        asset_out_id: arc4.UInt64,
        min_amount_out: arc4.UInt64,
    ) -> arc4.UInt64:
        """
        Swap one asset for another using constant product formula

        Args:
            pool_id: Pool identifier
            asset_in_payment: Payment of input asset
            asset_out_id: ID of output asset to receive
            min_amount_out: Minimum output amount (slippage protection)

        Returns:
            Amount of output asset sent
        """
        # Decode pool ID - extract bytes from arc4.String
        pool_key = pool_id.native

        # Get pool data from box
        pool_data_bytes, exists = op.Box.get(pool_key)
        assert exists, "Pool does not exist"

        # Load pool data
        pool_data = PoolData.from_bytes(pool_data_bytes)
        assert pool_data.initialized.native, "Pool not initialized"
        assert pool_data.reserve_1.native > 0 and pool_data.reserve_2.native > 0, "No liquidity"

        # Verify payment
        assert asset_in_payment.asset_receiver == Global.current_application_address

        asset_in_id = asset_in_payment.xfer_asset.id
        amount_in = asset_in_payment.asset_amount
        assert amount_in > 0, "Amount in must be positive"

        # Determine swap direction
        swap_1_to_2 = asset_in_id == pool_data.asset_1_id.native and asset_out_id.native == pool_data.asset_2_id.native
        swap_2_to_1 = asset_in_id == pool_data.asset_2_id.native and asset_out_id.native == pool_data.asset_1_id.native
        assert swap_1_to_2 or swap_2_to_1, "Invalid asset pair"

        # Calculate output amount using constant product formula
        if swap_1_to_2:
            reserve_in = pool_data.reserve_1.native
            reserve_out = pool_data.reserve_2.native
        else:
            reserve_in = pool_data.reserve_2.native
            reserve_out = pool_data.reserve_1.native

        # Apply fee
        amount_in_with_fee = amount_in * (BASIS_POINTS - pool_data.fee_bps.native)

        # Calculate output
        numerator = amount_in_with_fee * reserve_out
        denominator = (reserve_in * BASIS_POINTS) + amount_in_with_fee
        amount_out = numerator // denominator

        # Verify slippage tolerance
        assert amount_out >= min_amount_out.native, "Slippage exceeded"
        assert amount_out < reserve_out, "Insufficient liquidity"

        # Update reserves
        if swap_1_to_2:
            pool_data.reserve_1 = arc4.UInt64(pool_data.reserve_1.native + amount_in)
            pool_data.reserve_2 = arc4.UInt64(pool_data.reserve_2.native - amount_out)
        else:
            pool_data.reserve_2 = arc4.UInt64(pool_data.reserve_2.native + amount_in)
            pool_data.reserve_1 = arc4.UInt64(pool_data.reserve_1.native - amount_out)

        # Save updated pool data
        op.Box.put(pool_key, pool_data.bytes)

        # Send output asset to user
        itxn.AssetTransfer(
            xfer_asset=asset_out_id.native,
            asset_amount=amount_out,
            asset_receiver=Txn.sender,
        ).submit()

        # Log swap
        log(
            arc4.String("SWAP").bytes
            + pool_key
            + op.itob(asset_in_id)
            + op.itob(amount_in)
            + op.itob(asset_out_id.native)
            + op.itob(amount_out)
        )

        return arc4.UInt64(amount_out)

    @arc4.abimethod(readonly=True)
    def get_pool_info(self, pool_id: arc4.DynamicBytes) -> PoolData:
        """
        Get current pool state

        Args:
            pool_id: Pool identifier (raw 32-byte hash)

        Returns:
            Pool data
        """
        # Extract raw bytes from arc4.DynamicBytes
        pool_key = pool_id.native
        pool_data_bytes, exists = op.Box.get(pool_key)
        assert exists, "Pool does not exist"

        return PoolData.from_bytes(pool_data_bytes)

    @arc4.abimethod(readonly=True)
    def get_total_pools(self) -> arc4.UInt64:
        """Get total number of pools created"""
        return arc4.UInt64(self.total_pools)

    @arc4.abimethod(readonly=True)
    def compute_pool_id(self, asset_1_id: arc4.UInt64, asset_2_id: arc4.UInt64) -> arc4.String:
        """
        Compute pool ID for an asset pair

        Args:
            asset_1_id: First asset ID
            asset_2_id: Second asset ID

        Returns:
            Pool ID (as arc4.String)
        """
        pool_key = self.get_pool_key(asset_1_id.native, asset_2_id.native)
        return arc4.String.from_bytes(pool_key)

    @arc4.abimethod(readonly=True)
    def get_swap_quote(
        self,
        pool_id: arc4.DynamicBytes,
        asset_in_id: arc4.UInt64,
        asset_out_id: arc4.UInt64,
        amount_in: arc4.UInt64,
    ) -> arc4.UInt64:
        """
        Get quote for a swap without executing

        Args:
            pool_id: Pool identifier
            asset_in_id: Input asset ID
            asset_out_id: Output asset ID
            amount_in: Amount of input asset

        Returns:
            Expected output amount
        """
        # Decode pool ID - extract bytes from arc4.String
        pool_key = pool_id.native
        pool_data_bytes, exists = op.Box.get(pool_key)
        assert exists, "Pool does not exist"

        pool_data = PoolData.from_bytes(pool_data_bytes)
        assert pool_data.initialized.native, "Pool not initialized"
        assert pool_data.reserve_1.native > 0 and pool_data.reserve_2.native > 0, "No liquidity"

        # Determine swap direction
        swap_1_to_2 = asset_in_id.native == pool_data.asset_1_id.native and asset_out_id.native == pool_data.asset_2_id.native
        swap_2_to_1 = asset_in_id.native == pool_data.asset_2_id.native and asset_out_id.native == pool_data.asset_1_id.native
        assert swap_1_to_2 or swap_2_to_1, "Invalid asset pair"

        if swap_1_to_2:
            reserve_in = pool_data.reserve_1.native
            reserve_out = pool_data.reserve_2.native
        else:
            reserve_in = pool_data.reserve_2.native
            reserve_out = pool_data.reserve_1.native

        # Calculate output
        amount_in_with_fee = amount_in.native * (BASIS_POINTS - pool_data.fee_bps.native)
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

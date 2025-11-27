from algopy import (
    ARC4Contract,
    Asset,
    Account,
    Global,
    Txn,
    UInt64,
    arc4,
    itxn,
    op,
    gtxn,
    Bytes,
)

class UserRecord(arc4.Struct):
    """User purchase record for anti-bot tracking"""
    total_bought: arc4.UInt64
    last_buy_round: arc4.UInt64

class TokenLaunchpad(ARC4Contract):
    """
    Token Launchpad with Bonding Curve (Linear implementation).
    """

    def __init__(self) -> None:
        # Global State (Native UInt64 storage)
        self.creator = Account()
        self.asa_id = UInt64()
        self.total_supply = UInt64()
        self.tokens_for_sale = UInt64()
        self.start_price = UInt64()
        self.target_price = UInt64()
        self.bonding_target = UInt64()
        self.curve_type = UInt64()  # 0=Linear, 1=Exponential, 2=Sigmoid
        self.tokens_sold = UInt64()
        self.algo_raised = UInt64()
        self.max_buy_per_tx = UInt64()
        self.max_buy_per_user = UInt64()
        self.liquidity_percent = UInt64()
        self.liquidity_lock_days = UInt64()
        self.launch_status = UInt64()  # 0=Prelaunch, 1=Live, 2=Completed, 3=Finalized
        self.platform_address = Account()
        self.platform_fee_percent = UInt64()

    # -----------------------
    @arc4.baremethod(allow_actions=["NoOp"], create="require")
    def create(self) -> None:
        """Initialize the contract"""
        self.creator = Txn.sender
        self.launch_status = UInt64(0)
        # default platform fee 1% (stored as integer percentage)
        self.platform_fee_percent = UInt64(1)

    # -----------------------
    @arc4.abimethod
    def configure(
        self,
        asa: Asset,
        total_supply: arc4.UInt64,
        tokens_for_sale: arc4.UInt64,
        start_price: arc4.UInt64,
        target_price: arc4.UInt64,
        bonding_target: arc4.UInt64,
        curve_type: arc4.UInt64,
        max_buy_per_tx: arc4.UInt64,
        max_buy_per_user: arc4.UInt64,
        liquidity_percent: arc4.UInt64,
        liquidity_lock_days: arc4.UInt64,
        platform_address: Account
    ) -> None:
        """Configure sale parameters (creator only, pre-launch)"""
        assert Txn.sender == self.creator, "Only creator"
        assert self.launch_status == 0, "Already configured"

        # Basic sanity checks
        assert total_supply.native > 0, "total_supply must be > 0"
        assert tokens_for_sale.native > 0, "tokens_for_sale must be > 0"
        assert start_price.native < target_price.native, "start_price must be < target_price"
        assert tokens_for_sale.native <= total_supply.native, "tokens_for_sale <= total_supply"

        # Store params (native values)
        self.asa_id = asa.id
        self.total_supply = total_supply.native
        self.tokens_for_sale = tokens_for_sale.native
        self.start_price = start_price.native
        self.target_price = target_price.native
        self.bonding_target = bonding_target.native
        self.curve_type = curve_type.native
        self.max_buy_per_tx = max_buy_per_tx.native
        self.max_buy_per_user = max_buy_per_user.native
        self.liquidity_percent = liquidity_percent.native
        self.liquidity_lock_days = liquidity_lock_days.native
        self.platform_address = platform_address
        # Set to Live
        self.launch_status = UInt64(1)

    # -----------------------
    @arc4.abimethod
    def bootstrap(self, asa: Asset) -> None:
        """Opt contract into ASA (creator only)"""
        assert Txn.sender == self.creator, "Only creator"
        # ASA opt-in (0 amount)
        itxn.AssetTransfer(
            xfer_asset=asa.id,
            asset_receiver=Global.current_application_address,
            asset_amount=0,
        ).submit()

    # -----------------------
    @arc4.abimethod
    def buy(self, quantity: arc4.UInt64) -> None:
        """
        Buy tokens via bonding curve.

        IMPORTANT: this is an ABI method — callers must invoke via ABI (app client) so
        the application call carries the encoded ABI args. Also a grouped Payment txn
        (gtxn[0]) must send ALGO to the app address prior to this AppCall (gtxn[1]).
        """
        # Basic state checks
        assert self.launch_status == 1, "Sale not live"

        n = quantity.native
        assert n > 0, "Quantity must be positive"

        # Read from state
        tokens_for_sale = self.tokens_for_sale
        tokens_sold = self.tokens_sold
        start_price = self.start_price
        target_price = self.target_price

        assert tokens_for_sale > 0, "tokens_for_sale not set"
        assert tokens_sold + n <= tokens_for_sale, "Not enough tokens"

        # Payment is expected as group txn 0 (buyer -> app)
        pay = gtxn.PaymentTransaction(0)
        assert pay.receiver == Global.current_application_address, "Payment must go to app address"
        assert pay.sender == Txn.sender, "Payment sender must equal caller"

        # Per-user limits using op.Box keyed by sender bytes
        buyer = Txn.sender
        user_key = buyer.bytes
        user_data_bytes, exists = op.Box.get(user_key)

        bought_before = UInt64(0)
        if exists:
            rec = UserRecord.from_bytes(user_data_bytes)
            bought_before = rec.total_bought.native

        # Enforce caps
        assert bought_before + n <= self.max_buy_per_user, "Exceeds max per user"
        assert n <= self.max_buy_per_tx, "Exceeds max per tx"

        # Linear price calculation (integer-safe)
        p0 = start_price
        p1 = target_price
        delta_p = p1 - p0

        # cost = p0*n + delta_p * n * (2*s + n) / (2 * tokens_for_sale)
        numerator = delta_p * n * ((tokens_sold * 2) + n)
        denominator = tokens_for_sale * 2
        curve_add = numerator // denominator
        cost = p0 * n + curve_add  # cost in microAlgos

        # Verify payment amount (paid is native int microAlgos)
        paid = pay.amount
        assert paid >= cost, "Insufficient payment provided"

        # Update global state
        self.tokens_sold = tokens_sold + n
        self.algo_raised = self.algo_raised + cost

        # Update user record in box storage
        new_user = UserRecord(
            total_bought=arc4.UInt64(bought_before + n),
            last_buy_round=arc4.UInt64(Global.round)
        )
        op.Box.put(user_key, new_user.bytes)

        # Transfer ASA tokens (contract must hold sufficient tokens)
        itxn.AssetTransfer(
            xfer_asset=self.asa_id,
            asset_receiver=buyer,
            asset_amount=n,
        ).submit()

        # Refund any overpayment
        if paid > cost:
            change = paid - cost
            itxn.Payment(
                receiver=buyer,
                amount=change
            ).submit()

        # Check completion
        if self.tokens_sold >= tokens_for_sale or self.algo_raised >= self.bonding_target:
            self.launch_status = UInt64(2)

    # -----------------------
    @arc4.abimethod
    def finalize(self) -> None:
        """Finalize sale and distribute funds (creator only)"""
        assert Txn.sender == self.creator, "Only creator"
        assert self.launch_status == 2, "Sale not completed"

        total_raised = self.algo_raised
        fee_pct = self.platform_fee_percent
        platform_fee = (total_raised * fee_pct) // 100

        creator_amount = total_raised - platform_fee

        # 1. Pay Platform Fee
        if platform_fee > 0:
            itxn.Payment(
                receiver=self.platform_address,
                amount=platform_fee
            ).submit()

        # 2. Pay Creator (Revenue + Liquidity Capital)
        if creator_amount > 0:
            itxn.Payment(
                receiver=self.creator,
                amount=creator_amount
            ).submit()

        self.launch_status = UInt64(3)

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
        # Global State
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

    # -----------------------
    @arc4.baremethod(allow_actions=["NoOp"], create="require")
    def create(self) -> None:
        """Initialize the contract"""
        self.creator = Txn.sender
        self.launch_status = UInt64(0)

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
        liquidity_lock_days: arc4.UInt64
    ) -> None:
        """Configure sale parameters (creator only, pre-launch)"""
        assert Txn.sender == self.creator, "Only creator"
        assert self.launch_status.native == 0, "Already configured"

        # Basic sanity checks
        assert total_supply.native > 0, "total_supply must be > 0"
        assert tokens_for_sale.native > 0, "tokens_for_sale must be > 0"
        assert start_price.native < target_price.native, "start_price must be < target_price"
        assert tokens_for_sale.native <= total_supply.native, "tokens_for_sale <= total_supply"

        # Set params (store as UInt64 wrappers)
        self.asa_id = UInt64(asa.id)
        self.total_supply = arc4.UInt64(total_supply.native)
        self.tokens_for_sale = arc4.UInt64(tokens_for_sale.native)
        self.start_price = arc4.UInt64(start_price.native)
        self.target_price = arc4.UInt64(target_price.native)
        self.bonding_target = arc4.UInt64(bonding_target.native)
        self.curve_type = arc4.UInt64(curve_type.native)
        self.max_buy_per_tx = arc4.UInt64(max_buy_per_tx.native)
        self.max_buy_per_user = arc4.UInt64(max_buy_per_user.native)
        self.liquidity_percent = arc4.UInt64(liquidity_percent.native)
        self.liquidity_lock_days = arc4.UInt64(liquidity_lock_days.native)

        # Set to Live
        self.launch_status = arc4.UInt64(1)

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
        Expect group:
          gtxn[0] = Payment (buyer -> app address)
          gtxn[1] = ApplicationCall (this method)
        """
        # Basic state checks
        assert self.launch_status.native == 1, "Sale not live"

        n = quantity.native
        assert n > 0, "Quantity must be positive"

        tokens_for_sale = self.tokens_for_sale.native
        assert tokens_for_sale > 0, "tokens_for_sale not set"

        tokens_sold = self.tokens_sold.native
        assert tokens_sold + n <= tokens_for_sale, "Not enough tokens"

        # Payment is expected as group txn 0
        pay = gtxn[0]
        assert pay.type_enum == Txn.PaymentType, "First grouped txn must be Payment"
        assert pay.receiver == Global.current_application_address, "Payment must go to app address"
        assert pay.sender == Txn.sender, "Payment sender must equal caller"

        # Per-user limits using op.Box keyed by sender bytes
        buyer = Txn.sender
        user_key = buyer.bytes
        user_data_bytes, exists = op.Box.get(user_key)

        bought_before = 0
        last_buy_round = 0
        if exists:
            rec = UserRecord.from_bytes(user_data_bytes)
            bought_before = rec.total_bought.native
            last_buy_round = rec.last_buy_round.native

        # Enforce caps
        assert bought_before + n <= self.max_buy_per_user.native, "Exceeds max per user"
        assert n <= self.max_buy_per_tx.native, "Exceeds max per tx"

        # Ensure no divide-by-zero
        assert tokens_for_sale > 0, "tokens_for_sale must be > 0"

        # Linear price calculation (integer-safe)
        p0 = self.start_price.native
        p1 = self.target_price.native
        delta_p = p1 - p0

        # cost = p0*n + delta_p * n * (2*s + n) / (2 * tokens_for_sale)
        numerator = delta_p * n * ((tokens_sold * 2) + n)
        denominator = tokens_for_sale * 2
        curve_add = numerator // denominator
        cost = p0 * n + curve_add

        # Verify payment amount
        paid = pay.amount
        assert paid >= cost, "Insufficient payment provided"

        # Update global state (wrap with arc4.UInt64)
        self.tokens_sold = arc4.UInt64(tokens_sold + n)
        self.algo_raised = arc4.UInt64(self.algo_raised.native + cost)

        # Write user record back to box
        new_user = UserRecord(
            total_bought=arc4.UInt64(bought_before + n),
            last_buy_round=arc4.UInt64(Global.round.native)
        )
        op.Box.put(user_key, new_user.bytes)

        # Transfer ASA tokens (contract must hold sufficient tokens)
        itxn.AssetTransfer(
            xfer_asset=self.asa_id.native,
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
        if self.tokens_sold.native >= tokens_for_sale or self.algo_raised.native >= self.bonding_target.native:
            self.launch_status = arc4.UInt64(2)

    # -----------------------
    @arc4.abimethod
    def finalize(self) -> None:
        """Finalize sale and distribute liquidity (creator only)"""
        assert Txn.sender == self.creator, "Only creator"
        assert self.launch_status.native == 2, "Sale not completed"

        # Transfer raised ALGO to creator (simple prototype)
        itxn.Payment(
            receiver=self.creator,
            amount=self.algo_raised.native
        ).submit()

        self.launch_status = arc4.UInt64(3)

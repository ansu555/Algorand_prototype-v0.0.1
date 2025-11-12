"""
AutoPilot Rule Contract for Automated Trading Strategies

This contract enables users to create and execute automated trading rules
for DCA (Dollar Cost Averaging), REBALANCE, and ROTATE strategies.

Features:
- On-chain rule storage using box storage
- Trigger-based execution (price drops, trends, momentum)
- Risk controls (max spend, slippage, cooldown)
- Integration with MultihopSwapRouter for DEX swaps
"""

from algopy import (
    ARC4Contract,
    Account,
    Application,
    Asset,
    Bytes,
    Global,
    TransactionType,
    Txn,
    UInt64,
    arc4,
    gtxn,
    itxn,
    log,
    op,
    subroutine,
)


# Constants for rule types
RULE_TYPE_DCA = 1
RULE_TYPE_REBALANCE = 2
RULE_TYPE_ROTATE = 3

# Trigger types
TRIGGER_PRICE_DROP = 1
TRIGGER_TREND = 2
TRIGGER_MOMENTUM = 3

# Rule status
STATUS_ACTIVE = 1
STATUS_PAUSED = 2
STATUS_CANCELLED = 3

# Constants
MIN_COOLDOWN_MINUTES = 5
MAX_SLIPPAGE_BPS = 5000  # 50%
BASIS_POINTS = 10000


class TriggerData(arc4.Struct):
    """Trigger condition configuration"""
    trigger_type: arc4.UInt8        # 1=price_drop, 2=trend, 3=momentum
    threshold_bps: arc4.UInt16      # Threshold in basis points (500 = 5%)
    window_hours: arc4.UInt16       # Time window for trend/momentum (optional)
    lookback_days: arc4.UInt8       # Lookback period for momentum (optional)


class RuleData(arc4.Struct):
    """Complete rule configuration stored in box storage"""
    rule_id: arc4.UInt64            # Unique rule ID
    owner: arc4.Address             # Rule creator/owner
    rule_type: arc4.UInt8           # 1=DCA, 2=REBALANCE, 3=ROTATE
    status: arc4.UInt8              # 1=active, 2=paused, 3=cancelled
    
    # Assets
    target_assets: arc4.DynamicArray[arc4.UInt64]  # Asset IDs to trade
    rotate_top_n: arc4.UInt8        # For ROTATE: top N assets (0 if N/A)
    
    # Risk Controls
    max_spend_microalgos: arc4.UInt64  # Maximum ALGO to spend per execution
    max_slippage_bps: arc4.UInt16   # Maximum slippage (basis points)
    cooldown_minutes: arc4.UInt16   # Minimum time between executions
    
    # Trigger Configuration
    trigger: TriggerData            # Trigger conditions
    
    # Execution Tracking
    last_execution_timestamp: arc4.UInt64  # Unix timestamp of last execution
    total_executions: arc4.UInt32   # Number of times executed
    total_spent_microalgos: arc4.UInt64  # Total ALGO spent
    
    # Metadata
    created_at: arc4.UInt64         # Creation timestamp


class AutoPilotRuleContract(ARC4Contract):
    """
    AutoPilot Rule Engine for automated trading strategies
    
    Enables users to create automated trading rules that execute
    when specific market conditions are met.
    """
    
    def __init__(self) -> None:
        """Initialize contract state"""
        self.rule_counter = UInt64(0)
        self.total_executions = UInt64(0)
        self.protocol_fee_bps = UInt64(10)  # 0.1% protocol fee
        self.protocol_treasury = Global.creator_address
        self.is_paused = False
    
    @arc4.abimethod(create="require")
    def create_application(self) -> arc4.String:
        """Initialize the contract on creation"""
        return arc4.String("AutoPilot Rule Contract v1.0")
    
    @arc4.abimethod
    def create_rule(
        self,
        rule_type: arc4.UInt8,
        target_assets: arc4.DynamicArray[arc4.UInt64],
        rotate_top_n: arc4.UInt8,
        max_spend_microalgos: arc4.UInt64,
        max_slippage_bps: arc4.UInt16,
        cooldown_minutes: arc4.UInt16,
        trigger_type: arc4.UInt8,
        threshold_bps: arc4.UInt16,
        window_hours: arc4.UInt16,
        payment: gtxn.PaymentTransaction,
    ) -> arc4.UInt64:
        """
        Create a new AutoPilot rule
        
        Args:
            rule_type: 1=DCA, 2=REBALANCE, 3=ROTATE
            target_assets: Asset IDs to trade
            rotate_top_n: For ROTATE: top N assets
            max_spend_microalgos: Max spend per execution
            max_slippage_bps: Max slippage in basis points
            cooldown_minutes: Cooldown period between executions
            trigger_type: 1=price_drop, 2=trend, 3=momentum
            threshold_bps: Trigger threshold in basis points
            window_hours: Time window for trend/momentum triggers
            payment: Payment to cover box storage costs
        
        Returns:
            rule_id: Unique identifier for the created rule
        """
        
        # Validations
        assert not self.is_paused, "Contract is paused"
        assert rule_type.native <= 3, "Invalid rule type"
        assert target_assets.length > 0, "Must have target assets"
        assert max_spend_microalgos.native > 0, "Max spend must be > 0"
        assert max_slippage_bps.native <= MAX_SLIPPAGE_BPS, "Slippage too high (max 50%)"
        assert cooldown_minutes.native >= MIN_COOLDOWN_MINUTES, "Cooldown too short (min 5 minutes)"
        assert trigger_type.native <= 3, "Invalid trigger type"
        
        # Verify payment for box storage
        # Box size varies based on number of target assets
        # Minimum: ~100 bytes for 1 asset = 2,500 + (100 * 400) = 42,500 microALGOs
        # We require 0.165 ALGO (165,000 microALGOs) to cover up to ~400 bytes
        min_payment = UInt64(165000)
        assert payment.receiver == Global.current_application_address, "Payment must be to contract"
        assert payment.amount >= min_payment, "Insufficient payment for box storage"
        
        # Increment rule counter
        self.rule_counter += 1
        rule_id = self.rule_counter
        
        # Create trigger data
        trigger = TriggerData(
            trigger_type=trigger_type,
            threshold_bps=threshold_bps,
            window_hours=window_hours,
            lookback_days=arc4.UInt8(0),
        )
        
        # Create rule data
        rule = RuleData(
            rule_id=arc4.UInt64(rule_id),
            owner=arc4.Address(Txn.sender),
            rule_type=rule_type,
            status=arc4.UInt8(STATUS_ACTIVE),
            target_assets=target_assets.copy(),
            rotate_top_n=rotate_top_n,
            max_spend_microalgos=max_spend_microalgos,
            max_slippage_bps=max_slippage_bps,
            cooldown_minutes=cooldown_minutes,
            trigger=trigger.copy(),
            last_execution_timestamp=arc4.UInt64(0),
            total_executions=arc4.UInt32(0),
            total_spent_microalgos=arc4.UInt64(0),
            created_at=arc4.UInt64(Global.latest_timestamp),
        )
        
        # Store in box (key: owner address + rule_id)
        box_key = Txn.sender.bytes + op.itob(rule_id)
        # Create box with exact size needed for the serialized rule data
        rule_bytes = rule.bytes
        op.Box.create(box_key, rule_bytes.length)
        op.Box.put(box_key, rule_bytes)
        
        # Log creation event
        log(b"RuleCreated", op.itob(rule_id), Txn.sender.bytes)
        
        return arc4.UInt64(rule_id)
    
    @arc4.abimethod
    def execute_rule(
        self,
        rule_id: arc4.UInt64,
        owner: arc4.Address,
        asset_in: Asset,
        asset_out: Asset,
        amount_in: arc4.UInt64,
        min_amount_out: arc4.UInt64,
        swap_router_app: Application,
        pool_app: Application,
    ) -> arc4.UInt64:
        """
        Execute an AutoPilot rule
        
        This method executes a single swap for the rule. For multiple assets,
        this should be called multiple times (can be grouped).
        
        Expected atomic group:
        [0] Payment/AssetTransfer from user to this contract (asset_in)
        [1] App call to this method
        
        Args:
            rule_id: Rule to execute
            owner: Rule owner address
            asset_in: Asset to swap from (typically ALGO)
            asset_out: Asset to swap to
            amount_in: Amount to swap
            min_amount_out: Minimum output (slippage protection)
            swap_router_app: DEX adapter application ID (Tinyman/Pact adapter)
            pool_app: DEX pool application ID
        
        Returns:
            amount_spent: Amount of asset_in spent
        """
        
        # Verify atomic group structure
        assert Global.group_size == UInt64(2), "Invalid group size (expected 2)"
        
        # Verify first transaction is payment/transfer of input asset
        if asset_in.id == UInt64(0):
            # ALGO swap - expect payment transaction
            assert gtxn.Transaction(0).type == TransactionType.Payment, "First txn must be payment for ALGO"
            assert gtxn.PaymentTransaction(0).receiver == Global.current_application_address, "Must send ALGO to contract"
            actual_amount = gtxn.PaymentTransaction(0).amount
        else:
            # ASA swap - expect asset transfer
            assert gtxn.Transaction(0).type == TransactionType.AssetTransfer, "First txn must be asset transfer"
            assert gtxn.AssetTransferTransaction(0).xfer_asset == asset_in, "Wrong input asset"
            assert gtxn.AssetTransferTransaction(0).asset_receiver == Global.current_application_address, "Must send to contract"
            actual_amount = gtxn.AssetTransferTransaction(0).asset_amount
        
        # Verify amount matches
        assert actual_amount == amount_in.native, "Amount mismatch"
        
        # Load rule from box storage
        box_key = owner.bytes + op.itob(rule_id.native)
        assert op.Box.length(box_key), "Rule not found"
        
        rule_bytes, exists = op.Box.get(box_key)
        assert exists, "Rule not found"
        rule = RuleData.from_bytes(rule_bytes)
        
        # Validations
        assert not self.is_paused, "Contract is paused"
        assert rule.status.native == STATUS_ACTIVE, "Rule not active"
        
        # Check cooldown period
        time_since_last = Global.latest_timestamp - rule.last_execution_timestamp.native
        cooldown_seconds = rule.cooldown_minutes.native * UInt64(60)
        assert time_since_last >= cooldown_seconds, "Cooldown period not met"
        
        # Verify caller is authorized (owner or contract)
        assert Txn.sender == owner.native or Txn.sender == Global.current_application_address, "Unauthorized"
        
        # Verify spend limit
        assert amount_in.native <= rule.max_spend_microalgos.native, "Exceeds max spend limit"
        
        # Calculate minimum output with slippage
        # min_out should already be calculated by caller, but we verify it's within limits
        max_slippage = rule.max_slippage_bps.native
        
        # Execute the swap by calling the DEX adapter
        # We use the swap_router_app as the adapter (Tinyman/Pact adapter)
        amount_spent = self._execute_swap_inner(
            asset_in=asset_in,
            asset_out=asset_out,
            amount_in=amount_in.native,
            min_amount_out=min_amount_out.native,
            adapter_app_id=swap_router_app,
            pool_app_id=pool_app,
        )
        
        # Update rule statistics
        rule.last_execution_timestamp = arc4.UInt64(Global.latest_timestamp)
        rule.total_executions = arc4.UInt32(rule.total_executions.native + UInt64(1))
        rule.total_spent_microalgos = arc4.UInt64(
            rule.total_spent_microalgos.native + amount_spent
        )
        
        # Save updated rule
        op.Box.put(box_key, rule.bytes)
        
        # Increment global execution counter
        self.total_executions += 1
        
        # Log execution
        log(b"RuleExecuted", op.itob(rule_id.native), op.itob(amount_spent))
        
        return arc4.UInt64(amount_spent)
    
    @arc4.abimethod
    def update_rule_status(
        self,
        rule_id: arc4.UInt64,
        new_status: arc4.UInt8,
    ) -> None:
        """
        Pause, resume, or cancel a rule
        
        Args:
            rule_id: Rule to update
            new_status: 1=active, 2=paused, 3=cancelled
        
        Only rule owner can update status.
        Cancelled rules cannot be reactivated.
        """
        
        # Load rule
        box_key = Txn.sender.bytes + op.itob(rule_id.native)
        assert op.Box.length(box_key), "Rule not found"
        
        rule_bytes, exists = op.Box.get(box_key)
        assert exists, "Rule not found"
        rule = RuleData.from_bytes(rule_bytes)
        
        # Validate
        assert rule.owner.native == Txn.sender, "Not rule owner"
        assert new_status.native <= STATUS_CANCELLED, "Invalid status"
        assert rule.status.native != STATUS_CANCELLED, "Cannot modify cancelled rule"
        
        # Update status
        rule.status = new_status
        op.Box.put(box_key, rule.bytes)
        
        # Log
        log(b"RuleStatusUpdated", op.itob(rule_id.native), op.itob(new_status.native))
    
    @arc4.abimethod
    def update_rule_parameters(
        self,
        rule_id: arc4.UInt64,
        max_spend_microalgos: arc4.UInt64,
        max_slippage_bps: arc4.UInt16,
        cooldown_minutes: arc4.UInt16,
    ) -> None:
        """
        Update rule risk parameters
        
        Args:
            rule_id: Rule to update
            max_spend_microalgos: New max spend limit
            max_slippage_bps: New max slippage
            cooldown_minutes: New cooldown period
        
        Only rule owner can update parameters.
        """
        
        # Load rule
        box_key = Txn.sender.bytes + op.itob(rule_id.native)
        assert op.Box.length(box_key), "Rule not found"
        
        rule_bytes, exists = op.Box.get(box_key)
        assert exists, "Rule not found"
        rule = RuleData.from_bytes(rule_bytes)
        
        # Validate
        assert rule.owner.native == Txn.sender, "Not rule owner"
        assert max_spend_microalgos.native > 0, "Max spend must be > 0"
        assert max_slippage_bps.native <= MAX_SLIPPAGE_BPS, "Slippage too high"
        assert cooldown_minutes.native >= MIN_COOLDOWN_MINUTES, "Cooldown too short"
        
        # Update parameters
        rule.max_spend_microalgos = max_spend_microalgos
        rule.max_slippage_bps = max_slippage_bps
        rule.cooldown_minutes = cooldown_minutes
        
        op.Box.put(box_key, rule.bytes)
        
        # Log
        log(b"RuleParametersUpdated", op.itob(rule_id.native))
    
    @arc4.abimethod
    def delete_rule(
        self,
        rule_id: arc4.UInt64,
    ) -> None:
        """
        Delete a rule and reclaim box storage MBR
        
        Args:
            rule_id: Rule to delete
        
        Only rule owner can delete.
        Sends box storage MBR back to owner.
        """
        
        # Load rule first to verify ownership
        box_key = Txn.sender.bytes + op.itob(rule_id.native)
        assert op.Box.length(box_key), "Rule not found"
        
        rule_bytes, exists = op.Box.get(box_key)
        assert exists, "Rule not found"
        rule = RuleData.from_bytes(rule_bytes)
        
        assert rule.owner.native == Txn.sender, "Not rule owner"
        
        # Delete box and return MBR to owner
        box_size = UInt64(512)  # Fixed box size from creation
        box_mbr = box_size * UInt64(400) + UInt64(2500)
        
        # Delete box
        deleted = op.Box.delete(box_key)
        assert deleted, "Failed to delete box"
        
        # Return MBR to owner
        itxn.Payment(
            receiver=Txn.sender,
            amount=box_mbr,
            fee=UInt64(0),
        ).submit()
        
        # Log
        log(b"RuleDeleted", op.itob(rule_id.native))
    
    @arc4.abimethod(readonly=True)
    def get_rule(
        self,
        rule_id: arc4.UInt64,
        owner: arc4.Address,
    ) -> RuleData:
        """
        Retrieve rule details
        
        Args:
            rule_id: Rule ID to fetch
            owner: Rule owner address
        
        Returns:
            Complete rule configuration
        """
        
        box_key = owner.bytes + op.itob(rule_id.native)
        assert op.Box.length(box_key), "Rule not found"
        
        rule_bytes, exists = op.Box.get(box_key)
        assert exists, "Rule not found"
        return RuleData.from_bytes(rule_bytes)
    
    @arc4.abimethod(readonly=True)
    def get_rule_stats(
        self,
        rule_id: arc4.UInt64,
        owner: arc4.Address,
    ) -> arc4.Tuple[arc4.UInt32, arc4.UInt64, arc4.UInt64]:
        """
        Get rule execution statistics
        
        Args:
            rule_id: Rule ID
            owner: Rule owner address
        
        Returns:
            Tuple of (total_executions, total_spent, last_execution_timestamp)
        """
        
        box_key = owner.bytes + op.itob(rule_id.native)
        assert op.Box.length(box_key), "Rule not found"
        
        rule_bytes, exists = op.Box.get(box_key)
        assert exists, "Rule not found"
        rule = RuleData.from_bytes(rule_bytes)
        
        return arc4.Tuple((
            rule.total_executions,
            rule.total_spent_microalgos,
            rule.last_execution_timestamp,
        ))
    
    @arc4.abimethod
    def set_protocol_fee(
        self,
        new_fee_bps: arc4.UInt16,
    ) -> None:
        """
        Update protocol fee (admin only)
        
        Args:
            new_fee_bps: New fee in basis points (max 1% = 100 bps)
        """
        
        assert Txn.sender == self.protocol_treasury, "Only admin"
        assert new_fee_bps.native <= 100, "Fee too high (max 1%)"
        
        self.protocol_fee_bps = new_fee_bps.native
        log(b"ProtocolFeeUpdated", op.itob(new_fee_bps.native))
    
    @arc4.abimethod
    def opt_in_asset(
        self,
        asset: Asset,
    ) -> None:
        """
        Opt the contract into an asset (admin only)
        
        This is required before the contract can receive and hold ASAs
        
        Args:
            asset: The asset to opt into
        """
        
        assert Txn.sender == self.protocol_treasury, "Only admin"
        
        # Opt-in via inner transaction (transfer 0 to self)
        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_receiver=Global.current_application_address,
            asset_amount=UInt64(0),
            fee=UInt64(0),
        ).submit()
        
        log(b"AssetOptIn", op.itob(asset.id))
    
    @arc4.abimethod
    def set_pause(
        self,
        paused: arc4.Bool,
    ) -> None:
        """
        Emergency pause/unpause (admin only)
        
        Args:
            paused: True to pause, False to unpause
        """
        
        assert Txn.sender == self.protocol_treasury, "Only admin"
        self.is_paused = paused.native
        
        log(b"PauseUpdated", op.itob(UInt64(1) if paused.native else UInt64(0)))
    
    @arc4.baremethod(allow_actions=["NoOp"], create="disallow")
    def opt_in_asset_bare(self) -> None:
        """Bare method to opt the contract into a single ASA.

        Usage pattern (atomic group size 1):
            ApplicationCall (NoOp) with no app_args and foreign_assets=[asset_id]

        This avoids ARC4 method selector issues and lets the admin opt-in quickly.
        """
        # Only protocol treasury (admin) can perform asset opt-ins
        assert Txn.sender == self.protocol_treasury, "Only admin"
        # Must supply exactly one foreign asset in the call
        assert Txn.num_assets == UInt64(1), "Provide exactly one asset"
        asset_ref = Txn.assets(0)
        # Inner 0-amount transfer to self performs opt-in
        itxn.AssetTransfer(
            xfer_asset=asset_ref,
            asset_receiver=Global.current_application_address,
            asset_amount=UInt64(0),
            fee=UInt64(0),
        ).submit()
        log(b"AssetOptIn", op.itob(asset_ref.id))

    @subroutine
    def _execute_swap_inner(
        self,
        asset_in: Asset,
        asset_out: Asset,
        amount_in: UInt64,
        min_amount_out: UInt64,
        adapter_app_id: Application,
        pool_app_id: Application,
    ) -> UInt64:
        """
        Execute a swap using inner transactions via DEX adapter
        
        This calls the TinymanPoolAdapter (or PactPoolAdapter) to perform the actual swap.
        
        Args:
            asset_in: Asset to swap from
            asset_out: Asset to swap to
            amount_in: Amount to swap
            min_amount_out: Minimum output (slippage protection)
            adapter_app_id: The DEX adapter contract (Tinyman/Pact)
            pool_app_id: The DEX pool application ID
            
        Returns:
            Amount of asset_in actually spent
        """
        
        # Check if we're swapping from ALGO (asset ID 0)
        if asset_in.id == UInt64(0):
            # For ALGO swaps, we need to send a payment transaction
            # Transfer ALGO to adapter contract
            itxn.Payment(
                receiver=adapter_app_id.address,
                amount=amount_in,
                fee=UInt64(0),
            ).submit()
        else:
            # For ASA swaps, transfer the asset to adapter
            itxn.AssetTransfer(
                xfer_asset=asset_in,
                asset_receiver=adapter_app_id.address,
                asset_amount=amount_in,
                fee=UInt64(0),
            ).submit()
        
        # Call adapter's swap_fixed_input method
        # Method signature: "swap_fixed_input(uint64,uint64,uint64,uint64,uint64)uint64"
        # ABI selector for this method
        swap_method = Bytes.from_hex("0f2f6f7f")
        
        result = itxn.ApplicationCall(
            app_id=adapter_app_id,
            app_args=(
                swap_method,
                op.itob(pool_app_id.id),
                op.itob(asset_in.id),
                op.itob(asset_out.id),
                op.itob(amount_in),
                op.itob(min_amount_out),
            ),
            fee=UInt64(0),
        ).submit()
        
        # Extract output amount from adapter's return value
        output_bytes = result.last_log
        output_amount = op.btoi(output_bytes)
        
        # Verify minimum output was met
        assert output_amount >= min_amount_out, "Output below minimum (slippage exceeded)"
        
        # Transfer received assets from adapter back to this contract
        itxn.AssetTransfer(
            xfer_asset=asset_out,
            asset_sender=adapter_app_id.address,
            asset_receiver=Global.current_application_address,
            asset_amount=output_amount,
            fee=UInt64(0),
        ).submit()
        
        # Return the amount spent (which is the input amount for fixed-input swaps)
        return amount_in
    
    @arc4.abimethod(readonly=True)
    def get_contract_stats(self) -> arc4.Tuple[arc4.UInt64, arc4.UInt64, arc4.UInt16]:
        """
        Get global contract statistics
        
        Returns:
            Tuple of (total_rules_created, total_executions, protocol_fee_bps)
        """
        
        return arc4.Tuple((
            arc4.UInt64(self.rule_counter),
            arc4.UInt64(self.total_executions),
            arc4.UInt16(self.protocol_fee_bps),
        ))

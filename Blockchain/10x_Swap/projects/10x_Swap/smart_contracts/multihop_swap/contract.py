from algopy import (
    ARC4Contract,
    Asset,
    Txn,
    Global,
    gtxn,
    itxn,
    UInt64,
    Bytes,
    Account,
    Application,
    op,
    subroutine,
)
from algopy.arc4 import abimethod, Address, String, UInt64 as ARC4UInt64, Bool, DynamicArray

class MultihopSwapRouter(ARC4Contract):
    """
    Multihop Swap Router Contract
    
    This contract enables atomic swaps across multiple DEX pools
    by routing through the optimal path determined off-chain.
    """
    
    @abimethod(create="require")
    def create_application(self) -> String:
        """Initialize the contract on creation"""
        return String("Multihop Swap Router Initialized")
    
    @abimethod
    def execute_swap_2hop(
        self,
        input_asset: Asset,
        intermediate_asset: Asset,
        output_asset: Asset,
        pool1_app_id: Application,
        pool2_app_id: Application,
        min_output: UInt64,
        receiver: Account,
    ) -> ARC4UInt64:
        """
        Execute a 2-hop swap: Input -> Intermediate -> Output
        
        Args:
            input_asset: The asset being swapped from
            intermediate_asset: The intermediate asset in the path
            output_asset: The final output asset
            pool1_app_id: Application ID of first DEX pool
            pool2_app_id: Application ID of second DEX pool
            min_output: Minimum acceptable output amount (slippage protection)
            receiver: Account to receive the final output
            
        Returns:
            Final output amount received
        """
        
        # Verify atomic group structure
        # Expected: [Payment of input asset, App call to this contract]
        assert Global.group_size == UInt64(2), "Invalid group size"
        assert gtxn.Transaction(0).type == op.TransactionType.AssetTransfer, "First txn must be asset transfer"
        assert gtxn.AssetTransferTransaction(0).xfer_asset == input_asset, "Wrong input asset"
        assert gtxn.AssetTransferTransaction(0).asset_receiver == Global.current_application_address, "Must send to contract"
        
        # Get input amount from the grouped transaction
        input_amount = gtxn.AssetTransferTransaction(0).asset_amount
        
        # Execute first hop: Input -> Intermediate
        intermediate_amount = self._swap_on_pool(
            pool_app_id=pool1_app_id,
            asset_in=input_asset,
            asset_out=intermediate_asset,
            amount_in=input_amount,
        )
        
        # Execute second hop: Intermediate -> Output
        output_amount = self._swap_on_pool(
            pool_app_id=pool2_app_id,
            asset_in=intermediate_asset,
            asset_out=output_asset,
            amount_in=intermediate_amount,
        )
        
        # Verify minimum output (slippage protection)
        assert output_amount >= min_output, "Output below minimum (slippage exceeded)"
        
        # Transfer final output to receiver
        itxn.AssetTransfer(
            xfer_asset=output_asset,
            asset_receiver=receiver,
            asset_amount=output_amount,
            fee=UInt64(0),  # Fee pooling - outer txn pays
        ).submit()
        
        return ARC4UInt64(output_amount)
    
    @abimethod
    def execute_swap_3hop(
        self,
        input_asset: Asset,
        intermediate1_asset: Asset,
        intermediate2_asset: Asset,
        output_asset: Asset,
        pool1_app_id: Application,
        pool2_app_id: Application,
        pool3_app_id: Application,
        min_output: UInt64,
        receiver: Account,
    ) -> ARC4UInt64:
        """
        Execute a 3-hop swap: Input -> Int1 -> Int2 -> Output
        
        Similar to 2-hop but with an additional intermediate step
        """
        
        assert Global.group_size == UInt64(2), "Invalid group size"
        assert gtxn.Transaction(0).type == op.TransactionType.AssetTransfer, "First txn must be asset transfer"
        assert gtxn.AssetTransferTransaction(0).xfer_asset == input_asset, "Wrong input asset"
        
        input_amount = gtxn.AssetTransferTransaction(0).asset_amount
        
        # Hop 1: Input -> Intermediate1
        intermediate1_amount = self._swap_on_pool(
            pool_app_id=pool1_app_id,
            asset_in=input_asset,
            asset_out=intermediate1_asset,
            amount_in=input_amount,
        )
        
        # Hop 2: Intermediate1 -> Intermediate2
        intermediate2_amount = self._swap_on_pool(
            pool_app_id=pool2_app_id,
            asset_in=intermediate1_asset,
            asset_out=intermediate2_asset,
            amount_in=intermediate1_amount,
        )
        
        # Hop 3: Intermediate2 -> Output
        output_amount = self._swap_on_pool(
            pool_app_id=pool3_app_id,
            asset_in=intermediate2_asset,
            asset_out=output_asset,
            amount_in=intermediate2_amount,
        )
        
        assert output_amount >= min_output, "Output below minimum"
        
        # Transfer to receiver
        itxn.AssetTransfer(
            xfer_asset=output_asset,
            asset_receiver=receiver,
            asset_amount=output_amount,
            fee=UInt64(0),
        ).submit()
        
        return ARC4UInt64(output_amount)
    
    @abimethod
    def execute_swap_algo_to_asa(
        self,
        output_asset: Asset,
        pool_app_id: Application,
        min_output: UInt64,
        receiver: Account,
    ) -> ARC4UInt64:
        """
        Execute single-hop swap from ALGO to ASA
        
        Special case handling for ALGO (asset ID 0)
        """
        
        assert Global.group_size == UInt64(2), "Invalid group size"
        assert gtxn.Transaction(0).type == op.TransactionType.Payment, "First txn must be payment"
        assert gtxn.PaymentTransaction(0).receiver == Global.current_application_address, "Must send to contract"
        
        algo_amount = gtxn.PaymentTransaction(0).amount
        
        # Call pool to swap ALGO for ASA
        # This uses a payment inner transaction
        output_amount = self._swap_algo_for_asa(
            pool_app_id=pool_app_id,
            algo_amount=algo_amount,
            output_asset=output_asset,
        )
        
        assert output_amount >= min_output, "Output below minimum"
        
        # Transfer output to receiver
        itxn.AssetTransfer(
            xfer_asset=output_asset,
            asset_receiver=receiver,
            asset_amount=output_amount,
            fee=UInt64(0),
        ).submit()
        
        return ARC4UInt64(output_amount)
    
    @subroutine
    def _swap_on_pool(
        self,
        pool_app_id: Application,
        asset_in: Asset,
        asset_out: Asset,
        amount_in: UInt64,
    ) -> UInt64:
        """
        Execute a swap on a DEX pool using inner transactions
        
        This is a generic adapter that works with Tinyman-style pools.
        For production, you may need pool-specific adapters.
        """
        
        # Get contract balance before swap
        balance_before = op.balance(Global.current_application_address, asset_out)
        
        # Build inner transaction group for swap
        # 1. Transfer input asset to pool
        itxn.AssetTransfer(
            xfer_asset=asset_in,
            asset_receiver=Application(pool_app_id).address,
            asset_amount=amount_in,
            fee=UInt64(0),
        ).submit()
        
        # 2. Call pool's swap method
        # Note: This is simplified - real implementation needs proper ABI encoding
        itxn.ApplicationCall(
            app_id=pool_app_id,
            app_args=(Bytes(b"swap"),),  # Method selector for swap
            fee=UInt64(0),
        ).submit()
        
        # Get contract balance after swap
        balance_after = op.balance(Global.current_application_address, asset_out)
        
        # Calculate output amount
        output_amount = balance_after - balance_before
        
        return output_amount
    
    @subroutine
    def _swap_algo_for_asa(
        self,
        pool_app_id: Application,
        algo_amount: UInt64,
        output_asset: Asset,
    ) -> UInt64:
        """
        Swap ALGO for ASA on a pool
        """
        
        balance_before = op.balance(Global.current_application_address, output_asset)
        
        # Send ALGO to pool
        itxn.Payment(
            receiver=Application(pool_app_id).address,
            amount=algo_amount,
            fee=UInt64(0),
        ).submit()
        
        # Call pool swap
        itxn.ApplicationCall(
            app_id=pool_app_id,
            app_args=(Bytes(b"swap"),),
            fee=UInt64(0),
        ).submit()
        
        balance_after = op.balance(Global.current_application_address, output_asset)
        
        return balance_after - balance_before
    
    @abimethod
    def opt_into_asset(self, asset: Asset) -> Bool:
        """
        Opt the contract into an asset to hold it
        
        Must be called before the contract can receive any ASA
        """
        
        # Only allow opt-in from contract creator (for security)
        assert Txn.sender == Global.creator_address, "Only creator can opt-in"
        
        # Send 0-amount transfer to self to opt in
        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_receiver=Global.current_application_address,
            asset_amount=UInt64(0),
            fee=UInt64(0),
        ).submit()
        
        return Bool(True)
    
    @abimethod
    def withdraw_asset(
        self,
        asset: Asset,
        amount: UInt64,
        receiver: Account,
    ) -> Bool:
        """
        Emergency withdrawal function (only creator)
        
        Allows contract creator to recover stuck funds
        """
        
        assert Txn.sender == Global.creator_address, "Only creator can withdraw"
        
        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_receiver=receiver,
            asset_amount=amount,
            fee=UInt64(0),
        ).submit()
        
        return Bool(True)
    
    @abimethod
    def withdraw_algo(
        self,
        amount: UInt64,
        receiver: Account,
    ) -> Bool:
        """
        Emergency withdrawal of ALGO (only creator)
        """
        
        assert Txn.sender == Global.creator_address, "Only creator can withdraw"
        
        itxn.Payment(
            receiver=receiver,
            amount=amount,
            fee=UInt64(0),
        ).submit()
        
        return Bool(True)

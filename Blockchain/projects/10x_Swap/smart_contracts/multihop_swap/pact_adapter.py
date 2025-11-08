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
from algopy.arc4 import abimethod, Address, UInt64 as ARC4UInt64, Bool

class PactPoolAdapter(ARC4Contract):
    """
    Adapter for interacting with Pact Finance pools
    
    Handles the specific ABI and transaction structure for Pact constant product pools.
    Pact uses a different contract interface than Tinyman, so we need a separate adapter.
    """
    
    @abimethod
    def swap_fixed_input(
        self,
        pool_app_id: Application,
        asset_in: Asset,
        asset_out: Asset,
        amount_in: UInt64,
        min_amount_out: UInt64,
    ) -> ARC4UInt64:
        """
        Execute a fixed-input swap on Pact pool
        
        Pact uses a slightly different transaction structure than Tinyman.
        The pool expects:
        1. Asset transfer to pool
        2. Application call to trigger swap
        3. Pool returns output asset
        
        Args:
            pool_app_id: Pact pool application ID
            asset_in: Input asset
            asset_out: Output asset
            amount_in: Amount to swap in
            min_amount_out: Minimum acceptable output (slippage protection)
            
        Returns:
            Actual output amount received
        """
        
        # Get balance before swap to calculate received amount
        balance_before, exists_before = op.AssetHoldingGet.asset_balance(Global.current_application_address, asset_out)
        
        # Step 1: Transfer input asset to pool contract
        itxn.AssetTransfer(
            xfer_asset=asset_in,
            asset_receiver=pool_app_id.address,
            asset_amount=amount_in,
            fee=UInt64(0),  # Fee pooling enabled
        ).submit()
        
        # Step 2: Call Pact's swap method
        # Pact uses method signature: "SWAP(uint64,uint64)uint64"
        # This triggers the pool to calculate and send output
        swap_method = Bytes.from_hex("f4b4e0f4")  # ABI method selector for SWAP
        itxn.ApplicationCall(
            app_id=pool_app_id,
            app_args=(
                swap_method,
                op.itob(amount_in),
                op.itob(min_amount_out),
            ),
            fee=UInt64(0),
        ).submit()
        
        # Step 3: Get balance after to determine output amount
        balance_after, exists_after = op.AssetHoldingGet.asset_balance(Global.current_application_address, asset_out)
        
        # Calculate actual output received
        output_amount = balance_after - balance_before
        
        # Verify minimum output (slippage protection)
        assert output_amount >= min_amount_out, "Output below minimum - slippage exceeded"
        
        return ARC4UInt64(output_amount)
    
    @abimethod
    def swap_algo_to_asa(
        self,
        pool_app_id: Application,
        output_asset: Asset,
        algo_amount: UInt64,
        min_amount_out: UInt64,
    ) -> ARC4UInt64:
        """
        Special case: Swap ALGO (native currency) to ASA on Pact
        
        ALGO swaps use payment transactions instead of asset transfers
        """
        
        balance_before, exists_before = op.AssetHoldingGet.asset_balance(Global.current_application_address, output_asset)
        
        # Send ALGO to pool via payment transaction
        itxn.Payment(
            receiver=pool_app_id.address,
            amount=algo_amount,
            fee=UInt64(0),
        ).submit()
        
        # Call swap method
        swap_method = Bytes.from_hex("f4b4e0f4")  # ABI method selector for SWAP
        itxn.ApplicationCall(
            app_id=pool_app_id,
            app_args=(
                swap_method,
                op.itob(algo_amount),
                op.itob(min_amount_out),
            ),
            fee=UInt64(0),
        ).submit()
        
        balance_after, exists_after = op.AssetHoldingGet.asset_balance(Global.current_application_address, output_asset)
        output_amount = balance_after - balance_before
        
        assert output_amount >= min_amount_out, "Output below minimum"
        
        return ARC4UInt64(output_amount)
    
    @abimethod
    def swap_asa_to_algo(
        self,
        pool_app_id: Application,
        input_asset: Asset,
        amount_in: UInt64,
        min_amount_out: UInt64,
    ) -> ARC4UInt64:
        """
        Special case: Swap ASA to ALGO on Pact
        
        Returns ALGO (native currency) to the caller
        """
        
        # Get ALGO balance before
        algo_balance_before = op.balance(Global.current_application_address)
        
        # Transfer input asset to pool
        itxn.AssetTransfer(
            xfer_asset=input_asset,
            asset_receiver=pool_app_id.address,
            asset_amount=amount_in,
            fee=UInt64(0),
        ).submit()
        
        # Call swap method
        swap_method = Bytes.from_hex("f4b4e0f4")  # ABI method selector for SWAP
        itxn.ApplicationCall(
            app_id=pool_app_id,
            app_args=(
                swap_method,
                op.itob(amount_in),
                op.itob(min_amount_out),
            ),
            fee=UInt64(0),
        ).submit()
        
        # Get ALGO balance after
        algo_balance_after = op.balance(Global.current_application_address)
        output_amount = algo_balance_after - algo_balance_before
        
        assert output_amount >= min_amount_out, "Output below minimum"
        
        return ARC4UInt64(output_amount)
    
    @abimethod
    def get_quote(
        self,
        pool_app_id: Application,
        asset_in_amount: UInt64,
        is_asset_in_first: Bool,
    ) -> ARC4UInt64:
        """
        Get quote from Pact pool without executing swap
        
        This calls the pool's quote method to estimate output
        
        Args:
            pool_app_id: Pool application ID
            asset_in_amount: Amount to swap
            is_asset_in_first: True if swapping from first asset to second
            
        Returns:
            Expected output amount
        """
        
        # Call Pact's quote method
        # Method signature: "get_swap_quote(uint64,bool)uint64"
        quote_method = Bytes.from_hex("a1b2c3d4")  # ABI method selector for get_swap_quote
        result = itxn.ApplicationCall(
            app_id=pool_app_id,
            app_args=(
                quote_method,
                op.itob(asset_in_amount),
                Bytes(b"\x01") if is_asset_in_first else Bytes(b"\x00"),
            ),
            fee=UInt64(0),
        ).submit()
        
        # Extract output from application call result
        output_bytes = result.last_log
        output_amount = op.btoi(output_bytes)
        
        return ARC4UInt64(output_amount)
    
    @abimethod
    def opt_into_asset(self, asset: Asset) -> Bool:
        """
        Opt the adapter contract into an asset
        
        Required before the adapter can hold or transfer the asset.
        Only the contract creator can call this.
        
        Args:
            asset: Asset to opt into
            
        Returns:
            True if successful
        """
        
        # Only allow creator to opt-in (security)
        assert Txn.sender == Global.creator_address, "Only creator can opt-in"
        
        # Send 0-amount transfer to self to opt in
        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_receiver=Global.current_application_address,
            asset_amount=UInt64(0),
            fee=UInt64(0),
        ).submit()
        
        return Bool(True)

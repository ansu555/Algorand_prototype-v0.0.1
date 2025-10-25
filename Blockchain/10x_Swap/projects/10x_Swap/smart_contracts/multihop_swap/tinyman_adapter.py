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
    TransactionType,
    arc4,
)
from algopy.arc4 import abimethod, Address, UInt64 as ARC4UInt64, Bool

class TinymanPoolAdapter(ARC4Contract):
    """
    Adapter for interacting with Tinyman V2 pools
    
    Handles the specific ABI and transaction structure for Tinyman
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
        Execute a fixed-input swap on Tinyman pool
        
        Tinyman V2 uses ARC4 ABI methods
        """
        
        # Transfer input asset to pool
        itxn.AssetTransfer(
            xfer_asset=asset_in,
            asset_receiver=pool_app_id.address,
            asset_amount=amount_in,
            fee=UInt64(0),
        ).submit()
        
        # Get balance before
        balance_before = asset_out.balance(Global.current_application_address)
        
        # Call Tinyman's swap method via inner application call
        # Method signature: "swap(uint64,uint64)uint64"
        # Encode method selector and arguments
        method_selector = arc4.arc4_signature("swap(uint64,uint64)uint64")
        arg1 = arc4.UInt64(amount_in)
        arg2 = arc4.UInt64(min_amount_out)
        
        itxn.ApplicationCall(
            app_id=pool_app_id,
            app_args=(method_selector, arg1.bytes, arg2.bytes),
            fee=UInt64(0),
        ).submit()
        
        # Get balance after
        balance_after = asset_out.balance(Global.current_application_address)
        
        output_amount = balance_after - balance_before
        
        return ARC4UInt64(output_amount)

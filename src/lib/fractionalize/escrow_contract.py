"""
ARC-3 NFT Fractionalization Escrow Contract
PyTeal Smart Contract for secure NFT custody and fractional token distribution

This contract:
1. Locks the original ARC-3 NFT
2. Manages the distribution of ARC-20 fractional tokens
3. Handles purchases and redemptions
4. Ensures security and compliance with Algorand standards
"""

from pyteal import *


def approval_program():
    """Main approval program for fractionalization escrow"""
    
    # Global state keys
    key_nft_asset_id = Bytes("nft_id")
    key_fraction_token_id = Bytes("frac_id")
    key_total_fractions = Bytes("total_frac")
    key_fractions_sold = Bytes("frac_sold")
    key_fraction_price = Bytes("frac_price")
    key_creator = Bytes("creator")
    key_nft_locked = Bytes("nft_locked")
    
    # Initialize the escrow contract
    @Subroutine(TealType.none)
    def initialize():
        return Seq([
            # Store configuration
            App.globalPut(key_nft_asset_id, Txn.assets[0]),
            App.globalPut(key_fraction_token_id, Txn.assets[1]),
            App.globalPut(key_total_fractions, Btoi(Txn.application_args[0])),
            App.globalPut(key_fraction_price, Btoi(Txn.application_args[1])),
            App.globalPut(key_creator, Txn.sender()),
            App.globalPut(key_fractions_sold, Int(0)),
            App.globalPut(key_nft_locked, Int(0)),
            Approve(),
        ])
    
    # Lock the NFT in escrow
    @Subroutine(TealType.uint64)
    def lock_nft():
        return Seq([
            # Verify sender is creator
            Assert(Txn.sender() == App.globalGet(key_creator)),
            
            # Verify NFT hasn't been locked yet
            Assert(App.globalGet(key_nft_locked) == Int(0)),
            
            # Verify this is an asset transfer transaction
            Assert(Gtxn[1].type_enum() == TxnType.AssetTransfer),
            Assert(Gtxn[1].xfer_asset() == App.globalGet(key_nft_asset_id)),
            Assert(Gtxn[1].asset_amount() == Int(1)),
            Assert(Gtxn[1].asset_receiver() == Global.current_application_address()),
            
            # Mark NFT as locked
            App.globalPut(key_nft_locked, Int(1)),
            
            Return(Int(1)),
        ])
    
    # Purchase fractions
    @Subroutine(TealType.uint64)
    def purchase_fractions():
        amount = Btoi(Txn.application_args[1])
        total_cost = amount * App.globalGet(key_fraction_price)
        fractions_available = App.globalGet(key_total_fractions) - App.globalGet(key_fractions_sold)
        
        return Seq([
            # Verify NFT is locked
            Assert(App.globalGet(key_nft_locked) == Int(1)),
            
            # Verify enough fractions available
            Assert(amount <= fractions_available),
            Assert(amount > Int(0)),
            
            # Verify payment transaction
            Assert(Gtxn[1].type_enum() == TxnType.Payment),
            Assert(Gtxn[1].amount() == total_cost),
            Assert(Gtxn[1].receiver() == Global.current_application_address()),
            
            # Transfer fractional tokens to buyer
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: App.globalGet(key_fraction_token_id),
                TxnField.asset_amount: amount,
                TxnField.asset_receiver: Txn.sender(),
            }),
            InnerTxnBuilder.Submit(),
            
            # Update fractions sold count
            App.globalPut(key_fractions_sold, App.globalGet(key_fractions_sold) + amount),
            
            Return(Int(1)),
        ])
    
    # Redeem NFT (if user owns all fractions)
    @Subroutine(TealType.uint64)
    def redeem_nft():
        return Seq([
            # Verify NFT is locked
            Assert(App.globalGet(key_nft_locked) == Int(1)),
            
            # Verify caller owns all fractional tokens
            # In production, this would check actual token balance
            Assert(Gtxn[1].type_enum() == TxnType.AssetTransfer),
            Assert(Gtxn[1].xfer_asset() == App.globalGet(key_fraction_token_id)),
            Assert(Gtxn[1].asset_amount() == App.globalGet(key_total_fractions)),
            Assert(Gtxn[1].asset_receiver() == Global.current_application_address()),
            
            # Transfer NFT back to redeemer
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: App.globalGet(key_nft_asset_id),
                TxnField.asset_amount: Int(1),
                TxnField.asset_receiver: Txn.sender(),
            }),
            InnerTxnBuilder.Submit(),
            
            # Mark as redeemed
            App.globalPut(key_nft_locked, Int(0)),
            
            Return(Int(1)),
        ])
    
    # Main router
    on_creation = Seq([
        initialize(),
        Return(Int(1)),
    ])
    
    on_call_method = Txn.application_args[0]
    
    on_call = Cond(
        [on_call_method == Bytes("lock"), lock_nft()],
        [on_call_method == Bytes("purchase"), purchase_fractions()],
        [on_call_method == Bytes("redeem"), redeem_nft()],
    )
    
    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.NoOp, on_call],
        [Txn.on_completion() == OnComplete.OptIn, Approve()],
        [Txn.on_completion() == OnComplete.CloseOut, Approve()],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Txn.sender() == Global.creator_address())],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Txn.sender() == Global.creator_address())],
    )
    
    return program


def clear_state_program():
    """Clear state program - always approve"""
    return Approve()


if __name__ == "__main__":
    # Compile the contract
    import sys
    import os
    
    # Set output directory
    output_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "artifacts", "fractionalize")
    os.makedirs(output_dir, exist_ok=True)
    
    # Compile approval program
    approval_teal = compileTeal(approval_program(), mode=Mode.Application, version=8)
    with open(os.path.join(output_dir, "escrow_approval.teal"), "w") as f:
        f.write(approval_teal)
    
    # Compile clear state program  
    clear_teal = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
    with open(os.path.join(output_dir, "escrow_clear.teal"), "w") as f:
        f.write(clear_teal)
    
    print("✅ Smart contract compiled successfully!")
    print(f"   Output: {output_dir}")

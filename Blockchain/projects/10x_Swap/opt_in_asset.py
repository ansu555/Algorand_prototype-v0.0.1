#!/usr/bin/env python3
"""
Opt-in to an Algorand asset
"""
import sys
from algosdk import mnemonic, account
from algosdk.v2client.algod import AlgodClient
from algosdk.transaction import AssetTransferTxn, wait_for_confirmation

def opt_in_asset(asset_id: int, user_mnemonic: str):
    """
    Opt-in to an asset

    Args:
        asset_id: The asset ID to opt-in to
        user_mnemonic: The user's 25-word mnemonic
    """
    # Connect to testnet
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    algod_client = AlgodClient(algod_token, algod_address)

    # Get account from mnemonic
    private_key = mnemonic.to_private_key(user_mnemonic)
    address = account.address_from_private_key(private_key)

    print(f"🔐 Opting in to asset {asset_id}")
    print(f"   Account: {address}")

    # Check account balance
    account_info = algod_client.account_info(address)
    balance = account_info.get('amount', 0) / 1_000_000
    print(f"   Balance: {balance:.6f} ALGO")

    # Check if already opted in
    assets = account_info.get('assets', [])
    for asset in assets:
        if asset['asset-id'] == asset_id:
            print(f"\n✅ Already opted in to asset {asset_id}")
            return

    # Get suggested params
    params = algod_client.suggested_params()

    # Create opt-in transaction (asset transfer of 0 to self)
    opt_in_txn = AssetTransferTxn(
        sender=address,
        sp=params,
        receiver=address,
        amt=0,
        index=asset_id
    )

    # Sign transaction
    signed_txn = opt_in_txn.sign(private_key)

    # Send transaction
    print(f"\n📤 Sending opt-in transaction...")
    tx_id = algod_client.send_transaction(signed_txn)
    print(f"   Transaction ID: {tx_id}")

    # Wait for confirmation
    print(f"⏳ Waiting for confirmation...")
    wait_for_confirmation(algod_client, tx_id, 4)

    print(f"\n✅ Successfully opted in to asset {asset_id}!")
    print(f"   View on AlgoExplorer: https://testnet.algoexplorer.io/asset/{asset_id}")


if __name__ == "__main__":
    # Hardcoded mnemonic (REMOVE BEFORE COMMITTING TO GIT!)
    user_mnemonic = "observe churn system canvas damage endorse leopard flag globe bar device west craft glide bridge angry brother salad stadium argue olive remove version about ship"

    # Get asset ID from command line or use default
    if len(sys.argv) > 1:
        asset_id = int(sys.argv[1])
    else:
        # Default to USDC testnet
        asset_id = 10458941

    opt_in_asset(asset_id, user_mnemonic)

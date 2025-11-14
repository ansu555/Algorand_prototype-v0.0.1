#!/usr/bin/env python3
"""
Opt the liquidity pool contract into assets
This must be done before the contract can receive those assets
"""
import sys
import os
from pathlib import Path
from algosdk import mnemonic, account
from algosdk.v2client.algod import AlgodClient
from algosdk.transaction import ApplicationCallTxn, OnComplete, AssetTransferTxn, wait_for_confirmation
from dotenv import load_dotenv

def opt_in_contract_to_asset(app_id: int, asset_id: int, creator_mnemonic: str):
    """
    Opt the contract into an asset by calling it from the creator account

    Args:
        app_id: The application ID of the pool contract
        asset_id: The asset ID to opt into
        creator_mnemonic: The creator's 25-word mnemonic
    """
    # Connect to testnet
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    algod_client = AlgodClient(algod_token, algod_address)

    # Get account from mnemonic
    private_key = mnemonic.to_private_key(creator_mnemonic)
    creator_address = account.address_from_private_key(private_key)

    print(f"🔐 Opting contract {app_id} into asset {asset_id}")
    print(f"   Creator: {creator_address}")

    # Get suggested params
    params = algod_client.suggested_params()

    # Increase fee to cover inner transaction (asset opt-in)
    params.fee = 2000  # 1000 for this txn + 1000 for inner opt-in txn
    params.flat_fee = True

    # Create application call to trigger asset opt-in
    # We'll use a payment of 0.1 ALGO to the contract to cover the opt-in cost
    from algosdk.transaction import PaymentTxn
    import algosdk

    app_address = algosdk.logic.get_application_address(app_id)

    # Send ALGO to contract for opt-in minimum balance
    funding_txn = PaymentTxn(
        sender=creator_address,
        sp=params,
        receiver=app_address,
        amt=100_000,  # 0.1 ALGO for opt-in
    )

    # Create inner transaction for asset opt-in
    # The contract needs to execute: AssetTransfer(asset_id, 0, contract_address)
    # But since we don't have a method for this, we need to call the contract
    # and have it create the opt-in as an inner transaction

    print(f"\n⚠️  Note: This contract doesn't have a dedicated opt-in method.")
    print(f"   You need to manually opt the contract into assets using a different approach.")
    print(f"   The contract should handle opt-ins in create_pool via inner transactions.")
    print(f"\n   However, the create_pool method doesn't seem to include opt-in logic.")
    print(f"   You may need to update the smart contract to include asset opt-ins.")

if __name__ == "__main__":
    # Load .env from project root
    env_path = Path(__file__).parent.parent.parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded environment from {env_path}")

    # Get app ID from environment
    app_id = int(os.getenv("POOL_APP_ID", "0"))
    if app_id == 0:
        print("❌ POOL_APP_ID not set in .env")
        sys.exit(1)

    # Get asset ID from command line
    if len(sys.argv) > 1:
        asset_id = int(sys.argv[1])
    else:
        print("Usage: python opt_in_contract_to_asset.py <asset_id>")
        print("Example: python opt_in_contract_to_asset.py 67395862")
        sys.exit(1)

    # Get creator mnemonic
    creator_mnemonic = os.getenv("DEPLOYER_MNEMONIC", "")
    if not creator_mnemonic:
        print("❌ DEPLOYER_MNEMONIC not set in .env")
        sys.exit(1)

    opt_in_contract_to_asset(app_id, asset_id, creator_mnemonic)

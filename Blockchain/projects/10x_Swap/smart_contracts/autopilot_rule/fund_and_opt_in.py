"""
Fund and opt-in AutoPilot contract to necessary assets
"""
import json
import os
from pathlib import Path
from algosdk import transaction, mnemonic
from algosdk.v2client import algod
from algosdk import account
from algosdk.encoding import decode_address
import algosdk

# Testnet assets
ASSETS_TO_OPT_IN = [
    10458941,  # USDC
    67396430,  # USDT
    70283957,  # ALGF
]

APP_ID = 749509231
APP_ADDRESS = "KO5JO5GWYY5TIY3NQJ3VHNKF6DZSVWGWHBJI55LSFPA5PYQXMGSGWIEGS4"

def fund_and_opt_in():
    # Connect to testnet
    algod_token = ""
    algod_server = "https://testnet-api.4160.nodely.dev"
    algod_client = algod.AlgodClient(algod_token, algod_server)
    
    # Load deployer account
    mnemonic_phrase = os.getenv("ALGORAND_MNEMONIC")
    if not mnemonic_phrase:
        mnemonic_phrase = input("Enter deployer mnemonic: ")
    deployer_private_key = mnemonic.to_private_key(mnemonic_phrase)
    deployer_address = account.address_from_private_key(deployer_private_key)
    
    print(f"\n💰 Funding contract {APP_ID}...")
    print(f"   From: {deployer_address}")

    deployer_info = algod_client.account_info(deployer_address)
    deployer_balance = deployer_info["amount"]
    deployer_min_balance = deployer_info["min-balance"]
    deployer_available = deployer_balance - deployer_min_balance

    contract_info = algod_client.account_info(APP_ADDRESS)
    contract_balance = contract_info["amount"]
    contract_min_balance = contract_info["min-balance"]
    contract_headroom = contract_balance - contract_min_balance

    print(f"   Deployer balance: {deployer_balance / 1_000_000:.3f} ALGO (min {deployer_min_balance / 1_000_000:.3f})")
    print(f"   Contract balance: {contract_balance / 1_000_000:.3f} ALGO (min {contract_min_balance / 1_000_000:.3f})")

    # Only top up the contract if it is within 0.5 ALGO of its minimum balance
    needs_top_up = contract_headroom < 500_000
    if needs_top_up and deployer_available > 150_000:
        fund_amount = min(1_000_000, deployer_available - 100_000)
        if fund_amount < 100_000:
            print("   ⚠️ Deployer does not have enough free balance to fund the contract. Skipping funding.")
        else:
            params = algod_client.suggested_params()
            funding_txn = transaction.PaymentTxn(
                sender=deployer_address,
                sp=params,
                receiver=APP_ADDRESS,
                amt=fund_amount,
            )

            signed_funding = funding_txn.sign(deployer_private_key)
            tx_id = algod_client.send_transaction(signed_funding)
            print(f"   Funding transaction: {tx_id} ({fund_amount / 1_000_000:.3f} ALGO)")
            transaction.wait_for_confirmation(algod_client, tx_id, 4)
            print(f"   ✅ Contract funded")
    else:
        print("   ℹ️ Funding skipped (either contract already has headroom or deployer lacks free balance)")
    
    # Now opt into each asset
    print(f"\n🔐 Opting contract into assets...")
    
    for asset_id in ASSETS_TO_OPT_IN:
        try:
            params = algod_client.suggested_params()
            # Bare app call must cover the inner opt-in fee itself
            params.flat_fee = True
            params.fee = max(params.min_fee * 2, 2000)
            # Bare method call: NO app_args (bare = no method selector)
            opt_in_txn = transaction.ApplicationNoOpTxn(
                sender=deployer_address,
                sp=params,
                index=APP_ID,
                foreign_assets=[asset_id],
            )
            signed_opt_in = opt_in_txn.sign(deployer_private_key)
            tx_id = algod_client.send_transaction(signed_opt_in)
            print(f"   Opting into asset {asset_id}... {tx_id}")
            transaction.wait_for_confirmation(algod_client, tx_id, 4)
            print(f"   ✅ Opted into asset {asset_id}")
        except Exception as e:
            print(f"   ❌ Error opting into asset {asset_id}: {str(e)}")
    
    print("\n✅ Contract setup complete!")
    print(f"   App ID: {APP_ID}")
    print(f"   App Address: {APP_ADDRESS}")

if __name__ == "__main__":
    fund_and_opt_in()

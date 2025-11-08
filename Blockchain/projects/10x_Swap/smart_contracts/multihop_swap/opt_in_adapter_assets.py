"""
Opt the Pact Adapter into required assets

This script opts the deployed adapter contract into the assets it needs to handle.
"""

from pathlib import Path
from algosdk.v2client import algod
from algosdk import mnemonic
from algosdk.account import address_from_private_key
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    AccountTransactionSigner,
    TransactionWithSigner,
)
from algosdk.abi import Contract
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env.local file
env_file = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(env_file)

# Configuration
PACT_ADAPTER_APP_ID = 749341932  # Updated with latest deployment

# Testnet asset IDs
ASSETS_TO_OPT_IN = [
    10458941,  # USDC on testnet
    # Add more asset IDs here as needed
]


def get_algod_client():
    """Get Algod client"""
    algod_address = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
    algod_token = os.getenv("ALGOD_TOKEN", "")
    return algod.AlgodClient(algod_token, algod_address)


def opt_into_assets():
    """Opt the adapter into required assets"""
    
    print("=" * 60)
    print("  🔐 OPTING ADAPTER INTO ASSETS")
    print("=" * 60)
    print()
    
    algod_client = get_algod_client()
    
    # Test connection
    try:
        status = algod_client.status()
        print(f"✅ Connected to Algorand network")
        print(f"   Last round: {status.get('last-round', 'N/A')}")
        print()
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return
    
    # Load deployer account from environment
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    
    if not deployer_mnemonic:
        print("❌ DEPLOYER_MNEMONIC not found in .env.local file")
        return
    
    try:
        private_key = mnemonic.to_private_key(deployer_mnemonic)
        deployer_address = address_from_private_key(private_key)
    except Exception as e:
        print(f"❌ Invalid mnemonic: {e}")
        return
    
    print(f"📍 Adapter App ID: {PACT_ADAPTER_APP_ID}")
    print(f"📍 Deployer: {deployer_address}")
    print(f"📋 Assets to opt-in: {ASSETS_TO_OPT_IN}")
    print()
    
    # Load the contract ABI from ARC56 (in root artifacts folder)
    # Path: Algorand_prototype-v0.0.1/artifacts/multihop_swap/
    # Go up: multihop_swap -> smart_contracts -> 10x_Swap -> projects -> Blockchain -> Algorand_prototype-v0.0.1
    arc56_path = Path(__file__).parent.parent.parent.parent.parent / "artifacts" / "multihop_swap" / "PactPoolAdapter.arc56.json"
    
    if not arc56_path.exists():
        print(f"❌ ARC56 file not found at: {arc56_path}")
        print(f"   Please compile the contract first and ensure artifacts are in:")
        print(f"   artifacts/multihop_swap/ (at project root)")
        return
    
    with open(arc56_path) as f:
        arc56_data = json.load(f)
    
    # Create ABI Contract from ARC56
    contract = Contract.from_json(json.dumps(arc56_data))
    
    # Create signer
    signer = AccountTransactionSigner(private_key)
    
    success_count = 0
    fail_count = 0
    
    for asset_id in ASSETS_TO_OPT_IN:
        try:
            print(f"🔄 Opting into asset {asset_id}...")
            
            # Create atomic transaction composer
            atc = AtomicTransactionComposer()
            
            # Get suggested params
            sp = algod_client.suggested_params()
            sp.flat_fee = True
            sp.fee = 2000  # 2000 microALGOs (2 txns: outer + inner)
            
            # Add the method call
            atc.add_method_call(
                app_id=PACT_ADAPTER_APP_ID,
                method=contract.get_method_by_name("opt_into_asset"),
                sender=deployer_address,
                sp=sp,
                signer=signer,
                method_args=[asset_id],
                foreign_assets=[asset_id],
            )
            
            # Execute
            result = atc.execute(algod_client, 4)
            
            txid = result.tx_ids[0]
            
            print(f"✅ Successfully opted into asset {asset_id}")
            print(f"   Transaction: {txid}")
            success_count += 1
            
        except Exception as e:
            print(f"⚠️  Failed to opt into asset {asset_id}: {e}")
            fail_count += 1
        
        print()
    
    print("=" * 60)
    print("  📊 SUMMARY")
    print("=" * 60)
    print(f"✅ Successful: {success_count}")
    print(f"❌ Failed: {fail_count}")
    print()
    
    if fail_count > 0:
        print("⚠️  Some assets failed to opt-in.")
        print("   This might be because the adapter contract needs")
        print("   an opt-in method implemented, or the assets don't exist.")
        print()
        print("   You may need to:")
        print("   1. Add an opt_into_asset() method to the adapter contract")
        print("   2. Or handle opt-ins differently based on your contract design")
    else:
        print("✅ All assets opted in successfully!")
    
    print()


if __name__ == "__main__":
    print()
    print("🔧 Pact Adapter Asset Opt-In Tool")
    print()
    opt_into_assets()

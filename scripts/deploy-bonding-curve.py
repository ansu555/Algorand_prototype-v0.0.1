"""
Deploy Bonding Curve Contract to TestNet
=========================================

This script compiles and deploys the bonding curve smart contract to Algorand TestNet.

Prerequisites:
- Python 3.9+ with pyteal and beaker installed
- AlgoKit CLI (optional, for easier deployment)
- TestNet account with ALGO

Usage:
  python scripts/deploy-bonding-curve.py
"""

import sys
import json
from pathlib import Path

# Add src to path for imports
sys.path.append(str(Path(__file__).parent.parent / "src"))

try:
    from lib.launchpad.contracts.bonding_curve import app
    from pyteal import compileTeal, Mode
    import algosdk
    from algosdk import transaction, account, mnemonic
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("\n📦 Install required packages:")
    print("   pip install pyteal beaker py-algorand-sdk")
    sys.exit(1)


# TestNet configuration
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""

# Initialize client
algod_client = algosdk.v2client.algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)


def compile_contract():
    """Compile PyTeal contract to TEAL"""
    print("🔨 Compiling bonding curve contract...")
    
    artifacts_dir = Path(__file__).parent.parent / "artifacts" / "launchpad"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    
    # Compile approval program
    approval_program = app.approval_program
    approval_teal = compileTeal(approval_program, mode=Mode.Application, version=8)
    
    approval_path = artifacts_dir / "bonding_curve_approval.teal"
    with open(approval_path, "w") as f:
        f.write(approval_teal)
    
    print(f"   ✅ Approval program: {approval_path}")
    
    # Compile clear program
    clear_program = app.clear_program
    clear_teal = compileTeal(clear_program, mode=Mode.Application, version=8)
    
    clear_path = artifacts_dir / "bonding_curve_clear.teal"
    with open(clear_path, "w") as f:
        f.write(clear_teal)
    
    print(f"   ✅ Clear program: {clear_path}")
    
    # Generate ABI JSON
    try:
        abi_spec = app.build().application_spec()
        abi_path = artifacts_dir / "bonding_curve_abi.json"
        
        with open(abi_path, "w") as f:
            json.dump(abi_spec, f, indent=2)
        
        print(f"   ✅ ABI specification: {abi_path}")
    except Exception as e:
        print(f"   ⚠️ Could not generate ABI: {e}")
    
    return approval_teal, clear_teal


def compile_teal_to_bytecode(teal_source: str) -> bytes:
    """Compile TEAL source to bytecode using algod"""
    print("   📝 Compiling TEAL to bytecode...")
    
    compile_response = algod_client.compile(teal_source)
    return algosdk.encoding.base64.b64decode(compile_response["result"])


def deploy_contract(creator_mnemonic: str):
    """Deploy contract to TestNet"""
    print("\n🚀 Deploying to Algorand TestNet...")
    
    # Load account from mnemonic
    private_key = mnemonic.to_private_key(creator_mnemonic)
    creator_address = account.address_from_private_key(private_key)
    
    print(f"   👤 Creator: {creator_address}")
    
    # Check balance
    account_info = algod_client.account_info(creator_address)
    balance = account_info.get("amount", 0) / 1_000_000  # Convert microALGO to ALGO
    
    print(f"   💰 Balance: {balance:.2f} ALGO")
    
    if balance < 1:
        print("   ❌ Insufficient balance. Need at least 1 ALGO for deployment.")
        print("   💧 Get TestNet ALGO from: https://bank.testnet.algorand.network/")
        return None
    
    # Compile programs
    approval_teal, clear_teal = compile_contract()
    approval_program = compile_teal_to_bytecode(approval_teal)
    clear_program = compile_teal_to_bytecode(clear_teal)
    
    # Get transaction params
    params = algod_client.suggested_params()
    
    # Define state schema
    local_ints = 5
    local_bytes = 0
    global_ints = 15
    global_bytes = 1
    
    global_schema = transaction.StateSchema(global_ints, global_bytes)
    local_schema = transaction.StateSchema(local_ints, local_bytes)
    
    # Create application transaction
    txn = transaction.ApplicationCreateTxn(
        sender=creator_address,
        sp=params,
        on_complete=transaction.OnComplete.NoOpOC,
        approval_program=approval_program,
        clear_program=clear_program,
        global_schema=global_schema,
        local_schema=local_schema,
    )
    
    # Sign transaction
    signed_txn = txn.sign(private_key)
    
    # Submit transaction
    print("   📤 Submitting transaction...")
    tx_id = algod_client.send_transaction(signed_txn)
    
    # Wait for confirmation
    print(f"   ⏳ Waiting for confirmation (txID: {tx_id})...")
    confirmed_txn = transaction.wait_for_confirmation(algod_client, tx_id, 4)
    
    # Get application ID
    app_id = confirmed_txn.get("application-index")
    app_address = algosdk.logic.get_application_address(app_id)
    
    print(f"\n✅ Contract deployed successfully!")
    print(f"   📝 App ID: {app_id}")
    print(f"   📍 App Address: {app_address}")
    print(f"   🔗 View on TestNet: https://testnet.algoexplorer.io/application/{app_id}")
    
    # Save deployment info
    deployment_info = {
        "app_id": app_id,
        "app_address": app_address,
        "creator_address": creator_address,
        "tx_id": tx_id,
        "network": "testnet",
        "deployed_at": confirmed_txn.get("confirmed-round"),
    }
    
    artifacts_dir = Path(__file__).parent.parent / "artifacts" / "launchpad"
    deployment_path = artifacts_dir / "deployment.json"
    
    with open(deployment_path, "w") as f:
        json.dump(deployment_info, f, indent=2)
    
    print(f"   💾 Deployment info saved: {deployment_path}")
    
    return app_id


def main():
    print("=" * 60)
    print("  WaveBreak Bonding Curve Contract Deployment")
    print("  Network: Algorand TestNet")
    print("=" * 60)
    
    # Option 1: Environment variable
    import os
    creator_mnemonic = os.environ.get("CREATOR_MNEMONIC")
    
    # Option 2: Interactive input
    if not creator_mnemonic:
        print("\n⚠️  No CREATOR_MNEMONIC environment variable found")
        print("Please enter your TestNet account mnemonic (25 words):")
        print("(This will be used to deploy the contract)")
        creator_mnemonic = input("> ").strip()
    
    if not creator_mnemonic:
        print("❌ No mnemonic provided. Exiting.")
        return
    
    try:
        # Validate mnemonic
        private_key = mnemonic.to_private_key(creator_mnemonic)
        creator_address = account.address_from_private_key(private_key)
        
        print(f"\n✅ Valid mnemonic for address: {creator_address}")
        
        # Deploy
        app_id = deploy_contract(creator_mnemonic)
        
        if app_id:
            print("\n" + "=" * 60)
            print("  🎉 Deployment Complete!")
            print("=" * 60)
            print(f"\nNext steps:")
            print(f"1. Update BONDING_CURVE_APP_ID in src/lib/launchpad/algorand.ts")
            print(f"2. Use this App ID when creating new launch projects")
            print(f"3. Test the bonding curve purchase flow")
            
    except Exception as e:
        print(f"\n❌ Deployment failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

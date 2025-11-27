#!/usr/bin/env python3
"""
Deploy Token Launchpad to TestNet

This script deploys the Token Launchpad smart contract to Algorand TestNet.
Make sure you have:
1. A funded TestNet account (get ALGO from https://bank.testnet.algorand.network/)
2. Your mnemonic saved in .env.testnet or set DEPLOYER_MNEMONIC env var
"""

import os
import base64
from pathlib import Path
from algosdk import mnemonic, transaction, logic
from algosdk.v2client import algod
from algokit_utils import (
    Account,
    ApplicationClient,
    ApplicationSpecification,
)
import json

# TestNet configuration
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""  # Public node, no token needed

def get_algod_client():
    """Get Algod client for TestNet"""
    return algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

def get_deployer_account():
    """Get deployer account from environment"""
    # Try to get mnemonic from environment
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC") or os.getenv("ALGORAND_MNEMONIC")
    
    if not deployer_mnemonic:
        # Try to read from .env.testnet or .env.local
        for env_filename in [".env.testnet", ".env.local"]:
            env_file = Path(__file__).parent.parent.parent / env_filename
            if env_file.exists():
                with open(env_file) as f:
                    for line in f:
                        if line.startswith("DEPLOYER_MNEMONIC=") or line.startswith("ALGORAND_MNEMONIC="):
                            deployer_mnemonic = line.split("=", 1)[1].strip().strip('"')
                            break
                if deployer_mnemonic:
                    break
    
    if not deployer_mnemonic:
        print("❌ DEPLOYER_MNEMONIC not found!")
        print("\nPlease either:")
        print("1. Set environment variable: export DEPLOYER_MNEMONIC='your 25 word mnemonic'")
        print("2. Add to .env.local or .env.testnet: DEPLOYER_MNEMONIC='your 25 word mnemonic'")
        print("\nGet TestNet ALGO from: https://bank.testnet.algorand.network/")
        exit(1)
    
    private_key = mnemonic.to_private_key(deployer_mnemonic)
    return Account(private_key=private_key)

def main():
    print("🚀 Deploying Token Launchpad to TestNet")
    print("=" * 50)
    
    # Get clients and account
    algod_client = get_algod_client()
    deployer = get_deployer_account()
    
    print(f"📍 Deployer Address: {deployer.address}")
    
    # Check balance
    account_info = algod_client.account_info(deployer.address)
    balance = account_info.get('amount', 0) / 1_000_000
    print(f"💰 Balance: {balance:.6f} ALGO")
    
    if balance < 0.5:
        print("\n⚠️  Warning: Low balance! Get TestNet ALGO from:")
        print("   https://bank.testnet.algorand.network/")
        response = input("\nContinue anyway? (y/n): ")
        if response.lower() != 'y':
            exit(0)
    
    # Load TEAL files directly
    artifacts_dir = Path(__file__).parent
    approval_teal_path = artifacts_dir / "TokenLaunchpad.approval.teal"
    clear_teal_path = artifacts_dir / "TokenLaunchpad.clear.teal"
    
    if not approval_teal_path.exists() or not clear_teal_path.exists():
        print(f"❌ TEAL files not found in: {artifacts_dir}")
        print("   Run 'algokit compile py contract.py' first")
        exit(1)
    
    with open(approval_teal_path) as f:
        approval_program = f.read()
    
    with open(clear_teal_path) as f:
        clear_program = f.read()
    
    print(f"\n📄 Loaded TEAL programs from: {artifacts_dir.name}")
    
    print("\n🔨 Creating application...")
    
    try:
        # Compile programs
        approval_result = algod_client.compile(approval_program)
        clear_result = algod_client.compile(clear_program)
        
        # Decode base64 to bytes
        approval_binary = base64.b64decode(approval_result['result'])
        clear_binary = base64.b64decode(clear_result['result'])
        
        # Get suggested params
        params = algod_client.suggested_params()
        
        # Create application transaction
        txn = transaction.ApplicationCreateTxn(
            sender=deployer.address,
            sp=params,
            on_complete=transaction.OnComplete.NoOpOC,
            approval_program=approval_binary,
            clear_program=clear_binary,
            global_schema=transaction.StateSchema(num_uints=15, num_byte_slices=2),
            local_schema=transaction.StateSchema(num_uints=0, num_byte_slices=0),
        )
        
        # Sign and send
        signed_txn = txn.sign(deployer.private_key)
        tx_id = algod_client.send_transaction(signed_txn)
        
        print(f"   Transaction ID: {tx_id}")
        print("   Waiting for confirmation...")
        
        # Wait for confirmation
        confirmed_txn = transaction.wait_for_confirmation(algod_client, tx_id, 4)
        app_id = confirmed_txn["application-index"]
        app_address = logic.get_application_address(app_id)
        
        print(f"✅ Application created!")
        print(f"   App ID: {app_id}")
        print(f"   Confirmed in round: {confirmed_txn['confirmed-round']}")
        
        # Save deployment info
        deployment_info = {
            "network": "testnet",
            "app_id": app_id,
            "deployer": deployer.address,
            "tx_id": tx_id,
            "confirmed_round": confirmed_txn["confirmed-round"]
        }
        
        output_file = Path(__file__).parent / "deployment_testnet.json"
        with open(output_file, 'w') as f:
            json.dump(deployment_info, f, indent=2)
        
        print(f"\n💾 Deployment info saved to: {output_file.name}")
        print(f"\n🔗 View on AlgoExplorer:")
        print(f"   https://testnet.algoexplorer.io/application/{app_id}")
        
        print("\n✨ Next steps:")
        print("1. Create a test token (ASA)")
        print("2. Call configure() to set sale parameters")
        print("3. Call bootstrap() to opt the contract into the ASA")
        print("4. Send tokens to the contract")
        print("5. Users can call buy() to purchase tokens")
        
    except Exception as e:
        print(f"\n❌ Deployment failed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == "__main__":
    main()

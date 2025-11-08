"""
Deploy Pact Pool Adapter Contract

This script deploys the PactPoolAdapter contract to Algorand testnet
and registers it with the MultihopSwapRouter.
"""

from pathlib import Path
from algokit_utils import (
    ApplicationClient,
    AlgorandClient,
)
from algosdk.v2client import algod
from algosdk import mnemonic
from algosdk.account import address_from_private_key
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env.local file
# Go up two directories: multihop_swap -> smart_contracts -> 10x_Swap
env_file = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(env_file)


def get_algod_client():
    """Get Algod client with proper configuration"""
    
    # Try to get from environment variables first
    algod_address = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
    algod_token = os.getenv("ALGOD_TOKEN", "")
    
    # For public nodes, token can be empty
    # For local/private nodes, you need a valid token
    
    return algod.AlgodClient(algod_token, algod_address)


def deploy_pact_adapter():
    """Deploy the Pact Pool Adapter contract"""
    
    print("=" * 60)
    print("  🚀 DEPLOYING PACT POOL ADAPTER")
    print("=" * 60)
    print()
    
    # Initialize Algorand client
    algod_client = get_algod_client()
    
    # Test connection
    try:
        status = algod_client.status()
        print(f"✅ Connected to Algorand network")
        print(f"   Last round: {status.get('last-round', 'N/A')}")
        print()
    except Exception as e:
        print(f"❌ Failed to connect to Algorand node: {e}")
        print()
        print("Please check your connection settings:")
        print("  ALGOD_SERVER:", os.getenv("ALGOD_SERVER", "not set"))
        print("  ALGOD_TOKEN:", "***" if os.getenv("ALGOD_TOKEN") else "not set")
        return None, None
    
    # Load deployer account from environment variable
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    
    if not deployer_mnemonic:
        print("❌ DEPLOYER_MNEMONIC not found in .env.local file")
        print(f"   Please add it to: {env_file}")
        return None, None
    
    try:
        # Convert mnemonic to private key
        private_key = mnemonic.to_private_key(deployer_mnemonic)
        deployer_address = address_from_private_key(private_key)
        
        # Create a simple account object
        class SimpleAccount:
            def __init__(self, address, private_key):
                self.address = address
                self.private_key = private_key
        
        deployer = SimpleAccount(deployer_address, private_key)
    except Exception as e:
        print(f"❌ Invalid mnemonic in .env.local: {e}")
        return None, None
    
    print(f"📍 Deployer address: {deployer.address}")
    print()
    
    # Check balance
    try:
        account_info = algod_client.account_info(deployer.address)
        balance = account_info.get('amount', 0) / 1_000_000
        print(f"💰 Balance: {balance:.6f} ALGO")
        
        if balance < 0.5:
            print("❌ Insufficient balance. Need at least 0.5 ALGO for deployment.")
            print(f"   Please fund your account: {deployer.address}")
            return None, None
    except Exception as e:
        print(f"❌ Could not fetch account info: {e}")
        return None, None
    
    print()
    print("📝 Deploying PactPoolAdapter contract...")
    
    # Load compiled artifacts from the root-level artifacts directory
    # Path: Algorand_prototype-v0.0.1/artifacts/multihop_swap/
    current_dir = Path(__file__).parent
    # Go up: multihop_swap -> smart_contracts -> 10x_Swap -> projects -> Blockchain -> Algorand_prototype-v0.0.1
    artifacts_dir = current_dir.parent.parent.parent.parent.parent / "artifacts" / "multihop_swap"
    approval_file = artifacts_dir / "PactPoolAdapter.approval.teal"
    clear_file = artifacts_dir / "PactPoolAdapter.clear.teal"
    arc56_file = artifacts_dir / "PactPoolAdapter.arc56.json"
    
    # Check if artifacts exist
    if not approval_file.exists():
        print(f"❌ Artifacts not found at: {artifacts_dir}")
        print(f"   Looking for: {approval_file.name}")
        print(f"   Please compile the contract first:")
        print(f"   cd {current_dir}")
        print(f"   algokit compile py pact_adapter.py")
        print(f"   The artifacts will be created in the current directory,")
        print(f"   then move them to artifacts/ folder.")
        return None, None
    
    print(f"✅ Found compiled artifacts")
    print()
    
    # Load application spec from ARC56
    try:
        with open(arc56_file) as f:
            app_spec_dict = json.load(f)
        
        # Read TEAL programs
        with open(approval_file) as f:
            approval_program = f.read()
        
        with open(clear_file) as f:
            clear_program = f.read()
    except Exception as e:
        print(f"❌ Failed to load artifacts: {e}")
        return None, None
    
    # Deploy the contract using algosdk directly
    from algosdk.transaction import (
        ApplicationCreateTxn,
        OnComplete,
        StateSchema,
        wait_for_confirmation,
    )
    from algosdk import logic
    import base64
    
    try:
        print("🔄 Submitting deployment transaction...")
        
        # Compile the programs
        compile_approval = algod_client.compile(approval_program)
        compile_clear = algod_client.compile(clear_program)
        
        # Decode base64 to bytes
        approval_binary = base64.b64decode(compile_approval['result'])
        clear_binary = base64.b64decode(compile_clear['result'])
        
        # Get suggested params
        params = algod_client.suggested_params()
        
        # Define state schema (global and local storage)
        global_schema = StateSchema(num_uints=0, num_byte_slices=0)
        local_schema = StateSchema(num_uints=0, num_byte_slices=0)
        
        # Create the application
        txn = ApplicationCreateTxn(
            sender=deployer.address,
            sp=params,
            on_complete=OnComplete.NoOpOC,
            approval_program=approval_binary,
            clear_program=clear_binary,
            global_schema=global_schema,
            local_schema=local_schema,
        )
        
        # Sign and send
        signed_txn = txn.sign(deployer.private_key)
        txn_id = algod_client.send_transaction(signed_txn)
        
        # Wait for confirmation
        print("⏳ Waiting for confirmation...")
        confirmed_txn = wait_for_confirmation(algod_client, txn_id, 4)
        
        # Get app ID
        app_id = confirmed_txn.get('application-index')
        app_addr = logic.get_application_address(app_id)
        
        print()
        print("✅ Pact Pool Adapter deployed successfully!")
        print()
        print(f"   App ID: {app_id}")
        print(f"   App Address: {app_addr}")
        print(f"   Transaction ID: {txn_id}")
        print()
        
        # Save deployment info
        deployment_info = {
            "app_id": app_id,
            "app_address": app_addr,
            "deployer": deployer.address,
            "txn_id": txn_id,
            "network": "testnet",
            "dex": "pact",
        }
        
        output_file = Path(__file__).parent / "deployed_pact_adapter_id.txt"
        with open(output_file, 'w') as f:
            f.write(str(app_id))
        
        json_file = Path(__file__).parent / "deployed_pact_adapter.json"
        with open(json_file, 'w') as f:
            json.dump(deployment_info, f, indent=2)
        
        print(f"📄 Deployment info saved to:")
        print(f"   - {output_file}")
        print(f"   - {json_file}")
        print()
        
        # Fund the contract
        print("💸 Funding contract with 1 ALGO...")
        from algosdk.transaction import PaymentTxn, wait_for_confirmation
        
        params = algod_client.suggested_params()
        fund_txn = PaymentTxn(
            sender=deployer.address,
            sp=params,
            receiver=app_addr,
            amt=1_000_000,  # 1 ALGO
        )
        
        signed_txn = fund_txn.sign(deployer.private_key)
        txid = algod_client.send_transaction(signed_txn)
        
        # Wait for confirmation
        wait_for_confirmation(algod_client, txid, 4)
        
        print(f"✅ Contract funded. Transaction: {txid}")
        print()
        
        # Next steps
        print("=" * 60)
        print("  ✅ DEPLOYMENT COMPLETE")
        print("=" * 60)
        print()
        print("📋 NEXT STEPS:")
        print()
        print("1. Opt the adapter into required assets:")
        print(f"   App ID: {app_id}")
        print("   Required assets:")
        print("   - USDC (10458941)")
        print("   - Other tokens you want to swap")
        print()
        print("2. Register with MultihopSwapRouter (if applicable):")
        print(f"   Adapter App ID: {app_id}")
        print()
        print("3. Update your configuration:")
        print(f"   const PACT_ADAPTER_APP_ID = {app_id};")
        print()
        
        return app_id, app_addr
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        import traceback
        traceback.print_exc()
        return None, None


def opt_into_assets(adapter_app_id: int):
    """Opt the adapter into required assets"""
    
    print("=" * 60)
    print("  🔐 OPTING INTO ASSETS")
    print("=" * 60)
    print()
    
    algod_client = get_algod_client()
    
    # Load deployer account from environment variable
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    
    if not deployer_mnemonic:
        print("❌ DEPLOYER_MNEMONIC not found in .env.local file")
        return
    
    try:
        private_key = mnemonic.to_private_key(deployer_mnemonic)
        deployer_address = address_from_private_key(private_key)
        
        class SimpleAccount:
            def __init__(self, address, private_key):
                self.address = address
                self.private_key = private_key
        
        deployer = SimpleAccount(deployer_address, private_key)
    except Exception as e:
        print(f"❌ Invalid mnemonic: {e}")
        return
    
    # Common assets on TestNet
    assets_to_opt_in = [
        10458941,  # USDC
        # Add other asset IDs as needed
    ]
    
    print(f"📍 Adapter App ID: {adapter_app_id}")
    print(f"📋 Assets to opt-in: {assets_to_opt_in}")
    print()
    
    from algosdk.transaction import ApplicationCallTxn, OnComplete
    
    params = algod_client.suggested_params()
    
    for asset_id in assets_to_opt_in:
        try:
            print(f"🔄 Opting into asset {asset_id}...")
            
            # Call the adapter with asset opt-in
            app_call = ApplicationCallTxn(
                sender=deployer.address,
                sp=params,
                index=adapter_app_id,
                on_complete=OnComplete.NoOpOC,
                foreign_assets=[asset_id],
            )
            
            signed_txn = app_call.sign(deployer.private_key)
            txid = algod_client.send_transaction(signed_txn)
            
            from algosdk.transaction import wait_for_confirmation
            wait_for_confirmation(algod_client, txid, 4)
            
            print(f"✅ Opted into asset {asset_id}")
            
        except Exception as e:
            print(f"⚠️  Failed to opt into asset {asset_id}: {e}")
    
    print()
    print("✅ Asset opt-in complete")
    print()


if __name__ == "__main__":
    import sys
    
    print()
    print("🔧 Algorand Pact Adapter Deployment Tool")
    print()
    
    app_id, app_addr = deploy_pact_adapter()
    
    if app_id:
        print()
        print("✅ Deployment successful!")
        print()
        print("To opt into assets, run:")
        print(f"  python3 opt_in_adapter_assets.py")
        print()
    else:
        print()
        print("❌ Deployment failed. Please check the errors above.")
        sys.exit(1)

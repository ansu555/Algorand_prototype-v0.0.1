"""
Deploy MultihopSwapRouter Contract

This script deploys the MultihopSwapRouter contract to Algorand testnet.
"""

from pathlib import Path
from algosdk.v2client import algod
from algosdk import mnemonic
from algosdk.account import address_from_private_key
from algosdk.transaction import (
    ApplicationCreateTxn,
    OnComplete,
    StateSchema,
    wait_for_confirmation,
    PaymentTxn,
)
from algosdk.abi import Contract
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    AccountTransactionSigner,
    TransactionWithSigner,
)
import json
import os
from dotenv import load_dotenv
import base64


def get_algod_client():
    """Get Algod client with proper configuration"""
    
    algod_address = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
    algod_token = os.getenv("ALGOD_TOKEN", "")
    
    return algod.AlgodClient(algod_token, algod_address)


def deploy_router():
    """Deploy the MultihopSwapRouter contract"""
    
    print("=" * 60)
    print("  🚀 DEPLOYING MULTIHOP SWAP ROUTER")
    print("=" * 60)
    print()
    
    # Load environment variables from .env.local
    env_file = Path(__file__).parent.parent.parent / ".env.local"
    load_dotenv(env_file)
    
    # Initialize Algorand client
    algod_client = get_algod_client()
    
    # Test connection
    try:
        status = algod_client.status()
        print(f"✅ Connected to Algorand Testnet")
        print(f"   Last round: {status['last-round']}")
    except Exception as e:
        print(f"❌ Failed to connect to Algorand node: {e}")
        return
    
    print()
    
    # Get deployer account from mnemonic
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    if not deployer_mnemonic:
        print("❌ DEPLOYER_MNEMONIC not found in .env.local")
        print("   Please add your mnemonic to .env.local")
        return
    
    try:
        deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
        deployer_address = address_from_private_key(deployer_private_key)
    except Exception as e:
        print(f"❌ Invalid mnemonic: {e}")
        return
    
    print(f"👤 Deployer: {deployer_address}")
    
    # Check deployer balance
    try:
        account_info = algod_client.account_info(deployer_address)
        balance_algo = account_info["amount"] / 1_000_000
        print(f"💰 Balance: {balance_algo:.6f} ALGO")
        
        if balance_algo < 1:
            print(f"\n⚠️  WARNING: Low balance!")
            print(f"   Get testnet ALGO from: https://bank.testnet.algorand.network/?account={deployer_address}")
            return
    except Exception as e:
        print(f"❌ Could not check balance: {e}")
        return
    
    print()
    print("📝 Deploying MultihopSwapRouter contract...")
    
    # Load compiled artifacts from root artifacts folder
    current_dir = Path(__file__).parent
    # Go up: multihop_swap -> smart_contracts -> 10x_Swap -> projects -> Blockchain -> Algorand_prototype-v0.0.1
    artifacts_dir = current_dir.parent.parent.parent.parent.parent / "artifacts" / "multihop_swap"
    approval_file = artifacts_dir / "MultihopSwapRouter.approval.teal"
    clear_file = artifacts_dir / "MultihopSwapRouter.clear.teal"
    arc56_file = artifacts_dir / "MultihopSwapRouter.arc56.json"
    
    # Check if artifacts exist
    if not approval_file.exists():
        print(f"❌ Artifacts not found at: {artifacts_dir}")
        print(f"   Looking for: {approval_file.name}")
        print(f"   Please compile the contract first:")
        print(f"   cd smart_contracts && ./compile_all.sh")
        return
    
    print(f"📦 Loading artifacts from: {artifacts_dir.name}/")
    
    # Read TEAL programs
    with open(approval_file, 'r') as f:
        approval_teal = f.read()
    
    with open(clear_file, 'r') as f:
        clear_teal = f.read()
    
    # Load ARC56 for ABI
    with open(arc56_file, 'r') as f:
        arc56_data = json.load(f)
    
    # Compile TEAL to bytecode
    print("🔨 Compiling TEAL programs...")
    try:
        approval_result = algod_client.compile(approval_teal)
        clear_result = algod_client.compile(clear_teal)
        
        approval_program = base64.b64decode(approval_result['result'])
        clear_program = base64.b64decode(clear_result['result'])
        
        print(f"   Approval program: {len(approval_program)} bytes")
        print(f"   Clear program: {len(clear_program)} bytes")
    except Exception as e:
        print(f"❌ Compilation failed: {e}")
        return
    
    print()
    
    # Define state schema
    # MultihopSwapRouter has minimal state (just initialization tracking)
    global_schema = StateSchema(num_uints=2, num_byte_slices=2)
    local_schema = StateSchema(num_uints=0, num_byte_slices=0)
    
    # Get suggested parameters
    params = algod_client.suggested_params()
    
    # Create application with the create method call
    print("🚀 Creating application on blockchain...")
    
    # The contract requires calling create_application method during creation
    # We need to use AtomicTransactionComposer for this
    
    atc = AtomicTransactionComposer()
    signer = AccountTransactionSigner(deployer_private_key)
    
    # Create ABI Contract from ARC56
    contract = Contract.from_json(json.dumps(arc56_data))
    
    # Find the create method
    create_method = contract.get_method_by_name("create_application")
    
    # Add method call to ATC
    atc.add_method_call(
        app_id=0,  # 0 means create new app
        method=create_method,
        sender=deployer_address,
        sp=params,
        signer=signer,
        approval_program=approval_program,
        clear_program=clear_program,
        global_schema=global_schema,
        local_schema=local_schema,
        extra_pages=3,  # For larger contract code
    )
    
    try:
        # Execute transaction
        result = atc.execute(algod_client, 4)
        
        # Get app ID from result
        app_id = result.abi_results[0].tx_info['application-index']
        
        print(f"\n✅ MultihopSwapRouter deployed successfully!")
        print(f"   App ID: {app_id}")
        
        # Calculate app address
        from algosdk.logic import get_application_address
        app_address = get_application_address(app_id)
        print(f"   App Address: {app_address}")
        
        # Save deployment info
        output_file = Path(__file__).parent / "deployed_router_id.txt"
        output_file.write_text(f"{app_id}\n")
        
        output_json = Path(__file__).parent / "deployed_router.json"
        deployment_info = {
            "app_id": app_id,
            "app_address": app_address,
            "deployer": deployer_address,
            "txn_id": result.abi_results[0].tx_id,
            "network": "testnet",
            "contract": "MultihopSwapRouter"
        }
        
        with open(output_json, 'w') as f:
            json.dump(deployment_info, f, indent=2)
        
        print(f"\n📝 Deployment info saved:")
        print(f"   {output_file}")
        print(f"   {output_json}")
        
        # Fund the contract with ALGO for transaction fees
        print(f"\n💸 Funding contract with 2 ALGO for transaction fees...")
        
        funding_txn = PaymentTxn(
            sender=deployer_address,
            sp=algod_client.suggested_params(),
            receiver=app_address,
            amt=2_000_000,  # 2 ALGO
        )
        
        signed_funding = funding_txn.sign(deployer_private_key)
        funding_txid = algod_client.send_transaction(signed_funding)
        wait_for_confirmation(algod_client, funding_txid, 4)
        
        print(f"✅ Contract funded")
        print(f"   Transaction: {funding_txid}")
        
        print(f"\n🎉 Deployment Complete!")
        print(f"\n📋 Next Steps:")
        print(f"   1. Opt the contract into assets:")
        print(f"      python opt_in_router_assets.py")
        print(f"   2. View on AlgoExplorer:")
        print(f"      https://testnet.algoexplorer.io/application/{app_id}")
        
        return app_id
        
    except Exception as e:
        print(f"\n❌ Deployment failed: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    deploy_router()

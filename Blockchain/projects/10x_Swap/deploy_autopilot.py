"""
Deploy AutoPilot Rule Contract to Algorand Testnet
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from algosdk.v2client import algod
from algosdk import mnemonic, account, transaction
from algosdk.transaction import wait_for_confirmation
import base64

# Load environment
env_file = Path(__file__).parent / ".env.testnet"
load_dotenv(env_file)

def main():
    # Get deployer account
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    if not deployer_mnemonic:
        print("❌ DEPLOYER_MNEMONIC not found in .env.testnet")
        sys.exit(1)
    
    deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
    deployer_address = account.address_from_private_key(deployer_private_key)
    
    print(f"🔑 Deployer: {deployer_address}")
    
    # Connect to testnet
    algod_token = "a" * 64
    algod_server = "https://testnet-api.algonode.cloud"
    algod_client = algod.AlgodClient(algod_token, algod_server)
    
    # Check balance
    account_info = algod_client.account_info(deployer_address)
    balance = account_info["amount"] / 1_000_000
    print(f"💰 Balance: {balance:.6f} ALGO")
    
    if balance < 1:
        print(f"⚠️  Low balance! Get testnet ALGO from:")
        print(f"   https://bank.testnet.algorand.network/?account={deployer_address}")
        sys.exit(1)
    
    # Load contract artifacts
    artifacts_dir = Path(__file__).parent / "smart_contracts" / "artifacts" / "autopilot_rule"
    approval_path = artifacts_dir / "AutoPilotRuleContract.approval.teal"
    clear_path = artifacts_dir / "AutoPilotRuleContract.clear.teal"
    arc56_path = artifacts_dir / "AutoPilotRuleContract.arc56.json"
    
    if not approval_path.exists():
        print(f"❌ Contract artifacts not found at {artifacts_dir}")
        print("   Run: algokit project run build")
        sys.exit(1)
    
    print(f"📦 Loading contract from {artifacts_dir}")
    
    # Load arc56 for state schema
    with open(arc56_path, 'r') as f:
        arc56 = json.load(f)
    
    # Read and compile TEAL programs
    with open(approval_path, 'r') as f:
        approval_teal = f.read()
    
    with open(clear_path, 'r') as f:
        clear_teal = f.read()
    
    # Compile programs
    print("� Compiling TEAL programs...")
    approval_result = algod_client.compile(approval_teal)
    clear_result = algod_client.compile(clear_teal)
    
    approval_program = base64.b64decode(approval_result['result'])
    clear_program = base64.b64decode(clear_result['result'])
    
    # Get state schema from arc56
    global_state = arc56.get('state', {}).get('keys', {}).get('global', {})
    
    # Count state variables
    global_uints = 0
    global_bytes = 0
    
    # Manually count from state keys
    if 'state' in arc56 and 'keys' in arc56['state']:
        for key_name, key_spec in arc56['state']['keys'].items():
            if 'global' in key_spec.get('scope', ''):
                key_type = key_spec.get('valueType', {}).get('type', '')
                if 'uint' in key_type.lower():
                    global_uints += 1
                else:
                    global_bytes += 1
    
    # Fallback to reasonable defaults
    if global_uints == 0 and global_bytes == 0:
        global_uints = 5  # next_rule_id, protocol_fee_bps, total_executions, is_paused
        global_bytes = 1  # protocol_treasury
    
    print(f"   Global schema: {global_uints} uints, {global_bytes} bytes")
    
    # Create application transaction
    params = algod_client.suggested_params()
    
    txn = transaction.ApplicationCreateTxn(
        sender=deployer_address,
        sp=params,
        on_complete=transaction.OnComplete.NoOpOC,
        approval_program=approval_program,
        clear_program=clear_program,
        global_schema=transaction.StateSchema(
            num_uints=global_uints,
            num_byte_slices=global_bytes
        ),
        local_schema=transaction.StateSchema(num_uints=0, num_byte_slices=0),
        extra_pages=3,  # For box storage support
    )
    
    print("\n🚀 Deploying AutoPilot Rule Contract...")
    
    # Sign and send
    signed_txn = txn.sign(deployer_private_key)
    tx_id = algod_client.send_transaction(signed_txn)
    
    print(f"📡 Transaction ID: {tx_id}")
    print("⏳ Waiting for confirmation...")
    
    # Wait for confirmation
    try:
        result = wait_for_confirmation(algod_client, tx_id, 4)
        app_id = result['application-index']
        
        print(f"\n✅ AutoPilot Rule Contract deployed successfully!")
        print(f"   App ID: {app_id}")
        
        # Calculate app address
        from algosdk.logic import get_application_address
        app_address = get_application_address(app_id)
        print(f"   App Address: {app_address}")
        
        # Fund the contract
        print(f"\n💸 Funding contract with 2 ALGO for operation...")
        params = algod_client.suggested_params()
        funding_txn = transaction.PaymentTxn(
            sender=deployer_address,
            sp=params,
            receiver=app_address,
            amt=2_000_000,  # 2 ALGO for operations + box storage
        )
        
        signed_funding = funding_txn.sign(deployer_private_key)
        funding_id = algod_client.send_transaction(signed_funding)
        wait_for_confirmation(algod_client, funding_id, 4)
        
        print(f"✅ Contract funded")
        
        # Save app ID
        deployed_file = Path(__file__).parent / "smart_contracts" / "autopilot_rule" / "deployed_app_id.txt"
        deployed_file.write_text(f"{app_id}\n")
        print(f"\n📝 App ID saved to: {deployed_file}")
        
        print(f"\n🎉 Deployment Complete!")
        print(f"   View on AlgoExplorer: https://testnet.algoexplorer.io/application/{app_id}")
        
    except Exception as e:
        print(f"\n❌ Deployment failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

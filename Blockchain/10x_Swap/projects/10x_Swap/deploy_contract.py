#!/usr/bin/env python3
"""
Simple deployment script for MultihopSwapRouter contract
"""
import os
import json
from pathlib import Path
from algosdk import account, mnemonic, abi
from algosdk.v2client import algod
from algosdk.transaction import (
    ApplicationCreateTxn,
    OnComplete,
    StateSchema,
    wait_for_confirmation,
)
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    TransactionWithSigner,
    AccountTransactionSigner,
)
import base64

def main():
    # Get deployer account from environment
    mnemonic_phrase = os.getenv("DEPLOYER_MNEMONIC")
    if not mnemonic_phrase:
        raise ValueError("DEPLOYER_MNEMONIC not set in environment")
    
    # Strip quotes if present (in case user wrapped in quotes)
    mnemonic_phrase = mnemonic_phrase.strip().strip('"').strip("'")
    
    # Get account from mnemonic
    private_key = mnemonic.to_private_key(mnemonic_phrase)
    deployer_address = account.address_from_private_key(private_key)
    
    # Connect to testnet using algod client directly
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    algod_client = algod.AlgodClient(algod_token, algod_address)
    
    print(f"Deploying from account: {deployer_address}")
    
    # Get account info
    account_info = algod_client.account_info(deployer_address)
    balance = account_info['amount'] / 1e6
    print(f"Account balance: {balance} ALGO")
    
    if balance < 0.1:
        print("\n⚠️  WARNING: Low balance!")
        print("Get testnet ALGO from: https://bank.testnet.algorand.network/")
        print(f"Your address: {deployer_address}")
        raise ValueError("Insufficient balance to deploy contract")
    
    # Load compiled artifacts
    artifacts_dir = Path(__file__).parent / "smart_contracts" / "multihop_swap" / "smart_contracts" / "artifacts"
    approval_path = artifacts_dir / "MultihopSwapRouter.approval.teal"
    clear_path = artifacts_dir / "MultihopSwapRouter.clear.teal"
    
    if not approval_path.exists() or not clear_path.exists():
        raise FileNotFoundError(
            f"Contract artifacts not found. Run: poetry run algokit compile python smart_contracts/multihop_swap/contract.py --out-dir smart_contracts/artifacts"
        )
    
    approval_teal = approval_path.read_text()
    clear_teal = clear_path.read_text()
    
    # Load ARC56 contract spec
    arc56_path = artifacts_dir / "MultihopSwapRouter.arc56.json"
    contract_spec = json.loads(arc56_path.read_text())
    
    print("\nCompiling approval program...")
    approval_result = algod_client.compile(approval_teal)
    approval_binary = approval_result["result"]
    
    print("Compiling clear program...")
    clear_result = algod_client.compile(clear_teal)
    clear_binary = clear_result["result"]
    
    # Prepare transaction parameters
    params = algod_client.suggested_params()
    
    # Define schema (adjust if needed based on your contract)
    global_schema = StateSchema(num_uints=4, num_byte_slices=4)
    local_schema = StateSchema(num_uints=0, num_byte_slices=0)
    
    print("\nCreating application with ABI method call...")
    
    # Create an atomic transaction composer for ABI method call
    atc = AtomicTransactionComposer()
    signer = AccountTransactionSigner(private_key)
    
    # Get the create_application method from the contract
    contract = abi.Contract.from_json(json.dumps(contract_spec))
    create_method = contract.get_method_by_name("create_application")
    
    # Add the create method call
    atc.add_method_call(
        app_id=0,  # 0 means create new app
        method=create_method,
        sender=deployer_address,
        sp=params,
        signer=signer,
        approval_program=base64.b64decode(approval_binary),
        clear_program=base64.b64decode(clear_binary),
        global_schema=global_schema,
        local_schema=local_schema,
        on_complete=OnComplete.NoOpOC,
    )
    
    # Execute the transaction
    result = atc.execute(algod_client, 4)
    
    # Get the app ID from the result
    app_id = result.abi_results[0].tx_info['application-index']
    tx_id = result.tx_ids[0]
    
    print(f"\n✅ Successfully deployed MultihopSwapRouter!")
    print(f"Transaction ID: {tx_id}")
    print(f"App ID: {app_id}")
    print(f"Explorer: https://testnet.explorer.perawallet.app/application/{app_id}")
    
    # Save to file for easy reference
    config_file = Path(__file__).parent / "deployed_app_id.txt"
    config_file.write_text(f"{app_id}\n")
    print(f"\nApp ID saved to: {config_file}")
    
    return app_id

if __name__ == "__main__":
    # Try to load .env.testnet
    try:
        from dotenv import load_dotenv
        env_file = Path(__file__).parent / ".env.testnet"
        if env_file.exists():
            load_dotenv(env_file)
    except ImportError:
        # If dotenv not available, manually load from file
        env_file = Path(__file__).parent / ".env.testnet"
        if env_file.exists():
            for line in env_file.read_text().strip().split('\n'):
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
    
    main()

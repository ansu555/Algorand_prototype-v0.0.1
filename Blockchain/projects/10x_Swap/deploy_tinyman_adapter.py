#!/usr/bin/env python3
"""
Deployment script for TinymanPoolAdapter contract
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
    
    # Strip quotes if present
    mnemonic_phrase = mnemonic_phrase.strip().strip('"').strip("'")
    
    # Get account from mnemonic
    private_key = mnemonic.to_private_key(mnemonic_phrase)
    deployer_address = account.address_from_private_key(private_key)
    
    # Connect to testnet
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    algod_client = algod.AlgodClient(algod_token, algod_address)
    
    print(f"Deploying TinymanPoolAdapter from: {deployer_address}")
    
    # Get account info
    account_info = algod_client.account_info(deployer_address)
    balance = account_info['amount'] / 1e6
    print(f"Account balance: {balance} ALGO")
    
    if balance < 0.1:
        print("\n⚠️  WARNING: Low balance!")
        raise ValueError("Insufficient balance to deploy contract")
    
    # Load compiled artifacts
    artifacts_dir = Path(__file__).parent / "smart_contracts" / "multihop_swap" / "smart_contracts" / "artifacts"
    approval_path = artifacts_dir / "TinymanPoolAdapter.approval.teal"
    clear_path = artifacts_dir / "TinymanPoolAdapter.clear.teal"
    arc56_path = artifacts_dir / "TinymanPoolAdapter.arc56.json"
    
    if not approval_path.exists() or not clear_path.exists():
        raise FileNotFoundError(
            f"Contract artifacts not found. Run: poetry run algokit compile python smart_contracts/multihop_swap/tinyman_adapter.py --out-dir smart_contracts/artifacts"
        )
    
    approval_teal = approval_path.read_text()
    clear_teal = clear_path.read_text()
    contract_spec = json.loads(arc56_path.read_text())
    
    print("\nCompiling approval program...")
    approval_result = algod_client.compile(approval_teal)
    approval_binary = approval_result["result"]
    
    print("Compiling clear program...")
    clear_result = algod_client.compile(clear_teal)
    clear_binary = clear_result["result"]
    
    # Prepare transaction parameters
    params = algod_client.suggested_params()
    
    # Define schema
    global_schema = StateSchema(num_uints=2, num_byte_slices=2)
    local_schema = StateSchema(num_uints=0, num_byte_slices=0)
    
    print("\nCreating TinymanPoolAdapter application...")
    
    # This contract doesn't have a create method requirement, so use regular creation
    txn = ApplicationCreateTxn(
        sender=deployer_address,
        sp=params,
        on_complete=OnComplete.NoOpOC,
        approval_program=base64.b64decode(approval_binary),
        clear_program=base64.b64decode(clear_binary),
        global_schema=global_schema,
        local_schema=local_schema,
    )
    
    # Sign and send
    signed_txn = txn.sign(private_key)
    tx_id = algod_client.send_transaction(signed_txn)
    
    print(f"Transaction ID: {tx_id}")
    print("Waiting for confirmation...")
    
    # Wait for confirmation
    confirmed_txn = wait_for_confirmation(algod_client, tx_id, 4)
    app_id = confirmed_txn["application-index"]
    
    print(f"\n✅ Successfully deployed TinymanPoolAdapter!")
    print(f"Transaction ID: {tx_id}")
    print(f"App ID: {app_id}")
    print(f"Explorer: https://testnet.explorer.perawallet.app/application/{app_id}")
    
    # Save to file
    config_file = Path(__file__).parent / "deployed_tinyman_adapter_id.txt"
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

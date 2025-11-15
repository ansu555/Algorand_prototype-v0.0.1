#!/usr/bin/env python3
"""
Deploy the liquidity pool contract to testnet
"""

import os
from algosdk.v2client import algod
from algosdk import account, mnemonic
from pathlib import Path

# Read approval and clear programs
approval_path = Path("smart_contracts/liquidity_pool/LiquidityPoolContract.approval.teal")
clear_path = Path("smart_contracts/liquidity_pool/LiquidityPoolContract.clear.teal")

with open(approval_path) as f:
    approval_program = f.read()

with open(clear_path) as f:
    clear_program = f.read()

# Get algod client
algod_client = algod.AlgodClient(
    algod_token="",
    algod_address="https://testnet-api.algonode.cloud"
)

# Get deployer account from mnemonic
deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
if not deployer_mnemonic:
    print("ERROR: DEPLOYER_MNEMONIC environment variable not set")
    print("Please set it in your .env file or export it:")
    print("  export DEPLOYER_MNEMONIC='your 25 word mnemonic'")
    exit(1)

deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
deployer_address = account.address_from_private_key(deployer_private_key)

print(f"Deploying from: {deployer_address}")

# Check balance
account_info = algod_client.account_info(deployer_address)
balance = account_info.get('amount') / 1_000_000
print(f"Balance: {balance:.2f} ALGO")

if balance < 5:
    print(f"WARNING: Balance is low. Need at least 5 ALGO for deployment.")

# Compile programs
import base64
approval_result = algod_client.compile(approval_program)
clear_result = algod_client.compile(clear_program)

approval_binary = base64.b64decode(approval_result['result'])
clear_binary = base64.b64decode(clear_result['result'])

print(f"Approval program: {len(approval_binary)} bytes")
print(f"Clear program: {len(clear_binary)} bytes")

# Get suggested params
params = algod_client.suggested_params()

# Import transaction creation
from algosdk.transaction import ApplicationCreateTxn, OnComplete, StateSchema

# Create the application
txn = ApplicationCreateTxn(
    sender=deployer_address,
    sp=params,
    on_complete=OnComplete.NoOpOC,
    approval_program=approval_binary,
    clear_program=clear_binary,
    global_schema=StateSchema(num_uints=1, num_byte_slices=0),  # total_pools counter
    local_schema=StateSchema(num_uints=0, num_byte_slices=0),   # No local state
    extra_pages=0,  # No extra pages needed
)

# Sign transaction
signed_txn = txn.sign(deployer_private_key)

# Submit transaction
print("Submitting deployment transaction...")
tx_id = algod_client.send_transaction(signed_txn)
print(f"Transaction ID: {tx_id}")

# Wait for confirmation
print("Waiting for confirmation...")
from algosdk import transaction

confirmed_txn = transaction.wait_for_confirmation(algod_client, tx_id, 4)
print(f"Confirmed in round: {confirmed_txn['confirmed-round']}")

# Get app ID
app_id = confirmed_txn['application-index']
print(f"\n✅ Contract deployed successfully!")
print(f"App ID: {app_id}")
print(f"\nUpdate your .env file:")
print(f"NEXT_PUBLIC_POOL_APP_ID={app_id}")

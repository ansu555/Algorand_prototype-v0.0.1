#!/usr/bin/env python3
"""
Update the deployed liquidity pool contract to the new version
This preserves the app ID, address, and all existing pool data
"""

import os
import base64
import logging
from pathlib import Path
from algosdk.v2client import algod
from algosdk import account, mnemonic
from algosdk.transaction import ApplicationUpdateTxn, wait_for_confirmation

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Read the deployed app ID
deployed_app_id_path = Path("smart_contracts/liquidity_pool/deployed_app_id.txt")
if not deployed_app_id_path.exists():
    logger.error(f"deployed_app_id.txt not found at {deployed_app_id_path}")
    logger.error("Please deploy the contract first or specify the app ID manually")
    exit(1)

app_id = int(deployed_app_id_path.read_text().strip())
logger.info(f"Updating App ID: {app_id}")

# Get algod client
algod_client = algod.AlgodClient(
    algod_token="",
    algod_address="https://testnet-api.algonode.cloud"
)

# Get deployer account from mnemonic
deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
if not deployer_mnemonic:
    logger.error("DEPLOYER_MNEMONIC environment variable not set")
    logger.error("Please set it in your .env file or export it:")
    logger.error("  export DEPLOYER_MNEMONIC='your 25 word mnemonic'")
    exit(1)

deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
deployer_address = account.address_from_private_key(deployer_private_key)

logger.info(f"Updating from: {deployer_address}")

# Check that the deployer is the creator
app_info = algod_client.application_info(app_id)
creator_address = app_info['params']['creator']
if creator_address != deployer_address:
    logger.error(f"ERROR: Only the creator can update the contract")
    logger.error(f"Creator: {creator_address}")
    logger.error(f"Your address: {deployer_address}")
    exit(1)

logger.info(f"✅ Verified: You are the creator of app {app_id}")

# Check balance
account_info = algod_client.account_info(deployer_address)
balance = account_info.get('amount') / 1_000_000
logger.info(f"Balance: {balance:.2f} ALGO")

# Read approval and clear programs (from artifacts after compilation)
# Path: update_pool.py -> 10x_Swap -> projects -> Blockchain -> Algorand_prototype-v0.0.1 -> artifacts
artifacts_dir = Path(__file__).parent.parent.parent.parent / "artifacts" / "liquidity_pool"
approval_path = artifacts_dir / "LiquidityPoolContract.approval.teal"
clear_path = artifacts_dir / "LiquidityPoolContract.clear.teal"

if not approval_path.exists():
    logger.error(f"Approval program not found at {approval_path}")
    logger.error("Run './smart_contracts/compile_all.sh' first to compile the contract")
    exit(1)

if not clear_path.exists():
    logger.error(f"Clear program not found at {clear_path}")
    logger.error("Run './smart_contracts/compile_all.sh' first to compile the contract")
    exit(1)

with open(approval_path) as f:
    approval_program = f.read()

with open(clear_path) as f:
    clear_program = f.read()

# Compile programs
logger.info("Compiling TEAL programs...")
approval_result = algod_client.compile(approval_program)
clear_result = algod_client.compile(clear_program)

approval_binary = base64.b64decode(approval_result['result'])
clear_binary = base64.b64decode(clear_result['result'])

logger.info(f"Approval program: {len(approval_binary)} bytes")
logger.info(f"Clear program: {len(clear_binary)} bytes")

# Get suggested params
params = algod_client.suggested_params()

# Create update transaction with ABI method call
from algosdk.transaction import ApplicationCallTxn, OnComplete
from algosdk.abi import Contract, Method
import json

# Load the ABI from the compiled contract (ARC56 format)
abi_path = artifacts_dir / "LiquidityPoolContract.arc56.json"
with open(abi_path) as f:
    abi_json = json.load(f)

# Find the update_application method in ARC56 format
update_method_spec = None
for method in abi_json.get('methods', []):
    if method['name'] == 'update_application':
        update_method_spec = method
        break

if not update_method_spec:
    logger.error("update_application method not found in ABI")
    exit(1)

# Create Method object from spec
update_method = Method.from_signature(f"{update_method_spec['name']}()void")

# Create ABI method call for update
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    TransactionWithSigner,
    AccountTransactionSigner,
)

logger.info("Creating application update transaction with ABI call...")

# Create signer
signer = AccountTransactionSigner(deployer_private_key)

# Create atomic transaction composer
atc = AtomicTransactionComposer()

# Add method call for update
atc.add_method_call(
    app_id=app_id,
    method=update_method,
    sender=deployer_address,
    sp=params,
    signer=signer,
    on_complete=OnComplete.UpdateApplicationOC,
    approval_program=approval_binary,
    clear_program=clear_binary,
)

# Execute the transaction
logger.info("Submitting update transaction...")
result = atc.execute(algod_client, 4)
tx_id = result.tx_ids[0]
logger.info(f"Transaction ID: {tx_id}")

logger.info(f"Confirmed in round: {result.confirmed_round}")

logger.info(f"\n✅ Contract updated successfully!")
logger.info(f"App ID: {app_id} (unchanged)")
logger.info(f"\nChanges applied:")
logger.info(f"  - Removed creator-only restriction from create_pool()")
logger.info(f"  - Removed creator-only restriction from create_lp_token()")
logger.info(f"  - Anyone can now create pools permissionlessly!")
logger.info(f"\nAll existing pools and data are preserved.")

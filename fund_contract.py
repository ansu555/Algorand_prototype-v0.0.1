#!/usr/bin/env python3
"""Fund the deployed liquidity pool contract"""
import os
from algosdk.v2client import algod
from algosdk import transaction, mnemonic

# Configuration
ALGOD_SERVER = "https://testnet-api.4160.nodely.dev"
ALGOD_TOKEN = ""
CONTRACT_ADDRESS = "NUJMZ2GIHNH4HZQBERZNX3BQJCGO7AIRIVBIWBBVNVCW66PCYRB56Z3IZY"
FUNDING_AMOUNT = 5_000_000  # 5 ALGO in microAlgos

# Get deployer mnemonic from environment
deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
if not deployer_mnemonic:
    print("❌ DEPLOYER_MNEMONIC not found in environment")
    exit(1)

# Initialize client and account
algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER)
deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
deployer_address = mnemonic.to_public_key(deployer_mnemonic)

print(f"📤 Funding contract from: {deployer_address}")
print(f"📥 Contract address: {CONTRACT_ADDRESS}")
print(f"💰 Funding amount: {FUNDING_AMOUNT / 1_000_000} ALGO")

# Check deployer balance
account_info = algod_client.account_info(deployer_address)
balance = account_info.get('amount', 0)
print(f"💳 Deployer balance: {balance / 1_000_000} ALGO")

if balance < FUNDING_AMOUNT + 1_000:  # Need extra for txn fee
    print(f"❌ Insufficient balance. Need at least {(FUNDING_AMOUNT + 1_000) / 1_000_000} ALGO")
    exit(1)

# Get suggested params
params = algod_client.suggested_params()

# Create payment transaction
txn = transaction.PaymentTxn(
    sender=deployer_address,
    sp=params,
    receiver=CONTRACT_ADDRESS,
    amt=FUNDING_AMOUNT,
    note=b"Initial contract funding"
)

# Sign transaction
signed_txn = txn.sign(deployer_private_key)

# Submit transaction
txid = algod_client.send_transaction(signed_txn)
print(f"📡 Transaction submitted: {txid}")

# Wait for confirmation
print("⏳ Waiting for confirmation...")
confirmed_txn = transaction.wait_for_confirmation(algod_client, txid, 4)
print(f"✅ Transaction confirmed in round {confirmed_txn['confirmed-round']}")

# Check new contract balance
contract_info = algod_client.account_info(CONTRACT_ADDRESS)
new_balance = contract_info.get('amount', 0)
print(f"💰 Contract new balance: {new_balance / 1_000_000} ALGO")
print(f"✅ Contract funded successfully!")


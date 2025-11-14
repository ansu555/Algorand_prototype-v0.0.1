#!/usr/bin/env python3
"""Minimal script to fund deployed liquidity pool contract."""
import os
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import PaymentTxn

# Configuration
ALGOD_SERVER = "https://testnet-api.4160.nodely.dev"
ALGOD_TOKEN = ""
APP_ADDRESS = "5MJBDMWCHZWGYXDSXFJZS2VWZNBY2XZHXDWG2SNOVKWNXYV7UCJCBAOMRA"
APP_ID = 749661827
FUNDING_AMOUNT = 300_000  # 0.3 ALGO (reduced from 0.5)

# Get deployer mnemonic from environment
deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
if not deployer_mnemonic:
    print("❌ DEPLOYER_MNEMONIC not found in environment")
    print("Please run: export DEPLOYER_MNEMONIC='your mnemonic here'")
    exit(1)

# Initialize client and account
algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER)
deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
deployer_address = account.address_from_private_key(deployer_private_key)

# Check available balance
account_info = algod_client.account_info(deployer_address)
total_balance = account_info["amount"]
min_balance = account_info["min-balance"]
available = total_balance - min_balance

print(f"Total balance: {total_balance / 1_000_000:.3f} ALGO")
print(f"Minimum balance: {min_balance / 1_000_000:.3f} ALGO")
print(f"Available: {available / 1_000_000:.3f} ALGO")

# Validate sufficient balance
required = FUNDING_AMOUNT + 100_000  # 0.1 ALGO buffer for fees
if available < required:
    print(f"\n❌ Insufficient balance!")
    print(f"   Need: {required / 1_000_000:.3f} ALGO")
    print(f"   Have: {available / 1_000_000:.3f} ALGO")
    print(f"\nGet testnet ALGO from: https://bank.testnet.algorand.network/")
    print(f"Your address: {deployer_address}")
    exit(1)

# Send funding transaction
params = algod_client.suggested_params()
txn = PaymentTxn(
    sender=deployer_address,
    sp=params,
    receiver=APP_ADDRESS,
    amt=FUNDING_AMOUNT,
    note=b"Pool contract funding"
)

signed_txn = txn.sign(deployer_private_key)
txid = algod_client.send_transaction(signed_txn)

print(f"\n✅ Funding transaction sent!")
print(f"   TxID: {txid}")
print(f"   Amount: {FUNDING_AMOUNT / 1_000_000:.3f} ALGO")

# Wait for confirmation
algod_client.pending_transaction_info(txid)
print(f"✅ Transaction confirmed!")

# Save app ID to file
with open("deployed_app_id.txt", "w") as f:
    f.write(f"{APP_ID}\n")
print(f"\n✅ App ID {APP_ID} saved to deployed_app_id.txt")

#!/usr/bin/env python3
import os
from algosdk.v2client import algod
from algosdk import transaction, account

ALGOD_SERVER = "https://testnet-api.4160.nodely.dev"
ALGOD_TOKEN = ""
CONTRACT_ADDRESS = "NUJMZ2GIHNH4HZQBERZNX3BQJCGO7AIRIVBIWBBVNVCW66PCYRB56Z3IZY"

deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER)
deployer_private_key = account.mnemonic.to_private_key(deployer_mnemonic)
deployer_address = account.address_from_private_key(deployer_private_key)

print(f"Sending 5 ALGO from {deployer_address}")
print(f"To contract: {CONTRACT_ADDRESS}")

params = algod_client.suggested_params()
txn = transaction.PaymentTxn(deployer_address, params, CONTRACT_ADDRESS, 5_000_000)
signed = txn.sign(deployer_private_key)
txid = algod_client.send_transaction(signed)

print(f"Transaction ID: {txid}")
print("Waiting for confirmation...")
result = transaction.wait_for_confirmation(algod_client, txid, 4)
print(f"✅ Funded! Confirmed in round {result['confirmed-round']}")

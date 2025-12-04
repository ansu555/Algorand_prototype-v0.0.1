#!/usr/bin/env python3
"""
XR Token Deployment Configuration
=================================

Deploys the XR Token (ASA) on Algorand TestNet.

This script creates an Algorand Standard Asset (ASA) for the XR Token,
the governance and utility token for the 10xSwap ecosystem.

Requirements:
- DEPLOYER_MNEMONIC set in .env.local
- Sufficient ALGO balance for transaction fees (minimum 1 ALGO)

Usage:
    python smart_contracts/xr_token/deploy_config.py
"""

from algosdk.v2client import algod
from algosdk import mnemonic, transaction, account
from algosdk.transaction import AssetConfigTxn, wait_for_confirmation
import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parents[5] / '.env.local'
load_dotenv(env_path)

# Token configuration
XR_TOKEN_CONFIG = {
    'name': '10x Reward Token',
    'symbol': 'XR',
    'unit_name': 'XR',
    'decimals': 6,
    'initial_supply': 1_000_000,  # 1 million tokens
    'url': 'https://10xswap.io/xrtoken',
    'description': 'XR Token - The governance and utility token for 10xSwap DEX ecosystem',
}

# Network configuration
ALGOD_SERVER = os.getenv('ALGOD_SERVER', 'https://testnet-api.4160.nodely.dev')
ALGOD_PORT = int(os.getenv('ALGOD_PORT', '443'))
ALGOD_TOKEN = os.getenv('ALGOD_TOKEN', '')

def get_algod_client():
    return algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER)

def get_deployer_account():
    mnemonic_phrase = os.getenv('DEPLOYER_MNEMONIC')
    if not mnemonic_phrase:
        raise ValueError("DEPLOYER_MNEMONIC not found in environment variables")
    
    private_key = mnemonic.to_private_key(mnemonic_phrase)
    address = account.address_from_private_key(private_key)
    return private_key, address

def deploy_xr_token():
    print(f"Deploying XR Token to {ALGOD_SERVER}...")
    
    client = get_algod_client()
    private_key, sender_address = get_deployer_account()
    
    print(f"Deployer Address: {sender_address}")
    
    # Check balance
    account_info = client.account_info(sender_address)
    balance = account_info.get('amount')
    print(f"Deployer Balance: {balance} microAlgos")
    
    if balance < 1000000:
        raise ValueError("Insufficient balance. Please fund the deployer account.")

    # Create Asset Configuration Transaction
    params = client.suggested_params()
    
    txn = AssetConfigTxn(
        sender=sender_address,
        sp=params,
        total=XR_TOKEN_CONFIG['initial_supply'] * (10 ** XR_TOKEN_CONFIG['decimals']),
        decimals=XR_TOKEN_CONFIG['decimals'],
        default_frozen=False,
        unit_name=XR_TOKEN_CONFIG['unit_name'],
        asset_name=XR_TOKEN_CONFIG['name'],
        manager=sender_address,
        reserve=sender_address,
        freeze=sender_address,
        clawback=sender_address,
        url=XR_TOKEN_CONFIG['url'],
        strict_empty_address_check=False
    )
    
    # Sign and send transaction
    signed_txn = txn.sign(private_key)
    tx_id = client.send_transaction(signed_txn)
    
    print(f"Transaction sent with ID: {tx_id}")
    print("Waiting for confirmation...")
    
    confirmed_txn = wait_for_confirmation(client, tx_id, 4)
    asset_id = confirmed_txn['asset-index']
    
    print(f"XR Token deployed successfully!")
    print(f"Asset ID: {asset_id}")
    
    # Save deployment info
    deployment_info = {
        'asset_id': asset_id,
        'name': XR_TOKEN_CONFIG['name'],
        'unit_name': XR_TOKEN_CONFIG['unit_name'],
        'decimals': XR_TOKEN_CONFIG['decimals'],
        'total_supply': XR_TOKEN_CONFIG['initial_supply'],
        'deployer': sender_address,
        'tx_id': tx_id,
        'network': 'testnet'
    }
    
    output_path = Path(__file__).parent / 'deployment_testnet.json'
    with open(output_path, 'w') as f:
        json.dump(deployment_info, f, indent=2)
        
    print(f"Deployment info saved to {output_path}")
    return asset_id

if __name__ == "__main__":
    try:
        deploy_xr_token()
    except Exception as e:
        print(f"Error deploying XR Token: {e}")

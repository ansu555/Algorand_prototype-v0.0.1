#!/usr/bin/env python3
"""
X Token Deployment Configuration
=================================

Deploys the X Token (ASA) on Algorand TestNet.

This script creates an Algorand Standard Asset (ASA) for the X Token,
the official reward token for the 10xSwap ecosystem.

Requirements:
- DEPLOYER_MNEMONIC set in .env.local
- Sufficient ALGO balance for transaction fees (minimum 1 ALGO)

Usage:
    python smart_contracts/x_token/deploy_config.py

The script will:
1. Create the X Token ASA with proper configuration
2. Mint initial supply to the deployer (treasury)
3. Save deployment artifacts
4. Output the ASA ID for environment configuration
"""

from algosdk.v2client import algod
from algosdk import mnemonic, transaction
from algosdk.transaction import AssetConfigTxn, wait_for_confirmation
import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parents[4] / '.env.local'
load_dotenv(env_path)

# Token configuration
X_TOKEN_CONFIG = {
    'name': 'X Token',
    'symbol': 'X',
    'unit_name': 'X',
    'decimals': 6,
    'initial_supply': 1_000_000_000,  # 1 billion tokens
    'url': 'https://10xswap.io/xtoken',
    'description': 'X Token - The reward token for 10xSwap DEX ecosystem on Algorand',
}

# Network configuration
ALGOD_SERVER = os.getenv('ALGOD_SERVER', 'https://testnet-api.4160.nodely.dev')
ALGOD_PORT = int(os.getenv('ALGOD_PORT', '443'))
ALGOD_TOKEN = os.getenv('ALGOD_TOKEN', '')


def deploy_x_token():
    """Deploy X Token ASA on Algorand TestNet"""
    
    print('🚀 X Token Deployment Script')
    print('============================\n')
    
    # Validate environment
    deployer_mnemonic = os.getenv('DEPLOYER_MNEMONIC') or os.getenv('ALGORAND_MNEMONIC')
    if not deployer_mnemonic:
        print('❌ Error: DEPLOYER_MNEMONIC or ALGORAND_MNEMONIC not set in .env.local')
        return None
    
    # Initialize Algorand client
    print('📡 Connecting to Algorand TestNet...')
    print(f'   Server: {ALGOD_SERVER}')
    
    algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
    
    # Get deployer account
    deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
    deployer_address = mnemonic.to_public_key(deployer_mnemonic)
    
    print(f'\n📋 Deployer Address: {deployer_address}')
    
    # Check balance
    try:
        account_info = algod_client.account_info(deployer_address)
        balance = account_info['amount'] / 1_000_000
        print(f'💰 Deployer Balance: {balance:.6f} ALGO')
        
        if balance < 1:
            print('\n❌ Error: Insufficient balance. Need at least 1 ALGO for deployment.')
            print('   Get TestNet ALGO from: https://bank.testnet.algorand.network/')
            return None
    except Exception as e:
        print(f'❌ Error checking balance: {e}')
        return None
    
    # Calculate total supply with decimals
    total_supply_base_units = X_TOKEN_CONFIG['initial_supply'] * (10 ** X_TOKEN_CONFIG['decimals'])
    
    print('\n📊 Token Configuration:')
    print(f"   Name: {X_TOKEN_CONFIG['name']}")
    print(f"   Symbol: {X_TOKEN_CONFIG['symbol']}")
    print(f"   Decimals: {X_TOKEN_CONFIG['decimals']}")
    print(f"   Total Supply: {X_TOKEN_CONFIG['initial_supply']:,} {X_TOKEN_CONFIG['symbol']}")
    print(f"   Base Units: {total_supply_base_units}")
    print(f"   URL: {X_TOKEN_CONFIG['url']}")
    
    # Get suggested params
    print('\n⏳ Creating X Token ASA...')
    params = algod_client.suggested_params()
    
    # Create asset creation transaction
    asa_create_txn = AssetConfigTxn(
        sender=deployer_address,
        sp=params,
        total=total_supply_base_units,
        decimals=X_TOKEN_CONFIG['decimals'],
        default_frozen=False,
        
        # Asset identification
        unit_name=X_TOKEN_CONFIG['unit_name'][:8],  # Max 8 chars
        asset_name=X_TOKEN_CONFIG['name'][:32],     # Max 32 chars
        url=X_TOKEN_CONFIG['url'][:96],             # Max 96 chars
        
        # Management addresses
        manager=deployer_address,    # Can reconfigure asset
        reserve=deployer_address,    # Holds non-minted tokens
        freeze=None,                 # No freeze capability (fully decentralized)
        clawback=None,               # No clawback (fully decentralized)
        
        # Metadata note
        note=json.dumps({
            'standard': 'arc3',
            'description': X_TOKEN_CONFIG['description'],
            'properties': {
                'type': 'utility',
                'ecosystem': '10xSwap',
                'network': 'algorand-testnet',
            }
        }).encode()
    )
    
    # Sign transaction
    signed_txn = asa_create_txn.sign(deployer_private_key)
    
    # Submit to network
    print('📤 Submitting transaction...')
    tx_id = algod_client.send_transaction(signed_txn)
    print(f'   Transaction ID: {tx_id}')
    
    # Wait for confirmation
    print('⏳ Waiting for confirmation...')
    confirmed_txn = wait_for_confirmation(algod_client, tx_id, 4)
    asset_id = confirmed_txn['asset-index']
    
    print('\n✅ X Token Successfully Deployed!')
    print('================================')
    print(f'   ASA ID: {asset_id}')
    print(f'   Transaction: {tx_id}')
    print(f'   Creator/Treasury: {deployer_address}')
    print(f'\n🔗 View on AlgoExplorer:')
    print(f'   https://testnet.algoexplorer.io/asset/{asset_id}')
    print(f'   https://testnet.algoexplorer.io/tx/{tx_id}')
    
    # Save deployment info
    deployment_info = {
        'asaId': asset_id,
        'name': X_TOKEN_CONFIG['name'],
        'symbol': X_TOKEN_CONFIG['symbol'],
        'decimals': X_TOKEN_CONFIG['decimals'],
        'totalSupply': X_TOKEN_CONFIG['initial_supply'],
        'creatorAddress': deployer_address,
        'treasuryAddress': deployer_address,
        'txId': tx_id,
        'network': 'testnet',
        'deployedAt': confirmed_txn.get('confirmed-round'),
        'urls': {
            'asset': f'https://testnet.algoexplorer.io/asset/{asset_id}',
            'transaction': f'https://testnet.algoexplorer.io/tx/{tx_id}',
        }
    }
    
    # Save to artifacts
    artifacts_dir = Path(__file__).parent.parent.parent.parent / 'artifacts' / 'x_token'
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    
    deployment_path = artifacts_dir / 'deployment_testnet.json'
    with open(deployment_path, 'w') as f:
        json.dump(deployment_info, f, indent=2)
    
    print(f'\n💾 Deployment info saved to: {deployment_path}')
    
    # Output environment variable
    print('\n📝 Add to your .env.local:')
    print('─────────────────────────────')
    print(f'NEXT_PUBLIC_X_TOKEN_ASA_ID={asset_id}')
    print(f'X_TOKEN_TREASURY_ADDRESS={deployer_address}')
    print('─────────────────────────────')
    
    print('\n🎉 Deployment complete! The X Token is now live on Algorand TestNet.')
    print('   Users will need to opt-in to receive X tokens.')
    
    return deployment_info


if __name__ == '__main__':
    try:
        result = deploy_x_token()
        if result:
            print('\n✨ All done!')
            exit(0)
        else:
            exit(1)
    except Exception as e:
        print(f'\n❌ Deployment failed: {e}')
        import traceback
        traceback.print_exc()
        exit(1)

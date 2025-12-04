#!/usr/bin/env python3
"""
Staking Contract Deployment Script
==================================

Deploys and configures the Staking Contract.
"""

import json
import os
from pathlib import Path
from dotenv import load_dotenv
from algosdk.v2client import algod, indexer
from algosdk import mnemonic, account, transaction
from algosdk.atomic_transaction_composer import AccountTransactionSigner
import algokit_utils
from algokit_utils import Arc56Contract, AlgorandClient, AppFactory, AppFactoryParams, AlgoSdkClients, OnUpdate, OnSchemaBreak, EnsureBalanceParameters

# Load environment variables
env_path = Path(__file__).resolve().parents[5] / '.env.local'
load_dotenv(env_path)

# Configuration
ALGOD_SERVER = os.getenv('ALGOD_SERVER', 'https://testnet-api.4160.nodely.dev')
ALGOD_PORT = int(os.getenv('ALGOD_PORT', '443'))
ALGOD_TOKEN = os.getenv('ALGOD_TOKEN', '')
INDEXER_SERVER = os.getenv('INDEXER_SERVER', 'https://testnet-idx.4160.nodely.dev')
INDEXER_PORT = int(os.getenv('INDEXER_PORT', '443'))
INDEXER_TOKEN = os.getenv('INDEXER_TOKEN', '')

# Asset IDs (TestNet)
X_TOKEN_ID = 750589647
XR_TOKEN_ID = 751369844  # From previous step

def get_algod_client():
    return algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER)

def get_indexer_client():
    return indexer.IndexerClient(INDEXER_TOKEN, INDEXER_SERVER)

def get_deployer_account():
    mnemonic_phrase = os.getenv('DEPLOYER_MNEMONIC')
    if not mnemonic_phrase:
        raise ValueError("DEPLOYER_MNEMONIC not found")
    
    private_key = mnemonic.to_private_key(mnemonic_phrase)
    address = account.address_from_private_key(private_key)
    return private_key, address

def deploy():
    print("🚀 Deploying Staking Contract...")
    
    client = get_algod_client()
    indexer_client = get_indexer_client()
    private_key, sender_address = get_deployer_account()
    signer = AccountTransactionSigner(private_key)
    
    # Create AlgorandClient
    algorand = AlgorandClient(AlgoSdkClients(algod=client, indexer=indexer_client))
    algorand.set_signer(sender_address, signer)
    
    # Fund Deployer
    try:
        print("💰 Ensuring deployer is funded...")
        algorand.account.ensure_funded_from_environment(
            account_to_fund=sender_address,
            min_spending_balance=10_000_000  # 10 ALGO
        )
    except Exception as e:
        print(f"⚠️ Could not fund deployer: {e}")

    # Load App Spec
    artifacts_path = Path(__file__).parent / "StakingContract.arc56.json"
    with open(artifacts_path) as f:
        app_spec = Arc56Contract.from_json(f.read())
    
    # Create AppFactory
    factory = AppFactory(AppFactoryParams(
        algorand=algorand,
        app_spec=app_spec,
        default_sender=sender_address,
    ))
    
    # Deploy
    print("Creating application...")
    print(dir(factory.send))
    app_client, result = factory.deploy(
        on_schema_break=OnSchemaBreak.AppendApp,
        on_update=OnUpdate.AppendApp,
        ignore_cache=True
    )
    
    app_id = app_client.app_id
    app_addr = app_client.app_address
    print(f"✅ Contract Deployed! App ID: {app_id}, Address: {app_addr}")
    
    # Fund Contract (for MBR and Opt-ins)
    print("💰 Funding contract...")
    
    try:
        sp = client.suggested_params()
        pay_txn = transaction.PaymentTxn(
            sender=sender_address,
            sp=sp,
            receiver=app_addr,
            amt=500_000  # 0.5 ALGO
        )
        signed_pay = pay_txn.sign(private_key)
        client.send_transaction(signed_pay)
        transaction.wait_for_confirmation(client, signed_pay.get_txid(), 4)
        print("✅ Contract funded")
    except Exception as e:
        print(f"❌ Failed to fund contract: {e}")
        print(f"⚠️ Please fund the contract address {app_addr} with at least 0.5 ALGO")
        print("⚠️ Then run the configuration manually.")
        # Save info anyway so we can resume later
        info = {
            "app_id": int(app_id),
            "app_address": app_addr,
            "staked_asset": X_TOKEN_ID,
            "reward_asset": XR_TOKEN_ID,
            "network": "testnet"
        }
        with open(Path(__file__).parent / "deployment_testnet.json", "w") as f:
            json.dump(info, f, indent=2)
        return

    # Configure
    print("⚙️ Configuring contract...")
    # configure(staked_asset, reward_asset, reward_rate)
    # Reward Rate: 0.01 XR/sec = 10,000 micro units
    REWARD_RATE = 10_000
    
    try:
        app_client.send.call(
            algokit_utils.AppCallMethodCallParams(
                method="configure",
                args=[X_TOKEN_ID, XR_TOKEN_ID, REWARD_RATE],
                extra_foreign_assets=[X_TOKEN_ID, XR_TOKEN_ID]
            )
        )
        print("✅ Contract configured")
    except Exception as e:
        print(f"❌ Failed to configure contract: {e}")
        return
    
    # Fund with XR Tokens (Rewards)
    print("🎁 Funding rewards...")
    # Send 100,000 XR tokens (10% of supply)
    REWARD_AMOUNT = 100_000 * 1_000_000
    
    try:
        xr_transfer_txn = transaction.AssetTransferTxn(
            sender=sender_address,
            sp=sp,
            receiver=app_addr,
            amt=REWARD_AMOUNT,
            index=XR_TOKEN_ID
        )
        signed_xr = xr_transfer_txn.sign(private_key)
        client.send_transaction(signed_xr)
        transaction.wait_for_confirmation(client, signed_xr.get_txid(), 4)
        print(f"✅ Rewards funded: {REWARD_AMOUNT / 1_000_000} XR")
    except Exception as e:
        print(f"❌ Failed to fund rewards: {e}")
    
    # Save deployment info
    info = {
        "app_id": int(app_id),
        "app_address": app_addr,
        "staked_asset": X_TOKEN_ID,
        "reward_asset": XR_TOKEN_ID,
        "network": "testnet"
    }
    
    with open(Path(__file__).parent / "deployment_testnet.json", "w") as f:
        json.dump(info, f, indent=2)
        
    print("✅ Deployment complete!")

if __name__ == "__main__":
    try:
        deploy()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

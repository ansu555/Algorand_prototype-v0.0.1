#!/usr/bin/env python3
"""
Opt MultihopSwapRouter contract into assets
"""
import os
import sys
from pathlib import Path
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import wait_for_confirmation
from algosdk import abi
import algosdk

def main():
    if len(sys.argv) < 2:
        print("Usage: python opt_into_assets.py <asset_id1> [asset_id2] [asset_id3] ...")
        print("\nExample:")
        print("  python opt_into_assets.py 10458941 312769")
        sys.exit(1)
    
    asset_ids = [int(aid) for aid in sys.argv[1:]]
    
    # Load environment
    try:
        from dotenv import load_dotenv
        env_file = Path(__file__).parent / ".env.testnet"
        if env_file.exists():
            load_dotenv(env_file)
    except ImportError:
        env_file = Path(__file__).parent / ".env.testnet"
        if env_file.exists():
            for line in env_file.read_text().strip().split('\n'):
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
    
    # Get deployer account
    mnemonic_phrase = os.getenv("DEPLOYER_MNEMONIC")
    if not mnemonic_phrase:
        raise ValueError("DEPLOYER_MNEMONIC not set in .env.testnet")
    
    mnemonic_phrase = mnemonic_phrase.strip().strip('"').strip("'")
    private_key = mnemonic.to_private_key(mnemonic_phrase)
    deployer_address = account.address_from_private_key(private_key)
    
    # Connect to testnet
    algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")
    
    # Get router app ID
    app_id_file = Path(__file__).parent / "deployed_app_id.txt"
    if not app_id_file.exists():
        raise FileNotFoundError("deployed_app_id.txt not found. Deploy contract first.")
    
    router_app_id = int(app_id_file.read_text().strip())
    router_address = algosdk.logic.get_application_address(router_app_id)
    
    print(f"Opting MultihopSwapRouter into assets...")
    print(f"Router App ID: {router_app_id}")
    print(f"Router Address: {router_address}")
    print(f"Deployer: {deployer_address}")
    print(f"\nAssets to opt-in: {asset_ids}")
    print()
    
    # Opt into each asset
    for asset_id in asset_ids:
        try:
            print(f"Opting into asset {asset_id}...")
            
            # Build method call using ABI
            method_sig = "opt_into_asset(uint64)bool"
            abiMethod = algosdk.abi.Method.from_signature(method_sig)
            selector = abiMethod.get_selector()
            
            # Encode arguments
            args = [selector, algosdk.encoding.encode_uint64(asset_id)]
            
            # Get suggested params
            params = algod_client.suggested_params()
            
            # Create transaction
            txn = algosdk.transaction.ApplicationCallTxn(
                sender=deployer_address,
                sp=params,
                index=router_app_id,
                on_complete=algosdk.transaction.OnComplete.NoOpOC,
                app_args=args,
                foreign_assets=[asset_id],
            )
            
            # Sign and send
            signed_txn = txn.sign(private_key)
            tx_id = algod_client.send_transaction(signed_txn)
            
            print(f"  Transaction ID: {tx_id}")
            print(f"  Waiting for confirmation...")
            
            # Wait for confirmation
            wait_for_confirmation(algod_client, tx_id, 4)
            
            print(f"  ✅ Asset {asset_id} opted in successfully!")
            print(f"  Explorer: https://testnet.explorer.perawallet.app/tx/{tx_id}\n")
            
        except Exception as e:
            print(f"  ❌ Failed to opt into asset {asset_id}: {e}\n")
            continue
    
    print("Opt-in process complete!")
    print(f"\nContract {router_app_id} can now receive these assets:")
    for asset_id in asset_ids:
        print(f"  - Asset {asset_id}")

if __name__ == "__main__":
    main()

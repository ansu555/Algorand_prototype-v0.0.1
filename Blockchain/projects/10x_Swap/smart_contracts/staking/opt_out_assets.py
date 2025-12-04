from algosdk.v2client import algod
from algosdk import mnemonic, transaction, account
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parents[5] / '.env.local'
load_dotenv(env_path)

ALGOD_SERVER = os.getenv('ALGOD_SERVER', 'https://testnet-api.4160.nodely.dev')
ALGOD_TOKEN = os.getenv('ALGOD_TOKEN', '')

def opt_out_all():
    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER)
    mnemonic_phrase = os.getenv('DEPLOYER_MNEMONIC')
    private_key = mnemonic.to_private_key(mnemonic_phrase)
    address = account.address_from_private_key(private_key)
    
    print(f"Account: {address}")
    info = client.account_info(address)
    assets = info.get('assets', [])
    print(f"Assets: {len(assets)}")
    
    for asset in assets:
        asset_id = asset['asset-id']
        amount = asset['amount']
        # Only opt out if balance is 0, or if it's a random token we don't care about.
        # But be careful not to opt out of X Token or XR Token if we hold them.
        # X Token: 750589647
        # XR Token: 751369844
        
        if asset_id in [750589647, 751369844]:
            print(f"Skipping important asset {asset_id}")
            continue
            
        if amount == 0:
            print(f"Opting out of asset {asset_id}...")
            sp = client.suggested_params()
            txn = transaction.AssetTransferTxn(
                sender=address,
                sp=sp,
                receiver=address, # Send to self to close
                amt=0,
                index=asset_id,
                close_assets_to=address
            )
            signed = txn.sign(private_key)
            try:
                client.send_transaction(signed)
                print(f"Opted out of {asset_id}")
            except Exception as e:
                print(f"Failed to opt out of {asset_id}: {e}")
        else:
            print(f"Skipping asset {asset_id} with balance {amount}")

    apps = info.get('apps-local-state', [])
    print(f"Apps: {len(apps)}")
    
    for app in apps:
        app_id = app['id']
        # Don't opt out of the staking contract we just deployed if we did?
        # But we are deployer, we don't opt in to it usually unless we test.
        
        print(f"Opting out of app {app_id}...")
        sp = client.suggested_params()
        txn = transaction.ApplicationClearStateTxn(
            sender=address,
            sp=sp,
            index=app_id
        )
        signed = txn.sign(private_key)
        try:
            client.send_transaction(signed)
            print(f"Opted out of app {app_id}")
        except Exception as e:
            print(f"Failed to opt out of app {app_id}: {e}")

    created_apps = info.get('created-apps', [])
    print(f"Created Apps: {len(created_apps)}")
    for app in created_apps:
        app_id = app['id']
        if app_id == 751370931:
            print(f"Skipping current app {app_id}")
            continue
            
        print(f"Deleting app {app_id}...")
        sp = client.suggested_params()
        txn = transaction.ApplicationDeleteTxn(
            sender=address,
            sp=sp,
            index=app_id
        )
        signed = txn.sign(private_key)
        try:
            client.send_transaction(signed)
            print(f"Deleted app {app_id}")
        except Exception as e:
            print(f"Failed to delete app {app_id}: {e}")

if __name__ == "__main__":
    opt_out_all()

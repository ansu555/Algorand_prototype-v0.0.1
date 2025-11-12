"""
Opt the AutoPilot contract into necessary assets
"""
import json
from pathlib import Path
from algosdk import transaction
from algosdk.v2client import algod
from algokit_utils import Account

# Testnet assets
ASSETS_TO_OPT_IN = [
    10458941,  # USDC
    67396430,  # USDT
    70283957,  # ALGF
]

def opt_in_assets():
    # Load deployment info
    deployment_file = Path(__file__).parent / "deployed_autopilot.json"
    with open(deployment_file) as f:
        deployment = json.load(f)
    
    app_id = deployment["app_id"]
    app_address = deployment["app_address"]
    
    # Connect to testnet
    algod_token = ""
    algod_server = "https://testnet-api.4160.nodely.dev"
    algod_client = algod.AlgodClient(algod_token, algod_server)
    
    # Load deployer account (needed to authorize opt-ins)
    mnemonic = input("Enter deployer mnemonic (will not be stored): ")
    deployer = Account.from_mnemonic(mnemonic)
    
    print(f"\n🔐 Opting contract {app_id} into assets...")
    
    for asset_id in ASSETS_TO_OPT_IN:
        try:
            # Check if already opted in
            account_info = algod_client.account_asset_info(app_address, asset_id)
            print(f"   ✅ Already opted into asset {asset_id}")
            continue
        except Exception:
            # Not opted in, proceed with opt-in
            pass
        
        # Create opt-in transaction (asset transfer of 0 to self)
        params = algod_client.suggested_params()
        
        # Make an app call to opt-in via inner transaction
        # For now, we'll do a direct opt-in from the deployer
        # In production, you'd want to add an admin method to the contract
        print(f"   ⚠️  Asset {asset_id} requires manual opt-in via contract method")
        print(f"      Contract needs to create inner AssetTransfer to itself")
    
    print("\n✅ Asset opt-in check complete")
    print("\n⚠️  Note: The contract needs to opt-in via inner transactions")
    print("   Consider adding an admin method to opt-in to assets")

if __name__ == "__main__":
    opt_in_assets()

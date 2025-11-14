#!/usr/bin/env python3
"""
Check deployer account address and balance
"""
import os
from algosdk import account, mnemonic
from algosdk.v2client.algod import AlgodClient
from dotenv import load_dotenv

# Load environment variables from root .env
env_path = os.path.join(os.path.dirname(__file__), '../../..', '.env')
load_dotenv(env_path)

def main():
    # Get deployer mnemonic
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    if not deployer_mnemonic:
        print("❌ DEPLOYER_MNEMONIC not found in .env file")
        print("Please set it in your .env file")
        return

    # Get account address
    try:
        deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
        deployer_address = account.address_from_private_key(deployer_private_key)
        print(f"✓ Deployer Address: {deployer_address}")
    except Exception as e:
        print(f"❌ Error parsing mnemonic: {e}")
        return

    # Connect to testnet
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    algod_client = AlgodClient(algod_token, algod_address)

    try:
        # Get account info
        account_info = algod_client.account_info(deployer_address)
        balance_microalgos = account_info.get('amount', 0)
        balance_algos = balance_microalgos / 1_000_000
        min_balance = account_info.get('min-balance', 0) / 1_000_000

        print(f"✓ Balance: {balance_algos:.6f} ALGO")
        print(f"✓ Minimum Balance: {min_balance:.6f} ALGO")
        print(f"✓ Available: {balance_algos - min_balance:.6f} ALGO")

        # Check if sufficient for deployment
        required_algo = 5.0  # Need ~5 ALGO for deployment
        if balance_algos < required_algo:
            print(f"\n⚠️  WARNING: You need at least {required_algo} ALGO for deployment")
            print(f"   You have: {balance_algos:.6f} ALGO")
            print(f"   You need: {required_algo - balance_algos:.6f} more ALGO")
            print(f"\n💡 Get testnet ALGO from the dispenser:")
            print(f"   https://bank.testnet.algorand.network/")
            print(f"   Enter your address: {deployer_address}")
        else:
            print(f"\n✓ You have sufficient ALGO for deployment!")
            print(f"  Ready to deploy the liquidity pool contract")

    except Exception as e:
        print(f"❌ Error checking account: {e}")
        print(f"\n💡 Get testnet ALGO from the dispenser:")
        print(f"   https://bank.testnet.algorand.network/")
        print(f"   Enter your address: {deployer_address}")

if __name__ == "__main__":
    main()

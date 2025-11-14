#!/usr/bin/env python3
"""
Create a new Algorand account for deployment
"""
from algosdk import account, mnemonic

def main():
    print("🔐 Creating new Algorand testnet account...\n")

    # Generate a new account
    private_key, address = account.generate_account()
    account_mnemonic = mnemonic.from_private_key(private_key)

    print("=" * 80)
    print("✅ NEW ACCOUNT CREATED")
    print("=" * 80)
    print(f"\n📍 Address:")
    print(f"   {address}")
    print(f"\n🔑 Mnemonic (25 words):")
    print(f"   {account_mnemonic}")
    print("\n" + "=" * 80)

    print("\n📝 NEXT STEPS:")
    print("=" * 80)
    print("\n1. SAVE YOUR MNEMONIC SECURELY!")
    print("   ⚠️  NEVER share it or commit it to Git!")
    print("   ⚠️  You'll lose access to funds if you lose this!")

    print("\n2. Add to your .env file:")
    print(f'   DEPLOYER_MNEMONIC="{account_mnemonic}"')

    print("\n3. Get testnet ALGO:")
    print("   Go to: https://bank.testnet.algorand.network/")
    print(f"   Enter address: {address}")
    print("   Click 'Dispense' to get free testnet ALGO")

    print("\n4. Wait ~5 seconds for the transaction to confirm")

    print("\n5. Deploy the contract:")
    print("   python smart_contracts/liquidity_pool/deploy_config.py")

    print("\n" + "=" * 80)
    print()

if __name__ == "__main__":
    main()

#!/bin/bash
# Helper script to set up deployment wallet

echo "🔐 Algorand Testnet Deployment Setup"
echo "===================================="
echo ""
echo "You need a testnet wallet with ALGO to deploy the contract."
echo ""
echo "Option 1: Use existing Pera Wallet account"
echo "  1. Open Pera Wallet mobile app"
echo "  2. Go to Settings > [Your Account] > Show Recovery Phrase"
echo "  3. Copy all 25 words"
echo "  4. Edit .env.testnet and paste the mnemonic"
echo ""
echo "Option 2: Create a new account with AlgoKit"
echo "  Run: algokit goal account new MyDeployerAccount"
echo "  This will show you the mnemonic - copy it to .env.testnet"
echo ""
echo "Option 3: Use this script to generate a new account"
echo ""
read -p "Generate a new testnet account? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Generating new Algorand account..."
    
    # Use Python to generate account
    python3 << 'EOF'
from algosdk import account, mnemonic

# Generate new account
private_key, address = account.generate_account()
mn = mnemonic.from_private_key(private_key)

print("\n✅ New Algorand Account Generated!")
print("=" * 60)
print(f"\nAddress: {address}")
print(f"\nMnemonic (25 words):")
print(f"{mn}")
print("\n" + "=" * 60)
print("\n⚠️  IMPORTANT:")
print("1. Copy the mnemonic above")
print("2. Edit .env.testnet file")
print("3. Replace the DEPLOYER_MNEMONIC value with your mnemonic")
print("4. Get testnet ALGO from: https://bank.testnet.algorand.network/")
print("   - Paste your address and dispense 10 ALGO")
print("5. Run: poetry run python deploy_contract.py")
print("\n⚠️  Keep your mnemonic SECRET! Never share it or commit to git!")
print("")
EOF
else
    echo ""
    echo "No problem! Here's what to do:"
    echo "1. Get your 25-word mnemonic from your wallet"
    echo "2. Edit .env.testnet file:"
    echo "   nano .env.testnet"
    echo "3. Replace the DEPLOYER_MNEMONIC value"
    echo "4. Get testnet ALGO: https://bank.testnet.algorand.network/"
    echo "5. Deploy: poetry run python deploy_contract.py"
    echo ""
fi

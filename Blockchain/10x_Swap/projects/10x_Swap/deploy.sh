#!/bin/bash

# 🚀 Quick Contract Deployment Script
# This script deploys your MultihopSwapRouter contract to Algorand testnet

set -e  # Exit on error

echo "🚀 MultihopSwapRouter Deployment Script"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "pyproject.toml" ]; then
    echo "❌ Error: Must run from Blockchain/10x_Swap/projects/10x_Swap directory"
    echo "Run: cd Blockchain/10x_Swap/projects/10x_Swap"
    exit 1
fi

# Check if AlgoKit is installed
if ! command -v algokit &> /dev/null; then
    echo "❌ AlgoKit not found!"
    echo "Install with: brew install algorand/tap/algokit"
    exit 1
fi

# Check for .env.testnet file
if [ ! -f ".env.testnet" ]; then
    echo "⚠️  No .env.testnet file found!"
    echo ""
    echo "Creating .env.testnet template..."
    echo 'DEPLOYER_MNEMONIC="your 25 word mnemonic phrase here"' > .env.testnet
    echo ""
    echo "📝 Please edit .env.testnet and add your mnemonic phrase"
    echo "   Then run this script again"
    echo ""
    echo "Need a wallet?"
    echo "  1. Run: algokit generate account"
    echo "  2. Copy the mnemonic to .env.testnet"
    echo "  3. Get testnet ALGO: https://bank.testnet.algorand.network/"
    exit 1
fi

# Check if mnemonic is set
if grep -q "your 25 word mnemonic" .env.testnet; then
    echo "❌ Please update .env.testnet with your actual mnemonic"
    exit 1
fi

echo "✅ Environment configured"
echo ""

# Step 1: Build
echo "📦 Step 1: Building smart contract..."
algokit project run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Step 2: Deploy
echo "🚀 Step 2: Deploying to testnet..."
echo ""

algokit project deploy testnet | tee deploy_output.txt

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""

# Try to extract App ID from output
APP_ID=$(grep -oE "App ID: [0-9]+" deploy_output.txt | grep -oE "[0-9]+")

if [ -n "$APP_ID" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 Contract Deployed Successfully!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 Contract Details:"
    echo "   App ID: $APP_ID"
    echo ""
    echo "🔗 View on AlgoExplorer:"
    echo "   https://testnet.algoexplorer.io/application/$APP_ID"
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Save App ID: $APP_ID"
    echo "   2. Update src/lib/config/contracts.ts"
    echo "   3. Fund the contract with ALGO"
    echo "   4. Opt into required assets"
    echo ""
    
    # Save App ID to file
    echo "$APP_ID" > .app_id
    echo "💾 App ID saved to .app_id"
    
else
    echo "⚠️  Could not extract App ID from output"
    echo "Check deploy_output.txt for details"
fi

# Clean up
rm -f deploy_output.txt

echo ""
echo "✨ Deployment complete!"

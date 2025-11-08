#!/bin/bash

# Check your wallet balance on Algorand testnet
# This shows all assets you hold

YOUR_ADDRESS="YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I"

echo "🔍 Checking your wallet balances on Testnet..."
echo "Address: $YOUR_ADDRESS"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Using Algonode (more reliable)
echo "📊 Fetching account info..."
curl -s "https://testnet-api.algonode.cloud/v2/accounts/$YOUR_ADDRESS" | python3 -c "
import sys, json

data = json.load(sys.stdin)

print('ALGO Balance:', data['amount'] / 1000000, 'ALGO')
print('')
print('Assets you hold:')
print('─' * 60)

if 'assets' in data and len(data['assets']) > 0:
    for asset in data['assets']:
        asset_id = asset['asset-id']
        amount = asset['amount']
        
        # Fetch asset name
        print(f'Asset ID: {asset_id}')
        print(f'  Amount: {amount}')
        print('')
else:
    print('No assets found (besides ALGO)')
"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "💡 To see the full transaction group:"
echo "   https://testnet.algoexplorer.io/tx/V47MI6Y3PBOASAK2LVNQ7D3QNQVXY2IEEM5KG2LONHGKHPMBU5MA"
echo ""
echo "💡 To see your account history:"
echo "   https://testnet.algoexplorer.io/address/$YOUR_ADDRESS"

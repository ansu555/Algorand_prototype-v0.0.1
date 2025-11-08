#!/bin/bash
# Compile PactPoolAdapter contract using AlgoKit/PuyaPy

echo "🔨 Compiling PactPoolAdapter..."
echo ""

# Check if puyapy is available
if ! command -v puyapy &> /dev/null; then
    echo "❌ puyapy not found. Installing..."
    pip install puyapy
fi

# Navigate to contract directory
cd "$(dirname "$0")"

# Create artifacts directory if it doesn't exist
mkdir -p smart_contracts/artifacts

# Compile the Pact adapter
echo "Compiling pact_adapter.py..."
puyapy pact_adapter.py --out-dir smart_contracts/artifacts

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Compilation successful!"
    echo ""
    echo "Artifacts created:"
    ls -lh smart_contracts/artifacts/PactPoolAdapter.*
    echo ""
    echo "Next step: Run deployment script"
    echo "  python3 deploy_pact_adapter.py"
else
    echo ""
    echo "❌ Compilation failed"
    exit 1
fi

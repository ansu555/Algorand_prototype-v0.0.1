#!/bin/bash

# Token Launchpad - Compile Script
# Compiles contract.py and outputs to centralized artifacts directory

echo "🔨 Compiling Token Launchpad Contract..."
echo "=================================================="

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
CONTRACT_PATH="$PROJECT_ROOT/Blockchain/projects/10x_Swap/smart_contracts/token_launchpad/contract.py"
OUTPUT_DIR="$PROJECT_ROOT/artifacts/token_launchpad"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Compile
algokit compile py "$CONTRACT_PATH" --out-dir "$OUTPUT_DIR"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Compilation successful!"
    echo "📁 Artifacts saved to: artifacts/token_launchpad/"
    echo ""
    echo "Files generated:"
    ls -lh "$OUTPUT_DIR"/*.teal "$OUTPUT_DIR"/*.json 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
else
    echo ""
    echo "❌ Compilation failed!"
    exit 1
fi

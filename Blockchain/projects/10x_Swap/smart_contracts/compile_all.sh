#!/bin/bash

# Compile All Smart Contracts
# This script compiles all smart contracts and organizes artifacts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Use root-level artifacts directory (go up to Algorand_prototype-v0.0.1)
ARTIFACTS_DIR="$SCRIPT_DIR/../../../artifacts"

echo "=================================================="
echo "  Compiling Algorand Smart Contracts"
echo "=================================================="
echo

# Create artifacts directory structure
mkdir -p "$ARTIFACTS_DIR/multihop_swap"
mkdir -p "$ARTIFACTS_DIR/autopilot_rule"

# Compile MultihopSwapRouter
echo "📦 Compiling MultihopSwapRouter..."
cd "$SCRIPT_DIR/multihop_swap"
algokit compile py contract.py

# Move artifacts
if [ -f "MultihopSwapRouter.approval.teal" ]; then
    mv MultihopSwapRouter.* "$ARTIFACTS_DIR/multihop_swap/"
    echo "✅ MultihopSwapRouter compiled and moved to artifacts/multihop_swap/"
else
    echo "❌ MultihopSwapRouter compilation failed"
fi

echo

# Compile PactPoolAdapter
echo "📦 Compiling PactPoolAdapter..."
cd "$SCRIPT_DIR/multihop_swap"
algokit compile py pact_adapter.py

# Move artifacts
if [ -f "PactPoolAdapter.approval.teal" ]; then
    mv PactPoolAdapter.* "$ARTIFACTS_DIR/multihop_swap/"
    echo "✅ PactPoolAdapter compiled and moved to artifacts/multihop_swap/"
else
    echo "❌ PactPoolAdapter compilation failed"
fi

echo

# Compile TinymanPoolAdapter
echo "📦 Compiling TinymanPoolAdapter..."
cd "$SCRIPT_DIR/multihop_swap"
algokit compile py tinyman_adapter.py

# Move artifacts
if [ -f "TinymanPoolAdapter.approval.teal" ]; then
    mv TinymanPoolAdapter.* "$ARTIFACTS_DIR/multihop_swap/"
    echo "✅ TinymanPoolAdapter compiled and moved to artifacts/multihop_swap/"
else
    echo "❌ TinymanPoolAdapter compilation failed"
fi

echo
if [ -f "$SCRIPT_DIR/multihop_swap/tinyman_adapter.py" ]; then
    echo "📦 Compiling TinymanPoolAdapter..."
    cd "$SCRIPT_DIR/multihop_swap"
    algokit compile py tinyman_adapter.py
    
    if [ -f "TinymanPoolAdapter.approval.teal" ]; then
        mv TinymanPoolAdapter.* "$ARTIFACTS_DIR/multihop_swap/"
        echo "✅ TinymanPoolAdapter compiled and moved to artifacts/multihop_swap/"
    else
        echo "⚠️  TinymanPoolAdapter compilation failed or not ready"
    fi
    echo
fi

# Compile AutoPilotRuleContract
echo "📦 Compiling AutoPilotRuleContract..."
cd "$SCRIPT_DIR/autopilot_rule"
algokit compile py contract.py

# Move artifacts
if [ -f "AutoPilotRuleContract.approval.teal" ]; then
    mv AutoPilotRuleContract.* "$ARTIFACTS_DIR/autopilot_rule/"
    echo "✅ AutoPilotRuleContract compiled and moved to artifacts/autopilot_rule/"
else
    echo "❌ AutoPilotRuleContract compilation failed"
fi

echo
echo "=================================================="
echo "  ✅ Compilation Complete!"
echo "=================================================="
echo
echo "Artifacts organized in:"
echo "  $ARTIFACTS_DIR/multihop_swap/"
echo "  $ARTIFACTS_DIR/autopilot_rule/"
echo

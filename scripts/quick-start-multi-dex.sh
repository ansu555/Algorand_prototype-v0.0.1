#!/bin/bash
# Quick Start Script for Multi-DEX Integration
# Run this to set up and test multi-DEX routing

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════"
echo "  🚀 MULTI-DEX QUICK START"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if we're in the right directory
if [ ! -d "Blockchain/projects/10x_Swap" ]; then
    echo "❌ Error: Please run this script from the project root"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📁 Working directory: $(pwd)"
echo ""

# Step 1: Check Node.js installation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Checking Node.js installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js installed: $NODE_VERSION"
echo ""

# Step 2: Install dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Installing dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm packages..."
    npm install
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Step 3: Check Python installation (for contract deployment)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Checking Python installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! command -v python3 &> /dev/null; then
    echo "⚠️  Python3 not found. Skipping contract deployment check."
else
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python installed: $PYTHON_VERSION"
fi
echo ""

# Step 4: Run multi-DEX tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Running multi-DEX routing tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🧪 Testing multi-DEX quote comparison and selection..."
echo ""

if [ -f "scripts/test-multi-dex-routing.ts" ]; then
    npx tsx scripts/test-multi-dex-routing.ts
    echo ""
    echo "✅ Multi-DEX tests completed!"
else
    echo "❌ Test script not found: scripts/test-multi-dex-routing.ts"
    exit 1
fi
echo ""

# Step 5: Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ QUICK START COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📚 NEXT STEPS:"
echo ""
echo "1. Deploy Pact Adapter Contract:"
echo "   cd Blockchain/projects/10x_Swap/smart_contracts/multihop_swap"
echo "   python deploy_pact_adapter.py"
echo ""
echo "2. Update your app configuration:"
echo "   See: docs/MULTI_DEX_CHECKLIST.md (Step 3)"
echo ""
echo "3. Integrate aggregator into your app:"
echo "   import { createMultiDexAggregator } from './src/lib/dex/aggregator';"
echo ""
echo "4. Read comprehensive documentation:"
echo "   - docs/MULTI_DEX_SUMMARY.md (Overview)"
echo "   - docs/MULTI_DEX_AGGREGATION.md (Technical details)"
echo "   - docs/MULTI_DEX_CHECKLIST.md (Deployment guide)"
echo "   - docs/MULTI_DEX_FLOW_DIAGRAM.md (Visual diagrams)"
echo ""

echo "═══════════════════════════════════════════════════════"
echo "  🎉 Multi-DEX system ready to use!"
echo "═══════════════════════════════════════════════════════"
echo ""

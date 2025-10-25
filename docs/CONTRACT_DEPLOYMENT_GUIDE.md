# 🚀 Smart Contract Deployment Guide

## 📋 Overview

Your multihop swap router contract is ready to deploy! This guide will walk you through the entire deployment process step-by-step.

**Contract Location:** `Blockchain/10x_Swap/projects/10x_Swap/smart_contracts/multihop_swap/contract.py`

---

## ⚡ Quick Start (TL;DR)

```bash
cd Blockchain/10x_Swap/projects/10x_Swap

# Set up environment
echo "DEPLOYER_MNEMONIC=\"your 25 word mnemonic here\"" > .env.testnet

# Build contract
algokit project run build

# Deploy to testnet
algokit project deploy testnet

# Save the App ID that gets printed!
```

---

## 📝 Detailed Step-by-Step Guide

### Step 1: Navigate to Project Directory

```bash
cd Blockchain/10x_Swap/projects/10x_Swap
```

### Step 2: Install Dependencies

```bash
# Install AlgoKit if not already installed
brew install algorand/tap/algokit  # macOS
# OR
pipx install algokit  # Other platforms

# Install project dependencies
poetry install
```

### Step 3: Set Up Your Wallet

You need a wallet with testnet ALGO to deploy the contract.

#### Option A: Use Existing Wallet

If you have a wallet with testnet ALGO:

```bash
# Create .env.testnet file
nano .env.testnet
```

Add this line (replace with your actual mnemonic):
```
DEPLOYER_MNEMONIC="word1 word2 word3 ... word25"
```

**⚠️ IMPORTANT:** Never commit .env files to git! They're already in .gitignore.

#### Option B: Create New Wallet

```bash
# Generate new account
algokit generate account

# This will output:
# - Address (XXXXXXX...)
# - Mnemonic (25 words)

# Save the mnemonic to .env.testnet
echo 'DEPLOYER_MNEMONIC="your 25 words here"' > .env.testnet
```

Then get testnet ALGO:
```
Visit: https://bank.testnet.algorand.network/
Paste your address
Click "Dispense"
```

### Step 4: Build the Contract

Compile your smart contract to TEAL:

```bash
algokit project run build
```

**Expected Output:**
```
✅ Building smart contracts...
📝 Generating TEAL code for MultihopSwapRouter
✅ Build complete!
   Artifacts: smart_contracts/artifacts/
```

**Check the artifacts:**
```bash
ls -la smart_contracts/artifacts/MultihopSwapRouter/
```

You should see:
- `approval.teal` - Main contract logic
- `clear.teal` - Clear state program
- `contract.json` - ABI specification

### Step 5: Deploy to Testnet

```bash
algokit project deploy testnet
```

**Expected Output:**
```
🚀 Deploying to testnet...
📡 Connecting to Algorand testnet
💰 Deployer address: YOURADDRESS...
✅ Contract deployed!
   App ID: 12345678
   Address: CONTRACTADDRESS...
   Creator: YOURADDRESS...
```

**🎯 SAVE THE APP ID!** You'll need this number.

### Step 6: Verify Deployment

Check your contract on AlgoExplorer:

```
https://testnet.algoexplorer.io/application/YOUR_APP_ID
```

You should see:
- ✅ Application ID
- ✅ Creator address
- ✅ Creation transaction
- ✅ Global state
- ✅ TEAL code

### Step 7: Save App ID to Your Project

Create a config file:

```bash
# In your main project root
cat > src/lib/config/contracts.ts << 'EOF'
export const CONTRACTS = {
  testnet: {
    MULTIHOP_ROUTER: 12345678, // Replace with your actual App ID
  },
  mainnet: {
    MULTIHOP_ROUTER: 0, // Deploy to mainnet later
  }
}

export function getContractAppId(network: 'testnet' | 'mainnet'): number {
  return CONTRACTS[network].MULTIHOP_ROUTER
}
EOF
```

**Replace `12345678` with your actual App ID!**

---

## 🔧 Post-Deployment Setup

### 1. Fund the Contract

The contract needs ALGO for inner transactions:

```bash
# Get your contract address from AlgoExplorer
# Send 1-2 ALGO to it

goal clerk send \
  --from YOUR_DEPLOYER_ADDRESS \
  --to CONTRACT_ADDRESS \
  --amount 1000000 \
  --note "Funding contract"
```

Or use the dispenser:
```
https://bank.testnet.algorand.network/
Paste contract address
Dispense ALGO
```

### 2. Opt Contract Into Assets

The contract must opt-in to any ASAs it will handle:

```bash
# Example: Opt into USDC (asset ID 31566704 on testnet)
algokit task send \
  --app-id YOUR_APP_ID \
  --method "opt_into_asset(asset)void" \
  --arg asset:31566704
```

Repeat for each ASA your contract will swap.

---

## 📊 Contract Information

### What Gets Deployed

**Contract:** MultihopSwapRouter  
**Type:** ARC4 Smart Contract  
**Language:** Python (AlgoPy)  
**Compiled to:** TEAL (approval + clear programs)

### Available Methods

1. `create_application()` - Initialize contract
2. `execute_swap_2hop()` - 2-hop swaps
3. `execute_swap_3hop()` - 3-hop swaps
4. `execute_swap_algo_to_asa()` - ALGO → ASA swaps
5. `opt_into_asset()` - Opt contract into ASA
6. `withdraw_asset()` - Emergency withdrawal (creator only)
7. `withdraw_algo()` - Emergency withdrawal (creator only)

### Global State

The contract stores:
- Creator address
- Initialization status
- Opted-in assets

---

## 🧪 Testing Your Deployed Contract

### Test 1: Verify Contract Exists

```bash
algokit goal app info --app-id YOUR_APP_ID
```

### Test 2: Check Contract Balance

```bash
algokit goal account balance -a CONTRACT_ADDRESS
```

### Test 3: Call Opt-In Method

```bash
# Opt contract into testnet USDC
algokit task send \
  --app-id YOUR_APP_ID \
  --method "opt_into_asset(asset)void" \
  --arg asset:31566704
```

---

## 🔄 Updating the Contract

If you make changes to your contract:

```bash
# Rebuild
algokit project run build

# Update (if contract is updatable)
algokit project deploy testnet --update

# Or delete and redeploy
algokit goal app delete --app-id YOUR_APP_ID
algokit project deploy testnet
```

**⚠️ Note:** By default, your contract might not be updatable for security.

---

## 🚨 Troubleshooting

### Error: "DEPLOYER_MNEMONIC not found"

**Fix:** Create `.env.testnet` file:
```bash
echo 'DEPLOYER_MNEMONIC="your mnemonic"' > .env.testnet
```

### Error: "Insufficient balance"

**Fix:** Fund your deployer account:
```
https://bank.testnet.algorand.network/
```

### Error: "Invalid TEAL program"

**Fix:** Rebuild the contract:
```bash
algokit project run build
```

### Error: "Transaction pool full"

**Fix:** Wait a few seconds and try again. Testnet can be congested.

### Contract deployed but can't find App ID

**Check deployment logs:**
```bash
algokit project deploy testnet --verbose
```

Look for: `App ID: 12345678`

---

## 📁 Important Files

After deployment, these files contain important info:

1. **`.env.testnet`** - Your deployer mnemonic (NEVER COMMIT!)
2. **`smart_contracts/artifacts/`** - Compiled TEAL code
3. **`smart_contracts/artifacts/MultihopSwapRouter/contract.json`** - ABI spec

---

## 🎯 Next Steps After Deployment

1. ✅ **Save App ID** to `src/lib/config/contracts.ts`
2. ✅ **Fund contract** with ALGO for fees
3. ✅ **Opt into assets** (USDC, USDT, etc.)
4. ✅ **Update swap preparation API** to use contract
5. ✅ **Test contract calls** from your UI

---

## 💡 When to Use the Contract

**Use Direct DEX Swaps for:**
- ✅ Single-hop swaps (ALGO ↔ USDC)
- ✅ Testing and development
- ✅ Lower complexity

**Use Your Contract for:**
- ✅ Multi-hop swaps (ALGO → USDC → BTC)
- ✅ Custom routing logic
- ✅ Advanced features
- ✅ Gas optimization

---

## 🔐 Security Checklist

- [ ] Mnemonic is in `.env.testnet` (NOT committed to git)
- [ ] Only creator can call admin methods
- [ ] Contract has minimum ALGO balance
- [ ] Tested on testnet before mainnet
- [ ] Emergency withdrawal functions work
- [ ] Contract address documented

---

## 📞 Need Help?

**AlgoKit Docs:** https://developer.algorand.org/algokit/  
**AlgoPy Docs:** https://algorandfoundation.github.io/puya/  
**Testnet Explorer:** https://testnet.algoexplorer.io/  
**Testnet Dispenser:** https://bank.testnet.algorand.network/

---

## 🎉 Success!

Once deployed, your contract:
- ✅ Lives on Algorand blockchain
- ✅ Has a unique App ID
- ✅ Can execute multi-hop swaps
- ✅ Is immutable and trustless
- ✅ Runs exactly as coded

**Your App ID is your contract's permanent address on the blockchain!**

---

**Ready to deploy? Run these commands:**

```bash
cd Blockchain/10x_Swap/projects/10x_Swap
echo 'DEPLOYER_MNEMONIC="your mnemonic"' > .env.testnet
algokit project run build
algokit project deploy testnet
# Save the App ID!
```

🚀 Good luck!

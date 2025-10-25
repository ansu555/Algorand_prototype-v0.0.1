# 🚀 Quick Deployment Cheat Sheet

## Super Quick Deploy (3 Commands)

```bash
cd Blockchain/10x_Swap/projects/10x_Swap
echo 'DEPLOYER_MNEMONIC="word1 word2 ... word25"' > .env.testnet
./deploy.sh
```

---

## Method 1: Using the Deploy Script (EASIEST)

```bash
# 1. Navigate to contract directory
cd Blockchain/10x_Swap/projects/10x_Swap

# 2. Set your mnemonic
echo 'DEPLOYER_MNEMONIC="your mnemonic here"' > .env.testnet

# 3. Run deploy script
./deploy.sh

# 4. Save the App ID that gets printed!
```

---

## Method 2: Manual Commands

```bash
cd Blockchain/10x_Swap/projects/10x_Swap

# Build
algokit project run build

# Deploy
algokit project deploy testnet

# Look for: "App ID: 12345678"
```

---

## Get a Wallet with Testnet ALGO

### Option A: Generate New Wallet
```bash
algokit generate account
# Copy the mnemonic
# Visit: https://bank.testnet.algorand.network/
# Paste address and click "Dispense"
```

### Option B: Use Existing Wallet
Just export your mnemonic from your wallet app.

---

## After Deployment Checklist

```bash
# 1. Save App ID to your config
# Edit: src/lib/config/contracts.ts
# Set: MULTIHOP_ROUTER: YOUR_APP_ID

# 2. Fund the contract
# Visit: https://bank.testnet.algorand.network/
# Send to contract address

# 3. Verify on AlgoExplorer
# https://testnet.algoexplorer.io/application/YOUR_APP_ID
```

---

## Common Commands

```bash
# Build contract
algokit project run build

# Deploy to testnet
algokit project deploy testnet

# Deploy to mainnet (when ready)
algokit project deploy mainnet

# Check app info
algokit goal app info --app-id APP_ID

# Delete app
algokit goal app delete --app-id APP_ID
```

---

## Files You Need

- ✅ `.env.testnet` - Your mnemonic (NEVER commit!)
- ✅ `contract.py` - Your smart contract
- ✅ `pyproject.toml` - Project config (already exists)

---

## Expected Output

```
✅ Build successful!
🚀 Deploying to testnet...
✅ Contract deployed!
   App ID: 12345678
   
🎉 Save this App ID!
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "DEPLOYER_MNEMONIC not found" | Create `.env.testnet` file |
| "Insufficient balance" | Get testnet ALGO from dispenser |
| "Invalid TEAL" | Run `algokit project run build` |
| "AlgoKit not found" | Install: `brew install algorand/tap/algokit` |

---

## Important Notes

- ⚠️ **NEVER commit `.env.testnet`** to git
- 💰 Deployer needs ~1-2 ALGO for deployment
- 🔐 Save your App ID immediately
- 🧪 Always test on testnet first

---

## Quick Links

- **Testnet ALGO:** https://bank.testnet.algorand.network/
- **AlgoExplorer:** https://testnet.algoexplorer.io/
- **Full Guide:** `docs/CONTRACT_DEPLOYMENT_GUIDE.md`

---

**Ready? Run this now:**

```bash
cd Blockchain/10x_Swap/projects/10x_Swap && ./deploy.sh
```

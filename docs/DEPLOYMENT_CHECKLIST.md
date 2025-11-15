# WaveBreak Launchpad - Deployment Checklist

## 🎯 Complete These Steps to Deploy to TestNet

### ✅ Phase 1: Compile Smart Contract (5 min)

```bash
# 1. Install Python dependencies
pip install pyteal beaker py-algorand-sdk

# 2. Compile the contract
python scripts/deploy-bonding-curve.py
```

**Expected Output:**
```
✅ Compiled bonding curve contract:
   - Approval: artifacts/launchpad/bonding_curve_approval.teal
   - Clear: artifacts/launchpad/bonding_curve_clear.teal
   - ABI: artifacts/launchpad/bonding_curve_abi.json
```

---

### ✅ Phase 2: Get TestNet Account (2 min)

**Option A: Use Existing Wallet**
1. Open Pera Wallet or Defly
2. Switch to TestNet mode
3. Copy your address
4. Export mnemonic (backup phrase)

**Option B: Generate New Account**
```bash
# Using AlgoKit
algokit goal account new testnet_deployer

# Or Python
python -c "from algosdk import account, mnemonic; sk, addr = account.generate_account(); print(f'Address: {addr}\\nMnemonic: {mnemonic.from_private_key(sk)}')"
```

**Fund Your Account:**
```
https://bank.testnet.algorand.network/
```
Request 10 ALGO (enough for deployment + testing)

---

### ✅ Phase 3: Deploy Contract to TestNet (5 min)

```bash
# Set your mnemonic (replace with your actual 25 words)
export CREATOR_MNEMONIC="word1 word2 word3 ... word25"

# Deploy
python scripts/deploy-bonding-curve.py
```

**Expected Output:**
```
✅ Contract deployed successfully!
   📝 App ID: 123456789
   📍 App Address: APPADDRESS123...
   🔗 View on TestNet: https://testnet.algoexplorer.io/application/123456789
   💾 Deployment info saved: artifacts/launchpad/deployment.json
```

**Copy the App ID!** You'll need it in the next step.

---

### ✅ Phase 4: Update Frontend Config (2 min)

**File:** `src/lib/launchpad/algorand.ts`

Find this line:
```typescript
export const BONDING_CURVE_APP_ID = 0; // Update after deployment
```

Replace with your App ID:
```typescript
export const BONDING_CURVE_APP_ID = 123456789; // Your actual App ID
```

---

### ✅ Phase 5: Test Complete Flow (10 min)

**Start Dev Server:**
```bash
npm run dev
```

**Navigate to:** `http://localhost:3000/launchpad/create`

**Create Test Launch:**
1. **Connect Wallet** (TestNet mode)
2. **Fill Form:**
   ```
   Token Name: Test Meme Coin
   Symbol: TEST
   Total Supply: 1,000,000
   Curve Type: Sigmoid
   Base Price: 0.001 ALGO
   Max Price: 0.1 ALGO
   Bonding Target: 1,000 ALGO
   ```
3. **Click "Create Launch"**
4. **Sign 5 Transactions:**
   - Create ASA
   - Deploy contract instance
   - Initialize parameters
   - Fund with tokens
   - Activate sale

**Expected Result:**
```
✅ Launch complete!
   Project ID: abc-123-def
   ASA ID: 234567890
   App ID: 123456789
   🔗 Token: https://testnet.algoexplorer.io/asset/234567890
   🔗 Contract: https://testnet.algoexplorer.io/application/123456789
```

**Test Purchase:**
1. Navigate to your project page
2. Enter amount: `100` tokens
3. Click "Buy Tokens"
4. Sign 2 transactions (payment + app call)
5. See confirmation with points earned
6. Verify on AlgoExplorer

---

## 🔧 Troubleshooting

### Contract Compilation Fails
```bash
# Error: "No module named 'pyteal'"
pip install pyteal beaker

# Error: "No module named 'algosdk'"
pip install py-algorand-sdk
```

### Deployment Fails
```bash
# Error: "Insufficient balance"
# Get more ALGO: https://bank.testnet.algorand.network/

# Error: "Invalid mnemonic"
# Check your 25-word backup phrase has no extra spaces
```

### Frontend Connection Fails
```bash
# Error: "Contract not found"
# Make sure BONDING_CURVE_APP_ID is set correctly in algorand.ts

# Error: "Wallet not connected"
# Open Pera/Defly and switch to TestNet mode
```

### Purchase Transaction Fails
```bash
# Error: "App call failed"
# Check contract is activated: view on AlgoExplorer
# Check your account has ALGO for fees
# Check you're not exceeding max purchase limit

# Error: "Asset not opted in"
# Frontend should auto opt-in, but you can manually:
# Go to AlgoExplorer > Your Account > Assets > Opt In
```

---

## 📊 Verification Checklist

After deployment, verify these on AlgoExplorer:

### Contract (https://testnet.algoexplorer.io/application/YOUR_APP_ID)
- [ ] Global state shows creator address
- [ ] Global state shows curve_type (0/1/2)
- [ ] Global state shows base_price and max_price
- [ ] is_active = 0 (pending) or 1 (active)

### Token (https://testnet.algoexplorer.io/asset/YOUR_ASA_ID)
- [ ] Name matches your project
- [ ] Symbol matches (max 8 chars)
- [ ] Total supply is correct
- [ ] Manager is set to creator or contract

### Transactions
- [ ] ASA creation txn shows in account history
- [ ] Contract deployment txn shows app-id
- [ ] Purchase txns show as app calls with payment

---

## 🎥 Demo Recording Checklist

Record your screen for hackathon submission:

1. [ ] Show AlgoExplorer with deployed contract
2. [ ] Navigate to launchpad homepage
3. [ ] Click "Create Launch"
4. [ ] Fill in all fields
5. [ ] Show wallet signing requests
6. [ ] Show success message with links
7. [ ] Navigate to project detail page
8. [ ] Enter purchase amount
9. [ ] Show price calculation
10. [ ] Click "Buy Tokens"
11. [ ] Show wallet signing (2 txns)
12. [ ] Show success with points earned
13. [ ] Click AlgoExplorer link to verify
14. [ ] Show transaction details on-chain

**Recommended Tool:** OBS Studio or Loom

---

## 📝 Environment Variables (Optional)

Create `.env.local` if you want to persist config:

```bash
# TestNet Algod
NEXT_PUBLIC_ALGOD_TOKEN=
NEXT_PUBLIC_ALGOD_SERVER=https://testnet-api.algonode.cloud
NEXT_PUBLIC_ALGOD_PORT=443

# TestNet Indexer
NEXT_PUBLIC_INDEXER_TOKEN=
NEXT_PUBLIC_INDEXER_SERVER=https://testnet-idx.algonode.cloud
NEXT_PUBLIC_INDEXER_PORT=443

# Deployed Contract
NEXT_PUBLIC_BONDING_CURVE_APP_ID=123456789

# Optional: Pinata for IPFS (if storing metadata)
PINATA_API_KEY=your_key_here
PINATA_SECRET_KEY=your_secret_here
```

---

## 🏆 Submission Checklist

Before submitting to hackathon:

- [ ] Contract deployed to TestNet
- [ ] ASA created and verified
- [ ] At least 1 successful purchase transaction
- [ ] All transactions visible on AlgoExplorer
- [ ] Code pushed to GitHub (public repo)
- [ ] README.md updated with:
  - [ ] Project description
  - [ ] Setup instructions
  - [ ] TestNet contract addresses
  - [ ] Demo video link
- [ ] `HACKATHON_SUBMISSION.md` completed
- [ ] Demo video recorded (max 5 min)
- [ ] Screenshots of working app

---

## 🚀 Next Steps After Deployment

### Immediate (Testing)
1. Create 2-3 sample launches with different curve types
2. Test purchases from multiple wallets
3. Verify anti-bot cooldown works
4. Test edge cases (max purchase, sold out, etc.)

### Short-Term (Polish)
1. Add error toasts instead of alerts
2. Show loading states for transactions
3. Add transaction history page
4. Add leaderboard for top buyers

### Long-Term (Production)
1. Deploy to MainNet with audited contract
2. Add governance for protocol parameters
3. Integrate with more DEXs (Pact, Humble)
4. Add analytics dashboard

---

## 📧 Need Help?

**Common Issues:**
- Contract compilation: Check Python version (3.9+)
- Deployment fails: Ensure 10+ ALGO in account
- Frontend errors: Check browser console
- Transaction fails: Verify on AlgoExplorer first

**Resources:**
- Algorand Docs: https://developer.algorand.org
- PyTeal Docs: https://pyteal.readthedocs.io
- AlgoExplorer: https://testnet.algoexplorer.io
- TestNet Dispenser: https://bank.testnet.algorand.network

---

**Good luck! 🌊 May your launch be successful!**

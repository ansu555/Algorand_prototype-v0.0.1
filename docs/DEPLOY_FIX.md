# 🚀 Deploy Your Contract - Super Simple Steps

## What You Just Ran

You tried: `algokit compile python` ❌  
**Issue:** Needed to specify the path to your contract!

---

## ✅ Correct Commands

### Option 1: Using AlgoKit Project (EASIEST)

```bash
# Make sure you're in the right directory
cd Blockchain/10x_Swap/projects/10x_Swap

# Build the contract
algokit project run build

# Deploy to testnet
algokit project deploy testnet
```

### Option 2: Using AlgoKit Compile Directly

```bash
# From the 10x_Swap directory
algokit compile python smart_contracts/multihop_swap/contract.py
```

---

## 📋 What's Happening Now

Poetry is being installed... (this takes 1-2 minutes)

Once it's done, we can run:
```bash
algokit project run build
```

---

## 🎯 After Poetry Installs

Run these commands:

```bash
cd /Users/engineering_faliure/Desktop/Projects/Algorand_prototype-v0.0.1/Blockchain/10x_Swap/projects/10x_Swap

# Install project dependencies
poetry install

# Build contract
algokit project run build

# Deploy to testnet (needs wallet mnemonic in .env.testnet)
algokit project deploy testnet
```

---

## 📝 Quick Checklist

Before deploying:
- [ ] Poetry installed ← (Installing now...)
- [ ] Project dependencies installed ← (Run `poetry install`)
- [ ] Wallet mnemonic in `.env.testnet`
- [ ] Testnet ALGO in wallet

---

## 🔧 Your .env.testnet File

Check if this file exists:
```bash
cat .env.testnet
```

If it exists and has your mnemonic, you're good!

If not, create it:
```bash
echo 'DEPLOYER_MNEMONIC="word1 word2 word3 ... word25"' > .env.testnet
```

---

## ⏱️ Wait for Poetry to Finish

Once the installation completes, run:
```bash
poetry install
algokit project run build
```

And you'll see your contract compile! 🎉

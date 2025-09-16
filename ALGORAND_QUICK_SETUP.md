# Quick Algorand Testnet Setup

## 1. Get Your Mnemonic
- Visit [testnet.algoexplorer.io/dispenser](https://testnet.algoexplorer.io/dispenser)
- Create a new wallet or use existing
- Copy your 25-word mnemonic phrase

## 2. Add to Environment
Add to your `.env.local`:
```bash
ALGORAND_NETWORK="testnet"
ALGORAND_MNEMONIC="your 25 word mnemonic phrase here"
```

## 3. Test It
```bash
bun run test:algorand
```

## 4. Chat Commands
- `algorand address` - Show wallet address
- `algo balance` - Check ALGO balance
- `algorand portfolio` - Full portfolio
- `transfer 1 ALGO to ADDRESS` - Send ALGO

## Testnet Assets
- **ALGO** (ASA ID: 0) - Native token
- **USDC** (ASA ID: 10458941) - Test USDC

Get test ALGO from: https://testnet.algoexplorer.io/dispenser

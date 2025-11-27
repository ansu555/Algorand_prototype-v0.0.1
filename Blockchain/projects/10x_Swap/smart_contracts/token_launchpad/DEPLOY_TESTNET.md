# TestNet Deployment Guide

## Prerequisites

1. **Get a TestNet Account**:
   - Visit https://bank.testnet.algorand.network/
   - Click "Connect Wallet" or use the dispenser
   - Get your 25-word mnemonic phrase
   - Fund your account with TestNet ALGO (free)

2. **Set Your Mnemonic**:
   
   **Option A: Environment Variable** (Recommended)
   ```bash
   export DEPLOYER_MNEMONIC="your twenty five word mnemonic phrase here from testnet wallet"
   ```
   
   **Option B: Create .env.testnet file**
   ```bash
   cd Blockchain/projects/10x_Swap
   echo 'DEPLOYER_MNEMONIC="your twenty five word mnemonic phrase here"' > .env.testnet
   ```

## Deploy

```bash
cd Blockchain/projects/10x_Swap/smart_contracts/token_launchpad
python deploy_testnet.py
```

## What Happens

The script will:
1. ✅ Connect to TestNet
2. ✅ Check your account balance
3. ✅ Deploy the smart contract
4. ✅ Save deployment info to `deployment_testnet.json`
5. ✅ Give you the App ID and AlgoExplorer link

## After Deployment

You'll get an **App ID** - save this! You'll need it to:
- Configure the sale parameters
- Integrate with your frontend
- Let users buy tokens

## Example Output

```
🚀 Deploying Token Launchpad to TestNet
==================================================
📍 Deployer Address: ABC123...
💰 Balance: 10.000000 ALGO
📄 Loaded spec: TokenLaunchpad.arc56.json
🔨 Creating application...
✅ Application created!
   App ID: 123456789
   App Address: XYZ789...
💾 Deployment info saved to: deployment_testnet.json
🔗 View on AlgoExplorer:
   https://testnet.algoexplorer.io/application/123456789
```

## Troubleshooting

- **"DEPLOYER_MNEMONIC not found"**: Set your mnemonic (see Prerequisites)
- **"Low balance"**: Get more TestNet ALGO from the dispenser
- **"Application spec not found"**: Run `algokit compile py contract.py` first

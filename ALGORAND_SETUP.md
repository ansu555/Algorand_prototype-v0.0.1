# Algorand Integration Setup Guide

This guide will help you set up Algorand integration in your 10xSwap project.

## Prerequisites

1. **Algorand Wallet**: Create an Algorand wallet and get your 25-word mnemonic phrase
2. **Test ALGO**: Get some test ALGO from the [Algorand Testnet Dispenser](https://testnet.algoexplorer.io/dispenser)

## Environment Configuration

Add these variables to your `.env.local` file:

```bash
# Algorand Configuration
ALGORAND_NETWORK="testnet"  # or "mainnet" for production
ALGORAND_MNEMONIC="your 25 word mnemonic phrase here"
```

### Getting Your Mnemonic

1. **MyAlgo Wallet**: Visit [wallet.myalgo.com](https://wallet.myalgo.com/)
2. **Pera Wallet**: Download from [perawallet.app](https://perawallet.app/)
3. **AlgoSigner**: Browser extension from [algosigner.com](https://www.purestake.com/technology/algosigner/)

⚠️ **Security Warning**: Never use a wallet with real funds for development. Create a dedicated test wallet.

## Supported Networks

### Testnet (Recommended for Development)
- **Network ID**: `testnet`
- **Algod API**: `https://testnet-api.algonode.cloud`
- **Indexer API**: `https://testnet-idx.algonode.cloud`
- **Explorer**: [testnet.algoexplorer.io](https://testnet.algoexplorer.io/)

### Mainnet (Production)
- **Network ID**: `mainnet`
- **Algod API**: `https://mainnet-api.algonode.cloud`
- **Indexer API**: `https://mainnet-idx.algonode.cloud`
- **Explorer**: [algoexplorer.io](https://algoexplorer.io/)

## Supported Assets

### Testnet Assets
| Symbol | ASA ID | Decimals | Description |
|--------|--------|----------|-------------|
| ALGO   | 0      | 6        | Native Algorand token |
| USDC   | 10458941 | 6      | Test USD Coin |

### Mainnet Assets
| Symbol | ASA ID | Decimals | Description |
|--------|--------|----------|-------------|
| ALGO   | 0      | 6        | Native Algorand token |
| USDC   | 31566704 | 6      | USD Coin |
| USDT   | 312769 | 6        | Tether USD |
| WBTC   | 1058926737 | 8    | Wrapped Bitcoin |
| WETH   | 887406851 | 18     | Wrapped Ethereum |

## Testing the Integration

1. **Install Dependencies**:
   ```bash
   bun add algosdk @algorandfoundation/algokit-utils
   ```

2. **Run the Test Script**:
   ```bash
   bun run test:algorand
   ```

3. **Expected Output**:
   ```
   🔷 Testing Algorand Integration...
   ✅ Algorand agent initialized successfully
   📡 Network: testnet
   ⚡ Block Time: 4.5s
   🔒 Finality: instant
   🏠 Address: YOUR_ALGORAND_ADDRESS
   💰 ALGO Balance: 10.000000
   🪙 Supported Assets: ALGO, USDC
   📊 ALGO Price: $0.1234
   ```

## Chat Commands

Once configured, you can use these commands in the AI chat:

### Basic Commands
- `algorand address` - Show your Algorand wallet address
- `algo balance` - Check your ALGO balance
- `usdc balance algorand` - Check USDC balance on Algorand
- `algorand portfolio` - Show complete portfolio overview
- `algo price` - Get current ALGO price

### Advanced Commands
- `transfer 10 ALGO to ALGORAND_ADDRESS` - Send ALGO to another address
- `algorand transactions` - View recent transaction history
- `atomic swap info` - Learn about Algorand's atomic swaps

### Example Interactions
```
User: "algorand address"
Bot: 🔷 Algorand Address
     ABC123...XYZ789
     Network: testnet
     Block Time: 4.5s

User: "algo balance"
Bot: 💰 ALGO Balance
     10.000000 ALGO
     💵 $1.23 USD
     📊 $0.1234 (+2.34%)

User: "transfer 5 ALGO to DEF456...ABC123"
Bot: ✅ Transfer Successful
     🔗 Tx ID: ABC123...
     💰 Amount: 5 ALGO
     📍 To: DEF456...ABC123
     *Confirmed in ~4.5 seconds*
```

## Key Features

### 🚀 Performance
- **4.5 second block times**
- **Instant finality** (no confirmations needed)
- **46,000+ TPS capability**
- **Sub-penny transaction fees**

### 🔒 Security
- **Pure Proof of Stake** consensus
- **Byzantine fault tolerance**
- **Cryptographic sortition**
- **No slashing or delegation**

### 🌱 Sustainability
- **Carbon negative** blockchain
- **Energy efficient** consensus
- **Sustainable tokenomics**

### 💡 Developer Experience
- **Native asset creation** (ASAs)
- **Atomic transactions**
- **Smart contracts** (PyTeal, Reach, Beaker)
- **Rich ecosystem** of tools

## Troubleshooting

### Common Issues

1. **"Missing ALGORAND_MNEMONIC" Error**
   - Ensure your 25-word mnemonic is in `.env.local`
   - Check for extra spaces or line breaks
   - Verify the mnemonic is valid

2. **"Network connection failed" Error**
   - Check your internet connection
   - Verify Algorand network status
   - Try switching between testnet/mainnet

3. **"Insufficient balance" Error**
   - Get test ALGO from the testnet dispenser
   - Ensure you're on the correct network
   - Check your wallet address

4. **"Asset not found" Error**
   - Verify the ASA ID is correct
   - Ensure the asset exists on your network
   - Check if you've opted into the asset

### Getting Help

- **Algorand Developer Portal**: [developer.algorand.org](https://developer.algorand.org/)
- **Discord**: [Algorand Discord](https://discord.gg/algorand)
- **Forum**: [forum.algorand.org](https://forum.algorand.org/)
- **Documentation**: [docs.algorand.org](https://docs.algorand.org/)

## Next Steps

1. **Explore DEX Integration**: Add Tinyman or Pact for token swaps
2. **Smart Contract Deployment**: Deploy custom logic with PyTeal
3. **NFT Support**: Add Algorand Standard Asset (ASA) NFTs
4. **DeFi Protocols**: Integrate with Algorand DeFi ecosystem

## Security Best Practices

- ✅ Use dedicated test wallets for development
- ✅ Never commit private keys or mnemonics to git
- ✅ Use environment variables for sensitive data
- ✅ Test thoroughly on testnet before mainnet
- ✅ Implement proper error handling
- ✅ Validate all user inputs
- ✅ Use official Algorand SDKs and APIs

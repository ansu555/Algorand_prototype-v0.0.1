# @10xswap/sdk

Official TypeScript SDK for 10xSwap - The ultimate DeFi platform on Algorand.

[![npm version](https://img.shields.io/npm/v/@10xswap/sdk)](https://www.npmjs.com/package/@10xswap/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

## 🚀 Features

- **Multi-DEX Routing** - Find optimal swap routes across Tinyman, Pact, and 10xSwap
- **Agent Wallets** - Encrypted wallet management for automated trading
- **AutoPilot Rules** - Automated trading strategies (DCA, Rebalance, Rotate)
- **Market Analysis** - AI-powered crypto analysis with predictions
- **Liquidity Pools** - Constant product AMM (x * y = k model)
- **Full TypeScript** - Complete type safety and IntelliSense support
- **Network Agnostic** - Works on both testnet and mainnet

## 📦 Installation

```bash
npm install @10xswap/sdk algosdk
```

```bash
yarn add @10xswap/sdk algosdk
```

```bash
pnpm add @10xswap/sdk algosdk
```

## 🎯 Quick Start

### 1. Multi-DEX Swap Router

Find the best swap route across all DEXs:

```typescript
import { SwapRouter } from '@10xswap/sdk'

// Initialize router
const router = new SwapRouter('testnet')
await router.initialize()

// Find best route
const quote = await router.findBestRoute({
  assetIn: 0,           // ALGO
  assetOut: 10458941,   // USDC (testnet)
  amount: 1000000,      // 1 ALGO
  maxHops: 3,           // Allow multi-hop routing
  slippage: 0.5         // 0.5% slippage tolerance
})

console.log('Best DEX:', quote.dex)
console.log('Price Impact:', quote.priceImpact, '%')
console.log('Min Received:', quote.minReceived)

// Build and sign transaction
const txn = await router.buildSwapTransaction(quote, userAddress)
const signedTxn = await wallet.signTransaction(txn)
const result = await algodClient.sendRawTransaction(signedTxn).do()
```

### 2. Agent Wallet (Automated Trading)

Create an encrypted agent wallet for bots:

```typescript
import { AgentWallet } from '@10xswap/sdk'

// Create new agent wallet
const agent = await AgentWallet.create(userAddress, password, 'testnet')

console.log('Agent Address:', agent.getAddress())

// Get balance
const balance = await agent.getBalance()
console.log('ALGO:', balance.algo)
console.log('Assets:', balance.assets)

// Opt-in to assets
await agent.optIn(10458941) // USDC

// Transfer funds
const result = await agent.transfer({
  to: recipientAddress,
  amount: 500000,  // 0.5 ALGO
  assetId: 0       // ALGO
})

// Execute swap
const quote = await router.findBestRoute({ ... })
const swapResult = await agent.swap(quote)
console.log('Swap TX:', swapResult.txId)
```

### 3. AutoPilot Trading Rules

Create automated trading strategies:

```typescript
import { AutoPilot } from '@10xswap/sdk'

const autopilot = new AutoPilot('testnet')

// Create DCA rule: Buy USDC with ALGO when price drops 10%
const rule = await autopilot.createRule({
  strategy: 'DCA',
  assetIn: 0,          // ALGO
  assetOut: 10458941,  // USDC
  trigger: {
    type: 'price_drop_pct',
    value: 10,
    window: '24h'
  },
  maxSpendUSD: 100,
  maxSlippage: 0.5,
  cooldownMinutes: 1440  // 24 hours
}, ownerAddress)

console.log('Rule ID:', rule.id)

// Get all rules
const rules = await autopilot.getRules(ownerAddress)

// Pause rule
await autopilot.updateRuleStatus(rule.id, 'paused', ownerAddress)

// Manually execute rule
await autopilot.executeRule(rule.id, ownerAddress)

// Delete rule
await autopilot.deleteRule(rule.id, ownerAddress)
```

### 4. Market Analysis

AI-powered cryptocurrency analysis:

```typescript
import { MarketAnalysis } from '@10xswap/sdk'

const analysis = new MarketAnalysis('testnet')

// Comprehensive analysis
const result = await analysis.analyze({
  coin: 'algorand',
  horizonDays: 30,
  tasks: ['analysis', 'prediction', 'strategy', 'charts'],
  chartType: 'candlestick'
})

console.log('Summary:', result.summary)
console.log('Insights:', result.insights)
console.log('Predictions:', result.predictions)
console.log('Price:', result.marketData?.price)

// Fear & Greed Index
const fgi = await analysis.getFearGreedIndex()
console.log('Sentiment:', fgi.valueClassification) // "Extreme Fear" | "Fear" | ...

// Trending coins
const trending = await analysis.getTrendingAlgorandTokens()

// Quick price check
const price = await MarketAnalysis.quickPrice('bitcoin')
console.log('BTC Price:', price)

// Compare multiple coins
const comparison = await analysis.compare(['bitcoin', 'ethereum', 'algorand'])
```

### 5. Liquidity Pools

Interact with 10xSwap pools:

```typescript
import { LiquidityPool } from '@10xswap/sdk'

const pool = new LiquidityPool(749739213, 'testnet') // Pool App ID

// Get pool info
const info = await pool.getPoolInfo()
console.log('Reserves:', info.reserve1, info.reserve2)
console.log('Fee:', info.feeBps, 'bps')
console.log('TVL:', info.totalLiquidity)

// Get swap quote
const quote = await pool.getSwapQuote(0, 1000000) // 1 ALGO in
console.log('Will receive:', quote.amountOut, 'USDC')
console.log('Price impact:', quote.priceImpact, '%')

// Execute swap
const swapTxn = await pool.swap(0, 1000000, quote.amountOut * 0.995, userAddress)
const signedSwap = await wallet.signTransaction(swapTxn)
await algodClient.sendRawTransaction(signedSwap).do()

// Add liquidity
const addLiqTxn = await pool.addLiquidity({
  amount1: 1000000,   // 1 ALGO
  amount2: 2000000,   // 2 USDC
  minLpTokens: 1000
}, userAddress)

// Remove liquidity
const removeLiqTxn = await pool.removeLiquidity(
  1000,      // LP tokens to burn
  900000,    // Min ALGO
  1800000,   // Min USDC
  userAddress
)
```

## 📚 API Reference

### SwapRouter

| Method | Description |
|--------|-------------|
| `initialize()` | Fetch all pools and build routing graph |
| `findBestRoute(request)` | Find optimal swap path across DEXs |
| `buildSwapTransaction(quote, sender)` | Build unsigned transaction |
| `getPools()` | Get all available pools |
| `getPoolsForPair(asset1, asset2)` | Get pools for specific pair |

### AgentWallet

| Method | Description |
|--------|-------------|
| `create(userAddress, password, config)` | Create new encrypted wallet |
| `recover(userAddress, password, config)` | Recover existing wallet |
| `getAddress()` | Get wallet address |
| `getBalance()` | Get ALGO and ASA balances |
| `optIn(assetId)` | Opt-in to asset |
| `transfer(params)` | Transfer ALGO or ASA |
| `swap(quote)` | Execute swap using quote |

### AutoPilot

| Method | Description |
|--------|-------------|
| `createRule(config, owner)` | Create automated trading rule |
| `getRules(owner)` | Get all rules for user |
| `getRule(id, owner)` | Get specific rule |
| `updateRuleStatus(id, status, owner)` | Pause/resume/cancel rule |
| `updateRuleParameters(id, owner, updates)` | Update rule parameters |
| `executeRule(id, owner)` | Manually execute rule |
| `deleteRule(id, owner)` | Delete rule |
| `getRuleStats(id, owner)` | Get execution statistics |

### MarketAnalysis

| Method | Description |
|--------|-------------|
| `analyze(request)` | Comprehensive crypto analysis |
| `getFearGreedIndex()` | Get current market sentiment |
| `getTrendingCoins()` | Get trending cryptocurrencies |
| `getTrendingAlgorandTokens()` | Get trending Algorand tokens |
| `getNews(coinId, limit)` | Get crypto news |
| `getPrice(coinId)` | Get current price |
| `compare(coins)` | Compare multiple coins |
| `quickAnalyze(coin, network)` | Static quick analysis |
| `quickPrice(coin, network)` | Static quick price |

### LiquidityPool

| Method | Description |
|--------|-------------|
| `getPoolInfo()` | Get pool state and reserves |
| `getSwapQuote(assetIn, amountIn)` | Calculate swap output |
| `createPool(asset1, asset2, feeBps, sender)` | Create new pool |
| `addLiquidity(params, sender)` | Add liquidity to pool |
| `removeLiquidity(lpTokens, minAmount1, minAmount2, sender)` | Remove liquidity |
| `swap(assetIn, amountIn, minAmountOut, sender)` | Execute swap |
| `calculatePriceImpact(assetIn, amountIn)` | Calculate price impact |
| `getPrice(assetIn)` | Get current price ratio |
| `getTVL()` | Get Total Value Locked |

## 🔧 Configuration

### Custom Algod Client

```typescript
import { SwapRouter } from '@10xswap/sdk'
import algosdk from 'algosdk'

const algodClient = new algosdk.Algodv2('', 'https://testnet-api.4160.nodely.io', '')

const router = new SwapRouter({
  network: 'testnet',
  algodUrl: 'https://testnet-api.4160.nodely.io',
  algodToken: '',
  apiBaseUrl: 'http://localhost:3000/api'
})
```

### Network Configuration

```typescript
// Testnet (default)
const router = new SwapRouter('testnet')

// Mainnet
const router = new SwapRouter('mainnet')

// Custom config
const router = new SwapRouter({
  network: 'mainnet',
  apiBaseUrl: 'https://10xswap.com/api'
})
```

## 🔒 Security

- **Agent wallets** use AES-256-GCM encryption
- **Mnemonics** are encrypted at rest
- **Private keys** never leave the client
- **Password-based** key derivation (PBKDF2)

## 🌐 Network Support

| Network | Supported DEXs | Smart Contracts |
|---------|---------------|-----------------|
| Testnet | Tinyman V2, 10xSwap | ✅ |
| Mainnet | Tinyman V2, Pact, 10xSwap | ✅ |

## 📖 Documentation

- [Developer Docs](https://10xswap.com/developers)
- [API Reference](https://10xswap.com/api/docs)
- [Smart Contracts](https://10xswap.com/developers#contracts)
- [Examples](https://github.com/10xswap/sdk/tree/main/examples)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## 📄 License

MIT © 10xSwap Team

## 🔗 Links

- [Website](https://10xswap.com)
- [GitHub](https://github.com/10xswap/sdk)
- [NPM](https://www.npmjs.com/package/@10xswap/sdk)
- [Discord](https://discord.gg/10xswap)
- [Twitter](https://twitter.com/10xswap)

## 💡 Examples

Check out our [examples directory](https://github.com/10xswap/sdk/tree/main/examples) for more use cases:

- [Trading Bot](https://github.com/10xswap/sdk/tree/main/examples/trading-bot)
- [DCA Strategy](https://github.com/10xswap/sdk/tree/main/examples/dca-strategy)
- [Liquidity Provider](https://github.com/10xswap/sdk/tree/main/examples/liquidity-provider)
- [Price Monitor](https://github.com/10xswap/sdk/tree/main/examples/price-monitor)

## 🆘 Support

- [GitHub Issues](https://github.com/10xswap/sdk/issues)
- [Discord Community](https://discord.gg/10xswap)
- [Email Support](mailto:support@10xswap.com)

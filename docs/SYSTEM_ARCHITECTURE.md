# 10xSwap System Overview & Backend Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Backend Architecture](#backend-architecture)
4. [Multi-Chain Infrastructure](#multi-chain-infrastructure)
5. [Data Flow & Communication](#data-flow--communication)
6. [Security & Account Abstraction](#security--account-abstraction)
7. [API Architecture](#api-architecture)
8. [Database Architecture](#database-architecture)
9. [Deployment & Environment](#deployment--environment)
10. [Performance & Monitoring](#performance--monitoring)

---

## System Overview

10xSwap is a comprehensive DeFi aggregation platform that combines traditional DEX functionality with AI-powered trading agents. The system operates across multiple blockchain networks, providing gasless transactions through ERC-4337 account abstraction.

### Core Features
- **Multi-chain DEX aggregation** (Base, Avalanche, Avalanche Fuji)
- **AI-powered trading agent** with natural language interface
- **Gasless transactions** via 0xGasless account abstraction
- **Real-time market data** and price feeds
- **Automated trading rules** and portfolio management
- **Smart account management** with EOA/Smart Account dual support

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Blockchain    │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   Networks      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Components │    │   Agent System  │    │   Smart         │
│   - Trading     │    │   - 0xGasless   │    │   Contracts     │
│   - Chat        │    │   - LangChain   │    │   - DEX         │
│   - Portfolio   │    │   - AI Models   │    │   - Paymasters  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Technology Stack

### Frontend Stack
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 18 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Animations**: Framer Motion
- **State Management**: Redux Toolkit + TanStack Query
- **Web3 Integration**: wagmi + viem + ConnectKit

### Backend Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Next.js API Routes (serverless)
- **AI/ML**: LangChain + OpenAI/OpenRouter
- **Blockchain**: viem (Ethereum library)
- **Account Abstraction**: 0xGasless AgentKit SDK
- **Database**: Turso (LibSQL)
- **Caching**: In-memory + persistent storage

### External Integrations
- **DEX Aggregation**: 0x Protocol API
- **Price Feeds**: CoinGecko + CoinRanking
- **Blockchain RPCs**: Infura, Alchemy, Public RPCs
- **AI Models**: OpenAI GPT-4, OpenRouter models
- **Account Abstraction**: 0xGasless Paymaster

---

## Backend Architecture

### Agent System Architecture

```typescript
┌─────────────────────────────────────────────────────────────┐
│                    Agent System Core                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Chat      │  │   Balance   │  │   Swap      │        │
│  │   Handler   │  │   Manager   │  │   Engine    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                 │                 │              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Multi-Chain Agent Factory                │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │   │
│  │  │  Base Agent │ │ Avalanche   │ │ Fuji Agent  │  │   │
│  │  │   (8453)    │ │ Agent       │ │  (43113)    │  │   │
│  │  │             │ │  (43114)    │ │             │  │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    Core Services Layer                      │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   RPC       │  │   Token     │  │   Price     │        │
│  │   Manager   │  │   Registry  │  │   Oracle    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Per-Chain Agent System

Each blockchain network has its own agent instance with specific configurations:

#### Base Agent (Chain ID: 8453)
```typescript
// Configuration
{
  rpc: "RPC_URL_BASE",
  apiKey: "GASLESS_API_KEY_BASE" || "GASLESS_API_KEY",
  paymaster: "GASLESS_PAYMASTER_URL_BASE",
  nativeToken: "ETH",
  swapProtocol: "0x API (base.api.0x.org)",
  explorer: "basescan.org"
}
```

#### Avalanche Agent (Chain ID: 43114)
```typescript
// Configuration
{
  rpc: "RPC_URL_AVALANCHE",
  apiKey: "GASLESS_API_KEY_AVALANCHE" || "GASLESS_API_KEY",
  paymaster: "GASLESS_PAYMASTER_URL_AVALANCHE",
  nativeToken: "AVAX",
  swapProtocol: "0x API (avalanche.api.0x.org)",
  explorer: "snowtrace.io"
}
```

#### Fuji Agent (Chain ID: 43113)
```typescript
// Configuration
{
  rpc: "RPC_URL_FUJI",
  apiKey: "GASLESS_API_KEY_FUJI" || "GASLESS_API_KEY",
  paymaster: "GASLESS_PAYMASTER_URL_FUJI",
  nativeToken: "AVAX",
  swapProtocol: "DISABLED (testnet limitation)",
  explorer: "testnet.snowtrace.io"
}
```

### Smart Account Management

```typescript
interface SmartAccountSystem {
  // Address Resolution
  getAddress(): Promise<Address>           // Smart Account address
  getEOAAddress(): Promise<Address>        // Server EOA address
  getAddresses(): Promise<{smart: Address, eoa: Address}>
  
  // Transaction Execution
  smartTransfer(opts: TransferOptions): Promise<TxResult>
  smartSwap(opts: SwapOptions): Promise<TxResult>
  
  // Account Abstraction
  agentkit: Agentkit                       // 0xGasless SDK instance
  publicClient: PublicClient              // viem read client
  eoaClient: WalletClient                 // viem write client
}
```

---

## Multi-Chain Infrastructure

### Chain Configuration Matrix

| Chain | ID | Native | Swaps | Paymaster | RPC Env |
|-------|----|----|-------|-----------|---------|
| Base | 8453 | ETH | ✅ 0x | Base-specific | RPC_URL_BASE |
| Avalanche | 43114 | AVAX | ✅ 0x | Avalanche-specific | RPC_URL_AVALANCHE |
| Fuji | 43113 | AVAX | ❌ | Fuji-specific | RPC_URL_FUJI |

### Environment Configuration Strategy

```bash
# Global Fallbacks
GASLESS_API_KEY=<default-key>
RPC_URL=<fallback-rpc>

# Chain-Specific Overrides
GASLESS_API_KEY_BASE=<base-key>
GASLESS_API_KEY_AVALANCHE=<avalanche-key>
GASLESS_API_KEY_FUJI=<fuji-key>

RPC_URL_BASE=https://mainnet.base.org
RPC_URL_AVALANCHE=https://api.avax.network/ext/bc/C/rpc
RPC_URL_FUJI=https://api.avax-test.network/ext/bc/C/rpc

GASLESS_PAYMASTER_URL_BASE=https://paymaster.0xgasless.com/v1/8453/rpc/<key>
GASLESS_PAYMASTER_URL_AVALANCHE=https://paymaster.0xgasless.com/v1/43114/rpc/<key>
GASLESS_PAYMASTER_URL_FUJI=https://paymaster.0xgasless.com/v1/43113/rpc/<key>
```

### Token Registry System

```typescript
interface TokenRegistry {
  // Per-chain token mappings
  BASE_SYMBOL_TO_TOKEN: Record<string, TokenInfo>      // Base mainnet
  AVALANCHE_SYMBOL_TO_TOKEN: Record<string, TokenInfo> // Avalanche mainnet  
  FUJI_SYMBOL_TO_TOKEN: Record<string, TokenInfo>      // Fuji testnet
  
  // Resolution function
  resolveTokenBySymbol(symbol: string, chainId: number): TokenInfo | null
}

// Example token definitions
const BASE_TOKENS = {
  ETH: { address: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
  WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  USDC: { address: '0x833589fCD6EDb6E08f4c7C10d6D3e96cF6a47b8f', decimals: 6 }
}
```

---

## Data Flow & Communication

### Frontend to Backend Communication

```typescript
// Chat Interface Data Flow
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chat UI       │    │   API Route     │    │   Agent         │
│   Component     │───►│   /api/agent/   │───►│   Instance      │
│                 │    │   chat          │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       ▼
         │                       │              ┌─────────────────┐
         │                       │              │   Blockchain    │
         │                       │              │   Networks      │
         │                       │              └─────────────────┘
         │                       ▼
         │              ┌─────────────────┐
         │              │   LangChain     │
         │              │   Agent         │
         │              └─────────────────┘
         ▼
┌─────────────────┐
│   Real-time     │
│   Updates       │
└─────────────────┘
```

### API Request Flow

1. **Request Initiation**: Frontend sends request with user query + chainId
2. **Chain Selection**: Backend selects appropriate agent instance
3. **Intent Recognition**: LangChain processes natural language
4. **Action Execution**: Agent executes blockchain operations
5. **Response Formation**: Results formatted and returned
6. **UI Update**: Frontend updates with transaction results

### Message Format

```typescript
// Request
interface ChatRequest {
  messages: ClientMessage[]
  threadId?: string
  walletAddress?: string
  chainId?: number  // Dynamic chain selection
}

// Response
interface ChatResponse {
  ok: boolean
  content: string
  threadId?: string
  error?: string
}
```

---

## Security & Account Abstraction

### ERC-4337 Account Abstraction

The system uses 0xGasless for gasless transactions via ERC-4337:

```typescript
// Account Abstraction Flow
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Intent   │───►│   Smart Account │───►│   Paymaster     │
│                 │    │   (ERC-4337)    │    │   (Gas Sponsor) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Bundler       │
                       │   Network       │
                       └─────────────────┘
```

### Security Layers

1. **Private Key Management**: Server-side EOA for agent operations
2. **Smart Account Isolation**: Each user gets isolated smart account context
3. **Transaction Validation**: Pre-flight checks for all operations
4. **RPC Verification**: Chain ID validation against expected networks
5. **Rate Limiting**: Built-in protection against abuse

### Multi-Account Architecture

```typescript
interface AccountHierarchy {
  // Server-controlled accounts
  serverEOA: Address        // Agent's private key account
  smartAccount: Address     // Gasless execution account
  
  // User-connected accounts  
  connectedEOA?: Address    // User's MetaMask/wallet
  
  // Resolution strategy
  addressContext: 'smart' | 'server-eoa' | 'connected-eoa'
}
```

---

## API Architecture

### Route Structure

```
/api/
├── agent/
│   ├── chat              # Main AI agent interface
│   ├── balance           # Balance queries
│   ├── execute           # Direct action execution
│   ├── actions           # Available actions list
│   └── trigger           # Webhook triggers
├── db/
│   └── migrate           # Database migrations
├── logs/                 # System logging
├── poller/
│   ├── run               # Cron job execution
│   └── [endpoint]        # Poller management
├── price/                # Price feed aggregation
└── rules/                # Trading rule management
```

### Agent Chat API (`/api/agent/chat`)

Core endpoint for AI-powered interactions:

```typescript
// Capabilities
interface AgentCapabilities {
  // Account operations
  getAddress(): Promise<string>
  getBalance(token?: string, address?: string): Promise<string>
  
  // Transaction operations  
  smartTransfer(params: TransferParams): Promise<TxResult>
  smartSwap(params: SwapParams): Promise<TxResult>
  
  // Market data
  getTokenPrice(symbol: string): Promise<PriceData>
  getMarketData(): Promise<MarketData[]>
  getGasEstimate(): Promise<GasData>
  
  // Portfolio management
  getPortfolioOverview(address?: string): Promise<Portfolio>
  getTransactionHistory(address?: string): Promise<Transaction[]>
}
```

### Fallback Processing

When LangChain is unavailable, the system uses pattern matching:

```typescript
// Intent detection patterns
const intentPatterns = {
  address: /\b(address|wallet)\b/,
  balance: /\b(balance|balances)\b/,
  price: /\b(price|prices?|market)\b/,
  gas: /\b(gas|gas price|fees?)\b/,
  transfer: /transfer\s+(\d+(?:\.\d+)?)\s*([A-Za-z]{2,6})?\s*(?:to|=>)\s*(0x[a-fA-F0-9]{40})/,
  swap: /swap\s+(\d+(?:\.\d+)?)\s*([A-Za-z]{2,6})\s*(?:to|for)\s*([A-Za-z]{2,6})/
}
```

---

## Database Architecture

### Turso SQLite Configuration

```typescript
### Turso Database Configuration

The application uses Turso (LibSQL) as the database. Configuration is handled via environment variables:

```javascript
{
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
}
```

### Schema Overview

```sql
-- Core tables
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  wallet_address TEXT UNIQUE,
  smart_account TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  hash TEXT UNIQUE,
  user_id INTEGER,
  chain_id INTEGER,
  type TEXT, -- 'transfer', 'swap', 'approve'
  status TEXT, -- 'pending', 'success', 'failed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE trading_rules (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  name TEXT,
  conditions TEXT, -- JSON
  actions TEXT,    -- JSON
  active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE price_cache (
  symbol TEXT PRIMARY KEY,
  price REAL,
  change_24h REAL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Data Management

```typescript
// Database operations
interface DatabaseOperations {
  // Migration management
  migrate(secret?: string): Promise<void>
  
  // User management
  createUser(walletAddress: string): Promise<User>
  getUser(walletAddress: string): Promise<User | null>
  
  // Transaction logging
  logTransaction(tx: TransactionData): Promise<void>
  getTransactionHistory(userId: number): Promise<Transaction[]>
  
  // Trading rules
  createRule(rule: TradingRule): Promise<void>
  getRules(userId: number): Promise<TradingRule[]>
  
  // Price caching
  cachePrice(symbol: string, data: PriceData): Promise<void>
  getCachedPrice(symbol: string): Promise<PriceData | null>
}
```

---

## Deployment & Environment

### Environment Configuration

```bash
# Core Application
CHAIN_ID=8453                    # Default chain (Base)
PRIVATE_KEY=0x...               # Agent EOA key
OPENAI_API_KEY=sk-...           # AI model access

# Multi-chain RPCs
RPC_URL_BASE=https://mainnet.base.org
RPC_URL_AVALANCHE=https://api.avax.network/ext/bc/C/rpc  
RPC_URL_FUJI=https://api.avax-test.network/ext/bc/C/rpc

# 0xGasless Configuration
GASLESS_API_KEY=<global-key>
GASLESS_PAYMASTER_URL_BASE=https://paymaster.0xgasless.com/v1/8453/rpc/<key>
GASLESS_PAYMASTER_URL_AVALANCHE=https://paymaster.0xgasless.com/v1/43114/rpc/<key>
GASLESS_PAYMASTER_URL_FUJI=https://paymaster.0xgasless.com/v1/43113/rpc/<key>

# External APIs
OX_API_KEY=796b...              # 0x Protocol API
CRYPTO_RAPID_API_KEY=fb07...    # Price feeds
COINRANKING_API_KEY=...         # Market data

# Database  
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=eyJhbGci...

# Security
CRON_SECRET=cron_5d8f...        # Cron protection
MIGRATE_SECRET=migrate_f0a7...   # Migration protection
```

### Build & Deployment

```json
// Package.json scripts
{
  "scripts": {
    "dev": "next dev",
    "build": "next build", 
    "start": "next start",
    "build:poller": "tsc -p tsconfig.poller.json",
    "run:poller": "npm run build:poller && node scripts/run-poller.js",
    "dev:cron": "npm run build:poller && node scripts/dev-cron.js"
  }
}
```

### Vercel Configuration

```json
// vercel.json
{
  "functions": {
    "app/api/**": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/poller/run",
      "destination": "/api/poller/run?token=$CRON_SECRET"
    }
  ]
}
```

---

## Performance & Monitoring

### Caching Strategy

```typescript
// Multi-level caching
interface CachingSystem {
  // Agent instance caching
  agentInstances: Map<number, Promise<Agent>>  // Per-chain agents
  
  // Price data caching  
  priceCache: Map<string, {data: PriceData, expiry: number}>
  
  // Transaction state caching
  txStatusCache: Map<string, TransactionStatus>
  
  // RPC response caching
  rpcCache: Map<string, {result: any, expiry: number}>
}
```

### Error Handling

```typescript
// Comprehensive error handling
interface ErrorSystem {
  // RPC failures
  rpcFallback: string[]           // Multiple RPC endpoints
  
  // API rate limiting
  rateLimitBackoff: ExponentialBackoff
  
  // Transaction failures
  txRetryLogic: RetryStrategy
  
  // AI model fallbacks
  modelFallback: 'openai' | 'openrouter' | 'local'
  
  // Graceful degradation
  fallbackMode: 'pattern-matching' | 'cached-responses'
}
```

### Monitoring Points

```typescript
// Key metrics to monitor
interface MonitoringMetrics {
  // Performance
  apiResponseTimes: Histogram
  blockchainLatency: Histogram
  cacheHitRates: Counter
  
  // Reliability  
  successRates: Counter
  errorRates: Counter
  uptimePercentage: Gauge
  
  // Usage
  activeUsers: Gauge
  transactionVolume: Counter
  chainDistribution: Histogram
  
  // Cost
  gasUsage: Counter
  apiCallCosts: Counter
  infraCosts: Gauge
}
```

---

## Conclusion

The 10xSwap backend architecture provides a robust, scalable foundation for multi-chain DeFi operations with AI-powered automation. Key architectural strengths include:

- **Modular per-chain design** enabling easy network addition
- **Account abstraction integration** for seamless UX
- **Comprehensive error handling** and fallback systems
- **Flexible caching strategy** for optimal performance
- **Security-first approach** with multiple validation layers

The system is designed to scale with additional chains, enhanced AI capabilities, and growing user demand while maintaining reliability and security standards.

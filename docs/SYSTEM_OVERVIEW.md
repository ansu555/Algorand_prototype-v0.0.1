# 10xSwap System Overview

**A comprehensive guide to the 10xSwap Algorand DEX system architecture, components, and data flows.**

## Table of Contents

1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Multi-DEX Aggregation](#multi-dex-aggregation)
5. [Smart Contracts](#smart-contracts)
6. [Price Oracle & Market Data](#price-oracle--market-data)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Technology Stack](#technology-stack)
9. [Network Configuration](#network-configuration)

---

## Introduction

10xSwap is a comprehensive DeFi platform built on the Algorand blockchain that combines traditional DEX functionality with AI-powered trading agents. The system provides fast, secure, and carbon-neutral transactions on Algorand with sub-3 second finality.

### Core Features

- **Multi-DEX Aggregation** - Intelligent routing across Tinyman and Pact DEXs
- **AI-Powered Trading** - Natural language interface for blockchain operations
- **Per-User Agent Wallets** - Dedicated encrypted wallets for automated trading
- **Automated Trading Rules** - DCA, portfolio rebalancing, and rotation strategies
- **Real-Time Market Data** - Live price feeds from multiple sources
- **On-Chain Smart Contracts** - Autopilot rules and multi-hop swap router
- **Multi-Wallet Support** - Pera, Defly, and MyAlgo wallet integration

---

## System Architecture

### High-Level Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                            │
│                                                                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐ │
│  │  Swap UI     │   │  Portfolio   │   │  Agent Chat  │   │  Rules UI  │ │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬─────┘ │
└─────────┼──────────────────┼───────────────────┼──────────────────┼────────┘
          │                  │                   │                  │
┌─────────▼──────────────────▼───────────────────▼──────────────────▼────────┐
│                              API LAYER (Next.js)                           │
│                                                                            │
│  /api/price/*   /api/pools/*   /api/router/*    /api/agent/*   /api/rules/│
│      │               │               │               │              │      │
└──────┼───────────────┼───────────────┼───────────────┼──────────────┼──────┘
       │               │               │               │              │
┌──────▼─────────┐ ┌───▼──────────┐ ┌──▼────────────┐ ┌─▼───────────┐ ┌▼────┐
│  Price Oracle  │ │ Pool/Indexer │ │  Router Svc   │ │ Agent/Rules │ │Auth │
│  Aggregator    │ │  Access      │ │  (Tinyman/    │ │  Executor   │ │/ACL │
│  (multi-source)│ │              │ │   Pact)       │ │  (Autopilot)│ │     │
└──────┬─────────┘ └────┬─────────┘ └────┬──────────┘ └────┬────────┘ └─────┘
       │                │                │                 │
       │                │                │                 │
┌──────▼───────────┐ ┌──▼────────────┐ ┌─▼─────────────┐  │
│  Caching Layer   │ │  Data (DB)    │ │  Wallet/Signer│  │
│  (Price/Pool TTL)│ │  (logs, rules)│ │  (WalletConnect)│ │
└──────┬───────────┘ └────┬──────────┘ └────┬──────────┘  │
       │                   │                 │             │
       └───────────────────┼─────────────────┼─────────────┘
                           │                 │
                 ┌─────────▼─────────────────▼─────────────────────┐
                 │                   BLOCKCHAIN                    │
                 │                 (Algorand)                      │
                 │                                                 │
                 │  ┌──────────────┐   ┌──────────────┐           │
                 │  │  Tinyman V2  │   │    Pact      │           │
                 │  │   Pools      │   │   Pools      │           │
                 │  └──────┬───────┘   └──────┬───────┘           │
                 │         │                  │                   │
                 │  ┌──────▼────────┐  ┌──────▼────────┐          │
                 │  │  Contracts    │  │  Algorand     │          │
                 │  │  - Router     │  │  Indexer      │          │
                 │  │  - Pool Adptr │  │  (read chain) │          │
                 │  │  - Autopilot  │  └───────────────┘          │
                 │  │    Rules      │                              │
                 │  └───────────────┘                              │
                 └─────────────────────────────────────────────────┘
```

### Layer Breakdown

**Frontend Layer** (Next.js 15 + React 18)
- Modern App Router architecture with route groups
- Component library based on Shadcn UI
- Real-time updates via TanStack Query
- Wallet integration via TxnLab Use-Wallet

**API Layer** (Next.js API Routes)
- Serverless functions for all backend operations
- Price oracle aggregation
- DEX routing and quote comparison
- AI agent orchestration
- Trading rule execution

**Service Layer**
- Multi-source price aggregation
- Pool data fetching and caching
- Swap routing optimization
- Autopilot rule evaluation

**Blockchain Layer** (Algorand)
- Smart contracts for routing and rules
- DEX pool interactions (Tinyman, Pact)
- Transaction signing and submission
- On-chain data indexing

---

## Core Components

### 1. Frontend Components

```
src/components/
├── features/                  # Feature-specific components
│   ├── algorand/             # Blockchain UI components
│   ├── wallet/               # Wallet management
│   ├── crypto/               # Token display
│   ├── exchange/             # Swap interface
│   ├── analytics/            # Charts and analytics
│   ├── chat/                 # AI agent chat
│   ├── rules/                # Trading rules UI
│   └── trading/              # Trading components
│       └── pool-liquidity-chart.tsx  # Pool liquidity visualization
├── layout/                    # Layout components
├── ui/                        # Base UI (Shadcn)
└── providers/                 # React Context providers
```

#### Liquidity Pool UI Pages

**`/pool` - Pool Explorer**
- Browse all available liquidity pools across DEXs
- Network toggle (testnet/mainnet)
- Sortable columns (TVL, volume, fee tier, APR)
- Filter by DEX protocol (Tinyman, Pact)
- Visual pool analytics:
  - Total Value Locked (TVL) chart
  - 24h Trading Volume chart
  - Top 3 pools by TVL
- Real-time pool data with 5-minute cache
- Clickable rows navigate to pool details

**`/pool/create` - Create Liquidity Position**
- Two-step wizard interface:
  - Step 1: Select token pair and fee tier
  - Step 2: Set price range and deposit amounts
- Token selector with available assets
- Fee tier selection (0.05%, 0.30%, 1.00%)
- Price range input (min/max) for concentrated liquidity
- Deposit amount calculators for both tokens
- Position preview before submission

**`/pool/[id]` - Pool Details Page**
- Detailed pool information and analytics
- Liquidity depth charts
- Price history graphs
- Reserve ratio visualization
- Recent transaction history
- Add/remove liquidity interface
- Pool statistics (created date, total trades, etc.)

### 2. API Routes

```
src/app/api/
├── agent/                     # AI agent endpoints
│   ├── chat/                  # Chat interface
│   ├── wallet/                # Agent wallet management
│   │   ├── opt-in/           # Asset opt-in
│   │   └── opt-in-all/       # Batch opt-in
│   └── execute/               # Rule execution
├── algorand/                  # Blockchain operations
├── analytics/                 # Market analytics
├── db/                        # Database operations
├── logs/                      # Logging endpoints
├── poller/                    # Background polling
├── price/                     # Price queries
├── rules/                     # Trading rules
├── trade/                     # Swap execution
├── pool/                      # Pool data
│   └── opt-in-pool/          # Opt user into pool assets
└── pools/                     # Pool aggregation endpoints
    ├── all/                   # Fetch all pools from DEXs
    ├── market-data/           # Get TVL, volume, APR metrics
    └── transactions/          # Pool transaction history
```

#### Pool API Endpoints Details

**`/api/pools/all`** - Aggregate pool discovery
- Fetches pools from Tinyman and Pact in parallel
- Implements 5-minute caching per network
- Supports testnet and mainnet
- Returns: pool ID, assets, reserves, fees, DEX name

**`/api/pools/market-data`** - Market analytics
- Fetches from external data sources (Vestige, DeFiLlama)
- Calculates pool APR from fees and volume
- Returns: TVL in USD, 24h volume, reward APR
- 5-minute cache TTL

**`/api/pools/transactions`** - Historical data
- Queries Algorand indexer for pool transactions
- Filters by pool ID
- Returns swap events with amounts and timestamps
- Pagination support

**`/api/swap/opt-in-pool`** - Pool asset opt-in
- Opts user wallet into required pool assets
- Validates asset availability
- Constructs opt-in transactions
- Returns transaction group for signing

### 3. Core Libraries

```
src/lib/
├── agent.ts                   # AI agent orchestration
├── agent-wallet.ts            # Per-user agent wallet system
├── algorand.ts                # Algorand SDK functions
├── algorand-wallet.ts         # Wallet integration
├── tokens.ts                  # Token registry
├── db.ts                      # Database connection
└── dex/                       # DEX integration
    ├── aggregator.ts          # Multi-DEX aggregator
    ├── tinyman-client.ts      # Tinyman integration
    └── pact-client.ts         # Pact integration
```

---

## Agent Wallet System

### Overview

Each user has a dedicated Algorand wallet (agent wallet) that enables automated trading without requiring manual approval for each transaction. Agent wallets are automatically created when a user connects their main wallet.

### Key Features

- **Per-User Isolation** - Each user gets a unique agent wallet tied to their main wallet address
- **Encrypted Storage** - Wallet mnemonics encrypted with AES-256-GCM encryption
- **Automatic Creation** - Created on first wallet connection
- **Asset Support** - Supports ALGO and all Algorand Standard Assets (ASAs)
- **Auto Opt-In** - Automatically opts into required assets when needed

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER CONNECTS WALLET                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               GET /api/agent/wallet?userAddress             │
│                                                             │
│  Check Database for Existing Agent Wallet                  │
│           │                            │                    │
│      ┌────▼─────┐              ┌──────▼──────┐            │
│      │  EXISTS  │              │  NOT FOUND  │            │
│      └────┬─────┘              └──────┬──────┘            │
│           │                            │                    │
│  ┌────────▼─────────┐        ┌────────▼──────────────┐    │
│  │ Decrypt Mnemonic │        │ Generate New Wallet   │    │
│  │ Return Address   │        │ Encrypt Mnemonic      │    │
│  └──────────────────┘        │ Store in Database     │    │
│                               └───────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   AGENT WALLET READY                        │
│                                                             │
│  • Unique address per user                                 │
│  • Encrypted mnemonic stored in DB                         │
│  • Ready for funding and asset opt-ins                     │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
CREATE TABLE agent_wallets (
  id TEXT PRIMARY KEY,
  userAddress TEXT NOT NULL UNIQUE,
  agentAddress TEXT NOT NULL UNIQUE,
  encryptedMnemonic TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  lastUsedAt TEXT
)
```

### Security

- **AES-256-GCM Encryption** - Military-grade encryption for mnemonics
- **Environment Key Storage** - Encryption key stored in `AGENT_WALLET_ENCRYPTION_KEY`
- **Isolated Access** - Each agent wallet accessible only by its owner
- **No Shared Secrets** - Each user has independent encryption

### Usage in Autopilot

When executing autopilot rules, the system:

1. Retrieves user's agent wallet from database
2. Decrypts the mnemonic
3. Checks balance and opt-in status
4. Executes transfers from agent wallet to user's main wallet
5. Logs the transaction

For complete documentation, see **[Agent Wallet System](./AGENT_WALLET_SYSTEM.md)**.

---

## Multi-DEX Aggregation

### Overview

The Multi-DEX Aggregator fetches quotes from all supported DEXs in parallel and selects the best route based on multiple criteria.

### Complete Swap Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER INITIATES SWAP                        │
│                    "Swap 2 USDC for ALGO"                         │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│                    FRONTEND / API LAYER                            │
│                  (src/app/api/swap/prepare)                        │
│                                                                    │
│  1. Receives user request                                         │
│  2. Creates MultiDexAggregator                                    │
│  3. Requests quotes from all DEXs                                 │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│                   MULTI-DEX AGGREGATOR                             │
│                  (src/lib/dex/aggregator.ts)                       │
│                                                                    │
│  📊 PARALLEL QUOTE FETCHING                                       │
│  ┌─────────────────┐          ┌─────────────────┐               │
│  │  Tinyman Client │          │   Pact Client   │               │
│  │  getQuote()     │          │   getQuote()    │               │
│  └────────┬────────┘          └────────┬────────┘               │
│           │                             │                         │
│           ↓                             ↓                         │
│     Tinyman API                    Pact API                       │
│     Quote: 1.234 ALGO              Quote: 1.245 ALGO             │
│     Impact: 0.12%                  Impact: 0.11%                 │
│                                                                    │
│  🎯 SELECTION ALGORITHM                                           │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 1. Filter by max price impact (5%)       ✅ Both │           │
│  │ 2. Check preferred DEX                   ❌ None │           │
│  │ 3. Select highest output            → PACT WINS  │           │
│  │ 4. Liquidity tie-breaker (if needed)    N/A      │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                    │
│  📝 SELECTED: PACT                                                │
│   Reason: Best output amount: 1.245 ALGO                         │
│   Price Impact: 0.11%                                            │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│                   TRANSACTION BUILDER                              │
│                  (Selected DEX: PACT)                              │
│                                                                    │
│  Builds atomic transaction group:                                 │
│  ┌────────────────────────────────────────────────┐              │
│  │ Txn 0: Asset Transfer                          │              │
│  │   Sender: User                                 │              │
│  │   Receiver: MultihopSwapRouter                 │              │
│  │   Asset: USDC (10458941)                       │              │
│  │   Amount: 2,000,000 microUSDC                  │              │
│  └────────────────────────────────────────────────┘              │
│                                                                    │
│  ┌────────────────────────────────────────────────┐              │
│  │ Txn 1: Application Call                        │              │
│  │   App: MultihopSwapRouter                      │              │
│  │   Method: execute_swap_2hop()                  │              │
│  │   Args:                                         │              │
│  │     - pool_app_id: PACT_POOL_ID               │              │
│  │     - adapter_app_id: PACT_ADAPTER_ID   ← KEY │              │
│  │     - min_output: 1,233,000 (w/ slippage)     │              │
│  └────────────────────────────────────────────────┘              │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│              ON-CHAIN: MULTIHOP SWAP ROUTER                        │
│         (MultihopSwapRouter Smart Contract)                        │
│                                                                    │
│  1. Receives asset transfer + app call                            │
│  2. Routes to correct adapter (Pact)                              │
│  3. Adapter executes swap on Pact pool                            │
│  4. Returns swapped assets to user                                │
│  5. Verifies minimum output met                                   │
└────────────────────────────────────────────────────────────────────┘
```

### Selection Criteria

The aggregator selects the best DEX based on:

1. **Price Impact Filter** - Excludes quotes with >5% price impact
2. **Preferred DEX** - Uses user preference if set
3. **Best Output Amount** - Selects highest output (primary criterion)
4. **Liquidity Depth** - Tie-breaker for equal outputs
5. **Fee Structure** - Secondary consideration

### Supported DEXs

| DEX | Protocol | Fee | Adapter Contract ID | Pool Discovery |
|-----|----------|-----|---------------------|----------------|
| **Tinyman V2** | Constant Product AMM | 30 bps (0.3%) | 749360541 (testnet) | ✅ Tinyman Analytics API |
| **Pact Finance** | Constant Product AMM | 25 bps (0.25%) | 749341932 (testnet) | ✅ Pact Pool API |

### Liquidity Pool Integration

10xSwap integrates with decentralized exchange liquidity pools to enable token swaps. Each supported DEX has dedicated pool adapter contracts that handle protocol-specific interactions.

#### Pool Adapter Contracts

**TinymanPoolAdapter (749360541)**
- Enables interaction with Tinyman V2 constant product AMM pools
- Handles Tinyman's specific ABI interface (method selector: `0xd71d146d`)
- Supports all ASA-to-ASA and ALGO-to-ASA pool types
- 0.30% fee tier on all swaps

**PactPoolAdapter (749341932)**
- Connects to Pact Finance constant product AMM pools  
- Implements Pact's unique swap interface (method selector: `0xf4b4e0f4`)
- Includes special handlers for native ALGO swaps
- 0.25% fee tier (lower than Tinyman)

#### Pool Discovery Mechanism

```
┌─────────────────────────────────────────────────────────┐
│              POOL DISCOVERY & SELECTION                 │
└──────────────────┬──────────────────────────────────────┘
                   │
      ┌────────────▼─────────────┐
      │   Fetch All Pools        │
      │   - Tinyman Analytics    │
      │   - Pact Pool API        │
      │   - Vestige (optional)   │
      └────────────┬─────────────┘
                   │
      ┌────────────▼─────────────┐
      │   Filter & Validate      │
      │   - Min liquidity check  │
      │   - Asset availability   │
      │   - Network compatibility│
      └────────────┬─────────────┘
                   │
      ┌────────────▼─────────────┐
      │   Get Quotes from Pools  │
      │   - Calculate outputs    │
      │   - Estimate price impact│
      │   - Consider fees        │
      └────────────┬─────────────┘
                   │
      ┌────────────▼─────────────┐
      │   Rank & Select Best     │
      │   1. Price impact < 5%   │
      │   2. User preference     │
      │   3. Highest output      │
      │   4. Liquidity depth     │
      └────────────┬─────────────┘
                   │
      ┌────────────▼─────────────┐
      │   Return Selected Pool   │
      │   + Adapter Contract ID  │
      └──────────────────────────┘
```

#### Liquidity Pool Data Structure

Each pool contains:
- **Pool ID**: Unique identifier (typically DEX pool app ID)
- **Token Pair**: Two assets (e.g., ALGO/USDC)
- **Reserves**: Token balances in the pool
- **Fee Tier**: Trading fee percentage (30 bps or 25 bps)
- **DEX Name**: Source protocol (tinyman, pact)
- **Pool Address**: Algorand address of pool contract
- **Market Data**: TVL, volume, APR (mainnet only)

#### Pool APIs

**`GET /api/pools/all`** - Fetch all pools
- Network parameter: testnet or mainnet
- Returns pools from all supported DEXs
- 5-minute cache to avoid rate limits

**`GET /api/pools/market-data`** - Get market metrics
- TVL (Total Value Locked)
- 24h/1d/30d trading volume
- Pool APR and reward APR
- Fee revenue statistics

**`GET /api/pools/transactions`** - Pool transaction history
- Recent swaps and liquidity changes
- Per-pool filtering
- Pagination support

---

## Smart Contracts

### Deployed Contracts (Testnet)

#### 1. MultihopSwapRouter
- **App ID:** `749360450`
- **Purpose:** Main router for multi-hop swaps across DEXs
- **Methods:** `execute_swap_2hop()`, `execute_swap_1hop()`
- **Explorer:** [View on AlgoScan](https://testnet.algoscan.app/app/749360450)

#### 2. TinymanPoolAdapter
- **App ID:** `749360541`
- **Purpose:** Adapter for Tinyman V2 pools
- **Methods:** `swap()`, asset transfers
- **Explorer:** [View on AlgoScan](https://testnet.algoscan.app/app/749360541)

#### 3. PactPoolAdapter
- **App ID:** `749341932`
- **Purpose:** Adapter for Pact Finance pools
- **Methods:** `swap_fixed_input()`, `swap_algo_to_asa()`, `swap_asa_to_algo()`
- **Explorer:** [View on AlgoScan](https://testnet.algoscan.app/app/749341932)

#### 4. AutoPilotRuleContract
- **App ID:** `749361072`
- **Purpose:** Automated trading rules and conditions
- **Methods:** `create_rule()`, `execute_rule()`, `delete_rule()`
- **Explorer:** [View on AlgoScan](https://testnet.algoscan.app/app/749361072)

### Contract Architecture

```
┌────────────────────────────────────────────────────┐
│         MultihopSwapRouter (Main Contract)         │
│                  App ID: 749360450                 │
│                                                    │
│  Methods:                                          │
│  • execute_swap_2hop(pool1, pool2, adapter1,      │
│                      adapter2)                     │
│  • execute_swap_1hop(pool, adapter)               │
│  • execute_swap_3hop(pool1, pool2, pool3)         │
│                                                    │
│  Responsibilities:                                 │
│  • Receives user assets via atomic group          │
│  • Routes to appropriate adapter based on DEX     │
│  • Validates minimum output (slippage protection) │
│  • Returns swapped assets to user                 │
│  • Supports multi-hop routing (1, 2, or 3 hops)   │
└────────────┬───────────────────┬────────────────────┘
             │                   │
    ┌────────▼────────┐  ┌──────▼─────────┐
    │ TinymanAdapter  │  │  PactAdapter   │
    │  (749360541)    │  │  (749341932)   │
    │                 │  │                │
    │ Methods:        │  │ Methods:       │
    │ • swap_fixed_   │  │ • swap_fixed_  │
    │   input()       │  │   input()      │
    │                 │  │ • swap_algo_   │
    │ Responsibilities│  │   to_asa()     │
    │ • Tinyman ABI   │  │ • swap_asa_    │
    │   (0xd71d146d)  │  │   to_algo()    │
    │ • Pool calls    │  │                │
    │ • Asset routing │  │ Responsibilities│
    │ • Fee: 0.30%    │  │ • Pact ABI     │
    │                 │  │   (0xf4b4e0f4) │
    │                 │  │ • Pool calls   │
    │                 │  │ • Asset routing │
    │                 │  │ • Fee: 0.25%   │
    └─────────┬───────┘  └────────┬────────┘
              │                   │
    ┌─────────▼──────────┐ ┌─────▼──────────┐
    │  Tinyman V2 Pools  │ │  Pact Finance  │
    │                    │ │  Pools         │
    │ • 100+ pools       │ │ • 50+ pools    │
    │ • Testnet/Mainnet  │ │ • Mainnet only │
    │ • Constant Product │ │ • Constant     │
    │   AMM (x*y=k)      │ │   Product AMM  │
    └────────────────────┘ └────────────────┘
```

#### Pool Adapter Design Pattern

The adapter pattern provides:

1. **Protocol Abstraction** - Router doesn't need DEX-specific knowledge
2. **Extensibility** - New DEXs require only new adapter contracts
3. **Optimal Routing** - Can mix adapters in multi-hop swaps
4. **Unified Interface** - Consistent `swap_fixed_input()` method
5. **Gas Efficiency** - Fee pooling across all inner transactions

#### Adapter Selection Flow

```
User Request → Aggregator → Quote All DEXs → Rank by Output
                                                     ↓
                                        Select Best Pool & Adapter
                                                     ↓
Router.execute_swap_2hop(pool_id, adapter_id, ...) 
                                                     ↓
                      Adapter executes swap on selected pool
                                                     ↓
                            Output returned to user
```

---

## Price Oracle & Market Data

### Multi-Source Price Oracle

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MULTI-SOURCE PRICE ORACLE                       │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Tinyman    │  │     Pact     │  │   Vestige    │             │
│  │  Analytics   │  │   Finance    │  │     API      │             │
│  │     API      │  │     API      │  │              │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                 │                 │                      │
│         └─────────────────┴─────────────────┘                      │
│                           │                                        │
│                   ┌───────▼────────┐                               │
│                   │  Price Oracle  │                               │
│                   │  Aggregator    │                               │
│                   │  - Average     │                               │
│                   │  - Weighted    │                               │
│                   │  - Deviation   │                               │
│                   └───────┬────────┘                               │
│                           │                                        │
│        ┌──────────────────┼──────────────────┐                     │
│        │                  │                  │                     │
│  ┌─────▼─────┐   ┌────────▼────────┐  ┌──────▼──────┐            │
│  │ CoinGecko │   │    Algorand     │  │   Cache     │            │
│  │    API    │   │    Indexer      │  │  (60s TTL)  │            │
│  │           │   │  (On-chain)     │  │             │            │
│  └───────────┘   └─────────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

### Price Sources

1. **On-Chain Sources** (Primary)
   - Tinyman V2 pool reserves
   - Pact Finance pool reserves
   - Algorand Indexer (historical)

2. **Off-Chain Sources** (Secondary)
   - CoinGecko API
   - CoinRanking API
   - Vestige API

3. **Aggregation Strategy**
   - Weighted average based on liquidity
   - Deviation detection (>5% triggers alert)
   - 60-second TTL caching
   - Fallback cascade for reliability

---

## Data Flow Diagrams

### Swap Transaction Flow

```
User Wallet → Frontend → API Route → Aggregator → DEX Selection
                                                        ↓
User Wallet ← Blockchain ← Smart Contract ← Transaction Builder
```

### Price Data Flow

```
DEX APIs → Price Aggregator → Cache → API Response → Frontend
   ↓
Indexer → Pool Reserves → Calculation → Price Feed
```

### Autopilot Rule Execution

```
Cron/Poller → Rule Evaluation → Condition Check → Price Check
                                                       ↓
Database ← Execution Log ← Transaction ← Swap Execution
```

---

## Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 18 with TypeScript
- **Styling:** Tailwind CSS + Shadcn UI
- **Animations:** Framer Motion
- **State Management:** Redux Toolkit + TanStack Query
- **Web3:** TxnLab Use-Wallet + WalletConnect

### Backend
- **Runtime:** Node.js with TypeScript
- **Framework:** Next.js API Routes (serverless)
- **AI/ML:** LangChain + OpenAI/OpenRouter
- **Blockchain:** Algorand SDK (algosdk)
- **Database:** Turso (LibSQL)
- **Caching:** In-memory + persistent storage

### Blockchain
- **Network:** Algorand (testnet/mainnet)
- **Smart Contracts:** Python (AlgoPy)
- **DEX Integration:** Tinyman SDK, Pact SDK
- **Wallets:** Pera, Defly, MyAlgo

### External Integrations
- **Price Feeds:** CoinGecko, CoinRanking
- **Blockchain RPCs:** AlgoNode (free public nodes)
- **AI Models:** OpenAI GPT-4, OpenRouter models

---

## Network Configuration

### Testnet Configuration

```typescript
const TESTNET_CONFIG = {
  network: 'testnet',
  algodServer: 'https://testnet-api.algonode.cloud',
  indexerServer: 'https://testnet-idx.algonode.cloud',
  contracts: {
    multihopRouter: 749360450,
    tinymanAdapter: 749360541,
    pactAdapter: 749341932,
    autopilotRule: 749361072
  }
}
```

### Mainnet Configuration

```typescript
const MAINNET_CONFIG = {
  network: 'mainnet',
  algodServer: 'https://mainnet-api.algonode.cloud',
  indexerServer: 'https://mainnet-idx.algonode.cloud',
  contracts: {
    // Deploy contracts separately for mainnet
    multihopRouter: null,
    tinymanAdapter: null,
    pactAdapter: null,
    autopilotRule: null
  }
}
```

### Supported Assets (Testnet)

| Symbol | ASA ID | Decimals | Name |
|--------|--------|----------|------|
| ALGO   | 0      | 6        | Algorand |
| USDC   | 10458941 | 6      | USD Coin |
| USDT   | 312769 | 6        | Tether |

---

## Key Architectural Decisions

✅ **Algorand-Exclusive** - Focus on single blockchain for simplicity and deep integration  
✅ **Multi-DEX Aggregation** - Best price execution via intelligent routing  
✅ **On-Chain Routing** - Smart contracts handle swap execution for security  
✅ **Serverless Backend** - Next.js API routes for scalability  
✅ **Type Safety** - TypeScript throughout for reliability  
✅ **Modern UI** - Shadcn UI for beautiful, accessible components  

---

## Related Documentation

- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Setup, installation, and testing
- **[Backend & Agent Spec](./BACKEND_AND_AGENT_SPEC.md)** - API endpoints and implementation
- **[Autopilot Module](./AUTOPILOT_MODULE.md)** - Trading rules and automation
- **[Contracts & Deployment](./CONTRACTS_AND_DEPLOYMENT.md)** - Smart contract details
- **[AI Agent & MCP/NCP Spec](./AI_AGENT_AND_MCP_NCP_SPEC.md)** - AI agent capabilities

---

**Last Updated:** November 12, 2025  
**Version:** 1.0.0  
**Status:** Production Ready (Testnet)

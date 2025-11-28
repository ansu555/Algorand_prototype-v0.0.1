# 10xSwap System Overview

**A comprehensive guide to the 10xSwap Algorand DEX system architecture, components, and data flows.**

## Table of Contents

1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Multi-DEX Aggregation](#multi-dex-aggregation)
5. [Token Launchpad Architecture](#token-launchpad-architecture)
6. [Rewards System Architecture](#rewards-system-architecture)
7. [Smart Contracts](#smart-contracts)
8. [Price Oracle & Market Data](#price-oracle--market-data)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Technology Stack](#technology-stack)
11. [Network Configuration](#network-configuration)
12. [Database Schema](#database-schema)

---

## Introduction

10xSwap is a comprehensive DeFi platform built on the Algorand blockchain that combines traditional DEX functionality with AI-powered trading agents. The system provides fast, secure, and carbon-neutral transactions on Algorand with sub-3 second finality.

### Core Features

- **Multi-DEX Aggregation** - Intelligent routing across Tinyman and Pact DEXs
- **AI-Powered Trading** - Natural language interface for blockchain operations
- **Per-User Agent Wallets** - Dedicated encrypted wallets for automated trading
- **Automated Trading Rules** - DCA, portfolio rebalancing, and rotation strategies
- **WaveBreak Token Launchpad** - Fair token launches using bonding curves with anti-bot protection
- **X Token Rewards System** - Quest-based rewards with levels, streaks, and badges
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

## Token Launchpad Architecture

### WaveBreak Bonding Curve System

The WaveBreak Token Launchpad implements a fair-launch mechanism using bonding curves for transparent, bot-resistant token distribution.

#### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    WAVEBREAK LAUNCHPAD ARCHITECTURE                       │
└───────────────────────────────────────┬──────────────────────────────────┘
                                        │
            ┌───────────────────────────▼───────────────────────────┐
            │               FRONTEND (Launchpad UI)                 │
            │                                                       │
            │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
            │  │ Browse   │  │  Create  │  │  Project Detail   │ │
            │  │ Projects │  │  Launch  │  │  & Buy Interface  │ │
            │  └────┬─────┘  └────┬─────┘  └─────────┬─────────┘ │
            └───────┼─────────────┼──────────────────┼────────────┘
                    │             │                  │
            ┌───────▼─────────────▼──────────────────▼────────────┐
            │            LAUNCHPAD API LAYER                       │
            │                                                      │
            │  /api/launchpad/projects   - CRUD operations       │
            │  /api/launchpad/purchase   - Buy, quote, validate  │
            │  /api/launchpad/user       - Points & history      │
            │  /api/launchpad/deploy     - Contract deployment   │
            └───────┬──────────────────────────────────┬──────────┘
                    │                                  │
        ┌───────────▼──────────┐           ┌──────────▼──────────┐
        │ Bonding Curve Logic  │           │  Anti-Bot Engine    │
        │                      │           │                     │
        │ • Linear pricing     │           │ • Cooldown tracking │
        │ • Exponential curve  │           │ • Per-tx limits     │
        │ • Sigmoid curve      │           │ • Per-user limits   │
        │ • Price quotes       │           │ • Whale penalties   │
        │ • Impact calculation │           │ • Bot flagging      │
        └───────────┬──────────┘           └──────────┬──────────┘
                    │                                  │
        ┌───────────▼──────────────────────────────────▼──────────┐
        │                  DATABASE LAYER                         │
        │                                                          │
        │  launch_projects      - Project config & status         │
        │  token_purchases      - Purchase history                │
        │  launchpad_points     - User points accumulation        │
        │  launchpad_claims     - Vesting claims (30-day)         │
        │  launchpad_antibot    - Security tracking               │
        │  launchpad_liquidity  - DEX pool info after graduation  │
        │  launchpad_metrics    - Analytics snapshots             │
        └───────────┬──────────────────────────────────────────────┘
                    │
        ┌───────────▼──────────────────────────────────────────────┐
        │              ALGORAND BLOCKCHAIN                         │
        │                                                          │
        │  ASA Creation       - Token deployment                   │
        │  Payment Txns       - ALGO → Token purchases             │
        │  DEX Integration    - Tinyman/Pact pool creation         │
        │  LP Locks           - 6-month timelock contracts         │
        └──────────────────────────────────────────────────────────┘
```

#### Bonding Curve Mechanics

**Pricing Formulas:**

1. **Linear Curve** (steady increase)
   ```
   price(progress) = basePrice + (maxPrice - basePrice) * progress
   
   Example: $0.01 → $0.10 over 100% progress
   ```

2. **Exponential Curve** (rapid acceleration)
   ```
   price(progress) = basePrice * (maxPrice/basePrice) ^ progress
   
   Example: $0.01 → exponential growth → $0.50
   ```

3. **Sigmoid Curve** (S-shaped, balanced)
   ```
   price(progress) = basePrice + (maxPrice - basePrice) * (progress²)
   
   Example: Slow start, rapid middle, slow end
   ```

**Progress Calculation:**
```typescript
const progress = tokensSold / totalSupply // 0.0 to 1.0
```

#### Early Buyer Rewards System

Users earn **points** based on purchase timing:

```
┌────────────────────────────────────────────────────────────┐
│           EARLY BUYER BONUS MULTIPLIER CURVE               │
│                                                            │
│  3x ┤●                                                     │
│     │  ●●                                                  │
│     │     ●●                                               │
│  2x ┤        ●●●                                           │
│     │            ●●●                                       │
│     │                ●●●●                                  │
│  1x ┤                     ●●●●●●●●●●●●●●●●●●●●●●         │
│     └─────────────────────────────────────────────────────┤
│     0%                  Progress                       100%│
└────────────────────────────────────────────────────────────┘

Multiplier = 3.0 - (progress * 2.0)  // Linear decay from 3x to 1x
```

**Points Conversion:**
- After graduation: 1 point = 1 launched token
- 30-day linear vesting: `dailyUnlock = totalPoints / 30`
- Users claim unlocked tokens daily via UI

#### Anti-Bot Protection

**Four-Layer Defense:**

1. **Cooldown Period**
   - 10 blocks (~33 seconds) between purchases per wallet
   - Prevents rapid bot sniping
   - Tracked in `launchpad_antibot.last_purchase_round`

2. **Per-Transaction Limit**
   - Max 1% of total supply per purchase
   - Prevents single whale buys
   - Enforced: `tokenAmount <= totalSupply * 0.01`

3. **Per-User Limit**
   - Max 5% of total supply per wallet address
   - Prevents single wallet dominance
   - Enforced: `userTotalBought + tokenAmount <= totalSupply * 0.05`

4. **Whale Penalty**
   - Purchases >2.5% of supply flagged
   - Reduced point multiplier (0.5x instead of early bonus)
   - Still allowed, but economically discouraged

#### Graduation & DEX Deployment

**Graduation Trigger:**
```
if (algoRaised >= bondingTarget) {
  status = 'graduated'
  deployToDE

X()
}
```

**Automated Steps:**
1. Create liquidity pool on chosen DEX (Tinyman/Pact)
2. Deposit 80% of raised ALGO + equivalent tokens
3. Mint LP tokens
4. Lock LP tokens for 6 months (anti-rug)
5. Transfer 20% of ALGO to project creator
6. Enable token trading on DEX

**Liquidity Pool Structure:**
```typescript
{
  poolAddress: "ALGO_POOL_ADDRESS",
  poolAppId: 123456789,
  lpTokenId: 987654321,
  algoDeposited: totalRaised * 0.8,
  tokensDeposited: tokensForSale * 0.8,
  lpTokensLocked: true,
  lockExpiryRound: currentRound + (BLOCKS_PER_DAY * 180)  // 6 months
}
```

#### Database Schema

**Core Tables:**

```sql
-- Project Configuration
CREATE TABLE launch_projects (
  id TEXT PRIMARY KEY,
  creator_address TEXT NOT NULL,
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  asa_id BIGINT,                    -- Algorand ASA ID
  app_id BIGINT,                    -- Bonding curve contract
  curve_type TEXT,                  -- 'linear', 'exponential', 'sigmoid'
  base_price BIGINT,                -- Starting price (microALGO)
  max_price BIGINT,                 -- Maximum price (microALGO)
  bonding_target BIGINT,            -- Funding goal (microALGO)
  tokens_for_sale BIGINT,
  tokens_sold BIGINT DEFAULT 0,
  algo_raised BIGINT DEFAULT 0,
  status TEXT DEFAULT 'active',     -- 'pending', 'active', 'graduated'
  liquidity_percentage INTEGER DEFAULT 80,
  lp_lock_duration BIGINT,
  dex_platform TEXT                 -- 'tinyman', 'pact'
);

-- Purchase History
CREATE TABLE token_purchases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  buyer_address TEXT NOT NULL,
  tokens_amount BIGINT NOT NULL,
  algo_paid BIGINT NOT NULL,
  price_per_token BIGINT NOT NULL,
  points_earned BIGINT NOT NULL,    -- Early buyer bonus points
  transaction_id TEXT NOT NULL,
  block_round BIGINT NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- User Points (convert to tokens after graduation)
CREATE TABLE launchpad_points (
  user_address TEXT NOT NULL,
  project_id TEXT NOT NULL,
  points_balance BIGINT DEFAULT 0,
  total_earned BIGINT DEFAULT 0,
  total_claimed BIGINT DEFAULT 0,
  last_claim_round BIGINT,
  PRIMARY KEY (user_address, project_id)
);

-- Anti-Bot Tracking
CREATE TABLE launchpad_antibot (
  user_address TEXT NOT NULL,
  project_id TEXT NOT NULL,
  purchase_count INTEGER DEFAULT 0,
  last_purchase_round BIGINT,       -- For cooldown check
  total_tokens_bought BIGINT DEFAULT 0,
  flagged_as_bot INTEGER DEFAULT 0,
  whale_penalty INTEGER DEFAULT 0,
  PRIMARY KEY (user_address, project_id)
);
```

#### Data Flow: Token Purchase

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TOKEN PURCHASE FLOW                              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
            1. User Clicks "Buy X Tokens"
                                │
                    ┌───────────▼───────────┐
                    │  GET Price Quote      │
                    │  /api/launchpad/      │
                    │  purchase?action=quote│
                    │                       │
                    │  • Calculate price    │
                    │  • Apply early bonus  │
                    │  • Show impact        │
                    └───────────┬───────────┘
                                │
            2. Display Quote to User
                                │
                    ┌───────────▼───────────┐
                    │  POST Validation      │
                    │  action=validate      │
                    │                       │
                    │  ✓ Cooldown check     │
                    │  ✓ Per-tx limit       │
                    │  ✓ Per-user limit     │
                    │  ✓ Sufficient ALGO    │
                    └───────────┬───────────┘
                                │
            3. If Valid: User Signs Algorand Txn
                                │
                    ┌───────────▼───────────┐
                    │  Algorand Payment     │
                    │  User → Project       │
                    │                       │
                    │  amount: algoAmount   │
                    │  receiver: projectAddr│
                    │  note: "launchpad"    │
                    └───────────┬───────────┘
                                │
            4. Transaction Confirmed On-Chain
                                │
                    ┌───────────▼───────────┐
                    │  POST Record Purchase │
                    │  action=record        │
                    │                       │
                    │  • Save to DB         │
                    │  • Award points       │
                    │  • Update antibot     │
                    │  • Update project stats│
                    │  • Check graduation   │
                    └───────────┬───────────┘
                                │
            5. Success Response + Points Earned
                                │
                    ┌───────────▼───────────┐
                    │  If Graduated:        │
                    │  • Create DEX pool    │
                    │  • Lock liquidity     │
                    │  • Enable vesting     │
                    └───────────────────────┘
```

#### API Endpoints

**`GET /api/launchpad/projects`**
- List all projects (with filters)
- Query params: `id`, `status` (pending/active/graduated)

**`POST /api/launchpad/projects`**
- Create new token launch
- Body: Project config, curve params, liquidity settings

**`POST /api/launchpad/purchase`**
- Three actions: `quote`, `validate`, `record`
- Handles full purchase lifecycle

**`GET /api/launchpad/user`**
- Get user points and purchase history
- Query params: `userAddress`, `projectId`, `action` (points/purchases)

---

## Rewards System Architecture

### X Token Quest & Gamification Engine

The X Token Rewards System gamifies platform usage through quests, levels, streaks, and badges.

#### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    X TOKEN REWARDS ARCHITECTURE                           │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │
            ┌───────────────────────▼───────────────────────────┐
            │            FRONTEND (Rewards UI)                  │
            │                                                   │
            │  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
            │  │ Quest    │  │  Level   │  │  Leaderboard │   │
            │  │Dashboard │  │Progress  │  │  & Badges    │   │
            │  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
            └───────┼─────────────┼────────────────┼───────────┘
                    │             │                │
            ┌───────▼─────────────▼────────────────▼───────────┐
            │            REWARDS API LAYER                      │
            │                                                   │
            │  /api/rewards          - User rewards data       │
            │  /api/rewards/quests   - Quest list & progress   │
            │  /api/rewards/track    - Action tracking         │
            │  /api/rewards/claim    - Claim quest rewards     │
            └───────┬───────────────────────────────┬───────────┘
                    │                               │
        ┌───────────▼──────────┐       ┌───────────▼──────────┐
        │  Quest Engine        │       │  Streak Tracker      │
        │                      │       │                      │
        │ • Track user actions │       │ • Daily login check  │
        │ • Update progress    │       │ • Multiplier calc    │
        │ • Award XP & X       │       │ • Reset logic        │
        │ • Badge unlock       │       │ • Streak shields     │
        └───────────┬──────────┘       └───────────┬──────────┘
                    │                               │
        ┌───────────▼───────────────────────────────▼──────────┐
        │                  DATABASE LAYER                       │
        │                                                       │
        │  user_rewards        - Balance, level, XP, streaks   │
        │  reward_transactions - Earn/spend history            │
        │  quest_progress      - Per-user quest state          │
        │  user_actions        - Trackable events log          │
        │  daily_streaks       - Streak tracking               │
        │  leaderboard_cache   - Performance optimization      │
        └───────────┬───────────────────────────────────────────┘
                    │
        ┌───────────▼───────────────────────────────────────────┐
        │           EVENT BUS (Action Tracking)                 │
        │                                                       │
        │  trackAction(userId, 'swap', metadata)                │
        │  trackAction(userId, 'add_liquidity', metadata)       │
        │  trackAction(userId, 'create_rule', metadata)         │
        │  trackAction(userId, 'login', metadata)               │
        └───────────────────────────────────────────────────────┘
```

#### Quest System

**Quest Types:**

| Type | Duration | Complexity | Reward Range |
|------|----------|-----------|--------------|
| Daily | 24 hours | Simple (1 action) | 5-20 X |
| Weekly | 7 days | Moderate (5-10 actions) | 100-300 X |
| Milestone | Permanent | Long-term (cumulative) | 25-2,500 X |
| Achievement | Permanent | Difficult (elite goals) | 500-5,000 X |
| Social | Ongoing | Community-based | Variable |

**Quest Tracking Logic:**

```typescript
// Example: Swap completion
async function onSwapComplete(userId, swapData) {
  // Log action
  await db.insert('user_actions', {
    user_id: userId,
    action_type: 'swap',
    metadata: JSON.stringify(swapData)
  })
  
  // Update relevant quest progress
  const activeQuests = await getActiveQuests(userId)
  
  for (const quest of activeQuests) {
    if (quest.requirement.action === 'swap') {
      const newProgress = quest.progress + 1
      
      await updateQuestProgress(userId, quest.id, newProgress)
      
      // Check completion
      if (newProgress >= quest.requirement.count) {
        await completeQuest(userId, quest.id)
      }
    }
  }
  
  // Award XP
  await awardXP(userId, 10)  // 10 XP per swap
}
```

#### Level Progression System

**Level Thresholds (1-30):**

```typescript
const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000,    // 1-10
  15000, 20000, 26000, 33000, 41000, 50000, 60000, 71000,   // 11-18
  83000, 96000, 110000, 125000, 141000, 158000, 176000,     // 19-25
  195000, 215000, 236000, 258000, 281000                     // 26-30
]
```

**Level Benefits:**

| Level | Unlock |
|-------|--------|
| 5 | Weekly quests |
| 10 | Achievement quests |
| 15 | Referral bonuses |
| 20 | Prediction markets |
| 25 | Governance proposals |
| 30 | Legendary quests (5,000 X rewards) |

#### Streak Multiplier System

```
┌────────────────────────────────────────────────────────────┐
│             STREAK MULTIPLIER PROGRESSION                  │
│                                                            │
│  3x ┤                                           ●●●●●●●●● │
│     │                                                      │
│     │                                                      │
│  2x ┤                          ●●●●●●●●●●●●●●●●          │
│     │                                                      │
│     │                                                      │
│ 1.5x┤             ●●●●●●●●                                │
│     │                                                      │
│     │                                                      │
│  1x ┤●●●●●●●                                              │
│     └─────────────────────────────────────────────────────┤
│     0      7       14                    30+        days  │
└────────────────────────────────────────────────────────────┘
```

**Streak Logic:**

```typescript
async function checkDailyLogin(userId) {
  const user = await getUserRewards(userId)
  const now = new Date()
  const lastLogin = new Date(user.last_login_date)
  
  const hoursSinceLogin = (now - lastLogin) / (1000 * 60 * 60)
  
  if (hoursSinceLogin >= 24 && hoursSinceLogin < 48) {
    // Maintain streak
    user.streak_days += 1
  } else if (hoursSinceLogin >= 48) {
    // Streak broken
    user.streak_days = 1
  }
  // else: Same day, no change
  
  user.last_login_date = now
  
  // Calculate multiplier
  user.multiplier = getStreakMultiplier(user.streak_days)
  
  await updateUserRewards(userId, user)
}

function getStreakMultiplier(streakDays) {
  if (streakDays >= 30) return 3.0
  if (streakDays >= 14) return 2.0
  if (streakDays >= 7) return 1.5
  return 1.0
}
```

#### Badge System

**Badge Structure:**

```typescript
interface Badge {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  requirement: { type: string, value: number }
  reward: number           // One-time X token bonus
  multiplier?: number      // Permanent reward boost %
}
```

**Example Badges:**

```typescript
const BADGES = [
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    icon: '🥇',
    rarity: 'legendary',
    requirement: { type: 'join_date', value: 30 },  // First month
    reward: 500,
    multiplier: 10  // +10% all rewards
  },
  {
    id: 'diamond_hands',
    name: 'Diamond Hands',
    icon: '💎',
    rarity: 'epic',
    requirement: { type: 'lp_days', value: 90 },
    reward: 1000,
    multiplier: 5   // +5% all rewards
  }
]
```

#### Database Schema

```sql
-- User Rewards
CREATE TABLE user_rewards (
  user_id TEXT PRIMARY KEY,
  x_token_balance REAL DEFAULT 0,
  total_earned REAL DEFAULT 0,
  total_spent REAL DEFAULT 0,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_login_date TEXT,
  badges TEXT,              -- JSON array of badge IDs
  completed_quests TEXT,    -- JSON array of quest IDs
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  referred_users TEXT       -- JSON array
);

-- Quest Progress
CREATE TABLE quest_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',  -- 'active', 'completed', 'claimed'
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  claimed_at TEXT,
  UNIQUE(user_id, quest_id)
);

-- User Actions (for quest tracking)
CREATE TABLE user_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,  -- 'swap', 'add_liquidity', 'create_rule'
  metadata TEXT,              -- JSON context
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Reward Transactions
CREATE TABLE reward_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,      -- 'earn', 'spend', 'claim'
  amount REAL NOT NULL,
  source TEXT NOT NULL,    -- 'quest', 'streak', 'referral'
  quest_id TEXT,
  metadata TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### Data Flow: Quest Completion

```
┌─────────────────────────────────────────────────────────────────────┐
│                    QUEST COMPLETION FLOW                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
            1. User Performs Action (e.g., Swap)
                                │
                    ┌───────────▼───────────┐
                    │  Log to user_actions  │
                    │                       │
                    │  INSERT INTO          │
                    │  user_actions(        │
                    │    user_id,           │
                    │    action_type: 'swap'│
                    │    metadata: {...}    │
                    │  )                    │
                    └───────────┬───────────┘
                                │
            2. Quest Engine Triggered
                                │
                    ┌───────────▼───────────┐
                    │  Find Active Quests   │
                    │  Matching Action      │
                    │                       │
                    │  SELECT * FROM        │
                    │  quest_progress       │
                    │  WHERE                │
                    │    user_id = ? AND    │
                    │    status = 'active'  │
                    └───────────┬───────────┘
                                │
            3. Update Progress
                                │
                    ┌───────────▼───────────┐
                    │  Increment Progress   │
                    │                       │
                    │  UPDATE quest_progress│
                    │  SET                  │
                    │    progress = progress│
                    │              + 1      │
                    │  WHERE id = ?         │
                    └───────────┬───────────┘
                                │
            4. Check Completion
                                │
                    ┌───────────▼───────────┐
                    │  progress >=          │
                    │  requirement.count?   │
                    │                       │
                    │  If YES:              │
                    │  • Set status =       │
                    │    'completed'        │
                    │  • Show notification  │
                    └───────────┬───────────┘
                                │
            5. User Claims Reward
                                │
                    ┌───────────▼───────────┐
                    │  POST /api/rewards/   │
                    │  claim                │
                    │                       │
                    │  • Apply streak mult  │
                    │  • Award X tokens     │
                    │  • Award XP           │
                    │  • Set status =       │
                    │    'claimed'          │
                    │  • Record transaction │
                    └───────────┬───────────┘
                                │
            6. Update User Rewards
                                │
                    ┌───────────▼───────────┐
                    │  UPDATE user_rewards  │
                    │  SET                  │
                    │    x_token_balance += │
                    │    total_earned +=    │
                    │    experience_points+=│
                    │                       │
                    │  Check level up       │
                    │  Check badge unlock   │
                    └───────────────────────┘
```

---

## Smart Contracts

### Deployed Contracts (Testnet)

#### 1. MultihopSwapRouter
- **App ID:** `749360450`
- **Purpose:** Main router for multi-hop swaps across DEXs
- **Methods:** `execute_swap_2hop()`, `execute_swap_1hop()`
- **Explorer:** [View on Lora](https://lora.algokit.io/testnet/application/749360450)

#### 2. TinymanPoolAdapter
- **App ID:** `749360541`
- **Purpose:** Adapter for Tinyman V2 pools
- **Methods:** `swap()`, asset transfers
- **Explorer:** [View on Lora](https://lora.algokit.io/testnet/application/749360541)

#### 3. PactPoolAdapter
- **App ID:** `749341932`
- **Purpose:** Adapter for Pact Finance pools
- **Methods:** `swap_fixed_input()`, `swap_algo_to_asa()`, `swap_asa_to_algo()`
- **Explorer:** [View on Lora](https://lora.algokit.io/testnet/application/749341932)

#### 4. AutoPilotRuleContract
- **App ID:** `749509231`
- **Purpose:** Automated trading rules and conditions
- **Methods:** `create_rule()`, `execute_rule()`, `delete_rule()`
- **Explorer:** [View on Lora](https://lora.algokit.io/testnet/application/749509231)

#### 5. LiquidityPoolContract
- **Status:** Deploy per pool instance
- **Purpose:** Custom constant product AMM liquidity pools
- **Methods:** `create_pool()`, `add_liquidity()`, `swap()`

#### 6. TokenLaunchpad
- **App ID:** `750324113`
- **Purpose:** WaveBreak token launchpad with bonding curves
- **Methods:** `create_launch()`, `buy_tokens()`, `graduate()`
- **Explorer:** [View on Lora](https://lora.algokit.io/testnet/application/750324113)

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
  algodServer: 'https://testnet-api.4160.nodely.dev',
  indexerServer: 'https://testnet-idx.4160.nodely.dev',
  contracts: {
    multihopRouter: 749360450,
    tinymanAdapter: 749360541,
    pactAdapter: 749341932,
    autopilotRule: 749509231,
    tokenLaunchpad: 750324113
  }
}
```

### Mainnet Configuration

```typescript
const MAINNET_CONFIG = {
  network: 'mainnet',
  algodServer: 'https://mainnet-api.4160.nodely.dev',
  indexerServer: 'https://mainnet-idx.4160.nodely.dev',
  contracts: {
    // Deploy contracts separately for mainnet
    multihopRouter: null,
    tinymanAdapter: null,
    pactAdapter: null,
    autopilotRule: null,
    tokenLaunchpad: null
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
- **[Token Launchpad](./TOKEN_LAUNCHPAD.md)** - WaveBreak launchpad guide
- **[Token Economics](./TOKEN_ECONOMICS.md)** - X Token rewards and economics
- **[Liquidity Pools](./LIQUIDITY_POOLS.md)** - Pool adapters and DEX integration

---

**Last Updated:** 2025-11-28  
**Version:** 2.1.0  
**Status:** Production Ready (Testnet) + Launchpad, Rewards System & Custom Pools

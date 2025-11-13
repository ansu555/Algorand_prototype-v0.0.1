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
│   └── rules/                # Trading rules UI
├── layout/                    # Layout components
├── ui/                        # Base UI (Shadcn)
└── providers/                 # React Context providers
```

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
└── pool/                      # Pool data
```

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

| DEX | Protocol | Fee | Adapter Contract ID |
|-----|----------|-----|---------------------|
| **Tinyman V2** | AMM | 30 bps | 749360541 (testnet) |
| **Pact Finance** | Stable AMM | 25 bps | 749341932 (testnet) |

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
│                                                    │
│  Methods:                                          │
│  • execute_swap_2hop(pool1, pool2, adapter)       │
│  • execute_swap_1hop(pool, adapter)               │
│                                                    │
│  Responsibilities:                                 │
│  • Receives user assets                           │
│  • Routes to appropriate adapter                  │
│  • Validates minimum output                       │
│  • Returns swapped assets to user                 │
└────────────┬───────────────────┬────────────────────┘
             │                   │
    ┌────────▼────────┐  ┌──────▼─────────┐
    │ TinymanAdapter  │  │  PactAdapter   │
    │                 │  │                │
    │ • Tinyman ABI   │  │ • Pact ABI     │
    │ • Pool calls    │  │ • Pool calls   │
    └─────────────────┘  └────────────────┘
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

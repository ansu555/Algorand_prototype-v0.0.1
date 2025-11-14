# Backend & Agent Specification

**Complete specification of 10xSwap's backend API, database schema, and AI agent implementation.**

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints Reference](#api-endpoints-reference)
3. [Database Schema](#database-schema)
4. [Agent Implementation](#agent-implementation)
5. [Authentication & Security](#authentication--security)
6. [Error Handling](#error-handling)
7. [Performance & Caching](#performance--caching)

---

## Architecture Overview

### Backend Stack

```
┌─────────────────────────────────────────────────────┐
│            Next.js 15 App Router (Serverless)       │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │     API Routes (src/app/api/)               │   │
│  │  • RESTful endpoints                        │   │
│  │  • Serverless functions                     │   │
│  │  • Auto-scaling                             │   │
│  └──────────────┬──────────────────────────────┘   │
│                 │                                   │
│  ┌──────────────▼──────────────────────────────┐   │
│  │     Core Libraries (src/lib/)               │   │
│  │  • Algorand SDK integration                 │   │
│  │  • DEX clients (Tinyman, Pact)              │   │
│  │  • Price oracle aggregation                 │   │
│  │  • Database operations                      │   │
│  │  • AI agent orchestration                   │   │
│  └──────────────┬──────────────────────────────┘   │
└─────────────────┼─────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐  ┌─────▼─────┐  ┌───▼────┐
│Algorand│  │  Database │  │External│
│  Node  │  │  (Turso)  │  │  APIs  │
│        │  │           │  │        │
│• Algod │  │• Rules    │  │• Prices│
│• Indexer│ │• Logs     │  │• Market│
└────────┘  └───────────┘  └────────┘
```

### Request Flow

```
Client → API Route → Core Library → External Service
   ↓         ↓            ↓              ↓
Response ← Validation ← Processing ← Data Fetch
```

---

## API Endpoints Reference

### Agent Endpoints

#### POST /api/agent/chat

**Purpose:** Main AI agent chat interface

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What's my ALGO balance?" }
  ],
  "threadId": "optional-session-id",
  "walletAddress": "ALGORAND_ADDRESS"
}
```

**Response:**
```json
{
  "ok": true,
  "content": "Your ALGO balance is 123.456 ALGO ($18.52)",
  "threadId": "session-abc123"
}
```

**Features:**
- Natural language processing
- Command parsing (regex fallback for speed)
- Context-aware responses
- Session management

---

#### POST /api/agent/execute

**Purpose:** Execute autopilot rule (transfers from user's agent wallet to main wallet)

**Request:**
```json
{
  "ruleId": "rule_1756454137894_d3sxos"
}
```

**Response:**
```json
{
  "ok": true,
  "txId": "ABC123...",
  "details": {
    "from": "AGENT_WALLET_ADDRESS",
    "to": "USER_MAIN_WALLET_ADDRESS",
    "amount": "10",
    "assetId": 10458941,
    "note": "AutoPilot Rule rule_1756454137894_d3sxos execution"
  }
}
```

**Flow:**
1. Fetch rule from database
2. Get user's agent wallet (via `buildUserAgentWallet`)
3. Check agent wallet has sufficient balance
4. Auto opt-in to asset if needed (costs 0.1 ALGO)
5. Execute transfer from agent wallet → user's main wallet
6. Log execution to database

**Important Notes:**
- Uses **user's personal agent wallet**, not the shared deployer wallet
- Agent wallet must be funded before rule execution
- Agent wallet automatically opts into required assets
- Transaction fees paid from agent wallet (~0.001 ALGO)

---

#### POST /api/agent/trigger

**Purpose:** Trigger scheduled or conditional actions

**Request:**
```json
{
  "ruleId": "rule_123",
  "force": false
}
```

**Response:**
```json
{
  "ok": true,
  "executed": true,
  "txId": "DEF456..."
}
```

---

#### GET /api/agent/wallet

**Purpose:** Get or create agent wallet for a user

**Request:**
```
GET /api/agent/wallet?userAddress=ALGORAND_ADDRESS
```

**Response:**
```json
{
  "success": true,
  "agentAddress": "2AXW6UGLRWFYWMMEDDSXLZJFGWEWUBKFTAQE673MZXAROURSE6E6OHWOMA",
  "isNew": false,
  "accountInfo": {
    "address": "2AXW6UGLRWFYWMMEDDSXLZJFGWEWUBKFTAQE673MZXAROURSE6E6OHWOMA",
    "algoBalance": 1.5,
    "minBalance": 0.2,
    "availableBalance": 1.3,
    "assets": [
      {
        "assetId": 10458941,
        "symbol": "USDC",
        "balance": "100.0",
        "decimals": 6
      }
    ],
    "totalAssets": 1
  },
  "network": "testnet"
}
```

**Features:**
- Automatically creates agent wallet if it doesn't exist
- Returns encrypted mnemonic from database
- Fetches current account info from blockchain
- Calculates available balance (total - minimum balance)

---

#### POST /api/agent/wallet/opt-in

**Purpose:** Opt agent wallet into a specific asset

**Request:**
```json
{
  "userAddress": "YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I",
  "assetId": 10458941
}
```

**Response:**
```json
{
  "success": true,
  "txId": "ABC123DEF456...",
  "accountInfo": {
    "address": "2AXW6UGLRWFYWMMEDDSXLZJFGWEWUBKFTAQE673MZXAROURSE6E6OHWOMA",
    "algoBalance": 1.4,
    "minBalance": 0.2,
    "assets": [
      {
        "assetId": 10458941,
        "symbol": "USDC",
        "balance": "0.0",
        "decimals": 6
      }
    ]
  },
  "message": "Successfully opted in to asset 10458941"
}
```

**Requirements:**
- Agent wallet must have at least 0.101 ALGO (0.1 for opt-in + 0.001 for fee)
- Each opt-in locks 0.1 ALGO (recoverable by opting out)

---

#### POST /api/agent/wallet/opt-in-all

**Purpose:** Opt agent wallet into all common trading assets (USDC, USDT, ALGF)

**Request:**
```json
{
  "userAddress": "YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "assetId": 10458941,
      "symbol": "USDC",
      "txId": "ABC123...",
      "success": true
    },
    {
      "assetId": 67396430,
      "symbol": "USDT",
      "txId": "DEF456...",
      "success": true
    },
    {
      "assetId": 70283957,
      "symbol": "ALGF",
      "txId": "GHI789...",
      "success": true
    }
  ],
  "totalOptedIn": 3,
  "totalCost": "0.303 ALGO",
  "accountInfo": {
    "algoBalance": 0.197,
    "assets": [...]
  }
}
```

**Requirements:**
- Agent wallet must have at least 0.5 ALGO for all opt-ins
- Opt-ins are executed sequentially to ensure reliability

---

### Algorand Endpoints

#### GET /api/algorand

**Purpose:** Get Algorand network status and account info

**Query Params:**
- `address` - Algorand address to query
- `action` - One of: `balance`, `info`, `transactions`

**Examples:**

**Get Balance:**
```bash
GET /api/algorand?address=YOUR_ADDRESS&action=balance
```

Response:
```json
{
  "ok": true,
  "balance": "123.456",
  "assets": [
    { "assetId": 10458941, "balance": "50.0", "symbol": "USDC" }
  ]
}
```

**Get Account Info:**
```bash
GET /api/algorand?address=YOUR_ADDRESS&action=info
```

Response:
```json
{
  "ok": true,
  "address": "YOUR_ADDRESS",
  "amount": 123456000,
  "assets": [...],
  "status": "Online"
}
```

---

### Price Endpoints

#### GET /api/price

**Purpose:** Get current price for an asset

**Query Params:**
- `symbol` - Asset symbol (e.g., `ALGO`, `USDC`)
- `assetId` - Algorand ASA ID (alternative to symbol)

**Example:**
```bash
GET /api/price?symbol=ALGO
```

**Response:**
```json
{
  "ok": true,
  "symbol": "ALGO",
  "price": 0.15,
  "source": "aggregated",
  "timestamp": "2025-11-12T09:00:00Z"
}
```

---

#### GET /api/price/[assetId]

**Purpose:** Get price for specific ASA by ID

**Example:**
```bash
GET /api/price/10458941
```

**Response:**
```json
{
  "ok": true,
  "assetId": 10458941,
  "symbol": "USDC",
  "price": 1.0,
  "source": "coingecko"
}
```

---

#### POST /api/price/bulk

**Purpose:** Get prices for multiple assets

**Request:**
```json
{
  "assetIds": [0, 10458941, 312769]
}
```

**Response:**
```json
{
  "ok": true,
  "prices": [
    { "assetId": 0, "symbol": "ALGO", "price": 0.15 },
    { "assetId": 10458941, "symbol": "USDC", "price": 1.0 },
    { "assetId": 312769, "symbol": "USDT", "price": 1.0 }
  ]
}
```

---

### Router Endpoints

#### POST /api/router/quote

**Purpose:** Get best swap quote from multi-DEX aggregator

**Request:**
```json
{
  "assetIn": 10458941,
  "assetOut": 0,
  "amountIn": "2000000",
  "slippageTolerance": 50
}
```

**Response:**
```json
{
  "ok": true,
  "quote": {
    "dexName": "tinyman",
    "amountOut": "135859",
    "priceImpact": 0.302,
    "fee": 30,
    "poolAppId": 552635992,
    "adapterAppId": 749360541,
    "reason": "Best output amount"
  }
}
```

---

---

### Liquidity Pool Endpoints

#### GET /api/pools/all

**Purpose:** Fetch all available liquidity pools from supported DEXs

**Query Params:**
- `network` - Network to query (`testnet` or `mainnet`)

**Request:**
```bash
GET /api/pools/all?network=testnet
```

**Response:**
```json
{
  "success": true,
  "pools": [
    {
      "poolId": "552635992",
      "asset1": {
        "id": 0,
        "symbol": "ALGO",
        "name": "Algorand",
        "decimals": 6,
        "logoUrl": "https://..."
      },
      "asset2": {
        "id": 10458941,
        "symbol": "USDC",
        "name": "USD Coin",
        "decimals": 6,
        "logoUrl": "https://..."
      },
      "reserve1": "1000000000",
      "reserve2": "500000000",
      "totalLiquidity": "707106781",
      "fee": 30,
      "dexName": "tinyman",
      "poolAddress": "ABC...XYZ"
    }
  ],
  "network": "testnet",
  "stats": {
    "total": 150,
    "tinyman": 100,
    "pact": 50
  },
  "cached": false,
  "timestamp": 1699564800000
}
```

**Features:**
- Parallel fetching from Tinyman and Pact APIs
- 5-minute caching per network (testnet/mainnet)
- Returns pools with reserve data and fees
- Includes pool statistics

**Implementation:**
```typescript
// src/app/api/pools/all/route.ts
import { TinymanV2Client } from '@/lib/dex/tinyman-client';
import { PactClient } from '@/lib/dex/pact-client';

export async function GET(request: NextRequest) {
  const network = searchParams.get('network') || 'testnet';
  
  // Check cache
  if (cachedPools && now - cachedPools.timestamp < CACHE_TTL) {
    return NextResponse.json({ success: true, pools: cachedPools.data });
  }
  
  // Fetch from DEXs
  const tinymanClient = new TinymanV2Client(algodClient, network);
  const pactClient = new PactClient(algodClient, network);
  
  const [tinymanPools, pactPools] = await Promise.all([
    tinymanClient.fetchPools(),
    network === 'mainnet' ? pactClient.fetchPools() : []
  ]);
  
  const allPools = [...tinymanPools, ...pactPools];
  
  // Cache and return
  return NextResponse.json({ success: true, pools: allPools });
}
```

---

#### GET /api/pools/market-data

**Purpose:** Fetch market data (TVL, volume, APR) for pools

**Query Params:**
- `network` - Network to query (`testnet` or `mainnet`)

**Request:**
```bash
GET /api/pools/market-data?network=mainnet
```

**Response:**
```json
{
  "success": true,
  "data": {
    "552635992": {
      "poolId": "552635992",
      "tvlUSD": 1250000,
      "volume24hUSD": 85000,
      "volume1dUSD": 85000,
      "volume30dUSD": 2550000,
      "poolAPR": 12.5,
      "rewardAPR": 0,
      "fees24hUSD": 255
    },
    "792313023": {
      "poolId": "792313023",
      "tvlUSD": 890000,
      "volume24hUSD": 45000,
      "poolAPR": 8.2,
      "fees24hUSD": 135
    }
  },
  "cached": true,
  "timestamp": 1699564800000
}
```

**Notes:**
- TVL and volume data available on **mainnet only**
- Testnet returns empty data (no market analytics)
- Data sourced from Vestige Analytics API and DeFiLlama
- 5-minute cache TTL

**Data Sources:**
1. **Vestige Analytics API** - Primary source for Algorand DEX data
2. **DeFiLlama API** - Backup for TVL data
3. **On-chain calculation** - APR estimated from fees and volume

---

#### GET /api/pools/transactions

**Purpose:** Fetch recent transactions for a specific pool

**Query Params:**
- `poolId` - Pool application ID
- `network` - Network (`testnet` or `mainnet`)
- `limit` - Max transactions to return (default: 50)

**Request:**
```bash
GET /api/pools/transactions?poolId=552635992&network=testnet&limit=20
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "TXN123ABC...",
      "type": "swap",
      "timestamp": 1699564800,
      "sender": "USER_ADDRESS_1",
      "assetIn": "USDC",
      "assetOut": "ALGO",
      "amountIn": "10.5",
      "amountOut": "5.234",
      "fee": "0.0315"
    },
    {
      "id": "TXN456DEF...",
      "type": "add_liquidity",
      "timestamp": 1699564700,
      "sender": "USER_ADDRESS_2",
      "amount1": "100.0",
      "amount2": "50.0"
    }
  ],
  "poolId": "552635992",
  "count": 20
}
```

**Transaction Types:**
- `swap` - Token swap through pool
- `add_liquidity` - Liquidity provision
- `remove_liquidity` - Liquidity withdrawal

---

#### POST /api/swap/opt-in-pool

**Purpose:** Opt user wallet into pool-required assets

**Request:**
```json
{
  "userAddress": "YOUR_ALGORAND_ADDRESS",
  "assetIds": [10458941, 312769]
}
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    { "txn": "base64_encoded_opt_in_txn_1" },
    { "txn": "base64_encoded_opt_in_txn_2" }
  ],
  "message": "Please sign opt-in transactions for USDC, USDT"
}
```

**Features:**
- Checks which assets user already holds
- Creates opt-in transactions for missing assets
- Returns unsigned transactions for wallet signing
- Validates asset existence on network

**Use Case:**
Before swapping tokens via a pool, users must opt into the assets. This endpoint simplifies the opt-in process.

---

### Swap Endpoints

#### POST /api/swap/prepare

**Purpose:** Prepare swap transaction for signing

**Request:**
```json
{
  "assetIn": 10458941,
  "assetOut": 0,
  "amountIn": "2000000",
  "minAmountOut": "135000",
  "userAddress": "YOUR_ADDRESS",
  "dex": "tinyman"
}
```

**Response:**
```json
{
  "ok": true,
  "txnGroup": [
    { "txn": "base64_encoded_txn_1" },
    { "txn": "base64_encoded_txn_2" }
  ],
  "description": "Swap 2.0 USDC for ~0.135 ALGO via Tinyman"
}
```

---

#### POST /api/swaps

**Purpose:** Execute and record swap

**Request:**
```json
{
  "signedTxns": ["base64_signed_txn_1", "base64_signed_txn_2"],
  "metadata": {
    "assetIn": 10458941,
    "assetOut": 0,
    "amountIn": "2000000"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "txId": "ABC123...",
  "confirmed": true
}
```

---

### Rules Endpoints

#### GET /api/rules

**Purpose:** List trading rules

**Query Params:**
- `ownerAddress` - Filter by owner
- `status` - Filter by `active` or `paused`

**Response:**
```json
{
  "ok": true,
  "rules": [
    {
      "id": "rule_123",
      "ownerAddress": "YOUR_ADDRESS",
      "type": "dca",
      "status": "active",
      "trigger": { "type": "price_drop_pct", "value": 5 },
      "maxSpendUSD": 50,
      "cooldownMinutes": 1440,
      "createdAt": "2025-11-12T09:00:00Z"
    }
  ]
}
```

---

#### POST /api/rules

**Purpose:** Create new trading rule

**Request:**
```json
{
  "ownerAddress": "YOUR_ADDRESS",
  "type": "dca",
  "targets": ["ALGO"],
  "maxSpendUSD": 50,
  "maxSlippage": 0.5,
  "trigger": {
    "type": "price_drop_pct",
    "value": 5
  },
  "cooldownMinutes": 1440,
  "status": "active"
}
```

**Response:**
```json
{
  "ok": true,
  "rule": {
    "id": "rule_456",
    "ownerAddress": "YOUR_ADDRESS",
    "type": "dca",
    "targets": ["ALGO"],
    "maxSpendUSD": 50,
    "maxSlippage": 0.5,
    "trigger": { "type": "price_drop_pct", "value": 5 },
    "cooldownMinutes": 1440,
    "status": "active",
    "createdAt": "2025-11-12T09:00:00Z"
  }
}
```

---

#### PATCH /api/rules/:id

**Purpose:** Update existing rule

**Request:**
```json
{
  "status": "paused"
}
```

**Response:**
```json
{
  "ok": true,
  "rule": { /* updated rule */ }
}
```

---

#### DELETE /api/rules/:id

**Purpose:** Delete a rule

**Response:**
```json
{
  "ok": true,
  "message": "Rule deleted"
}
```

---

### Poller Endpoints

#### POST /api/poller/run

**Purpose:** Manually trigger rule evaluation

**Query Params:**
- `token` - CRON secret for authentication

**Example:**
```bash
POST /api/poller/run?token=YOUR_CRON_SECRET
```

**Response:**
```json
{
  "ok": true,
  "checked": 5,
  "triggered": ["rule_123", "rule_456"],
  "errors": []
}
```

---

### Logs Endpoints

#### GET /api/logs

**Purpose:** Retrieve execution logs

**Query Params:**
- `ruleId` - Filter by rule ID
- `limit` - Max results (default: 50)
- `ownerAddress` - Filter by owner

**Response:**
```json
{
  "ok": true,
  "logs": [
    {
      "id": "log_123",
      "ownerAddress": "YOUR_ADDRESS",
      "ruleId": "rule_456",
      "action": "poller_checked",
      "status": "success",
      "details": {
        "triggered": true,
        "txId": "ABC123..."
      },
      "createdAt": "2025-11-12T09:00:00Z"
    }
  ]
}
```

---

### Assets Endpoints

#### GET /api/assets/tradeable

**Purpose:** Get list of tradeable assets

**Response:**
```json
{
  "ok": true,
  "assets": [
    { "id": 0, "symbol": "ALGO", "name": "Algorand", "decimals": 6 },
    { "id": 10458941, "symbol": "USDC", "name": "USD Coin", "decimals": 6 }
  ]
}
```

---

#### GET /api/assets/market

**Purpose:** Get market data for assets

**Response:**
```json
{
  "ok": true,
  "assets": [
    {
      "id": 0,
      "symbol": "ALGO",
      "price": 0.15,
      "change24h": 2.5,
      "volume24h": 1234567,
      "marketCap": 987654321
    }
  ]
}
```

---

#### GET /api/assets/search

**Purpose:** Search for assets by name or symbol

**Query Params:**
- `q` - Search query

**Example:**
```bash
GET /api/assets/search?q=USD
```

**Response:**
```json
{
  "ok": true,
  "results": [
    { "id": 10458941, "symbol": "USDC", "name": "USD Coin" },
    { "id": 312769, "symbol": "USDT", "name": "Tether USD" }
  ]
}
```

---

### Pools Endpoints

#### GET /api/pools/market-data

**Purpose:** Get pool liquidity and market data

**Query Params:**
- `dex` - DEX name (`tinyman` or `pact`)
- `asset1` - First asset ID
- `asset2` - Second asset ID

**Example:**
```bash
GET /api/pools/market-data?dex=tinyman&asset1=0&asset2=10458941
```

**Response:**
```json
{
  "ok": true,
  "pool": {
    "appId": 552635992,
    "dex": "tinyman",
    "asset1Reserve": "89739000000",
    "asset2Reserve": "6114000000",
    "totalLiquidity": 540000,
    "fee": 30
  }
}
```

---

### MCP Analytics Endpoints

#### POST /api/mcp/analyze

**Purpose:** Analyze asset using Model Context Protocol server

**Request:**
```json
{
  "assetId": 0,
  "analysis": "trend"
}
```

**Response:**
```json
{
  "ok": true,
  "analysis": {
    "trend": "bullish",
    "confidence": 0.75,
    "indicators": {
      "rsi": 65,
      "macd": "positive"
    }
  }
}
```

---

## Database Schema

### Tables

#### agent_wallets

**Purpose:** Store encrypted per-user agent wallets for automated trading

**Schema:**
```sql
CREATE TABLE agent_wallets (
  id TEXT PRIMARY KEY,
  userAddress TEXT NOT NULL UNIQUE,
  agentAddress TEXT NOT NULL UNIQUE,
  encryptedMnemonic TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  lastUsedAt TEXT
);

CREATE INDEX idx_agent_wallets_user ON agent_wallets(userAddress);
CREATE INDEX idx_agent_wallets_agent ON agent_wallets(agentAddress);
```

**Example Row:**
```json
{
  "id": "agent_YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I_1699876543210",
  "userAddress": "YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I",
  "agentAddress": "2AXW6UGLRWFYWMMEDDSXLZJFGWEWUBKFTAQE673MZXAROURSE6E6OHWOMA",
  "encryptedMnemonic": "a1b2c3d4e5f6...iv:authTag:encrypted",
  "createdAt": "2025-11-12T09:00:00.000Z",
  "lastUsedAt": "2025-11-12T10:30:00.000Z"
}
```

**Security:**
- `encryptedMnemonic` uses AES-256-GCM encryption
- Format: `iv:authTag:encryptedData` (all hex-encoded)
- Encryption key stored in environment variable `AGENT_WALLET_ENCRYPTION_KEY`
- Each user's mnemonic is independently encrypted

---

#### rules

**Purpose:** Store automated trading rules

**Schema:**
```sql
CREATE TABLE rules (
  id TEXT PRIMARY KEY,
  ownerAddress TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('dca', 'rebalance', 'rotate')),
  targets TEXT NOT NULL,  -- JSON array of asset IDs/symbols
  rotateTopN INTEGER,
  maxSpendUSD REAL NOT NULL,
  maxSlippage REAL NOT NULL,
  trigger TEXT NOT NULL,  -- JSON object
  cooldownMinutes INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'paused')),
  lastExecutedAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
);

CREATE INDEX idx_rules_owner ON rules(ownerAddress);
CREATE INDEX idx_rules_status ON rules(status);
```

**Example Row:**
```json
{
  "id": "rule_1756454137894_d3sxos",
  "ownerAddress": "ALGORAND_ADDRESS",
  "type": "dca",
  "targets": "[\"ALGO\"]",
  "rotateTopN": null,
  "maxSpendUSD": 50.0,
  "maxSlippage": 0.5,
  "trigger": "{\"type\":\"price_drop_pct\",\"value\":5}",
  "cooldownMinutes": 1440,
  "status": "active",
  "lastExecutedAt": null,
  "createdAt": "2025-11-12T09:00:00.000Z",
  "updatedAt": null
}
```

---

#### pool_cache (In-Memory)

**Purpose:** Cache pool data to reduce API calls and improve performance

**Note:** This is an **in-memory cache** (not persisted to database) with TTL-based expiration.

**Cache Structure:**
```typescript
interface PoolCache {
  testnet: {
    data: PoolInfo[];
    timestamp: number;
  } | null;
  mainnet: {
    data: PoolInfo[];
    timestamp: number;
  } | null;
}

const CACHE_TTL = 300 * 1000; // 5 minutes
```

**Cached Data:**
```json
{
  "testnet": {
    "data": [
      {
        "poolId": "552635992",
        "asset1": { "id": 0, "symbol": "ALGO", "decimals": 6 },
        "asset2": { "id": 10458941, "symbol": "USDC", "decimals": 6 },
        "reserve1": "1000000000",
        "reserve2": "500000000",
        "fee": 30,
        "dexName": "tinyman"
      }
    ],
    "timestamp": 1699564800000
  },
  "mainnet": null
}
```

**Cache Invalidation:**
- **Time-based:** Expires after 5 minutes
- **Manual:** Server restart clears cache
- **Network-specific:** Testnet and mainnet caches are separate

**Why Not Database?**
- Pool data changes frequently (reserves update with each swap)
- Read-heavy workload (many clients fetching same data)
- TTL-based expiration is simpler than database cleanup
- Reduces database load and query latency

---

#### market_data_cache (In-Memory)

**Purpose:** Cache market analytics (TVL, volume, APR) from external APIs

**Cache Structure:**
```typescript
interface MarketDataCache {
  data: Record<string, PoolMarketData>;
  timestamp: number;
}

const CACHE_TTL = 300 * 1000; // 5 minutes
```

**Cached Data:**
```json
{
  "data": {
    "552635992": {
      "poolId": "552635992",
      "tvlUSD": 1250000,
      "volume24hUSD": 85000,
      "poolAPR": 12.5,
      "rewardAPR": 0
    }
  },
  "timestamp": 1699564800000
}
```

**Data Sources:**
- Vestige Analytics API (primary)
- DeFiLlama API (backup)
- On-chain calculations (APR estimation)

**Cache Benefits:**
- Reduces external API calls (rate limit protection)
- Faster response times (~10ms vs ~500ms)
- Cost reduction (free tier API limits)

---

#### swap_history (Future Enhancement)

**Purpose:** Store historical swap transactions for analytics

**Proposed Schema:**
```sql
CREATE TABLE swap_history (
  id TEXT PRIMARY KEY,
  userAddress TEXT NOT NULL,
  poolId TEXT NOT NULL,
  dexName TEXT NOT NULL,
  assetIn INTEGER NOT NULL,
  assetOut INTEGER NOT NULL,
  amountIn TEXT NOT NULL,
  amountOut TEXT NOT NULL,
  fee TEXT NOT NULL,
  txId TEXT NOT NULL UNIQUE,
  timestamp TEXT NOT NULL,
  network TEXT NOT NULL CHECK(network IN ('testnet', 'mainnet'))
);

CREATE INDEX idx_swap_history_user ON swap_history(userAddress);
CREATE INDEX idx_swap_history_pool ON swap_history(poolId);
CREATE INDEX idx_swap_history_tx ON swap_history(txId);
CREATE INDEX idx_swap_history_time ON swap_history(timestamp DESC);
```

**Use Cases:**
- User swap history and portfolio tracking
- Pool volume analytics
- Fee revenue calculations
- Trading pattern analysis

**Status:** Not yet implemented (currently using Algorand Indexer for transaction history)

---

#### logs

**Purpose:** Execution audit trail

**Schema:**
```sql
CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  ownerAddress TEXT,
  ruleId TEXT,
  action TEXT NOT NULL,
  details TEXT,  -- JSON object
  status TEXT NOT NULL CHECK(status IN ('simulated', 'success', 'failed')),
  createdAt TEXT NOT NULL
);

CREATE INDEX idx_logs_rule ON logs(ruleId);
CREATE INDEX idx_logs_owner ON logs(ownerAddress);
CREATE INDEX idx_logs_created ON logs(createdAt DESC);
```

**Example Row:**
```json
{
  "id": "log_1756454200000_abc123",
  "ownerAddress": "ALGORAND_ADDRESS",
  "ruleId": "rule_1756454137894_d3sxos",
  "action": "poller_checked",
  "details": "{\"triggered\":true,\"txId\":\"ABC123...\"}",
  "status": "success",
  "createdAt": "2025-11-12T09:00:00.000Z"
}
```

---

#### swap_history (Optional)

**Purpose:** Track swap transactions

**Schema:**
```sql
CREATE TABLE swap_history (
  id TEXT PRIMARY KEY,
  userAddress TEXT NOT NULL,
  assetIn INTEGER NOT NULL,
  assetOut INTEGER NOT NULL,
  amountIn TEXT NOT NULL,
  amountOut TEXT NOT NULL,
  dex TEXT NOT NULL,
  txId TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE INDEX idx_swaps_user ON swap_history(userAddress);
CREATE INDEX idx_swaps_created ON swap_history(createdAt DESC);
```

---

### Database Operations

**Location:** `src/lib/db/`

**Key Functions:**

```typescript
// Get rules
async function getRules(filter?: {
  ownerAddress?: string
  status?: 'active' | 'paused'
}): Promise<Rule[]>

// Create rule
async function createRule(rule: Omit<Rule, 'id' | 'createdAt'>): Promise<Rule>

// Update rule
async function updateRule(id: string, updates: Partial<Rule>): Promise<Rule>

// Delete rule
async function deleteRule(id: string): Promise<void>

// Create log
async function createLog(log: Omit<Log, 'id' | 'createdAt'>): Promise<Log>

// Get logs
async function getLogs(filter?: {
  ruleId?: string
  ownerAddress?: string
  limit?: number
}): Promise<Log[]>
```

---

## Agent Implementation

### Agent Architecture

**File:** `src/lib/algorand.ts`

The agent is built using **Algorand SDK** (not 0xGasless - that's only mentioned in outdated README sections).

```typescript
// Initialize Algorand agent
const agent = await buildAlgorandAgent()

// Get agent address
const address = await agent.getAddress()

// Get balance
const algoBalance = await agent.getBalance()        // ALGO balance
const usdcBalance = await agent.getBalance(10458941) // USDC balance

// Transfer assets
const result = await agent.transfer({
  to: 'RECIPIENT_ADDRESS',
  amount: '10',
  assetId: 0,  // 0 for ALGO, ASA ID for tokens
  note: 'Payment for services'
})

// Get transaction history
const txns = await agent.getTransactions()
```

### Agent Capabilities

| Capability | Method | Description |
|------------|--------|-------------|
| **Address Query** | `getAddress()` | Get agent's Algorand address |
| **Balance Check** | `getBalance(assetId?)` | Get ALGO or ASA balance |
| **Asset Transfer** | `transfer(opts)` | Send ALGO or ASA to address |
| **Swap Execution** | `swap(opts)` | Execute token swaps via DEX |
| **Transaction History** | `getTransactions()` | Get past transactions |
| **Asset Opt-In** | `optIn(assetId)` | Opt into ASA |

### Natural Language Processing

**File:** `src/app/api/agent/chat/route.ts`

The chat endpoint uses a two-tier approach:

1. **Fast Path (Regex)** - Simple commands matched by patterns
2. **AI Path (LangChain)** - Complex queries sent to LLM

**Supported Commands:**

| Command Pattern | Example | Action |
|----------------|---------|--------|
| `address`, `wallet` | "what's my address?" | Show wallet address |
| `balance` | "algo balance" | Show ALGO balance |
| `balance usdc` | "usdc balance" | Show USDC balance |
| `price algo` | "price of algorand" | Get current ALGO price |
| `transfer X ALGO to Y` | "transfer 10 ALGO to ABC..." | Send ALGO |
| `swap X for Y` | "swap 5 ALGO for USDC" | Execute swap |
| `portfolio` | "show my portfolio" | Display all holdings |
| `transactions` | "recent transactions" | Show tx history |

**Example Regex Patterns:**
```typescript
// Balance check
if (/\b(balance|bal)\b/i.test(message)) {
  if (/usdc/i.test(message)) return getBalance(10458941)
  if (/algo/i.test(message)) return getBalance(0)
}

// Transfer
const transferMatch = message.match(/transfer\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)/i)
if (transferMatch) {
  const [_, amount, asset, recipient] = transferMatch
  return executeTransfer(amount, asset, recipient)
}
```

---

## Authentication & Security

### API Key Authentication

Some endpoints require authentication:

**Method:** Query parameter token

**Example:**
```bash
POST /api/poller/run?token=YOUR_CRON_SECRET
```

**Environment Variable:**
```env
CRON_SECRET=your_secret_here
NEXT_PUBLIC_CRON_SECRET=your_secret_here
```

### Wallet-Based Authentication

For user-specific operations:

**Method:** Wallet signature verification

**Flow:**
1. Client signs message with wallet
2. API verifies signature matches address
3. Operation executed with verified address

### Rate Limiting

**Implementation:** None currently (rely on Vercel's built-in limits)

**Recommendations for Production:**
- Implement rate limiting per IP
- Throttle API key usage
- Monitor for abuse patterns

---

## Error Handling

### Standard Error Response

```json
{
  "ok": false,
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": { /* optional additional info */ }
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_ADDRESS` | Algorand address invalid | 400 |
| `INSUFFICIENT_BALANCE` | Not enough funds | 400 |
| `TRANSACTION_FAILED` | Blockchain tx failed | 500 |
| `RULE_NOT_FOUND` | Rule ID doesn't exist | 404 |
| `UNAUTHORIZED` | Missing/invalid auth | 401 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

### Example Error Handling

```typescript
try {
  const result = await agent.transfer({
    to: recipient,
    amount: '1000000',  // More than balance
    assetId: 0
  })
} catch (error) {
  if (error.message.includes('insufficient balance')) {
    return Response.json({
      ok: false,
      error: 'Insufficient balance',
      code: 'INSUFFICIENT_BALANCE'
    }, { status: 400 })
  }
  throw error
}
```

---

## Performance & Caching

### Price Caching

**TTL:** 60 seconds

**Implementation:**
```typescript
const priceCache = new Map<string, { price: number, timestamp: number }>()

async function getCachedPrice(assetId: number): Promise<number> {
  const key = `price_${assetId}`
  const cached = priceCache.get(key)
  
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.price
  }
  
  const price = await fetchPriceFromOracle(assetId)
  priceCache.set(key, { price, timestamp: Date.now() })
  return price
}
```

### Pool Data Caching

**TTL:** 30 seconds

**Reason:** Pool reserves change frequently, short TTL prevents stale data

### Response Time Targets

| Endpoint Type | Target | Actual |
|--------------|--------|--------|
| Price queries | <500ms | ~200ms |
| Balance checks | <1s | ~500ms |
| Swap quotes | <2s | ~1.5s |
| Rule execution | <5s | ~3s |

### Optimization Strategies

1. **Parallel Requests** - Fetch from multiple DEXs simultaneously
2. **Connection Pooling** - Reuse Algod/Indexer connections
3. **Data Aggregation** - Batch price fetches
4. **Edge Caching** - Use Vercel's edge network

---

## Best Practices

### API Design

✅ **DO:**
- Return consistent response format
- Include timestamps in responses
- Provide detailed error messages
- Use appropriate HTTP status codes
- Validate all inputs
- Log all operations

❌ **DON'T:**
- Expose internal errors to clients
- Return sensitive data
- Skip input validation
- Hardcode configuration
- Ignore rate limiting

### Database Operations

✅ **DO:**
- Use parameterized queries
- Handle concurrent access
- Index frequently queried fields
- Log all mutations
- Implement backups

❌ **DON'T:**
- Store sensitive data unencrypted
- Skip error handling
- Allow SQL injection
- Ignore performance issues

---

## Reference

### Related Documentation
- [System Overview](./SYSTEM_OVERVIEW.md) - Architecture
- [Developer Guide](./DEVELOPER_GUIDE.md) - Setup
- [Autopilot Module](./AUTOPILOT_MODULE.md) - Trading rules
- [Contracts](./CONTRACTS_AND_DEPLOYMENT.md) - Smart contracts

### External Resources
- [Algorand SDK Docs](https://developer.algorand.org/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Turso Database](https://docs.turso.tech/)

---

**Last Updated:** November 12, 2025  
**Version:** 1.0.0  
**Status:** Production Ready (Testnet)

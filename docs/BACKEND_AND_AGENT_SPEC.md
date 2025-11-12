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

**Purpose:** Execute specific agent actions

**Request:**
```json
{
  "action": "transfer",
  "params": {
    "to": "RECIPIENT_ADDRESS",
    "amount": "10",
    "assetId": 0
  },
  "walletAddress": "SENDER_ADDRESS"
}
```

**Response:**
```json
{
  "ok": true,
  "txId": "ABC123...",
  "details": {
    "from": "SENDER_ADDRESS",
    "to": "RECIPIENT_ADDRESS",
    "amount": "10",
    "assetId": 0
  }
}
```

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

# Autopilot Module Documentation

**Complete guide to 10xSwap's automated trading rules, execution pipeline, and safety features.**

## Table of Contents

1. [Overview](#overview)
2. [Rule Types](#rule-types)
3. [Trigger Mechanisms](#trigger-mechanisms)
4. [Rule Creation](#rule-creation)
5. [Execution Pipeline](#execution-pipeline)
6. [Safety Features](#safety-features)
7. [Manual Poller Triggering](#manual-poller-triggering)
8. [Rule Management](#rule-management)

---

## Overview

The Autopilot Module enables users to create automated trading rules that execute based on predefined conditions. Rules are evaluated periodically by a background poller service and executed on-chain when conditions are met.

### Core Features

- **Automated Trading** - Set-and-forget trading strategies
- **Multiple Rule Types** - DCA, Rebalance, and Rotation strategies
- **Flexible Triggers** - Price drops, trends, momentum indicators
- **Safety Controls** - Slippage protection, cooldown periods, max spend limits
- **On-Chain Execution** - Secure, verifiable smart contract execution
- **Simulation Mode** - Preview trades before execution

### Architecture

```
┌────────────────────────────────────────────────────┐
│                 USER INTERFACE                     │
│          (Create/View/Manage Rules)                │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│              RULE STORAGE (Database)               │
│  - Rule definitions                                │
│  - Execution logs                                  │
│  - User preferences                                │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│            POLLER SERVICE (Background)             │
│  1. Fetch ACTIVE rules from database               │
│  2. Get current prices for target assets           │
│  3. Evaluate trigger conditions                    │
│  4. Execute if conditions met + cooldown passed    │
│  5. Log execution results                          │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│          EXECUTION ENGINE (On-Chain)               │
│  - AutoPilotRuleContract (App ID: 749509231)      │
│  - MultihopSwapRouter for swaps                   │
│  - Asset transfers and validations                │
└────────────────────────────────────────────────────┘
```

---

## Rule Types

### 1. DCA (Dollar-Cost Averaging)

**Purpose:** Automatically buy a fixed USD amount of target asset(s) at regular intervals or when conditions are met.

**Use Case:** Build position over time regardless of price volatility

**Example Rule:**
```json
{
  "type": "dca",
  "targets": ["ALGO", "USDC"],
  "maxSpendUSD": 50,
  "trigger": {
    "type": "price_drop_pct",
    "value": 5
  },
  "cooldownMinutes": 1440
}
```

**Behavior:**
- Buys $50 worth of ALGO or USDC
- Only when price drops ≥5%
- Maximum once per 24 hours (1440 minutes)

---

### 2. Rebalance (Portfolio Rebalancing)

**Purpose:** Maintain target allocation percentages across multiple assets

**Use Case:** Keep portfolio balanced according to predefined weights

**Example Rule:**
```json
{
  "type": "rebalance",
  "targets": ["ALGO", "USDC", "USDT"],
  "rotateTopN": 3,
  "maxSpendUSD": 100,
  "trigger": {
    "type": "trend_pct",
    "value": 3,
    "window": "7d"
  },
  "cooldownMinutes": 60
}
```

**Behavior:**
- Rebalances portfolio across ALGO, USDC, USDT
- Only when 7-day trend shows ≥3% movement
- Maximum spend of $100 per execution
- Cooldown of 1 hour between executions

---

### 3. Rotate (Token Rotation)

**Purpose:** Automatically rotate holdings into top-performing assets

**Use Case:** Follow momentum strategies, chase gains

**Example Rule:**
```json
{
  "type": "rotate",
  "targets": ["ALGO", "USDC", "USDT", "WBTC", "WETH"],
  "rotateTopN": 3,
  "maxSpendUSD": 200,
  "trigger": {
    "type": "momentum",
    "value": 10,
    "lookbackDays": 7
  },
  "cooldownMinutes": 120
}
```

**Behavior:**
- Selects top 3 performing assets from list
- Based on 7-day momentum ≥10%
- Rotates holdings into top performers
- Maximum $200 per rotation
- 2-hour cooldown

---

## Trigger Mechanisms

### 1. Price Drop Trigger

**Type:** `price_drop_pct`

**Description:** Executes when asset price drops by specified percentage

**Schema:**
```typescript
{
  type: 'price_drop_pct',
  value: number  // Percentage drop (e.g., 5 for 5%)
}
```

**Example:**
```json
{
  "type": "price_drop_pct",
  "value": 5
}
```

**Evaluation Logic:**
```typescript
const currentPrice = await getPriceOracle(asset);
const lastPrice = await getLastExecutionPrice(ruleId, asset);
const dropPercent = ((lastPrice - currentPrice) / lastPrice) * 100;

if (dropPercent >= trigger.value) {
  // Execute rule
}
```

**Use Cases:**
- Buy-the-dip strategies
- DCA on price drops
- Opportunistic entries

---

### 2. Trend Trigger

**Type:** `trend_pct`

**Description:** Executes when price trend over time window exceeds threshold

**Schema:**
```typescript
{
  type: 'trend_pct',
  value: number,       // Percentage trend (e.g., 3 for 3%)
  window: '24h' | '7d' | '30d'  // Time window
}
```

**Example:**
```json
{
  "type": "trend_pct",
  "value": 3,
  "window": "7d"
}
```

**Evaluation Logic:**
```typescript
const prices = await getPriceHistory(asset, trigger.window);
const trendPercent = calculateTrend(prices);

if (trendPercent >= trigger.value) {
  // Execute rule
}
```

**Use Cases:**
- Momentum strategies
- Trend-following
- Rebalancing on market shifts

---

### 3. Momentum Trigger

**Type:** `momentum`

**Description:** Executes based on momentum indicator over lookback period

**Schema:**
```typescript
{
  type: 'momentum',
  value: number,        // Momentum threshold (e.g., 10 for 10%)
  lookbackDays: number  // Days to calculate momentum
}
```

**Example:**
```json
{
  "type": "momentum",
  "value": 10,
  "lookbackDays": 7
}
```

**Evaluation Logic:**
```typescript
const prices = await getPriceHistory(asset, trigger.lookbackDays);
const momentum = (prices[0] - prices[prices.length - 1]) / prices[prices.length - 1] * 100;

if (momentum >= trigger.value) {
  // Execute rule
}
```

**Use Cases:**
- Momentum trading
- Top performer rotation
- Strength-based rebalancing

---

## Rule Creation

### Rule Schema

```typescript
type Rule = {
  id: string                    // Auto-generated unique ID
  ownerAddress: string          // Algorand wallet address
  type: 'dca' | 'rebalance' | 'rotate'
  targets: string[]             // Asset IDs or symbols
  rotateTopN?: number           // For rotate: top N assets
  maxSpendUSD: number           // Maximum USD to spend per execution
  maxSlippage: number           // Maximum slippage % (e.g., 0.5 for 0.5%)
  trigger: RuleTrigger          // Trigger condition
  cooldownMinutes: number       // Minimum time between executions
  status: 'active' | 'paused'   // Rule status
  createdAt: string             // ISO timestamp
}
```

### Creating a Rule via API

**Endpoint:** `POST /api/rules`

**Request Body:**
```json
{
  "ownerAddress": "YOUR_ALGORAND_ADDRESS",
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
    "id": "rule_1756454137894_d3sxos",
    "ownerAddress": "YOUR_ALGORAND_ADDRESS",
    "type": "dca",
    "targets": ["ALGO"],
    "maxSpendUSD": 50,
    "maxSlippage": 0.5,
    "trigger": {
      "type": "price_drop_pct",
      "value": 5
    },
    "cooldownMinutes": 1440,
    "status": "active",
    "createdAt": "2025-11-12T09:00:00.000Z"
  }
}
```

### Creating a Rule via UI

1. Navigate to **Dashboard → Autopilot**
2. Click **"Create New Rule"**
3. Select rule type (DCA/Rebalance/Rotate)
4. Choose target assets
5. Set trigger conditions
6. Configure safety limits:
   - Max spend per execution
   - Max slippage tolerance
   - Cooldown period
7. Review and confirm
8. Rule becomes active immediately

---

## Execution Pipeline

### Complete Flow

```
┌─────────────────────────────────────────┐
│  1. SCHEDULED TRIGGER                   │
│     - Cron job (daily at midnight UTC)  │
│     - Manual trigger via admin UI       │
│     - GitHub Actions workflow           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. FETCH ACTIVE RULES                  │
│     - Query database for status=active  │
│     - Filter by owner (if specified)    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. GET CURRENT PRICES                  │
│     - Fetch from price oracle           │
│     - Multi-source aggregation          │
│     - Cache for 60 seconds              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. EVALUATE EACH RULE                  │
│     - Check trigger condition           │
│     - Verify cooldown period elapsed    │
│     - Calculate required trades         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  5. SIMULATE EXECUTION (Preview)        │
│     - Get quotes from DEXs              │
│     - Calculate outputs and impacts     │
│     - Verify within safety limits       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  6. EXECUTE ON-CHAIN (if approved)      │
│     - Get user's agent wallet           │
│     - Check agent wallet balance        │
│     - Auto opt-in to asset if needed    │
│     - Transfer from agent → main wallet │
│     - Wait for confirmation             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  7. LOG EXECUTION                       │
│     - Record in database                │
│     - Update last execution time        │
│     - Track success/failure             │
│     - Store transaction details         │
└─────────────────────────────────────────┘
```

### Agent Wallet Integration

**Important:** Since the agent wallet update, autopilot rules now use **per-user agent wallets** instead of a shared deployer wallet.

**Key Changes:**
- Each user has their own dedicated agent wallet
- Agent wallet is automatically created on first connection
- Rules execute transfers from **user's agent wallet** → **user's main wallet**
- Users must fund their agent wallets before rules can execute

**Requirements:**
1. **Fund Agent Wallet:** Send at least 0.5 ALGO to your agent wallet address
2. **Opt-In to Assets:** Agent wallet must opt into assets (auto-handled, costs 0.1 ALGO per asset)
3. **Maintain Balance:** Keep sufficient ALGO for transaction fees (~0.001-0.002 per execution)

**Example Flow:**
```
User Agent Wallet: 2AXW6UGLRWFYWMMEDDSXLZJFGWEWUBKFTAQE673MZXAROURSE6E6OHWOMA
User Main Wallet:  YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I

1. User funds agent wallet with 1.0 ALGO + 100 USDC
2. Rule triggers (e.g., DCA: buy ALGO with 10 USDC)
3. System gets user's agent wallet from database
4. Checks agent wallet has 10 USDC + fees
5. Executes: Transfer 10 USDC from agent → main wallet (or swap on DEX)
6. Logs transaction
```

### Poller Service Details

**Location:** `src/lib/poller.ts`, `src/app/api/poller/run/route.ts`

**Execution Frequency:**
- **Automatic:** Daily at midnight UTC (via GitHub Actions)
- **Manual:** On-demand via admin UI or API call

**Evaluation Logic:**
```typescript
async function evaluateRules() {
  const rules = await db.getRules({ status: 'active' });
  const results = [];

  for (const rule of rules) {
    // 1. Check cooldown
    if (!hasCooldownElapsed(rule)) {
      continue;
    }

    // 2. Get current prices
    const prices = await getPrices(rule.targets);

    // 3. Evaluate trigger
    const shouldExecute = await evaluateTrigger(rule.trigger, prices);
    
    if (shouldExecute) {
      // 4. Simulate execution
      const simulation = await simulateExecution(rule, prices);
      
      // 5. Execute if within safety limits
      if (simulation.withinLimits) {
        const result = await executeRule(rule, simulation);
        results.push(result);
      }
    }
  }

  return results;
}
```

---

## Safety Features

### 1. Slippage Protection

**Purpose:** Prevent execution if price moves unfavorably during transaction

**Configuration:**
```json
{
  "maxSlippage": 0.5  // 0.5% maximum slippage
}
```

**Implementation:**
```typescript
const quote = await getQuote(assetIn, assetOut, amountIn);
const minOutput = quote.amountOut * (1 - rule.maxSlippage / 100);

// Transaction will revert if output < minOutput
await executeSwap({ minOutput });
```

**Protection Level:**
- ✅ On-chain validation (smart contract)
- ✅ Pre-flight simulation check
- ✅ User-configurable threshold

---

### 2. Maximum Spend Limit

**Purpose:** Cap total USD value per execution

**Configuration:**
```json
{
  "maxSpendUSD": 100  // Maximum $100 per execution
}
```

**Implementation:**
```typescript
const totalValue = calculateTotalValue(trades, prices);

if (totalValue > rule.maxSpendUSD) {
  // Scale down trades proportionally
  trades = scaleTrades(trades, rule.maxSpendUSD / totalValue);
}
```

**Protection Level:**
- ✅ Pre-execution validation
- ✅ Proportional scaling if exceeded
- ✅ Logged for transparency

---

### 3. Cooldown Periods

**Purpose:** Prevent excessive trading and fee burn

**Configuration:**
```json
{
  "cooldownMinutes": 1440  // 24 hours
}
```

**Implementation:**
```typescript
const lastExecution = await getLastExecution(ruleId);
const cooldownMs = rule.cooldownMinutes * 60 * 1000;
const elapsed = Date.now() - lastExecution.timestamp;

if (elapsed < cooldownMs) {
  // Skip execution, log cooldown status
  return { skipped: true, reason: 'cooldown' };
}
```

**Protection Level:**
- ✅ Database-backed tracking
- ✅ Per-rule enforcement
- ✅ Prevents rapid-fire trades

---

### 4. Price Impact Validation

**Purpose:** Avoid trades that significantly move the market

**Configuration:** Built-in (5% max impact)

**Implementation:**
```typescript
const quote = await getQuote(assetIn, assetOut, amountIn);

if (quote.priceImpact > 0.05) {
  // Reject trade, too much impact
  return { rejected: true, reason: 'high_price_impact' };
}
```

**Protection Level:**
- ✅ Multi-DEX quote comparison
- ✅ Automatic rejection if exceeded
- ✅ Logged for user awareness

---

### 5. Agent Wallet Funding Requirements

**Purpose:** Ensure user's agent wallet has sufficient funds before execution

**Configuration:** Automatic checks

**Requirements:**
```typescript
// Minimum balances for agent wallet
{
  "minimumAlgo": 0.1,           // Base requirement
  "perAssetOptIn": 0.1,         // Per ASA opted-in
  "transactionFee": 0.001,      // Per transaction
  "recommendedMinimum": 0.5     // For initial funding
}
```

**Implementation:**
```typescript
// Before rule execution
const userAgent = await buildUserAgentWallet(rule.ownerAddress);
const balance = await userAgent.getBalance(assetId);

if (balance < requiredAmount + fees) {
  return { 
    rejected: true, 
    reason: 'insufficient_agent_wallet_balance',
    required: requiredAmount + fees,
    current: balance
  };
}

// Auto opt-in if needed
if (!alreadyOptedIn) {
  await userAgent.optInToAsset(assetId); // Costs 0.1 ALGO
}
```

**Protection Level:**
- ✅ Pre-execution balance verification
- ✅ Automatic asset opt-in handling
- ✅ Clear error messages with funding instructions

**User Action Required:**
1. Navigate to `/agent-wallet` page
2. Copy agent wallet address
3. Fund with at least 0.5 ALGO + trading assets
4. Wait for confirmation (~4 seconds)
5. Rules will execute automatically when conditions are met

---

## Manual Poller Triggering

You can trigger the poller manually in **4 different ways**:

### 1. Admin UI (Easiest)

**Local:**
1. Start dev server: `npm run dev`
2. Go to: `http://localhost:3000/admin/poller`
3. Click **"Run Poller Now"** button

**Production:**
1. Go to: `https://your-deployment.vercel.app/admin/poller`
2. Click **"Run Poller Now"** button

✅ Works on both local and production!

---

### 2. Shell Script

**Local:**
```bash
./scripts/trigger-poller.sh
```

**Production:**
```bash
./scripts/trigger-poller.sh prod
```

---

### 3. Direct cURL

**Local:**
```bash
curl "http://localhost:3000/api/poller/run?token=YOUR_CRON_SECRET"
```

**Production:**
```bash
curl "https://your-deployment.vercel.app/api/poller/run?token=YOUR_CRON_SECRET"
```

Replace `YOUR_CRON_SECRET` with the value from your `.env` file.

---

### 4. GitHub Actions

**Manual Trigger:**
1. Go to: `https://github.com/your-repo/actions`
2. Click **"Daily Poller"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

**Automatic Schedule:**
- Runs **daily at midnight UTC** (5:30 AM IST)
- No action needed - fully automatic!

---

### Response Format

**Success:**
```json
{
  "ok": true,
  "checked": 5,
  "triggered": ["rule_123", "rule_456"],
  "errors": []
}
```

**Failure:**
```json
{
  "ok": false,
  "error": "Error message here"
}
```

---

## Rule Management

### Listing Rules

**Endpoint:** `GET /api/rules`

**Query Parameters:**
- `ownerAddress` - Filter by owner
- `status` - Filter by active/paused

**Response:**
```json
{
  "ok": true,
  "rules": [
    {
      "id": "rule_1756454137894_d3sxos",
      "ownerAddress": "YOUR_ADDRESS",
      "type": "dca",
      "status": "active",
      "createdAt": "2025-11-12T09:00:00.000Z"
    }
  ]
}
```

---

### Updating a Rule

**Endpoint:** `PATCH /api/rules/:id`

**Request Body:**
```json
{
  "status": "paused"  // or "active"
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

### Deleting a Rule

**Endpoint:** `DELETE /api/rules/:id`

**Response:**
```json
{
  "ok": true,
  "message": "Rule deleted"
}
```

---

### Viewing Execution Logs

**Endpoint:** `GET /api/logs`

**Query Parameters:**
- `ruleId` - Filter by rule
- `limit` - Number of logs to return

**Response:**
```json
{
  "ok": true,
  "logs": [
    {
      "id": "log_123",
      "ruleId": "rule_456",
      "action": "poller_checked",
      "status": "success",
      "details": {
        "triggered": true,
        "txId": "ABC123..."
      },
      "createdAt": "2025-11-12T09:00:00.000Z"
    }
  ]
}
```

---

## Best Practices

### DO ✅

- Start with conservative limits (low maxSpendUSD)
- Test rules with simulation mode first
- Use reasonable cooldown periods (≥1 hour)
- Monitor execution logs regularly
- Pause rules during high volatility
- Keep slippage tolerance tight (<1%)

### DON'T ❌

- Set maxSpendUSD higher than you can afford to lose
- Use very short cooldowns (<30 minutes)
- Create too many overlapping rules
- Forget to monitor execution logs
- Set triggers that execute too frequently
- Ignore high price impact warnings

---

## Troubleshooting

### Rule not executing

**Possible causes:**
- Cooldown period not elapsed
- Trigger condition not met
- Status set to "paused"
- Insufficient balance in wallet

**Solution:** Check execution logs for detailed reason

---

### High price impact warnings

**Cause:** Low liquidity in pool for trade size

**Solutions:**
- Reduce maxSpendUSD
- Use multiple smaller rules
- Wait for better liquidity
- Switch to mainnet (better liquidity)

---

### Transaction failures

**Possible causes:**
- Slippage exceeded during execution
- Insufficient wallet balance
- Network congestion
- Smart contract error

**Solution:** Review transaction on Algorand explorer, check logs for details

---

## Reference

### Related Documentation
- [System Overview](./SYSTEM_OVERVIEW.md) - Architecture
- [Smart Contracts](./CONTRACTS_AND_DEPLOYMENT.md) - Contract details
- [Developer Guide](./DEVELOPER_GUIDE.md) - Setup and testing

### API Endpoints
- `POST /api/rules` - Create rule
- `GET /api/rules` - List rules
- `PATCH /api/rules/:id` - Update rule
- `DELETE /api/rules/:id` - Delete rule
- `POST /api/poller/run` - Manual trigger
- `GET /api/logs` - View execution logs

---

**Last Updated:** November 28, 2025  
**Version:** 1.1.0  
**Status:** Production Ready (Testnet)

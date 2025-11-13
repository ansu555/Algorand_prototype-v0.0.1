# AI Agent & MCP/NCP Specification

**Complete specification of 10xSwap's AI agent capabilities, MCP server, and NCP analytics engine.**

## Table of Contents

1. [Overview](#overview)
2. [AI Agent System](#ai-agent-system)
3. [Natural Language Processing](#natural-language-processing)
4. [MCP Server (Analytics Engine)](#mcp-server-analytics-engine)
5. [NCP Features](#ncp-features)
6. [Command Mappings](#command-mappings)
7. [Integration Guide](#integration-guide)

---

## Overview

10xSwap integrates AI capabilities through three components:

1. **AI Agent** - Natural language interface for blockchain operations
2. **MCP Server** - Model Context Protocol analytics server
3. **NCP Features** - Advanced crypto asset analysis

### Architecture

```
┌────────────────────────────────────────────────────┐
│              Frontend Chat Interface               │
│          (Natural Language Input)                  │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│            AI Agent Chat Endpoint                  │
│          (src/app/api/agent/chat)                  │
│                                                    │
│  ┌──────────────┐         ┌──────────────┐        │
│  │ Fast Path    │         │  AI Path     │        │
│  │ (Regex)      │         │ (LangChain)  │        │
│  └──────┬───────┘         └──────┬───────┘        │
└─────────┼────────────────────────┼────────────────┘
          │                        │
          │                        ▼
          │              ┌─────────────────┐
          │              │   OpenAI/       │
          │              │  OpenRouter     │
          │              └─────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────┐
│           Algorand Agent Functions                 │
│  • getAddress()                                    │
│  • getBalance(assetId)                            │
│  • transfer(to, amount, assetId)                  │
│  • swap(assetIn, assetOut, amount)                │
│  • getTransactions()                              │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│              Algorand Blockchain                   │
└────────────────────────────────────────────────────┘

                 ┌────────────────┐
                 │   MCP Server   │
                 │  (Analytics)   │
                 └────────────────┘
```

---

## AI Agent System

### Agent Initialization

**File:** `src/lib/agent.ts`, `src/lib/algorand.ts`, `src/lib/agent-wallet.ts`

```typescript
import { getAgent } from '@/lib/agent';
import { buildUserAgentWallet } from '@/lib/agent-wallet';

// Get shared deployer agent (for general queries)
const agent = await getAgent();

// Get user's personal agent wallet (for autopilot)
const userAgent = await buildUserAgentWallet(userWalletAddress);

// Agent is initialized with:
// - Algorand wallet (from mnemonic)
// - Network configuration (testnet/mainnet)
// - Connected to Algod and Indexer
```

### Per-User Agent Wallets

**New Feature:** Each user now has a dedicated agent wallet for automated trading.

**Key Functions:**
```typescript
import { getOrCreateAgentWallet, buildUserAgentWallet } from '@/lib/agent-wallet';

// Create or retrieve agent wallet for user
const { agentAddress, agentMnemonic, isNew } = 
  await getOrCreateAgentWallet(userWalletAddress);

// Build agent instance for operations
const userAgent = await buildUserAgentWallet(userWalletAddress);

// Check balance
const balance = await userAgent.getBalance(assetId);

// Opt-in to asset
const txId = await userAgent.optInToAsset(assetId);

// Transfer assets
const result = await userAgent.transfer({
  to: recipientAddress,
  assetId: 10458941,
  amount: 1000000,
  note: "AutoPilot execution"
});
```

### Core Capabilities

| Capability | Function | Input | Output |
|-----------|----------|-------|--------|
| **Address Query** | `getAddress()` | None | Algorand address string |
| **Balance Check** | `getBalance(assetId?)` | Asset ID (optional) | Balance string |
| **Asset Transfer** | `transfer(opts)` | to, amount, assetId, note | Transaction ID |
| **Token Swap** | `swap(opts)` | assetIn, assetOut, amount | Transaction ID |
| **Transaction History** | `getTransactions()` | None | Array of transactions |
| **Asset Opt-In** | `optIn(assetId)` | Asset ID | Transaction ID |
| **Agent Wallet Mgmt** | `getOrCreateAgentWallet()` | userAddress | Agent wallet details |
| **Fund Agent Wallet** | Manual transfer | ALGO/assets | N/A |

### Agent Response Format

**Success:**
```json
{
  "ok": true,
  "data": { /* operation result */ },
  "message": "Human-readable success message"
}
```

**Error:**
```json
{
  "ok": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## Natural Language Processing

### Two-Tier Processing

#### Tier 1: Fast Path (Regex-Based)

**Purpose:** Handle simple, common commands instantly without AI overhead

**Performance:** ~50ms response time

**Coverage:** ~70% of user queries

**Examples:**
- "what's my address?"
- "algo balance"
- "price of btc"
- "transfer 10 ALGO to ABC..."

**Implementation:**
```typescript
// Pattern matching
const patterns = {
  address: /\b(address|wallet)\b/i,
  balance: /\b(balance|bal)\b/i,
  price: /\b(price|cost|worth)\b.*?\b(\w+)\b/i,
  transfer: /transfer\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)/i
};

if (patterns.address.test(message)) {
  return await handleAddress();
}
```

#### Tier 2: AI Path (LangChain)

**Purpose:** Handle complex queries, multi-step operations, context-aware responses

**Performance:** ~2-5s response time

**Coverage:** ~30% of user queries

**Examples:**
- "What's the best time to buy ALGO based on recent trends?"
- "Create a DCA rule for $50 weekly into ALGO and USDC"
- "Explain why my last swap had high slippage"

**Implementation:**
```typescript
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor } from 'langchain/agents';

const model = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY
});

const executor = await AgentExecutor.fromAgentAndTools({
  agent: model,
  tools: [
    getBalanceTool,
    transferTool,
    swapTool,
    priceCheckTool
  ]
});

const response = await executor.invoke({ input: userMessage });
```

---

## Command Mappings

### Address Commands

**Triggers:** `address`, `wallet`, `account`, `my address`

**Examples:**
- "what's my address?"
- "show wallet"
- "my algorand account"

**Response:**
```
Your Algorand address is: ABC123...XYZ789
```

---

### Balance Commands

**Triggers:** `balance`, `bal`, `how much`

**Formats:**
- "balance" → Shows all balances
- "algo balance" → Shows ALGO balance
- "usdc balance" → Shows USDC balance

**Examples:**
- "what's my balance?"
- "how much ALGO do I have?"
- "show usdc balance"

**Response:**
```
💰 Your Balances:
• ALGO: 123.456 ($18.52)
• USDC: 50.000 ($50.00)

Total: $68.52
```

---

### Price Commands

**Triggers:** `price`, `cost`, `worth`, `value`

**Formats:**
- "price of [ASSET]"
- "[ASSET] price"
- "how much is [ASSET]"

**Examples:**
- "price of algorand"
- "algo price"
- "what's bitcoin worth?"

**Response:**
```
📊 ALGO Price: $0.1500 USD
• 24h Change: +2.5%
• Volume: $12.5M
```

---

### Transfer Commands

**Triggers:** `transfer`, `send`, `pay`

**Format:** `transfer [AMOUNT] [ASSET] to [ADDRESS]`

**Examples:**
- "transfer 10 ALGO to ABC123...XYZ789"
- "send 5 USDC to recipient_address"
- "pay 100 ALGO to ABC..."

**Response:**
```
✅ Transfer successful!
• Sent: 10 ALGO
• To: ABC123...XYZ789
• Transaction ID: DEF456...
• Explorer: https://testnet.algoscan.app/tx/DEF456...
```

---

### Swap Commands

**Triggers:** `swap`, `trade`, `exchange`

**Format:** `swap [AMOUNT] [ASSET_IN] for [ASSET_OUT]`

**Examples:**
- "swap 5 ALGO for USDC"
- "trade 10 USDC for ALGO"
- "exchange 2 ALGO to USDC"

**Response:**
```
🔄 Swap Quote:
• Input: 5.0 ALGO
• Output: ~0.75 USDC
• DEX: Tinyman
• Price Impact: 0.3%
• Fee: 0.3%

Confirm? (yes/no)
```

---

### Portfolio Commands

**Triggers:** `portfolio`, `holdings`, `assets`, `overview`

**Examples:**
- "show my portfolio"
- "what assets do I have?"
- "portfolio overview"

**Response:**
```
📊 Portfolio Overview:
┌─────────┬──────────┬────────────┬──────────┐
│ Asset   │ Balance  │ Price      │ Value    │
├─────────┼──────────┼────────────┼──────────┤
│ ALGO    │ 123.456  │ $0.15      │ $18.52   │
│ USDC    │ 50.000   │ $1.00      │ $50.00   │
│ USDT    │ 25.000   │ $1.00      │ $25.00   │
└─────────┴──────────┴────────────┴──────────┘

Total Value: $93.52
```

---

### Agent Wallet Commands

**Triggers:** `agent wallet`, `agent balance`, `agent address`, `fund agent`

**Examples:**
- "show my agent wallet"
- "what's my agent wallet address?"
- "agent wallet balance"
- "how do I fund my agent wallet?"

**Response (agent wallet info):**
```
🔐 Your Agent Wallet:
• Address: 2AXW6UGLRW...E6OHWOMA
• ALGO Balance: 0.5 ALGO
• Available: 0.3 ALGO (after min balance)
• Assets: USDC (100.0), USDT (50.0)

To fund: Send ALGO or assets to the address above
```

**Response (funding instructions):**
```
💡 How to Fund Your Agent Wallet:

1. Copy your agent address: 2AXW6UGLRW...E6OHWOMA
2. Open your main wallet (Pera, Defly, etc.)
3. Send at least 0.5 ALGO to fund it
4. Optionally send trading assets (USDC, USDT, etc.)
5. Agent wallet will auto opt-in to assets when needed

Minimum Requirements:
• 0.1 ALGO (base)
• +0.1 ALGO per asset you want to hold
• +fees (~0.001 ALGO per transaction)

Recommended: Start with 0.5 ALGO + your trading assets
```

---

### Opt-In Commands

**Triggers:** `opt in`, `opt-in`, `add asset`, `enable asset`

**Examples:**
- "opt in to USDC"
- "add USDT to agent wallet"
- "enable all trading assets"

**Response:**
```
✅ Asset Opt-In Successful!
• Asset: USDC (10458941)
• Transaction ID: ABC123...
• Cost: 0.101 ALGO (0.1 locked + 0.001 fee)

Your agent wallet can now hold USDC.
```

**Response (opt-in all):**
```
✅ Opted in to all trading assets!
• USDC: Transaction ABC123...
• USDT: Transaction DEF456...
• ALGF: Transaction GHI789...

Total Cost: 0.303 ALGO
Your agent wallet is ready for automated trading!
```

---

### Transaction History

**Triggers:** `transactions`, `history`, `recent`, `tx`

**Examples:**
- "show recent transactions"
- "my transaction history"
- "latest transactions"

**Response:**
```
📜 Recent Transactions:
1. ✅ Sent 10 ALGO to ABC... (2 hours ago)
2. ✅ Received 5 USDC from DEF... (5 hours ago)
3. 🔄 Swapped 2 ALGO for USDC (1 day ago)

View all: https://testnet.algoscan.app/address/YOUR_ADDRESS
```

---

## MCP Server (Analytics Engine)

### Overview

The **Model Context Protocol (MCP) Server** provides advanced cryptocurrency analytics using technical indicators, price predictions, and trading strategies.

**Location:** `src/lib/mcp_server/`

**Port:** 8080 (default)

**Authentication:** API key via `Authorization: Bearer` header

### Starting the MCP Server

```bash
# Development mode (with auto-reload)
npm run mcp:dev

# Production mode
npm run mcp:start
```

**Environment Variables:**
```env
MCP_PORT=8080
MCP_BASE_URL=http://localhost:8080
MCP_ANALYTICS_API_KEY=your-secret-key-here
```

### API Endpoints

#### POST /analyze

**Purpose:** Comprehensive cryptocurrency analysis

**Request:**
```json
{
  "coin": "algo",
  "horizonDays": 30,
  "granularity": "1d",
  "tasks": ["analysis", "prediction", "strategy", "charts"]
}
```

**Parameters:**
- `coin` (required) - Symbol: `btc`, `algo`, `eth`, etc.
- `horizonDays` (optional, default: 30) - Days of historical data
- `granularity` (optional, default: "1d") - `"1h"`, `"4h"`, or `"1d"`
- `tasks` (optional) - Array of tasks or empty for all

**Response:**
```json
{
  "ok": true,
  "summary": "ALGO is trading at $0.15 (+2.5% 24h). Market shows bullish trend. Volatility is moderate.",
  "insights": [
    "RSI at 58.3 shows neutral momentum",
    "30-day MA above 50-day MA indicates bullish momentum",
    "MACD histogram positive, suggesting upward momentum"
  ],
  "predictions": [
    {
      "date": "2025-11-13",
      "price": 0.152,
      "probability": 0.68
    },
    {
      "date": "2025-11-14",
      "price": 0.154,
      "probability": 0.65
    }
  ],
  "strategies": [
    {
      "name": "DCA Strategy",
      "description": "Dollar-cost averaging with weekly buys",
      "parameters": {
        "frequency": "weekly",
        "amount": 50
      }
    }
  ],
  "charts": [
    {
      "type": "price_history",
      "format": "svg",
      "data": "<?xml version=\"1.0\"...>"
    }
  ]
}
```

---

#### GET /health

**Purpose:** Health check

**Response:**
```json
{
  "ok": true,
  "timestamp": "2025-11-12T09:00:00.000Z"
}
```

---

## NCP Features

### Technical Analysis

**Indicators Provided:**

1. **RSI (Relative Strength Index)**
   - Range: 0-100
   - Overbought: >70
   - Oversold: <30
   - Neutral: 30-70

2. **MACD (Moving Average Convergence Divergence)**
   - Signal line crossovers
   - Histogram analysis
   - Trend strength

3. **Moving Averages**
   - 30-day MA
   - 50-day MA
   - 200-day MA
   - Crossover signals

4. **Volatility**
   - Standard deviation
   - Bollinger Bands
   - Risk assessment

**Example Analysis:**
```json
{
  "rsi": 58.3,
  "rsiSignal": "neutral",
  "macd": {
    "value": 0.002,
    "signal": 0.001,
    "histogram": 0.001,
    "trend": "bullish"
  },
  "movingAverages": {
    "ma30": 0.148,
    "ma50": 0.145,
    "ma200": 0.140,
    "trend": "bullish"
  },
  "volatility": {
    "value": 0.025,
    "level": "moderate"
  }
}
```

---

### Price Predictions

**Method:** Linear regression + momentum analysis

**Horizon:** 7 days

**Output:** Daily price predictions with probability scores

**Example:**
```json
{
  "predictions": [
    { "date": "2025-11-13", "price": 0.152, "probability": 0.68 },
    { "date": "2025-11-14", "price": 0.154, "probability": 0.65 },
    { "date": "2025-11-15", "price": 0.156, "probability": 0.62 }
  ]
}
```

**Probability Score:**
- >0.7: High confidence
- 0.5-0.7: Moderate confidence
- <0.5: Low confidence

---

### Trading Strategies

**Generated Strategies:**

1. **DCA (Dollar-Cost Averaging)**
   - Frequency: Daily, weekly, monthly
   - Amount: Based on risk profile
   - Best for: Long-term accumulation

2. **Momentum Trading**
   - Entry: RSI crosses 50
   - Exit: RSI crosses 70
   - Best for: Trending markets

3. **Mean Reversion**
   - Entry: Price below 30-day MA
   - Exit: Price above 30-day MA
   - Best for: Range-bound markets

4. **Trend Following**
   - Entry: MA crossover (bullish)
   - Exit: MA crossover (bearish)
   - Best for: Strong trends

**Example Strategy:**
```json
{
  "name": "Momentum Strategy",
  "type": "momentum",
  "description": "Buy on RSI dips, sell on overbought signals",
  "parameters": {
    "buyRSI": 30,
    "sellRSI": 70,
    "stopLoss": 0.05,
    "takeProfit": 0.15
  },
  "recommendation": "Suitable for current market conditions"
}
```

---

### Chart Generation

**Format:** SVG (Scalable Vector Graphics)

**Chart Types:**

1. **Price History**
   - Line chart of historical prices
   - Moving average overlays
   - Volume bars

2. **Technical Indicators**
   - RSI chart
   - MACD chart
   - Bollinger Bands

3. **Predictions**
   - Historical + predicted prices
   - Confidence intervals
   - Trend lines

**Example Usage:**
```typescript
const analysis = await fetch('http://localhost:8080/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MCP_ANALYTICS_API_KEY}`
  },
  body: JSON.stringify({
    coin: 'algo',
    tasks: ['charts']
  })
});

const { charts } = await analysis.json();
// charts[0].data contains SVG markup
```

---

## Integration Guide

### Frontend Integration

**1. Install Dependencies:**
```bash
npm install @langchain/core @langchain/openai
```

**2. Configure Environment:**
```env
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-v1-...
MCP_ANALYTICS_URL=http://localhost:8080
MCP_ANALYTICS_API_KEY=your-secret-key
```

**3. Use Agent in Components:**
```typescript
import { useState } from 'react';

export function ChatInterface() {
  const [messages, setMessages] = useState([]);
  
  const sendMessage = async (content: string) => {
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...messages, { role: 'user', content }],
        walletAddress: userWallet
      })
    });
    
    const data = await response.json();
    setMessages([...messages, 
      { role: 'user', content },
      { role: 'assistant', content: data.content }
    ]);
  };
  
  return (
    <div>
      {/* Chat UI */}
    </div>
  );
}
```

---

### Backend Integration

**1. Initialize Agent:**
```typescript
import { getAgent } from '@/lib/agent';

export async function GET(request: Request) {
  const agent = await getAgent();
  const balance = await agent.getBalance();
  
  return Response.json({ balance });
}
```

**2. Call MCP Server:**
```typescript
const analysis = await fetch(`${MCP_ANALYTICS_URL}/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MCP_ANALYTICS_API_KEY}`
  },
  body: JSON.stringify({
    coin: 'algo',
    horizonDays: 30
  })
});

const data = await analysis.json();
```

---

## Best Practices

### DO ✅

- Cache MCP analysis results (TTL: 5-10 minutes)
- Validate user input before processing
- Use fast path for common queries
- Implement rate limiting
- Log all agent operations
- Handle errors gracefully
- Sanitize AI responses
- Monitor API costs

### DON'T ❌

- Send sensitive data to external AI
- Execute high-value operations without confirmation
- Skip input validation
- Ignore error states
- Over-rely on AI predictions
- Expose API keys in client
- Process untrusted code from AI
- Allow unlimited API calls

---

## Monitoring & Analytics

### Metrics to Track

- Agent request volume
- Response times (fast vs AI path)
- Error rates
- Popular commands
- AI API costs
- User satisfaction

### Logging

**Location:** `data/logs.json`

**Log Format:**
```json
{
  "timestamp": "2025-11-12T09:00:00.000Z",
  "type": "agent_request",
  "command": "balance",
  "path": "fast",
  "duration": 45,
  "status": "success"
}
```

---

## Reference

### Related Documentation
- [System Overview](./SYSTEM_OVERVIEW.md) - Architecture
- [Backend Spec](./BACKEND_AND_AGENT_SPEC.md) - API endpoints
- [Developer Guide](./DEVELOPER_GUIDE.md) - Setup

### External Resources
- [LangChain Docs](https://js.langchain.com/)
- [OpenAI API](https://platform.openai.com/docs)
- [OpenRouter](https://openrouter.ai/docs)

---

**Last Updated:** November 12, 2025  
**Version:** 1.0.0  
**Status:** Production Ready (Testnet)

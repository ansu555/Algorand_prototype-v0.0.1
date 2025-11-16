# 10xSwap: AI-Powered Algorand DEX 

10xSwap is a comprehensive Algorand ecosystem platform featuring:
1. **AI-Powered DEX** - Natural language trading and portfolio management
2. **Token Launchpad** - Fair token launches using bonding curves with anti-bot protection 🚀
3. **X Token Rewards System** - Quest-based rewards with levels, streaks, and badges 🎮
4. **Multi-DEX Aggregation** - Best price routing across Tinyman and Pact
5. **Automated Trading** - Auto-Pilot rules for DCA, rebalancing, and rotation strategies

## Table of Contents

- [✨ Features](#-features)
- [🚀 WaveBreak Token Launchpad](#-wavebreak-token-launchpad)
- [🎮 X Token Rewards System](#-x-token-rewards-system)
- [🏗️ Project Structure](#️-project-structure)
- [🛠️ Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#1-installation)
  - [Environment Setup](#2-environment-setup)
  - [Running the Application](#3-running-the-application)
- [🔧 API Keys & Configuration](#-api-keys--configuration)
- [📡 API Endpoints](#-api-endpoints)
- [🤖 AI Agent Features](#-ai-agent-features)
- [💎 Supported Tokens](#-supported-tokens)
- [📜 Smart Contracts](#-smart-contracts)
- [📖 Documentation](#-documentation)

## ✨ Features

### Core Platform Features
- **🤖 AI-Powered Chat Agent**: Natural language interface for blockchain operations
- **🔐 Per-User Agent Wallets**: Dedicated Algorand wallet for each user with encrypted storage
- **🌿 Algorand Blockchain**: Fast, secure, and carbon-neutral blockchain integration
- **💱 Multi-DEX Aggregation**: Intelligent routing across Tinyman and Pact DEXs
- **👛 Multi-Wallet Support**: Pera, Defly, MyAlgo wallet connections
- **📊 Real-Time Market Data**: Live cryptocurrency prices and analytics
- **⚡ Instant Finality**: Sub-3 second transaction confirmation on Algorand
- **🎨 Modern UI**: Responsive design with dark mode support
- **📦 On-Chain Smart Contracts**: Deployed autopilot rules and multi-hop swap router

### 🚀 WaveBreak Token Launchpad
- **Bonding Curve Mechanics**: Linear, Exponential, and Sigmoid price curves
- **Anti-Bot Protection**: Cooldown periods, per-transaction limits, whale penalties
- **Early Buyer Rewards**: 3x → 1x points multiplier based on purchase timing
- **Automated DEX Graduation**: Auto-creates liquidity pools when funding target reached
- **30-Day Vesting**: Fair token distribution with linear unlock schedule
- **LP Lock**: 6-month liquidity pool locks for project credibility

### 🎮 X Token Rewards System
- **Quest-Based Earning**: Daily, weekly, milestone, and achievement quests
- **30 Level Progression**: Level up from 1-30 with increasing XP thresholds
- **Streak Multipliers**: Up to 3x rewards for maintaining daily login streaks
- **Badge Collection**: Common, Rare, Epic, and Legendary badges with bonuses
- **Referral System**: Earn 10% of referred users' quest rewards
- **Leaderboards**: Compete globally on volume, swaps, and quest completion

### 🔄 Automated Trading (Auto-Pilot)
- **DCA Strategies**: Dollar-cost averaging with custom intervals
- **Portfolio Rebalancing**: Maintain target allocations automatically
- **Token Rotation**: Automated pair trading strategies
- **Rule Scheduling**: Time-based and condition-based execution

### 💰 Staking (Coming Soon)
- **15% Base APY**: Earn passive rewards on staked X tokens
- **VIP Tiers**: Unlock fee discounts and exclusive features
- **Flexible Terms**: Choose lock periods for higher APY multipliers
- **Governance Rights**: Stakers can vote on protocol changes

---

## 🚀 WaveBreak Token Launchpad

**WaveBreak** is a revolutionary fair-launch platform using **bonding curves** to ensure transparent, bot-resistant token distribution on Algorand.

### How It Works

```
Creator → Configure Launch → Bonding Curve Active → Users Buy → Target Reached → Auto-DEX Graduation
```

#### 1. **Project Creation**
- Define token (name, symbol, supply, decimals)
- Choose bonding curve type (Linear, Exponential, Sigmoid)
- Set pricing (base price, max price, funding target)
- Configure liquidity (DEX platform, LP lock duration)
- Upload project assets (logo, social links)

#### 2. **Bonding Curve Phase**
- Users buy tokens at algorithmically determined prices
- **Price Discovery**: Early buyers pay lower prices
- **Fair Distribution**: No private sales or VCs
- **Anti-Bot Protection**:
  - 10-block cooldown between purchases (~33 seconds)
  - Max 1% of supply per transaction
  - Max 5% of supply per wallet
  - Whale penalty for purchases >2.5% supply

#### 3. **Early Buyer Rewards**
Users earn **points** that convert to tokens after graduation:

| Progress | Multiplier | Example ($100 purchase) |
|----------|-----------|-------------------------|
| 0-10% sold | 3x | 300 points → 300 tokens |
| 10-25% sold | 2.5x | 250 points → 250 tokens |
| 25-50% sold | 2x | 200 points → 200 tokens |
| 50-75% sold | 1.5x | 150 points → 150 tokens |
| 75-100% sold | 1x | 100 points → 100 tokens |

**Vesting:** Points convert to tokens with 30-day linear unlock.

#### 4. **Graduation to DEX**
When funding target is reached:
- Smart contract auto-creates liquidity pool on chosen DEX (Tinyman/Pact)
- 80% of raised ALGO + equivalent tokens deposited as liquidity
- LP tokens locked for 6 months (anti-rug protection)
- Token becomes tradable on open market
- Creator receives 20% of raised ALGO

### Bonding Curve Types

**Linear Curve:**
```
price = basePrice + (maxPrice - basePrice) * progress
```
- Steady, predictable price increase
- Best for: Community tokens, DAOs

**Exponential Curve:**
```
price = basePrice * (maxPrice/basePrice) ^ progress
```
- Rapid price acceleration near target
- Best for: Meme coins, speculation plays

**Sigmoid Curve:**
```
price = basePrice + (maxPrice - basePrice) * (progress²)
```
- S-curve: slow start, rapid middle, slow end
- Best for: Balanced launches, gaming tokens

### Launchpad Pages

- **`/launchpad`** - Browse all active and graduated projects
- **`/launchpad/create`** - Launch your own token
- **`/launchpad/[projectId]`** - Project details, buy interface, analytics

### Documentation

- **[Token Launchpad Guide](./docs/TOKEN_LAUNCHPAD.md)** - User guide and feature overview
- **[Launchpad Implementation](./docs/LAUNCHPAD_IMPLEMENTATION.md)** - Technical implementation details
- **[Token Economics](./docs/TOKEN_ECONOMICS.md)** - Points system and tokenomics

---

## 🎮 X Token Rewards System

**X Token** is the platform's utility token, earned through quests and activities, usable for staking, governance, and fee discounts.

### Core Mechanics

#### 🎯 Quest System
Complete quests to earn X tokens:

**Onboarding Quests:**
- Connect Wallet → **10 X**
- First Swap → **25 X**
- First Liquidity → **40 X**
- Create Auto-Pilot Rule → **30 X**

**Daily Quests:**
- Daily Login → **5 X** (stackable with streaks)
- Complete 1 Swap → **10 X**
- Check Liquidity → **8 X**

**Milestone Quests:**
- 5 Swaps → **50 X**
- 25 Swaps → **150 X**
- 100 Swaps → **500 X**
- 500 Swaps → **1,500 X**

**Achievement Quests:**
- $10,000+ Volume → **500 X**
- $50,000+ Volume → **2,500 X**
- 90-Day LP Holder → **1,000 X** + 💎 Diamond Hands Badge

#### 📊 Level Progression (1-30)
Earn XP to level up and unlock rewards:

| Level Range | XP Required | Unlocks |
|-------------|-------------|---------|
| 1-5 | 0 - 1,000 XP | Basic quests |
| 6-10 | 2,000 - 11,000 XP | Weekly quests |
| 11-15 | 15,000 - 41,000 XP | Achievement quests |
| 16-20 | 50,000 - 96,000 XP | Referral bonuses, prediction markets |
| 21-25 | 110,000 - 176,000 XP | Governance proposals |
| 26-30 | 195,000 - 281,000 XP | Legendary quests (5,000 X rewards) |

**XP Sources:**
- Quest rewards: 1 XP per 1 X earned
- Daily login: 5 XP
- Swap: 10 XP each
- LP position active: 50 XP/day
- Auto-Pilot execution: 15 XP

#### 🔥 Streak Multipliers
Maintain daily login streaks for bonus rewards:

| Streak | Multiplier | Example Reward |
|--------|-----------|----------------|
| 1-6 days | 1x | 5 X → 5 X |
| 7-13 days | 1.5x | 5 X → 7.5 X |
| 14-29 days | 2x | 5 X → 10 X |
| 30+ days | 3x | 5 X → 15 X |

**Streak Protection (Future):** Purchase shields with X tokens to protect streaks during absences.

#### 🏆 Badge Collection
Unlock badges for permanent bonuses:

| Badge | Requirement | Reward | Bonus |
|-------|------------|--------|-------|
| Early Adopter 🥇 | Join first month | 500 X | +10% all rewards |
| Diamond Hands 💎 | 90+ day LP | 1,000 X | +5% all rewards |
| Whale Watcher 🐋 | $50,000+ volume | 2,500 X | - |
| Master Trader 🏆 | 500+ swaps | 1,500 X | - |
| Automation Expert 🤖 | 50+ agent trades | 800 X | - |
| Social Butterfly 🦋 | 10+ referrals | 1,000 X | +2% referral |

#### 🤝 Referral System
Invite friends and earn lifetime rewards:

- **Per Signup:** 50 X
- **Friend's First Swap:** 25 X bonus
- **Lifetime Earnings:** 10% of friend's quest rewards
- **Milestones:**
  - 5 referrals → 100 X bonus
  - 10 referrals → 500 X + 🦋 Social Butterfly Badge
  - 25 referrals → 2,000 X
  - 50 referrals → 5,000 X + Influencer Badge

### X Token Utility

#### 🎫 Current Utilities
- **Quest Rewards**: Primary earning method
- **Platform Currency**: Foundation for future features
- **Leaderboard Status**: Show off your X holdings

#### 🔜 Coming Soon (entirely conseptual)
- **Trading Fee Discounts**: Up to 75% off (Diamond tier: 50,000+ X)
- **Staking Rewards**: 15% base APY, up to 40% with lock periods
- **VIP Benefits**:
  - Early launchpad access (6 hours for Diamond tier)
  - Priority customer support
  - Exclusive governance proposals
  - Higher referral commissions (15% vs 10%)
- **Governance Voting**: 1 X = 1 vote on protocol decisions
- **Prediction Markets**: Stake X on token launch outcomes

#### 🔮 Future Vision
- **DAO Treasury**: Community-controlled fund allocation
- **Prediction Market Pools**: Earn from accurate predictions
- **NFT Minting**: Use X to mint achievement NFTs
- **Cross-Chain Bridge**: Bridge X to other ecosystems

### Rewards Pages

- **`/rewards`** - Quest dashboard, streak tracking, badge collection
- **`/stake`** - Staking portal (coming soon with 15% APY)

### Documentation

- **[Token Economics](./docs/TOKEN_ECONOMICS.md)** - Complete X Token economics guide
- **[Backend & Agent Spec](./docs/BACKEND_AND_AGENT_SPEC.md)** - Rewards system API and database schema

---

## 🏗️ Project Structure

This project follows a **clean, modular architecture** using Next.js 15+ App Router with TypeScript.

```
Algorand_prototype-v0.0.1/
├── src/
│   ├── app/                  # Next.js App Router (pages & API)
│   │   ├── (marketing)/      # Public pages (home, landing)
│   │   ├── (dashboard)/      # Protected dashboard pages
│   │   │   ├── agent/        # AI agent interface
│   │   │   ├── wallet/       # Wallet management
│   │   │   └── swap-demo/    # Token swap demo
│   │   ├── launchpad/        # WaveBreak token launchpad
│   │   │   ├── page.tsx      # Browse launches
│   │   │   ├── create/       # Create new launch
│   │   │   └── [projectId]/  # Project details & buy interface
│   │   ├── rewards/          # X Token rewards system
│   │   │   └── page.tsx      # Quest dashboard, streaks, badges
│   │   ├── stake/            # Staking portal (coming soon)
│   │   ├── api/              # API routes (serverless functions)
│   │   │   ├── agent/        # AI agent endpoints
│   │   │   ├── algorand/     # Algorand operations
│   │   │   ├── analytics/    # Market analytics
│   │   │   ├── launchpad/    # Launchpad API
│   │   │   │   ├── projects/ # Project CRUD
│   │   │   │   ├── purchase/ # Buy tokens, quotes, validation
│   │   │   │   ├── user/     # User points & purchases
│   │   │   │   └── ...more
│   │   │   ├── rewards/      # Rewards system API
│   │   │   │   ├── route.ts  # User rewards data
│   │   │   │   ├── quests/   # Quest tracking
│   │   │   │   ├── claim/    # Claim quest rewards
│   │   │   │   └── track/    # Action tracking
│   │   │   └── ...more
│   │   └── ...other routes
│   │
│   ├── components/           # React components (organized by domain)
│   │   ├── features/         # Feature-specific components
│   │   │   ├── algorand/     # Algorand blockchain UI
│   │   │   ├── wallet/       # Wallet management UI
│   │   │   ├── crypto/       # Crypto display components
│   │   │   ├── exchange/     # Exchange components
│   │   │   ├── analytics/    # Analytics & charts
│   │   │   ├── chat/         # Chat interface
│   │   │   └── rules/        # Trading rules
│   │   ├── layout/           # Layout components (header, footer)
│   │   ├── ui/               # Base UI components (Shadcn UI)
│   │   ├── shared/           # Shared utilities
│   │   └── providers/        # React Context providers
│   │
│   ├── lib/                  # Core business logic & utilities
│   │   ├── agent.ts          # AI agent configuration
│   │   ├── algorand.ts       # Algorand SDK functions
│   │   ├── algorand-wallet.ts # Wallet integration
│   │   ├── tokens.ts         # Token registry
│   │   ├── db.ts             # Database connection
│   │   ├── launchpad/        # WaveBreak launchpad
│   │   │   ├── algorand.ts   # Bonding curve interactions
│   │   │   ├── db.ts         # Database operations
│   │   │   ├── schema.sql    # Launchpad database schema
│   │   │   ├── sdk.ts        # Launchpad SDK
│   │   │   └── types.ts      # TypeScript types
│   │   ├── rewards/          # X Token rewards system
│   │   │   ├── db.ts         # Rewards database operations
│   │   │   ├── schema.sql    # Rewards database schema
│   │   │   └── types.ts      # Quest, badge, streak types
│   │   └── ...more utilities
│   │
│   ├── hooks/                # Custom React hooks
│   ├── features/             # Feature business logic (Redux)
│   └── styles/               # Global styles
│
├── scripts/                  # Development & test scripts
├── public/                   # Static assets
├── docs/                     # Documentation
│   ├── FILE_STRUCTURE.md     # 📁 Detailed structure guide
│   ├── SYSTEM_OVERVIEW.md    # 🏗️ System design
│   ├── TOKEN_ECONOMICS.md    # 🎮 X Token rewards guide
│   ├── TOKEN_LAUNCHPAD.md    # 🚀 WaveBreak launchpad
│   └── BACKEND_AND_AGENT_SPEC.md # ⚙️ Backend details
└── data/                     # Runtime data (logs, db)
```

### 📚 Documentation

**Core Documentation** (10 canonical guides):

- **[🏗️ System Overview](./docs/SYSTEM_OVERVIEW.md)** - Architecture, components, and data flows
- **[👨‍💻 Developer Guide](./docs/DEVELOPER_GUIDE.md)** - Setup, installation, testing, and troubleshooting
- **[📁 File Structure](./docs/FILE_STRUCTURE.md)** - Detailed codebase organization guide
- **[📦 Smart Contracts & Deployment](./docs/CONTRACTS_AND_DEPLOYMENT.md)** - Contract details and deployment procedures
- **[💧 Liquidity Pools](./docs/LIQUIDITY_POOLS.md)** - Pool adapters, DEX integration, and pool management
- **[🤖 Autopilot Module](./docs/AUTOPILOT_MODULE.md)** - Automated trading rules and execution
- **[⚙️ Backend & Agent Spec](./docs/BACKEND_AND_AGENT_SPEC.md)** - API endpoints and database schema
- **[🧠 AI Agent & MCP/NCP](./docs/AI_AGENT_AND_MCP_NCP_SPEC.md)** - AI capabilities and analytics engine
- **[🔐 Agent Wallet System](./docs/AGENT_WALLET_SYSTEM.md)** - Per-user agent wallets and automated trading
- **[🚀 Token Launchpad](./docs/TOKEN_LAUNCHPAD.md)** - WaveBreak launchpad guide
- **[🎮 Token Economics](./docs/TOKEN_ECONOMICS.md)** - X Token rewards system and economics

### Key Architectural Decisions

✅ **Next.js App Router** - Modern routing with React Server Components
✅ **Route Groups** - Organized routes without URL clutter (`(marketing)`, `(dashboard)`)
✅ **Domain-Driven Components** - Components organized by feature/domain
✅ **Path Aliases** - Clean imports with `@/*` (e.g., `@/components/ui/button`)
✅ **TypeScript** - Type safety across the entire codebase
✅ **Shadcn UI** - Customizable, accessible component library

## 🚀 Technology Stack

### Frontend
- **Next.js 15+** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn UI** - Beautiful, accessible components
- **Framer Motion** - Smooth animations
- **Redux Toolkit** - State management

### Blockchain
- **Algorand SDK** - Algorand blockchain integration
- **TxnLab Use-Wallet** - Multi-wallet provider
- **Tinyman SDK** - DEX integration for Algorand

### AI & Backend
- **LangChain** - AI agent orchestration
- **OpenAI / OpenRouter** - LLM providers
- **Turso (libSQL)** - Edge database
- **Next.js API Routes** - Serverless functions

### Developer Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Static type checking

## 🛠️ Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

-   [Node.js](https://nodejs.org/en) (v18 or later)
-   [Bun](https://bun.sh/) (for package management and running scripts)

### 1. Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/ansu555/Algorand_prototype-v0.0.1.git
cd Algorand_prototype-v0.0.1
npm install
```

Or using Bun for faster installation:

```bash
bun install
```

### 2. Environment Setup

Create a `.env.local` file in the root of the project by copying from `.env.example`. This file will store all your secret keys and configuration variables.

```bash
cp .env.example .env.local
```

For detailed setup instructions and API key sources, see the [🔧 API Keys & Configuration](#-api-keys--configuration) section below.

### 3. Running the Application

Once your `.env.local` file is configured, you can start the development server:

```bash
npm run dev
```

Or with Bun:

```bash
bun run dev
```

The application will be available at `http://localhost:3000`.

### 4. Testing

Run the test scripts to verify your setup:

```bash
# Test Algorand integration
npm run test:algorand

# Test swap functionality
npm run test:swap

# Test agent address
npm run test:agent
```

## 🔧 API Keys & Configuration

The application requires several API keys for full functionality. Here's where to obtain each one:

### 🔑 Required API Keys

| Service | Environment Variable | Where to Get | Purpose |
|---------|---------------------|--------------|---------|
| **OpenRouter** | `OPENROUTER_API_KEY` | [OpenRouter Platform](https://openrouter.ai/keys) | AI/LLM services (recommended) |
| **OpenAI** | `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) | Alternative AI provider |
| **CoinRanking** | `COINRANKING_API_KEY` | [CoinRanking API](https://developers.coinranking.com/api) | Cryptocurrency market data |
| **Algorand** | `ALGORAND_MNEMONIC` | [Algorand Wallet](https://wallet.myalgo.com/) | 25-word mnemonic phrase |
| **Algorand Network** | `ALGORAND_NETWORK` | `testnet` or `mainnet` | Network selection |

### 🔗 RPC Endpoints

| Network | Environment Variable | Free Options |
|---------|---------------------|--------------|
| **Algorand Mainnet** | `ALGOD_SERVER` | `https://mainnet-api.algonode.cloud` |
| **Algorand Testnet** | `ALGOD_SERVER` | `https://testnet-api.algonode.cloud` |

### ⚙️ Algorand Configuration

The application uses the following environment variables for Algorand:

```env
# Algorand Network (testnet or mainnet)
NEXT_PUBLIC_ALGORAND_NETWORK="testnet"

# Algorand Node Configuration
ALGOD_TOKEN=""
ALGOD_SERVER="https://testnet-api.algonode.cloud"
INDEXER_SERVER="https://testnet-idx.algonode.cloud"

# Deployer Wallet Mnemonic
DEPLOYER_MNEMONIC="your 25-word mnemonic phrase for the deployer account"

# Agent Wallet Encryption (32-byte key for AES-256-GCM encryption)
AGENT_WALLET_ENCRYPTION_KEY="your-32-byte-encryption-key-here"
```

### 🔐 Security Notes

- **NEVER** use a wallet with significant real funds for `DEPLOYER_MNEMONIC` during development.
- Use a dedicated wallet for testing and development.
- Keep your `.env.local` file secure and never commit it to version control.
- Generate a secure `AGENT_WALLET_ENCRYPTION_KEY` using: `openssl rand -hex 32`
- Consider using different API keys for development and production environments.

## 📡 API Endpoints

The project's backend is primarily centered around a single, powerful API endpoint that drives the AI chat.

### `POST /api/agent/chat`

This is the main endpoint for all user interactions with the AI agent.

-   **Responsibility**: It receives chat messages, determines user intent, and orchestrates calls to the appropriate backend functions or the AI agent. It supports both a fast, regex-based fallback for simple commands and a full LLM-based agent for complex queries.
-   **File Location**: `app/api/agent/chat/route.ts`

#### Request Body

```json
{
  "messages": [
    { "role": "user", "content": "what's my address?" }
  ],
  "threadId": "optional-session-id",
  "walletAddress": "YOUR_ALGORAND_ADDRESS"
}
```

#### Response Body

```json
{
  "ok": true,
  "content": "Your address is YOUR_ALGORAND_ADDRESS",
  "threadId": "session-id"
}
```

## 🤖 AI Agent Features

### AI-Powered Natural Language Interface

The AI agent enables natural language interaction with the Algorand blockchain, allowing users to execute operations through simple conversational commands.

### Agent Implementation

The agent is built using **Algorand SDK** and **LangChain** for intelligent command processing. It uses a two-tier approach:

1.  **Fast Path (Regex-Based)**: Instant responses for simple commands like balance checks and price queries (~50ms)

2.  **AI Path (LangChain + OpenAI)**: Complex query processing for multi-step operations and context-aware responses (~2-5s)

**Core Capabilities:**

```typescript
// Initialize Algorand agent
const agent = await getAgent();

// Get wallet address
const address = await agent.getAddress();

// Check balances
const algoBalance = await agent.getBalance();        // ALGO balance
const usdcBalance = await agent.getBalance(10458941); // USDC balance

// Transfer assets
const result = await agent.transfer({
  to: 'RECIPIENT_ADDRESS',
  amount: '10',
  assetId: 0,  // 0 for ALGO, ASA ID for tokens
  note: 'Payment for services'
});

// Get transaction history
const txns = await agent.getTransactions();
```

**Supported Natural Language Commands:**
- "What's my ALGO balance?"
- "Transfer 10 ALGO to [address]"
- "Swap 5 ALGO for USDC"
- "Show my portfolio"
- "What's the price of Algorand?"
- "Show recent transactions"

For complete AI agent documentation, see **[AI Agent & MCP/NCP Spec](./docs/AI_AGENT_AND_MCP_NCP_SPEC.md)**

### AI Agent Actions & Triggers

The AI chat understands a variety of commands. For speed and cost-efficiency, simple commands are handled by a regex-based parser in `app/api/agent/chat/route.ts`. More complex requests are passed to a LangChain agent.

Here is a detailed map of triggers and actions:

#### 🔑 Address
- **Triggers**: `address`, `wallet`
- **Action**: Shows the user's connected wallet address.

#### 💰 Balances
- **Triggers**: `balance`, `balances`
- **Examples**:
  - `ALGO balance` → `ALGO: 123.45 ($15.67)`
  - `USDC balance` → `USDC: 500.00 ($500.00)`

#### 📊 Prices & Market
- **Triggers**: `price`, `prices`, `market`, `top`, `tokens`
- **Examples**:
  - `price algo`, `price of algorand`
  - `market`, `top 10 coins`

#### ⛽ Gas
- **Triggers**: `gas`, `gas price`, `fees`
- **Action**: Shows the current Algorand network transaction fees.

#### 📂 Portfolio
- **Triggers**: `portfolio`, `overview`, `total value`, `net worth`
- **Action**: Displays a summary of all assets in the connected wallet.

#### 🔄 Transactions
- **Triggers**: `transactions`, `history`, `recent`, `tx`
- **Action**: Shows a summary of recent transactions from the connected wallet.

#### 💸 Transfer
- **Format**: `transfer <amount> <ASSET> to <ADDRESS>`
- **Example**: `transfer 10 ALGO to ZQ...`

## 📦 Supported Tokens

This project maintains a registry of supported tokens per chain in `src/lib/tokens.ts`. The UI and backend expect these symbols when requesting balances or swaps.

**Algorand mainnet**

| Symbol | ASA ID | Decimals |
|--------|--------|----------|
| ALGO   | 0      | 6        |
| USDC   | 31566704 | 6      |
| USDT   | 312769 | 6        |
| WBTC   | 1058926737 | 8    |
| WETH   | 887406851 | 18     |

**Algorand testnet**

| Symbol | ASA ID | Decimals |
|--------|--------|----------|
| ALGO   | 0      | 6        |
| USDC   | 10458941 | 6      |
| USDT   | 67396430 | 6      |
| ALGF   | 70283957 | 6      |

If you need additional tokens supported, add them to `src/lib/tokens.ts` and the UI will pick them up automatically.

#### 💸 Transfer Commands
- **Format**: `transfer <amount> <ASSET> to <ADDRESS>`
- **Example**: `transfer 10 ALGO to ZQ...`

#### 🔁 Swap (Tinyman DEX Integration)
- **Format**: `swap <amount> <FROM> for <TO>`
- **Example**: `swap 5 ALGO for USDC`
- **Supported Pairs**: ALGO ↔ USDC (testnet)
- **Features**: Real-time pricing, minimal slippage, instant settlement

#### 🔷 Algorand Commands
- **Address**: `algorand address`, `algo wallet`
- **Balance**: `algo balance`, `usdc balance algorand`
- **Portfolio**: `algorand portfolio`, `algo overview`
- **Transfer**: `transfer 10 ALGO to ALGORAND_ADDRESS`
- **Price**: `algo price`, `price of algorand`
- **History**: `algorand transactions`, `algo history`

### Other API Routes

All API routes are located in `src/app/api/`:

| Endpoint | Purpose | File Location |
|----------|---------|---------------|
| `/api/agent` | AI agent chat interface | `src/app/api/agent/` |
| `/api/agent/wallet` | Per-user agent wallet management | `src/app/api/agent/wallet/` |
| `/api/algorand` | Algorand blockchain operations | `src/app/api/algorand/` |
| `/api/analytics` | Market analytics data | `src/app/api/analytics/` |
| `/api/db` | Database operations | `src/app/api/db/` |
| `/api/logs` | System logs management | `src/app/api/logs/` |
| `/api/poller` | Background polling service | `src/app/api/poller/` |
| `/api/price` | Token price queries | `src/app/api/price/` |
| `/api/rules` | Trading rules management | `src/app/api/rules/` |

## 📜 Smart Contracts

10xSwap uses four main smart contracts deployed on Algorand Testnet for multi-DEX aggregation and automated trading.

### Testnet Deployments

| Contract | App ID | Address | Explorer Links |
|----------|--------|---------|----------------|
| **MultihopSwapRouter** | `749360450` | `OL7STUUNPYHLP3I73MG3ESSFWU2HGIFQ522TUOADK4WHD66W2T4A6M4B3Y` | [Application](https://lora.algokit.io/testnet/application/749360450) • [Transaction](https://lora.algokit.io/testnet/transaction/W6JEYCEWVHLQTYRAQZJ433DVPXDV25L3PJ7ALTFA766CZ72PLQVA) |
| **TinymanPoolAdapter** | `749360541` | `IRIK74M646IKDJV2F3QGMVTKHRGRH4PW7C7EOZV5YUYFNT2DYBFJVDJILM` | [Application](https://lora.algokit.io/testnet/application/749360541) • [Transaction](https://lora.algokit.io/testnet/transaction/I7BH4U4HHZZIURVDRKO4O3RUNRYPM2KMTELQVPXDSQEWX7DJ6RQA) |
| **PactPoolAdapter** | `749341932` | `5MF2XA5DFO2JKZCSNRGO64LYADV7ZUSF4VE2ZQFPUKPRGG2ZOLBIUOITQU` | [Application](https://lora.algokit.io/testnet/application/749341932) • [Transaction](https://lora.algokit.io/testnet/transaction/4DOBHUDTL26N5ZWRPYSGZNIP5NBVJIKRSYYVJHHSQ65AG5QAD7LA) |
| **AutoPilotRuleContract** | `749509231` | `KO5JO5GWYY5TIY3NQJ3VHNKF6DZSVWGWHBJI55LSFPA5PYQXMGSGWIEGS4` | [Application](https://lora.algokit.io/testnet/application/749509231) |

### Contract Purposes

- **MultihopSwapRouter**: Main routing contract for executing multi-hop swaps across different DEXs
- **TinymanPoolAdapter**: Adapter for Tinyman V2 DEX integration (0.30% fee)
- **PactPoolAdapter**: Adapter for Pact Finance DEX integration (0.25% fee)
- **AutoPilotRuleContract**: Smart contract for automated trading rules (DCA, rebalancing, rotation)

### Source Files

All contract source code, TEAL, and ABI specifications are available in:
- **Source Code**: `Blockchain/projects/10x_Swap/smart_contracts/`
- **Compiled Artifacts**: `artifacts/` (TEAL files and ARC56 JSON specifications)

For detailed contract documentation, deployment procedures, and integration guides, see **[Smart Contracts & Deployment](./docs/CONTRACTS_AND_DEPLOYMENT.md)**

### Liquidity Pool Integration

10xSwap aggregates liquidity from multiple DEX protocols to provide optimal swap rates:

- **Tinyman V2 Pools**: 100+ liquidity pools with 0.30% trading fee
- **Pact Finance Pools**: 50+ liquidity pools with 0.25% trading fee
- **Pool Discovery**: Automatic selection of best pool based on output amount and liquidity depth
- **Multi-hop Routing**: Intelligent routing through multiple pools for optimal pricing

The platform uses dedicated **pool adapter contracts** (TinymanPoolAdapter and PactPoolAdapter) to interact with each DEX's liquidity pools through a unified interface. This architecture enables:
- ✅ Seamless multi-DEX aggregation
- ✅ Automatic best-price selection
- ✅ Slippage protection across all pools
- ✅ Optimized gas costs

For complete liquidity pool documentation, see **[Liquidity Pools Guide](./docs/LIQUIDITY_POOLS.md)**

## 📖 Documentation

### 📚 Complete Documentation

This project includes comprehensive documentation to help you understand and contribute:

#### 🗂️ Codebase Structure
- **[📁 File Structure Guide](./docs/FILE_STRUCTURE.md)** - Detailed walkthrough of every folder, file, and their purposes. Perfect for new developers to understand the codebase organization.

#### 🏗️ Architecture & Design  
- **[🏗️ System Overview](./docs/SYSTEM_OVERVIEW.md)** - High-level system design, architecture, components, and data flows
- **[⚙️ Backend & Agent Spec](./docs/BACKEND_AND_AGENT_SPEC.md)** - Backend architecture, API endpoints, and database schema

### 🚀 Quick Links

- [✨ Features](#-features) - What this app can do
- [🏗️ Project Structure](#️-project-structure) - Codebase organization
- [�️ Getting Started](#-getting-started) - Installation and setup
- [🔧 API Configuration](#-api-keys--configuration) - Environment setup
- [🤖 AI Agent](#-ai-agent-features) - Chat commands and capabilities
- [� Supported Tokens](#-supported-tokens) - Available tokens per chain

### 🆘 Support & Troubleshooting

**Having issues?**

1. **Setup Issues**: Review the [Getting Started](#️-getting-started) section
2. **Understanding the Code**: Check the [System Overview](./docs/SYSTEM_OVERVIEW.md)
3. **Environment Setup**: See [Developer Guide](./docs/DEVELOPER_GUIDE.md)
4. **API Questions**: Review [Backend & Agent Spec](./docs/BACKEND_AND_AGENT_SPEC.md)
5. **Smart Contracts**: See [Contracts & Deployment](./docs/CONTRACTS_AND_DEPLOYMENT.md)

### 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Before contributing**, please read:
- [System Overview](./docs/SYSTEM_OVERVIEW.md) - Understand the architecture
- [Developer Guide](./docs/DEVELOPER_GUIDE.md) - Know the development workflow

### 📄 License

This project is licensed under the MIT License.

### 🙏 Acknowledgments

- **Algorand Foundation** - Blockchain infrastructure
- **TxnLab** - Wallet provider
- **Shadcn UI** - Component library
- **Vercel** - Hosting platform

---

**Built with ❤️ by the 10xSwap Team**

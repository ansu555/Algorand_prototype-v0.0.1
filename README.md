# 10xSwap: AI-Powered Algorand DEX

10xSwap is a modern web application that allows users to explore cryptocurrency markets, manage assets, and execute transactions on the Algorand blockchain. It features an AI-powered chat agent that can understand natural language commands to perform actions like checking balances, getting token prices, and executing swaps and transfers.

## Table of Contents

- [✨ Features](#-features)
- [🏗️ Project Structure](#️-project-structure)
- [� Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#1-installation)
  - [Environment Setup](#2-environment-setup)
  - [Running the Application](#3-running-the-application)
- [🔧 API Keys & Configuration](#-api-keys--configuration)
- [📡 API Endpoints](#-api-endpoints)
- [🤖 AI Agent Features](#-ai-agent-features)
- [� Supported Tokens](#-supported-tokens)
- [�📖 Documentation](#-documentation)

## ✨ Features

- **🤖 AI-Powered Chat Agent**: Natural language interface for blockchain operations
- **� Algorand Blockchain**: Fast, secure, and carbon-neutral blockchain integration
- **💱 DEX Integration**: Swap tokens via Tinyman and Pact on Algorand
- **👛 Multi-Wallet Support**: Pera, Defly, MyAlgo wallet connections
- **📊 Real-Time Market Data**: Live cryptocurrency prices and analytics
- **🔄 Automated Trading Rules**: DCA, Rebalance, and Rotation strategies
- **⚡ Instant Finality**: Sub-3 second transaction confirmation on Algorand
- **🎨 Modern UI**: Responsive design with dark mode support
- **📦 On-Chain Smart Contracts**: Deployed autopilot rules and multi-hop swap router

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
│   │   ├── api/              # API routes (serverless functions)
│   │   │   ├── agent/        # AI agent endpoints
│   │   │   ├── algorand/     # Algorand operations
│   │   │   ├── analytics/    # Market analytics
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
│   ├── SYSTEM_ARCHITECTURE.md # 🏗️ System design
│   └── BACKEND_ARCHITECTURE.md # ⚙️ Backend details
└── data/                     # Runtime data (logs, db)
```

### 📚 Documentation

**Core Documentation** (7 canonical guides):

- **[🏗️ System Overview](./docs/SYSTEM_OVERVIEW.md)** - Architecture, components, and data flows
- **[👨‍💻 Developer Guide](./docs/DEVELOPER_GUIDE.md)** - Setup, installation, testing, and troubleshooting
- **[📦 Smart Contracts & Deployment](./docs/CONTRACTS_AND_DEPLOYMENT.md)** - Contract details and deployment procedures
- **[🤖 Autopilot Module](./docs/AUTOPILOT_MODULE.md)** - Automated trading rules and execution
- **[⚙️ Backend & Agent Spec](./docs/BACKEND_AND_AGENT_SPEC.md)** - API endpoints and database schema
- **[🧠 AI Agent & MCP/NCP](./docs/AI_AGENT_AND_MCP_NCP_SPEC.md)** - AI capabilities and analytics engine

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
```

### 🔐 Security Notes

- **NEVER** use a wallet with significant real funds for `DEPLOYER_MNEMONIC` during development.
- Use a dedicated wallet for testing and development.
- Keep your `.env.local` file secure and never commit it to version control.
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
| `/api/algorand` | Algorand blockchain operations | `src/app/api/algorand/` |
| `/api/analytics` | Market analytics data | `src/app/api/analytics/` |
| `/api/db` | Database operations | `src/app/api/db/` |
| `/api/logs` | System logs management | `src/app/api/logs/` |
| `/api/poller` | Background polling service | `src/app/api/poller/` |
| `/api/price` | Token price queries | `src/app/api/price/` |
| `/api/rules` | Trading rules management | `src/app/api/rules/` |

## 📖 Documentation

### 📚 Complete Documentation

This project includes comprehensive documentation to help you understand and contribute:

#### 🗂️ Codebase Structure
- **[📁 File Structure Guide](./docs/FILE_STRUCTURE.md)** - Detailed walkthrough of every folder, file, and their purposes. Perfect for new developers to understand the codebase organization.

#### 🏗️ Architecture & Design  
- **[🏗️ System Architecture](./docs/SYSTEM_ARCHITECTURE.md)** - High-level system design, multi-chain infrastructure, technology stack, data flow, and security considerations.
- **[⚙️ Backend Architecture](./docs/BACKEND_ARCHITECTURE.md)** - Detailed technical implementation, agent factory patterns, transaction pipeline, AI integration, and performance optimization.

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

# 10xSwap: AI-Powered Algorand DEX

10xSwap is a modern web application that allows users to explore cryptocurrency markets, manage assets, and execute  transactions across multiple network Algorand. It features an AI-powered chat agent that can understand natural language commands to perform actions like checking balances, getting token prices, and executing swaps and transfers.

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
- **💸 Gasless Transactions**: Execute transactions without paying gas fees
- **🔗 Multi-Chain Support**: Base, Avalanche, and Algorand blockchain integration
- **💱 DEX Integration**: Swap tokens via Tinyman on Algorand
- **👛 Multi-Wallet Support**: Pera, Defly, MyAlgo wallet connections
- **📊 Real-Time Market Data**: Live cryptocurrency prices and analytics
- **🔄 Smart Transfers**: Automatic token swapping when balance is insufficient
- **⚡ Instant Finality**: Fast transaction confirmation on Algorand
- **🎨 Modern UI**: Responsive design with dark mode support

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

For detailed information about the codebase structure:

- **[� File Structure Guide](./docs/FILE_STRUCTURE.md)** - Comprehensive guide to every folder and file
- **[🏗️ System Architecture](./docs/SYSTEM_ARCHITECTURE.md)** - High-level system design and multi-chain infrastructure
- **[⚙️ Backend Architecture](./docs/BACKEND_ARCHITECTURE.md)** - Technical implementation details and patterns

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
- **0xGasless Agentkit** - Gasless transactions (Base, Avalanche)
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
| **0xGasless** | `GASLESS_API_KEY_*` | [0xGasless Dashboard](https://dashboard.0xgasless.com/) | Gasless transaction sponsorship |
| **0xGasless Paymaster** | `GASLESS_PAYMASTER_URL_*` | [0xGasless Dashboard](https://dashboard.0xgasless.com/) | Per-chain paymaster endpoints |
| **OpenRouter** | `OPENROUTER_API_KEY` | [OpenRouter Platform](https://openrouter.ai/keys) | AI/LLM services (recommended) |
| **OpenAI** | `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) | Alternative AI provider |
| **CoinRanking** | `COINRANKING_API_KEY` | [CoinRanking API](https://developers.coinranking.com/api) | Cryptocurrency market data |
| **Algorand** | `ALGORAND_MNEMONIC` | [Algorand Wallet](https://wallet.myalgo.com/) | 25-word mnemonic phrase |
| **Algorand Network** | `ALGORAND_NETWORK` | `testnet` or `mainnet` | Network selection |

### 🔗 RPC Endpoints

| Network | Environment Variable | Free Options | Premium Options |
|---------|---------------------|--------------|-----------------|
| **Base Mainnet** | `RPC_URL_BASE` | [Base Public RPC](https://mainnet.base.org) | [Alchemy](https://alchemy.com), [Infura](https://infura.io) |
| **Avalanche Mainnet** | `RPC_URL_AVALANCHE` | [Avalanche Public RPC](https://api.avax.network/ext/bc/C/rpc) | [Alchemy](https://alchemy.com), [Infura](https://infura.io) |
| **Fuji Testnet** | `RPC_URL_FUJI` | [Fuji Public RPC](https://api.avax-test.network/ext/bc/C/rpc) | [Alchemy](https://alchemy.com), [Infura](https://infura.io) |

### ⚙️ Multi-Chain Configuration

The application supports per-chain configuration. Each chain requires its own set of API keys and endpoints:

- **Base Mainnet (8453)**: `*_BASE` suffix
- **Avalanche Mainnet (43114)**: `*_AVALANCHE` suffix  
- **Fuji Testnet (43113)**: `*_FUJI` suffix

Example configuration pattern:
```env
# Base Mainnet
GASLESS_API_KEY_BASE="your_base_api_key"
GASLESS_PAYMASTER_URL_BASE="your_base_paymaster_url"
RPC_URL_BASE="your_base_rpc_url"

# Avalanche Mainnet
GASLESS_API_KEY_AVALANCHE="your_avalanche_api_key"
GASLESS_PAYMASTER_URL_AVALANCHE="your_avalanche_paymaster_url"
RPC_URL_AVALANCHE="your_avalanche_rpc_url"
```

### 🔐 Security Notes

- **NEVER** use a private key with significant real funds for `PRIVATE_KEY`
- Use a dedicated wallet for testing and development
- Keep your `.env.local` file secure and never commit it to version control
- Consider using different API keys for development and production environments

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
  "walletAddress": "0x... (optional, from user's connected wallet)",
  "chainId": 8453
}
}
```

#### Response Body

```json
{
  "ok": true,
  "content": "Smart Account (gasless): 0x...",
  "threadId": "session-id"
}
```

## 🤖 AI Agent Features

### 0xGasless & AI Agent Implementation

The core of this project is the integration of gasless transactions via **0xGasless Agentkit** and natural language processing with an AI agent across multiple blockchain networks.

### 0xGasless Smart Account

We use an ERC-4337 Smart Account to execute transactions on behalf of the user without requiring them to pay for gas directly. The system supports multiple chains with per-chain configuration.

1.  **Multi-Chain Initialization**: In `lib/agent.ts`, we configure the `Agentkit` with chain-specific parameters. Each chain has its own API keys, paymaster URLs, and RPC endpoints.

    ```typescript
    // lib/agent.ts
    import { Agentkit } from '@0xgasless/agentkit';

    // ... inside buildAgent(chainId)
    const agentkit = await Agentkit.configureWithWallet({
      privateKey: PRIVATE_KEY,
      rpcUrl: getRpcUrl(chainId),
      apiKey: getGaslessApiKey(chainId),
      chainID: chainId,
      paymasterUrl: getPaymasterUrl(chainId),
    });

    // The smart account is accessed via agentkit.smartAccount
    const smartAccountAddress = await agentkit.smartAccount.getAddress();
    ```

2.  **Executing Transactions**: All on-chain actions like `smartTransfer` and `smartSwap` are executed through the `agentkit.smartAccount` instance. This ensures they are routed through the paymaster for gas sponsorship.

    ```typescript
    // lib/agent.ts
    async function smartTransfer(opts) {
      const sa = agentkit.smartAccount;
      // For native ETH transfer
      const tx = await sa.sendTransaction({ to: destination, value });
      // For ERC20 transfer
      const tx = await sa.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [destination, value],
      });
      return { hash: tx };
    }
    ```

### AI Agent Actions & Triggers

The AI chat understands a variety of commands. For speed and cost-efficiency, simple commands are handled by a regex-based parser in `app/api/agent/chat/route.ts`. More complex requests are passed to a LangChain agent.

Here is a detailed map of triggers and actions:

#### 🔑 Address
- **Triggers**: `address`, `wallet`
- **Action**: Shows the gasless Smart Account, the server's EOA, and the user's connected wallet address (if available).

#### 💰 Balances
- **Triggers**: `balance`, `balances`
- **Default Account**: Smart Account
- **Examples**:
  - `ETH balance` → `ETH: 0.0000 ($0.00)`
  - `USDC balance` → `USDC: 5.0000 ($5.00)`
  - `balance 0x...` → Fetches balance for a specific token contract.
- **Targeting Other Accounts**:
  - `ETH balance connected eoa` → Shows balance for your connected wallet.
  - `USDC balance server eoa` → Shows balance for the server's key.

#### 📊 Prices & Market
- **Triggers**: `price`, `prices`, `market`, `top`, `tokens`
- **Examples**:
  - `price eth`, `price of solana`
  - `market`, `top 10 coins`

#### ⛽ Gas
- **Triggers**: `gas`, `gas price`, `fees`
- **Action**: Shows the current gas and base fee on the Base network.

#### 📂 Portfolio
- **Triggers**: `portfolio`, `overview`, `total value`, `net worth`
- **Default Account**: Smart Account
- **Targeting**: Works just like balances (`portfolio connected eoa`, `portfolio server eoa`).

#### 🔄 Transactions
- **Triggers**: `transactions`, `history`, `recent`, `tx`
- **Action**: Shows a summary of recent transactions from the Smart Account.

#### 💸 Transfer (from Smart Account)
- **Basic**: `transfer 0.01 ETH to 0x...`
- **Priority**: `fast transfer 1 USDC to 0x...` (options: `fast`, `cheap`, `urgent`, `economy`)
- **Smart (Auto-Swap)**: `smart transfer 5 USDC to 0x...` (swaps other assets if balance is too low)
- **Batch**: `batch transfer 1 USDC to 0xA and 0.5 ETH to 0xB`

## 📦 Supported Tokens

This project maintains a registry of supported tokens per chain in `src/lib/tokens.ts`. The UI and backend expect these symbols when requesting balances or swaps.

**Base mainnet (8453)**

| Symbol | Address |
|--------|---------|
| ETH    | native  |
| WETH   | 0x4200000000000000000000000000000000000006 |
| USDC   | 0x833589fCD6EDb6E08f4c7C10d6D3e96cF6a47b8f |

**Avalanche mainnet (43114)**

| Symbol | Address |
|--------|---------|
| AVAX   | native  |
| WAVAX  | 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7 |
| USDC   | 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E |

**Fuji testnet (43113)**

| Symbol | Address |
|--------|---------|
| AVAX   | native  |
| WAVAX  | 0xd00ae08403B9bbb9124bb305C09058E32C39A48c |
| USDC   | 0x5425890298aed601595a70AB815c96711a31Bc65 |

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
- **Basic**: `transfer 0.01 ETH to 0x...`
- **Priority**: `fast transfer 1 USDC to 0x...` (options: `fast`, `cheap`, `urgent`, `economy`)
- **Smart (Auto-Swap)**: `smart transfer 5 USDC to 0x...` (swaps other assets if balance is too low)
- **Batch**: `batch transfer 1 USDC to 0xA and 0.5 ETH to 0xB`
- **Scheduled**: `schedule transfer 2 USDC to 0x... for tomorrow at 2pm`

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
- **Atomic Swaps**: `atomic swap info` (coming soon)
- **History**: `algorand transactions`, `algo history`

#### 🎯 Address Targeting Keywords
Use these keywords in your balance or portfolio queries to specify the address.
- **Connected EOA**: `connected`, `my wallet`, `metamask`, `my eoa`
- **Server EOA**: `server eoa`, `agent key`, `server wallet`
- **Smart Account**: `smart account`, `smart`, `gasless`
- **Plain "eoa"**: Defaults to your connected wallet if available, otherwise falls back to the server EOA.

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

1. **Setup Issues**: Review the [Getting Started](#-getting-started) section
2. **Understanding the Code**: Check the [File Structure Guide](./docs/FILE_STRUCTURE.md)
3. **Architecture Questions**: See [System Architecture](./docs/SYSTEM_ARCHITECTURE.md)
4. **Technical Details**: Review [Backend Architecture](./docs/BACKEND_ARCHITECTURE.md)
5. **Configuration**: Verify all API keys in [Configuration Guide](#-api-keys--configuration)

### 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Before contributing**, please read:
- [File Structure Guide](./docs/FILE_STRUCTURE.md) - Understand the organization
- [System Architecture](./docs/SYSTEM_ARCHITECTURE.md) - Know the design principles

### 📄 License

This project is licensed under the MIT License.

### 🙏 Acknowledgments

- **Algorand Foundation** - Blockchain infrastructure
- **TxnLab** - Wallet provider
- **Shadcn UI** - Component library
- **Vercel** - Hosting platform
- **0xGasless** - Gasless transaction support

---

**Built with ❤️ by the 10xSwap Team**

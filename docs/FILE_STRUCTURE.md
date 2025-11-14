# File Structure Guide

**Detailed walkthrough of the 10xSwap codebase organization, file purposes, and architectural patterns.**

## Table of Contents

1. [Overview](#overview)
2. [Root Directory](#root-directory)
3. [Source Code (`src/`)](#source-code-src)
4. [Smart Contracts (`Blockchain/`)](#smart-contracts-blockchain)
5. [Documentation (`docs/`)](#documentation-docs)
6. [Scripts (`scripts/`)](#scripts-scripts)
7. [Artifacts (`artifacts/`)](#artifacts-artifacts)
8. [Public Assets (`public/`)](#public-assets-public)
9. [Data (`data/`)](#data-data)

---

## Overview

10xSwap follows a **modular Next.js 15 App Router architecture** with clear separation of concerns:

```
Algorand_prototype-v0.0.1/
├── src/                      # Frontend & backend source code
├── Blockchain/               # Smart contract source (Python/AlgoPy)
├── docs/                     # Documentation (8 canonical guides)
├── scripts/                  # Development & testing scripts
├── artifacts/                # Compiled smart contracts (TEAL + ABI)
├── public/                   # Static assets
├── data/                     # Runtime data (logs, rules, db)
└── [config files]            # Next.js, TypeScript, Tailwind configs
```

---

## Root Directory

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Node.js dependencies, scripts, project metadata |
| `next.config.mjs` | Next.js configuration (redirects, environment, build) |
| `tsconfig.json` | TypeScript compiler configuration |
| `tsconfig.poller.json` | TypeScript config for background poller service |
| `tailwind.config.ts` | Tailwind CSS theme and plugin configuration |
| `postcss.config.mjs` | PostCSS plugins (Tailwind processor) |
| `components.json` | Shadcn UI component configuration |
| `.eslintrc.json` | ESLint linting rules |
| `.gitignore` | Git ignore patterns |
| `.env.example` | Environment variable template |

### Root Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview, setup instructions, documentation index |
| `bun.lock` | Bun package manager lock file |
| `package-lock.json` | npm lock file (if using npm instead of bun) |

---

## Source Code (`src/`)

### `src/app/` - Next.js App Router

Next.js 15 App Router with route groups and API routes.

#### Route Groups

**`(marketing)/`** - Public marketing pages
- `page.tsx` - Landing page

**`(dashboard)/`** - Protected dashboard pages (require wallet connection)
```
├── agent/                    # AI agent chat interface
├── agent-wallet/             # Per-user agent wallet management
├── autopilot/                # Autopilot rules UI
├── portfolio/                # User portfolio dashboard
├── swap-demo/                # Token swap interface
└── wallet/                   # Wallet connection & management
```

**`admin/`** - Admin-only pages
```
└── poller/                   # Manual poller trigger interface
```

#### Feature Pages

```
├── algorand/                 # Algorand blockchain info page
├── pool/                     # Liquidity pools
│   ├── page.tsx              # Pool explorer
│   ├── create/               # Create liquidity position
│   └── [id]/                 # Pool details page
├── cryptocurrencies/         # Crypto market data
│   ├── page.tsx              # Crypto list
│   └── [id]/                 # Crypto detail page
├── stake/                    # Staking page
├── trade/                    # Trading page
└── transactions/             # Transaction history
```

#### API Routes (`src/app/api/`)

All backend serverless functions:

```
api/
├── agent/                    # AI agent endpoints
│   ├── chat/                 # Agent chat interface
│   ├── wallet/               # Agent wallet operations
│   └── execute/              # Agent action execution
├── algorand/                 # Algorand blockchain operations
├── assets/                   # Asset discovery & info
├── coingecko/                # CoinGecko API proxy
├── db/                       # Database operations
├── logs/                     # Execution logs
├── mcp/                      # Management Control Protocol
├── poller/                   # Background poller
│   ├── trigger/              # Manual trigger endpoint
│   └── status/               # Poller status
├── pools/                    # Liquidity pool endpoints
│   ├── all/                  # Fetch all pools
│   ├── market-data/          # Pool TVL, volume, APR
│   └── transactions/         # Pool transaction history
├── price/                    # Token price queries
├── router/                   # Multi-DEX routing
├── rules/                    # Autopilot rules CRUD
├── swap/                     # Swap preparation & execution
│   ├── prepare/              # Build swap transactions
│   ├── opt-in-pool/          # Asset opt-in helper
│   └── route.ts              # Legacy swap endpoint
├── swaps/                    # Swap history
└── transactions/             # Transaction queries
```

**API Endpoint Naming Convention:**
- `GET` requests: Fetch data (e.g., `/api/pools/all`)
- `POST` requests: Create/execute (e.g., `/api/rules`, `/api/swap/prepare`)
- `PATCH` requests: Update (e.g., `/api/rules/:id`)
- `DELETE` requests: Delete (e.g., `/api/rules/:id`)

#### App Files

| File | Purpose |
|------|---------|
| `layout.tsx` | Root layout (providers, fonts, metadata) |
| `globals.css` | Global CSS styles (Tailwind directives) |
| `favicon.ico` | Site favicon |
| `not-found.tsx` | 404 error page |

---

### `src/components/` - React Components

Organized by purpose and domain.

#### `components/features/` - Feature Components

Domain-specific components:

```
features/
├── algorand/                 # Algorand blockchain UI
│   ├── account-info.tsx      # Account balance display
│   ├── transaction-list.tsx  # Transaction history
│   └── wallet-connect.tsx    # Wallet connection button
├── analytics/                # Charts & analytics
│   ├── price-chart.tsx       # Token price charts
│   └── portfolio-chart.tsx   # Portfolio value chart
├── chat/                     # AI agent chat
│   ├── chat-interface.tsx    # Main chat UI
│   ├── message-list.tsx      # Chat message list
│   └── input-area.tsx        # Chat input
├── crypto/                   # Crypto display
│   ├── coin-card.tsx         # Cryptocurrency card
│   └── market-stats.tsx      # Market statistics
├── rules/                    # Autopilot rules
│   ├── rule-builder-modal.tsx # Rule creation modal
│   ├── rule-card.tsx         # Individual rule display
│   └── rule-list.tsx         # Rules listing
├── trading/                  # Trading components
│   ├── swap-card.tsx         # Swap interface card
│   ├── pool-liquidity-chart.tsx # Pool liquidity visualization
│   └── trade-form.tsx        # Trading form
└── wallet/                   # Wallet management
    ├── wallet-button.tsx     # Connect wallet button
    ├── wallet-modal.tsx      # Wallet selection modal
    └── balance-display.tsx   # Wallet balance
```

#### `components/layout/` - Layout Components

```
layout/
├── header.tsx                # Site header/navigation
└── providers.tsx             # React Context providers wrapper
```

#### `components/pages/` - Page Components

```
pages/
└── home-page.tsx             # Landing page sections
```

#### `components/providers/` - Context Providers

```
providers/
└── txnlab-wallet-provider.tsx # Algorand wallet provider (Pera, Defly, MyAlgo)
```

#### `components/shared/` - Shared Utilities

```
shared/
├── animated-background.tsx   # Animated background effect
├── mode-toggle.tsx           # Dark/light mode toggle
├── redux-provider.tsx        # Redux store provider
├── route-display.tsx         # Current route breadcrumb
├── search-bar.tsx            # Global search bar
└── theme-provider.tsx        # Theme context provider
```

#### `components/ui/` - Base UI Components (Shadcn)

50+ base UI components from Shadcn UI:
- `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `select.tsx`
- `table.tsx`, `tabs.tsx`, `toast.tsx`, `dropdown-menu.tsx`
- Full list: accordion, alert, avatar, badge, calendar, carousel, chart, checkbox, collapsible, command, context-menu, drawer, form, hover-card, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, separator, sheet, sidebar, skeleton, slider, sonner, switch, textarea, toggle, tooltip

#### `components/web3/` - Web3 Components

```
web3/
└── Web3Providers.tsx         # Web3 context providers
```

---

### `src/features/` - Feature Business Logic

Redux-based feature slices (if using Redux):

```
features/
└── agent/                    # AI agent feature
    ├── api/                  # Agent API calls
    └── hooks/                # Agent React hooks
```

---

### `src/hooks/` - Custom React Hooks

```
hooks/
├── use-mobile.tsx            # Mobile device detection
├── use-mouse-position.ts     # Mouse position tracking
├── use-toast.ts              # Toast notification hook
├── use-tradeable-assets.ts   # Fetch tradeable assets
└── use-viewport.ts           # Viewport size hook
```

---

### `src/lib/` - Core Business Logic

Heart of the application - blockchain, DEX, database, and utility logic.

#### `lib/` Root Files

| File | Purpose |
|------|---------|
| `agent.ts` | AI agent configuration (LangChain) |
| `agent-wallet.ts` | Per-user agent wallet system |
| `algorand.ts` | Algorand SDK functions (transactions, queries) |
| `algorand-wallet.ts` | Wallet integration (Pera, Defly, MyAlgo) |
| `tokens.ts` | Token registry & metadata |
| `db.ts` | Database connection (Turso/LibSQL) |
| `utils.ts` | General utility functions |

#### `lib/amm/` - Automated Market Maker

```
amm/
├── config.ts                 # AMM configuration
└── routerClient.ts           # Multi-hop router client
```

#### `lib/assets/` - Asset Discovery

```
assets/
└── asset-discovery.ts        # Algorand asset discovery
```

#### `lib/config/` - Configuration

```
config/
└── contracts.ts              # Smart contract addresses & configs
```

#### `lib/contracts/` - Smart Contract Clients

```
contracts/
├── autopilot-types.ts        # AutoPilot contract types
├── autopilot-client.ts       # AutoPilot contract client
├── autopilot-helpers.ts      # AutoPilot utility functions
└── multihop-swap-client.ts   # Multihop swap router client
```

#### `lib/db/` - Database Layer

```
db/
├── index.ts                  # Database exports
└── sqlite.ts                 # SQLite/Turso operations
```

#### `lib/dex/` - DEX Integration

Multi-DEX aggregation system:

```
dex/
├── aggregator.ts             # Multi-DEX aggregator
├── tinyman-client.ts         # Tinyman V2 client
├── pact-client.ts            # Pact Finance client
└── types.ts                  # Shared DEX types
```

**DEX Client Pattern:**
- Each DEX has dedicated client (`TinymanV2Client`, `PactClient`)
- Clients implement: `fetchPools()`, `getQuote()`, `buildSwapTxn()`
- `MultiDexAggregator` combines all clients for best route selection

---

### `src/styles/` - Global Styles

```
styles/
└── globals.css               # Additional global styles (if separated)
```

---

## Smart Contracts (`Blockchain/`)

Python-based smart contracts using AlgoPy framework.

```
Blockchain/
├── projects/
│   └── 10x_Swap/
│       ├── smart_contracts/  # Contract source code
│       │   ├── autopilot_rule/
│       │   │   ├── contract.py           # AutoPilot rule contract
│       │   │   ├── deploy_config.py      # Deployment script
│       │   │   ├── fund_and_opt_in.py    # Funding script
│       │   │   └── opt_in_assets.py      # Asset opt-in
│       │   ├── multihop_swap/
│       │   │   ├── contract.py           # Main router contract
│       │   │   ├── tinyman_adapter.py    # Tinyman V2 adapter
│       │   │   ├── pact_adapter.py       # Pact Finance adapter
│       │   │   ├── deploy_router.py      # Deploy router
│       │   │   ├── deploy_tinyman_adapter.py
│       │   │   ├── deploy_pact_adapter.py
│       │   │   └── opt_in_adapter_assets.py
│       │   └── compile_all.sh            # Compile all contracts
│       ├── artifacts/        # Compiled contracts (copied to root)
│       ├── tests/            # Contract tests
│       ├── package.json      # Node dependencies
│       └── pyproject.toml    # Python dependencies
└── README.md                 # Blockchain setup guide
```

**Contract Architecture:**
1. **MultihopSwapRouter** - Routes swaps across DEXs
2. **TinymanPoolAdapter** - Adapter for Tinyman V2
3. **PactPoolAdapter** - Adapter for Pact Finance
4. **AutoPilotRuleContract** - Automated trading rules

---

## Documentation (`docs/`)

8 canonical documentation guides (1,500+ pages total):

| File | Purpose | Lines |
|------|---------|-------|
| `SYSTEM_OVERVIEW.md` | Architecture, components, data flows | ~800 |
| `DEVELOPER_GUIDE.md` | Setup, installation, testing | ~1,200 |
| `CONTRACTS_AND_DEPLOYMENT.md` | Smart contracts, deployment | ~900 |
| `LIQUIDITY_POOLS.md` | Pool adapters, DEX integration | ~1,100 |
| `AUTOPILOT_MODULE.md` | Automated trading rules | ~650 |
| `BACKEND_AND_AGENT_SPEC.md` | API endpoints, database | ~1,600 |
| `AI_AGENT_AND_MCP_NCP_SPEC.md` | AI agent, analytics | ~750 |
| `AGENT_WALLET_SYSTEM.md` | Per-user agent wallets | ~200 |

**Documentation Structure:**
- Each doc has Table of Contents
- Code examples with syntax highlighting
- Diagrams for complex flows
- Cross-references between docs

---

## Scripts (`scripts/`)

Development, testing, and deployment scripts.

### Testing Scripts

| Script | Purpose |
|--------|---------|
| `test-algorand.ts` | Test Algorand SDK functions |
| `test-simple-swap.ts` | Test basic token swap |
| `test-multi-dex-routing.ts` | Test multi-DEX routing |
| `test-price-oracle.ts` | Test price oracle aggregation |
| `test-database.ts` | Test database operations |
| `test-create-rule.ts` | Test autopilot rule creation |
| `test-agent-address.ts` | Test agent address retrieval |

### Deployment Scripts

| Script | Purpose |
|--------|---------|
| `deploy-autopilot-contract.ts` | Deploy AutoPilot contract |

### Utility Scripts

| Script | Purpose |
|--------|---------|
| `delete-rule.ts` | Delete autopilot rule |
| `reset-agent-wallets.ts` | Reset all agent wallets (dev only) |
| `trigger-poller.sh` | Manually trigger background poller |
| `quick-start-multi-dex.sh` | Quick start guide for multi-DEX |

**Running Scripts:**
```bash
npx tsx scripts/test-algorand.ts
# or
bun run scripts/test-simple-swap.ts
```

---

## Artifacts (`artifacts/`)

Compiled smart contract artifacts (TEAL + ABI).

```
artifacts/
├── autopilot_rule/
│   ├── AutoPilotRuleContract.approval.teal    # Approval program (TEAL)
│   ├── AutoPilotRuleContract.clear.teal       # Clear state program
│   ├── AutoPilotRuleContract.arc56.json       # ABI specification (ARC-56)
│   ├── AutoPilotRuleContract.approval.puya.map # Source map
│   ├── AutoPilotRuleContract.clear.puya.map
│   └── deployed_autopilot.json                # Deployment info
└── multihop_swap/
    ├── MultihopSwapRouter.approval.teal
    ├── MultihopSwapRouter.clear.teal
    ├── MultihopSwapRouter.arc56.json
    ├── TinymanPoolAdapter.approval.teal
    ├── TinymanPoolAdapter.clear.teal
    ├── TinymanPoolAdapter.arc56.json
    ├── PactPoolAdapter.approval.teal
    ├── PactPoolAdapter.clear.teal
    └── PactPoolAdapter.arc56.json
```

**File Types:**
- `.teal` - TEAL bytecode (Transaction Execution Approval Language)
- `.arc56.json` - ABI specification (Application Binary Interface)
- `.puya.map` - Source map for debugging

---

## Public Assets (`public/`)

Static files served directly by Next.js.

```
public/
├── 10xswap_logo.png          # 10xSwap logo
├── demo.png                  # Demo screenshot
├── placeholder-logo.png      # Placeholder images
├── placeholder-logo.svg
├── placeholder-user.jpg
├── placeholder.jpg
├── placeholder.svg
└── test-mcp.html             # MCP test page
```

**Usage:**
```tsx
<Image src="/10xswap_logo.png" alt="Logo" />
```

---

## Data (`data/`)

Runtime data storage (SQLite database, JSON logs).

```
data/
├── db.sqlite                 # SQLite database (Turso)
├── db.sqlite-wal             # Write-ahead log
├── db.sqlite-shm             # Shared memory
├── rules.json                # Autopilot rules (JSON backup)
└── logs.json                 # Execution logs (JSON backup)
```

**Database Tables:**
- `agent_wallets` - Per-user agent wallets (encrypted)
- `rules` - Autopilot trading rules
- `logs` - Execution audit trail

**Note:** Database is managed by Turso (cloud SQLite). Local file is for development only.

---

## File Naming Conventions

### TypeScript/React Files

- **Components:** `PascalCase.tsx` (e.g., `WalletButton.tsx`)
- **Hooks:** `use-kebab-case.ts` (e.g., `use-mobile.tsx`)
- **Utils:** `kebab-case.ts` (e.g., `algorand.ts`)
- **Types:** `kebab-case-types.ts` (e.g., `autopilot-types.ts`)

### Python Files

- **Contracts:** `snake_case.py` (e.g., `pact_adapter.py`)
- **Scripts:** `snake_case.py` (e.g., `deploy_router.py`)

### Documentation

- **Docs:** `SCREAMING_SNAKE_CASE.md` (e.g., `DEVELOPER_GUIDE.md`)
- **README:** `README.md` (standard)

---

## Import Paths

### Absolute Imports (via `tsconfig.json`)

```typescript
import { getAlgodClient } from '@/lib/algorand'
import { Button } from '@/components/ui/button'
import { WalletButton } from '@/components/features/wallet/wallet-button'
```

**Path Aliases:**
- `@/` → `src/`
- `@/components` → `src/components/`
- `@/lib` → `src/lib/`
- `@/app` → `src/app/`

---

## Environment Variables

### Development (`.env`)

```env
# Algorand
NEXT_PUBLIC_ALGORAND_NETWORK=testnet
ALGOD_SERVER=https://testnet-api.algonode.cloud
INDEXER_SERVER=https://testnet-idx.algonode.cloud

# Deployer Wallet
DEPLOYER_MNEMONIC="word1 word2 ... word25"

# AI
OPENROUTER_API_KEY=sk-or-v1-...
OPENAI_API_KEY=sk-...

# Market Data
COINRANKING_API_KEY=...

# Database
DATABASE_URL=file:./data/db.sqlite
```

**Security:**
- Never commit `.env` to git
- Use `.env.example` as template
- Rotate keys regularly

---

## Build Output

### Development

```bash
npm run dev
# Next.js dev server: http://localhost:3000
```

### Production Build

```bash
npm run build
# Output: .next/ directory
```

**Build Artifacts:**
- `.next/` - Next.js build output (ignored in git)
- `dist/` - TypeScript compiled output (if applicable)
- `node_modules/` - Dependencies (ignored in git)

---

## Git Ignored Files

From `.gitignore`:

- `node_modules/` - Dependencies
- `.next/` - Next.js build
- `dist/` - Compiled output
- `.env` - Environment variables
- `*.log` - Log files
- `.DS_Store` - macOS metadata
- `*.swp`, `*.swo` - Editor temp files

---

## Summary

**Key Directories:**
- `src/` - All application code
- `Blockchain/` - Smart contract source
- `docs/` - Documentation (8 guides)
- `scripts/` - Testing & deployment
- `artifacts/` - Compiled contracts
- `data/` - Runtime database

**Key Patterns:**
- **App Router:** Route groups for organization
- **API Routes:** Serverless functions in `src/app/api/`
- **Components:** Feature-based organization
- **Smart Contracts:** Python/AlgoPy → TEAL compilation
- **Documentation:** 8 canonical guides (no duplicates)

**Next Steps:**
- See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for setup
- See [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) for architecture
- See [CONTRACTS_AND_DEPLOYMENT.md](./CONTRACTS_AND_DEPLOYMENT.md) for smart contracts

---

**Last Updated:** November 14, 2025  
**Version:** 1.0.0  
**Total Files:** ~500+ source files  
**Documentation:** 8 canonical guides

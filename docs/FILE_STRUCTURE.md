# 📁 File Structure Documentation

## Overview

This document provides a comprehensive guide to the file structure of the **10xSwap Algorand Prototype** project. This is a Next.js 15+ application with TypeScript, featuring AI-powered cryptocurrency trading, Algorand blockchain integration, and a modern UI built with Shadcn UI.

## Table of Contents

- [Project Root](#project-root)
- [Source Directory (src/)](#source-directory-src)
  - [App Directory (src/app/)](#app-directory-srcapp)
  - [Components (src/components/)](#components-srccomponents)
  - [Features (src/features/)](#features-srcfeatures)
  - [Hooks (src/hooks/)](#hooks-srchooks)
  - [Library (src/lib/)](#library-srclib)
  - [Styles (src/styles/)](#styles-srcstyles)
- [Configuration Files](#configuration-files)
- [Supporting Directories](#supporting-directories)

---

## Project Root

```
Algorand_prototype-v0.0.1/
├── src/                      # Main source code directory
├── public/                   # Static assets (images, fonts, etc.)
├── scripts/                  # Utility scripts for testing and development
├── data/                     # Runtime data (database, logs, rules)
├── Blockchain/               # Smart contract projects
├── docs/                     # Documentation files
├── config/                   # Configuration files
├── node_modules/             # npm dependencies (generated)
├── .next/                    # Next.js build output (generated)
├── dist/                     # Compiled output (generated)
├── package.json              # Project dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── next.config.mjs           # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
└── README.md                 # Project overview and setup guide
```

### Key Root Files

| File | Purpose |
|------|---------|
| `package.json` | Defines project dependencies, scripts, and metadata |
| `tsconfig.json` | TypeScript compiler configuration with path aliases (`@/*` → `src/*`) |
| `next.config.mjs` | Next.js framework configuration (experimental features, webpack, etc.) |
| `tailwind.config.ts` | Tailwind CSS theme configuration (colors, fonts, animations) |
| `postcss.config.mjs` | PostCSS configuration for Tailwind processing |
| `components.json` | Shadcn UI component configuration |
| `vercel.json` | Vercel deployment configuration |
| `.env` | Environment variables (API keys, database URLs) |
| `.gitignore` | Git ignore patterns |

---

## Source Directory (src/)

The `src/` directory contains all application source code, organized by function and domain.

```
src/
├── app/              # Next.js App Router - pages and API routes
├── components/       # React components organized by purpose
├── features/         # Feature-specific business logic
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and core logic
└── styles/           # Global styles
```

---

## App Directory (src/app/)

The `app/` directory uses **Next.js 13+ App Router** with Route Groups for logical organization.

### Structure

```
src/app/
├── (marketing)/              # Public-facing pages (route group - no URL prefix)
│   └── page.tsx              # Home/Landing page (/)
│
├── (dashboard)/              # Protected dashboard pages (route group - no URL prefix)
│   ├── agent/
│   │   └── page.tsx          # AI Agent Dashboard (/agent)
│   ├── wallet/
│   │   ├── page.tsx          # Wallet Management (/wallet)
│   │   └── demo/
│   │       └── page.tsx      # Wallet Demo (/wallet/demo)
│   └── swap-demo/
│       └── page.tsx          # Token Swap Demo (/swap-demo)
│
├── algorand/
│   └── page.tsx              # Algorand Info Page (/algorand)
│
├── cryptocurrencies/
│   └── page.tsx              # Crypto List Page (/cryptocurrencies)
│
├── exchanges/
│   └── page.tsx              # Exchange List Page (/exchanges)
│
├── api/                      # API Routes (serverless functions)
│   ├── agent/                # AI Agent API endpoints
│   ├── algorand/             # Algorand blockchain operations
│   ├── analytics/            # Analytics data endpoints
│   ├── db/                   # Database operations
│   ├── logs/                 # Log management
│   ├── poller/               # Polling service endpoints
│   ├── price/                # Price data endpoints
│   └── rules/                # Trading rules management
│
├── services/                 # Redux store and services
│   └── store.ts              # Redux store configuration
│
├── layout.tsx                # Root layout (wraps all pages)
├── page.tsx                  # Main entry point (redirects to home)
├── not-found.tsx             # Custom 404 page
├── globals.css               # Global CSS styles
├── index.js                  # Index exports
└── favicon.ico               # Site favicon
```

### Route Groups

**What are Route Groups?**
Folders wrapped in parentheses `(folder-name)` are route groups. They organize routes without affecting the URL structure.

- `(marketing)/page.tsx` → URL: `/` (home page)
- `(dashboard)/agent/page.tsx` → URL: `/agent` (not `/dashboard/agent`)

**Benefits:**
- Logical organization without URL clutter
- Separate layouts per group
- Better code organization

### API Routes

Each API route is a serverless function that handles HTTP requests:

| Endpoint | Purpose |
|----------|---------|
| `/api/agent` | AI agent chat and command processing |
| `/api/algorand` | Algorand wallet operations, transactions |
| `/api/analytics` | Market analytics and statistics |
| `/api/db` | Database CRUD operations |
| `/api/logs` | System logging and retrieval |
| `/api/poller` | Background polling service control |
| `/api/price` | Real-time price data fetching |
| `/api/rules` | Trading rule CRUD operations |

---

## Components (src/components/)

Components are organized by **purpose and domain**, making it easy to find and maintain code.

### Structure

```
src/components/
├── features/         # Feature-specific components (domain-driven)
│   ├── algorand/     # Algorand blockchain components
│   ├── wallet/       # Wallet management components
│   ├── crypto/       # Cryptocurrency display components
│   ├── exchange/     # Exchange-related components
│   ├── analytics/    # Analytics and charts
│   ├── chat/         # Chat interface components
│   └── rules/        # Trading rules components
│
├── layout/           # Layout components (header, footer, providers)
├── pages/            # Page-level components (home, landing)
├── shared/           # Shared/utility components (animations, theme toggle)
├── providers/        # React Context providers
├── ui/               # Base UI components (Shadcn UI library)
└── web3/             # Web3-specific components
```

### Features Directory Detail

#### `features/algorand/`
Algorand blockchain-specific components:
- `algorand-info.tsx` - Display Algorand network information
- `algorand-wallet-connect.tsx` - Wallet connection UI
- `transaction-signer.tsx` - Transaction signing interface
- `txnlab-algorand-wallet-connect.tsx` - TxnLab wallet integration

#### `features/wallet/`
Wallet management components:
- `wallet-info.tsx` - Display wallet details (balance, address)
- `wallet-status.tsx` - Connection status indicator
- `swap-interface.tsx` - Token swap UI

#### `features/crypto/`
Cryptocurrency data display:
- `crypto-detail.tsx` - Individual crypto details
- `cryptocurrencies-list.tsx` - List of all cryptocurrencies
- `top-cryptocurrencies.tsx` - Top performing cryptos
- `mini-crypto-table.tsx` - Compact crypto table
- `coin-overview-pane.tsx` - Detailed coin overview

#### `features/exchange/`
Exchange platform components:
- `exchange-detail.tsx` - Exchange platform details
- `exchanges-list.tsx` - List of exchanges

#### `features/analytics/`
Analytics and market data:
- `side-analytics.tsx` - Sidebar analytics panel
- `market-overview.tsx` - Market overview dashboard

#### `features/chat/`
AI chat interface:
- `chat-bubble.tsx` - Floating chat bubble
- `guidelines-bubble.tsx` - Help/guidelines display

#### `features/rules/`
Trading rules management:
- `rule-builder-modal.tsx` - Create/edit trading rules

### Layout Directory

Core layout components used across the app:
- `header.tsx` - Site header with navigation
- `footer.tsx` - Site footer
- `providers.tsx` - Global providers wrapper

### Pages Directory

High-level page components:
- `home-page.tsx` - Home page content
- `landing-page.tsx` - Landing page content

### Shared Directory

Reusable utility components:
- `animated-background.tsx` - Animated background effects
- `mode-toggle.tsx` - Dark/light theme toggle
- `redux-provider.tsx` - Redux store provider
- `route-display.tsx` - Route visualization
- `theme-provider.tsx` - Theme context provider
- `background2/` - Additional background components

### Providers Directory

React Context providers:
- `txnlab-wallet-provider.tsx` - TxnLab wallet provider wrapper

### UI Directory

**Shadcn UI Component Library** (48 components)

Base UI components built on Radix UI primitives:

| Component | Purpose |
|-----------|---------|
| `button.tsx` | Button variants |
| `input.tsx` | Text input field |
| `dialog.tsx` | Modal dialogs |
| `card.tsx` | Card container |
| `table.tsx` | Data tables |
| `form.tsx` | Form components |
| `select.tsx` | Dropdown select |
| `toast.tsx` | Notification toasts |
| `tabs.tsx` | Tab navigation |
| `accordion.tsx` | Collapsible sections |
| `avatar.tsx` | User avatars |
| `badge.tsx` | Status badges |
| `calendar.tsx` | Date picker |
| `chart.tsx` | Chart components |
| `checkbox.tsx` | Checkbox input |
| `command.tsx` | Command palette |
| `dropdown-menu.tsx` | Context menus |
| `label.tsx` | Form labels |
| `popover.tsx` | Popover tooltips |
| `progress.tsx` | Progress bars |
| `radio-group.tsx` | Radio buttons |
| `scroll-area.tsx` | Custom scrollbars |
| `separator.tsx` | Visual separators |
| `slider.tsx` | Range sliders |
| `switch.tsx` | Toggle switches |
| `textarea.tsx` | Multi-line text input |
| `tooltip.tsx` | Hover tooltips |
| ...and more |

### Web3 Directory

Web3/Blockchain components:
- `Web3Providers.tsx` - Web3 provider setup

---

## Features (src/features/)

Business logic and state management for features.

```
src/features/
└── agent/            # AI Agent feature logic
    ├── agentSlice.ts # Redux slice for agent state
    └── types.ts      # TypeScript types
```

**Purpose:** Separates business logic from UI components. Can include:
- Redux slices
- State management
- API service functions
- Feature-specific utilities

---

## Hooks (src/hooks/)

Custom React hooks for reusable logic.

```
src/hooks/
├── use-mobile.tsx        # Detect mobile viewport
├── use-mouse-position.ts # Track mouse position
├── use-toast.ts          # Toast notification hook
└── use-viewport.ts       # Viewport dimensions
```

**Usage Example:**
```typescript
import { useMobile } from '@/hooks/use-mobile'

function MyComponent() {
  const isMobile = useMobile()
  return <div>{isMobile ? 'Mobile' : 'Desktop'}</div>
}
```

---

## Library (src/lib/)

Core utility functions, configurations, and business logic.

### Structure

```
src/lib/
├── amm/                      # Automated Market Maker logic
├── db/                       # Database utilities
├── mcp/                      # Model Context Protocol
├── server/                   # Server-side utilities
├── shared/                   # Shared utilities
├── tools/                    # Agent tools
│
├── agent.ts                  # AI agent configuration
├── algorand-wallet.ts        # Algorand wallet functions
├── algorand.ts               # Algorand SDK utilities
├── db.ts                     # Database connection
├── errors.ts                 # Error handling
├── log.ts                    # Logging utilities
├── poller.ts                 # Polling service
├── tokens.ts                 # Token definitions
├── txnlab-wallet-config.ts   # TxnLab wallet config
├── utils.ts                  # General utilities
│
└── Swap implementations:
    ├── simple-swap.ts        # Basic swap logic
    ├── simple-real-swap.ts   # Real swap implementation
    └── pact-real-swap.ts     # Pact protocol swap
```

### Key Files

| File | Purpose |
|------|---------|
| `agent.ts` | LangChain AI agent configuration, tools, and graph |
| `algorand.ts` | Algorand SDK wrapper functions (transactions, queries) |
| `algorand-wallet.ts` | Wallet connection and management |
| `db.ts` | Database connection (Turso/libSQL) |
| `log.ts` | Structured logging system |
| `tokens.ts` | Token metadata and definitions |
| `utils.ts` | General utility functions (cn, formatters, etc.) |
| `simple-swap.ts` | Token swap logic |
| `poller.ts` | Background polling service for price updates |

### Subdirectories

#### `amm/`
Automated Market Maker (DEX) integration logic

#### `db/`
Database schema, migrations, and queries

#### `mcp/`
Model Context Protocol for AI agent communication

#### `server/`
Server-side utilities and configurations

#### `shared/`
Shared utilities used across client and server

#### `tools/`
AI agent tools (balance checking, price fetching, swap execution)

---

## Styles (src/styles/)

Global styles and CSS configuration.

```
src/styles/
└── globals.css       # Global CSS (Tailwind directives, custom styles)
```

**Note:** Most styling is done via Tailwind utility classes in components.

---

## Configuration Files

### TypeScript Configuration

#### `tsconfig.json`
Main TypeScript configuration:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]    // Path alias for clean imports
    }
    // ... other options
  }
}
```

**Path Aliases:**
- `@/components/...` → `src/components/...`
- `@/lib/...` → `src/lib/...`
- `@/hooks/...` → `src/hooks/...`

#### `tsconfig.poller.json`
Separate config for the poller service (Node.js environment)

### Next.js Configuration

#### `next.config.mjs`
Next.js framework settings:
- Webpack configuration
- Experimental features
- Environment variables
- Image optimization
- Redirects and rewrites

### Styling Configuration

#### `tailwind.config.ts`
Tailwind CSS customization:
- Custom colors (theme)
- Typography
- Spacing
- Animations
- Dark mode support

#### `postcss.config.mjs`
PostCSS plugins for CSS processing

### Component Library

#### `components.json`
Shadcn UI configuration:
- Component installation path
- Style preferences
- Alias configuration

### Deployment

#### `vercel.json`
Vercel deployment settings:
- Build configuration
- Environment variables
- Routing rules

---

## Supporting Directories

### Public Directory (`public/`)

Static assets served directly:
```
public/
├── images/           # Image assets
├── fonts/            # Custom fonts
└── icons/            # Icons and favicons
```

**Access:** Files in `public/` are served from the root URL.
- `public/logo.png` → `/logo.png`

### Scripts Directory (`scripts/`)

Development and testing scripts:

```
scripts/
├── test-algorand.ts          # Test Algorand integration
├── test-simple-swap.ts       # Test swap functionality
├── test-agent-address.ts     # Test agent address
├── test-real-swap.ts         # Test real swap
├── test-pact-simple.ts       # Test Pact protocol
├── debug-account.ts          # Debug account issues
├── dev-cron.js               # Development cron jobs
├── run-poller.js             # Run polling service
├── smoke-test.js             # Smoke tests
├── env_check.js              # Validate environment variables
├── check-factory.mjs         # Check factory contract
└── ...more debug/test scripts
```

**Run scripts via:**
```bash
npm run test:algorand      # Run Algorand tests
npm run test:swap          # Run swap tests
npm run test:agent         # Run agent tests
```

### Data Directory (`data/`)

Runtime data (not committed to git):

```
data/
├── db.sqlite             # SQLite database
├── db.sqlite-wal         # Write-ahead log
├── logs.json             # Application logs
└── rules.json            # Trading rules
```

**⚠️ Important:** Add `data/.gitignore` to exclude database files from version control.

### Blockchain Directory (`Blockchain/`)

Smart contract projects:

```
Blockchain/
├── projects/
│   └── Blockchain/
│       └── smart_contracts/    # Algorand smart contracts
└── README.md
```

### Docs Directory (`docs/`)

Documentation files:

```
docs/
├── SYSTEM_ARCHITECTURE.md     # System design overview
├── BACKEND_ARCHITECTURE.md    # Backend architecture details
└── FILE_STRUCTURE.md          # This file!
```

### Config Directory (`config/`)

Additional configuration files:

```
config/
├── tailwind.config.ts         # Tailwind config (duplicate?)
├── tsconfig.json              # TypeScript config (duplicate?)
└── tsconfig.poller.json       # Poller TypeScript config
```

**Note:** Consider consolidating with root configs.

---

## Import Patterns

### Using Path Aliases

The project uses TypeScript path aliases for clean imports:

```typescript
// ❌ Bad: Relative imports
import { Button } from '../../../components/ui/button'
import { useWallet } from '../../hooks/use-wallet'

// ✅ Good: Absolute imports with aliases
import { Button } from '@/components/ui/button'
import { useWallet } from '@/hooks/use-wallet'
```

### Common Import Examples

```typescript
// UI Components
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// Feature Components
import { WalletInfo } from '@/components/features/wallet/wallet-info'
import { AlgorandWalletConnect } from '@/components/features/algorand/algorand-wallet-connect'

// Layout Components
import { Header } from '@/components/layout/header'

// Hooks
import { useMobile } from '@/hooks/use-mobile'
import { useToast } from '@/hooks/use-toast'

// Utilities
import { cn } from '@/lib/utils'
import { connectAlgorandWallet } from '@/lib/algorand-wallet'

// Types
import type { Agent } from '@/features/agent/types'
```

---

## Navigation Map

### Page URLs

| URL | File Path | Description |
|-----|-----------|-------------|
| `/` | `src/app/(marketing)/page.tsx` | Home page |
| `/agent` | `src/app/(dashboard)/agent/page.tsx` | AI Agent Dashboard |
| `/wallet` | `src/app/(dashboard)/wallet/page.tsx` | Wallet Management |
| `/wallet/demo` | `src/app/(dashboard)/wallet/demo/page.tsx` | Wallet Demo |
| `/swap-demo` | `src/app/(dashboard)/swap-demo/page.tsx` | Swap Demo |
| `/algorand` | `src/app/algorand/page.tsx` | Algorand Info |
| `/cryptocurrencies` | `src/app/cryptocurrencies/page.tsx` | Crypto List |
| `/exchanges` | `src/app/exchanges/page.tsx` | Exchange List |

### API Endpoints

| Endpoint | File Path | Method | Description |
|----------|-----------|--------|-------------|
| `/api/agent` | `src/app/api/agent/` | POST | AI agent chat |
| `/api/algorand/connect` | `src/app/api/algorand/` | POST | Connect wallet |
| `/api/algorand/balance` | `src/app/api/algorand/` | GET | Get balance |
| `/api/analytics` | `src/app/api/analytics/` | GET | Get analytics |
| `/api/price` | `src/app/api/price/` | GET | Get token prices |
| `/api/rules` | `src/app/api/rules/` | GET/POST | Manage rules |

---

## Development Workflow

### Adding a New Feature

1. **Create Feature Components**
   - Add to `src/components/features/[feature-name]/`
   - Example: `src/components/features/staking/staking-dashboard.tsx`

2. **Add Business Logic**
   - Create Redux slice in `src/features/[feature-name]/`
   - Add utilities to `src/lib/`

3. **Create Page Route**
   - Add page to `src/app/[route-name]/page.tsx`
   - Or add to dashboard: `src/app/(dashboard)/[route-name]/page.tsx`

4. **Add API Endpoints** (if needed)
   - Create `src/app/api/[feature-name]/route.ts`

5. **Update Navigation**
   - Add link in `src/components/layout/header.tsx`

### Adding a New Component

1. **Determine Component Type**
   - UI Component → `src/components/ui/`
   - Feature Component → `src/components/features/[domain]/`
   - Layout Component → `src/components/layout/`
   - Shared Utility → `src/components/shared/`

2. **Create Component File**
   ```typescript
   // src/components/features/wallet/wallet-balance.tsx
   export function WalletBalance() {
     return <div>...</div>
   }
   ```

3. **Import and Use**
   ```typescript
   import { WalletBalance } from '@/components/features/wallet/wallet-balance'
   ```

### Adding a New API Route

1. **Create Route Handler**
   ```typescript
   // src/app/api/balance/route.ts
   export async function GET(request: Request) {
     return Response.json({ balance: 1000 })
   }
   ```

2. **Access Endpoint**
   - URL: `https://yourdomain.com/api/balance`
   - From client: `fetch('/api/balance')`

---

## Best Practices

### File Naming

- **Components:** PascalCase with descriptive names
  - `WalletInfo.tsx`, `AlgorandWalletConnect.tsx`
  
- **Utilities:** kebab-case
  - `algorand-wallet.ts`, `use-mobile.tsx`
  
- **API Routes:** `route.ts` (Next.js convention)
  
- **Pages:** `page.tsx` (Next.js convention)

### Component Organization

✅ **Do:**
- Group related components by domain/feature
- Keep components small and focused
- Use barrel exports (index.ts) for cleaner imports
- Separate business logic from UI

❌ **Don't:**
- Mix unrelated components in the same folder
- Create deeply nested folder structures (max 3 levels)
- Put everything in one file

### Import Organization

Order imports logically:
```typescript
// 1. External libraries
import React from 'react'
import { useWallet } from '@txnlab/use-wallet-react'

// 2. UI components
import { Button } from '@/components/ui/button'

// 3. Feature components
import { WalletInfo } from '@/components/features/wallet/wallet-info'

// 4. Utilities
import { cn } from '@/lib/utils'

// 5. Types
import type { Transaction } from '@/types'

// 6. Styles (if any)
import styles from './styles.module.css'
```

---

## Troubleshooting

### Common Issues

**Import errors after restructuring:**
- Clear Next.js cache: `rm -rf .next`
- Reload VS Code window: Cmd+Shift+P → "Reload Window"

**Path alias not working:**
- Check `tsconfig.json` paths configuration
- Verify `baseUrl` is set to `"."`
- Restart TypeScript server in VS Code

**Component not found:**
- Verify file path matches import statement
- Check for typos in component/file names
- Ensure proper exports (`export function Component()`)

---

## Summary

This file structure follows **Next.js 13+ best practices** with:

✅ **App Router** for modern routing
✅ **Route Groups** for logical organization
✅ **Domain-driven component structure** for scalability
✅ **Path aliases** for clean imports
✅ **Separation of concerns** (UI, logic, API)
✅ **Type safety** with TypeScript
✅ **Modular architecture** for maintainability

The structure supports:
- Easy navigation and discovery
- Scalable growth (add features without restructuring)
- Clear separation of client/server code
- Efficient development workflow
- Team collaboration

---

## Quick Reference

### Project Structure at a Glance

```
Algorand_prototype-v0.0.1/
│
├── src/
│   ├── app/                  # Routes & API (Next.js App Router)
│   │   ├── (marketing)/      # Public pages
│   │   ├── (dashboard)/      # Protected pages
│   │   └── api/              # API endpoints
│   │
│   ├── components/           # React Components
│   │   ├── features/         # Domain-specific (algorand, wallet, crypto)
│   │   ├── layout/           # Layout components
│   │   ├── ui/               # Base UI library (Shadcn)
│   │   └── shared/           # Shared utilities
│   │
│   ├── lib/                  # Core logic & utilities
│   ├── hooks/                # Custom React hooks
│   ├── features/             # Business logic & state
│   └── styles/               # Global styles
│
├── public/                   # Static assets
├── scripts/                  # Development scripts
├── docs/                     # Documentation
└── data/                     # Runtime data (logs, db)
```

---

**Last Updated:** October 21, 2025
**Version:** 1.0.0
**Maintainer:** 10xSwap Team

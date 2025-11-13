# 10xSwap Developer Guide

**Complete setup, installation, testing, and troubleshooting guide for 10xSwap development.**

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Setup](#environment-setup)
4. [Running the Application](#running-the-application)
5. [Testing](#testing)
6. [Development Workflow](#development-workflow)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js** v18 or later ([Download](https://nodejs.org/))
- **Bun** (optional, faster than npm) ([Install](https://bun.sh/))
- **Git** for version control

### Required Accounts & API Keys

You'll need to create accounts and obtain API keys from:

1. **Algorand Wallet** - For blockchain operations
2. **WalletConnect** - For wallet integration
3. **OpenRouter or OpenAI** - For AI features (optional)
4. **CoinRanking** - For market data (optional)
5. **Turso** - For database (optional for local development)

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ansu555/Algorand_prototype-v0.0.1.git
cd Algorand_prototype-v0.0.1
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using Bun (faster):
```bash
bun install
```

### 3. Verify Installation

```bash
npm run dev
# or
bun run dev
```

If successful, you'll see:
```
▲ Next.js 15.x.x
- Local: http://localhost:3000
```

---

## Environment Setup

### Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your credentials** (see sections below)

3. **Start the app:**
   ```bash
   npm run dev
   ```

### Required Environment Variables

#### 1. Algorand Network Configuration

```env
# Network Selection (testnet or mainnet)
NEXT_PUBLIC_ALGORAND_NETWORK="testnet"

# Algorand Node Endpoints
ALGOD_SERVER="https://testnet-api.algonode.cloud"
ALGOD_TOKEN=""
INDEXER_SERVER="https://testnet-idx.algonode.cloud"

# Deployer Wallet (25-word mnemonic phrase)
DEPLOYER_MNEMONIC="word1 word2 word3 ... word25"

# Agent Wallet Encryption Key (32-byte key for AES-256-GCM)
AGENT_WALLET_ENCRYPTION_KEY="your-32-byte-encryption-key-here"
```

**How to get a testnet wallet:**

1. Go to [Algorand Testnet Dispenser](https://testnet.algoexplorer.io/dispenser)
2. Create a new wallet or use existing one
3. Get free testnet ALGO from the dispenser
4. Copy your 25-word mnemonic phrase
5. Paste it into `DEPLOYER_MNEMONIC` in `.env`

**Generate encryption key for agent wallets:**

```bash
# macOS/Linux
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated key and paste into `AGENT_WALLET_ENCRYPTION_KEY` in `.env`.

⚠️ **Security Warning:**
- NEVER commit your real mnemonic to git
- NEVER use mainnet keys in `.env` files
- Use testnet keys for development only
- Generate a unique encryption key for each environment
- Rotate encryption keys periodically in production

#### 2. Smart Contract Configuration

```env
# AutoPilot Contract App ID (deploy first)
NEXT_PUBLIC_AUTOPILOT_CONTRACT_APP_ID=your_app_id_here
```

**Deploy the AutoPilot contract:**

```bash
cd Blockchain/projects/10x_Swap
npm install
npm run deploy:testnet
```

After deployment, copy the App ID from the output and paste into the environment variable above.

#### 3. WalletConnect Project ID

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_project_id_here"
```

**Get your Project ID:**

1. Sign up at [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy the Project ID
4. Paste into the environment variable

#### 4. AI Provider (Optional)

Choose one provider:

**Option A: OpenRouter** (Recommended)
```env
OPENROUTER_API_KEY="sk-or-v1-..."
AI_PROVIDER="openrouter"
```

Get API key: [OpenRouter Keys](https://openrouter.ai/keys)

**Option B: OpenAI**
```env
OPENAI_API_KEY="sk-..."
AI_PROVIDER="openai"
```

Get API key: [OpenAI API Keys](https://platform.openai.com/api-keys)

#### 5. Market Data (Optional)

```env
# CoinRanking API for crypto market data
COINRANKING_API_KEY="your_coinranking_key"

# CoinGecko API (alternative/additional source)
NEXT_PUBLIC_COINGECKO_API_KEY="your_coingecko_key"
```

**Get CoinRanking API key:**
1. Sign up at [CoinRanking](https://developers.coinranking.com/api)
2. Free tier works fine for development
3. Copy your API key

**Note:** Free tier has rate limits. Upgrade if needed.

#### 6. Database (Optional for Local Development)

```env
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your_token_here"
```

**Set up Turso database:**

1. Sign up at [Turso](https://turso.tech/)
2. Create a new database:
   ```bash
   turso db create algorand-app
   ```
3. Get your database URL:
   ```bash
   turso db show algorand-app --url
   ```
4. Create an auth token:
   ```bash
   turso db tokens create algorand-app
   ```
5. Paste both into `.env`

**Initialize database:**
```bash
npm run db:migrate
```

#### 7. Security Secrets

Generate random secrets for CRON and migration protection:

```bash
# macOS/Linux
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```env
CRON_SECRET="your_generated_secret_here"
NEXT_PUBLIC_CRON_SECRET="your_generated_secret_here"
MIGRATE_SECRET="your_other_generated_secret_here"
```

#### 8. MCP Analytics Server (Optional)

If you're running the Model Context Protocol analytics server:

```env
MCP_ANALYTICS_URL="http://localhost:8080"
MCP_BASE_URL="http://localhost:8080"
MCP_ANALYTICS_API_KEY="your_mcp_key_here"
MCP_PORT=8080
```

To start the MCP server:
```bash
npm run mcp:server
```

### Complete .env Template

```env
# Algorand Network
NEXT_PUBLIC_ALGORAND_NETWORK="testnet"
ALGOD_SERVER="https://testnet-api.algonode.cloud"
ALGOD_TOKEN=""
INDEXER_SERVER="https://testnet-idx.algonode.cloud"
DEPLOYER_MNEMONIC="your 25-word mnemonic phrase"

# Agent Wallet Encryption
AGENT_WALLET_ENCRYPTION_KEY="your-32-byte-encryption-key-here"

# Smart Contracts
NEXT_PUBLIC_AUTOPILOT_CONTRACT_APP_ID=""

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=""

# AI Provider (choose one)
OPENROUTER_API_KEY=""
# OPENAI_API_KEY=""
AI_PROVIDER="openrouter"

# Market Data (optional)
COINRANKING_API_KEY=""
NEXT_PUBLIC_COINGECKO_API_KEY=""

# Database (optional)
TURSO_DATABASE_URL=""
TURSO_AUTH_TOKEN=""

# Security
CRON_SECRET=""
NEXT_PUBLIC_CRON_SECRET=""
MIGRATE_SECRET=""

# MCP Server (optional)
MCP_ANALYTICS_URL="http://localhost:8080"
MCP_BASE_URL="http://localhost:8080"
MCP_ANALYTICS_API_KEY=""
MCP_PORT=8080
```

---

## Running the Application

### Development Server

```bash
npm run dev
# or
bun run dev
```

The application will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

### Run Production Build Locally

```bash
npm run start
```

### Lint Code

```bash
npm run lint
```

---

## Testing

### Available Test Scripts

| Command | Purpose | File Location |
|---------|---------|---------------|
| `npm run test:algorand` | Test Algorand integration | `scripts/test-algorand.ts` |
| `npm run test:swap` | Test swap functionality | `scripts/test-simple-swap.ts` |
| `npm run test:agent` | Test agent address | `scripts/test-agent-address.ts` |
| `npx tsx scripts/test-multi-dex-routing.ts` | Test multi-DEX routing | `scripts/test-multi-dex-routing.ts` |
| `npx tsx scripts/test-price-oracle.ts` | Test price oracle | `scripts/test-price-oracle.ts` |
| `npx tsx scripts/test-database.ts` | Test database operations | `scripts/test-database.ts` |

### Running Tests

#### Test Algorand Integration
```bash
npm run test:algorand
```

**Expected Output:**
```
✅ Algorand client initialized
✅ Connected to testnet
✅ Account balance: 123.456 ALGO
```

#### Test Swap Functionality
```bash
npm run test:swap
```

**Expected Output:**
```
✅ Pool found: ALGO/USDC
✅ Quote received: 1.234 ALGO → 2.468 USDC
✅ Swap transaction prepared
```

#### Test Multi-DEX Routing
```bash
npx tsx scripts/test-multi-dex-routing.ts
```

**Expected Output:**
```
🔍 Finding best swap route...
📊 Quotes from all DEXs:
   TINYMAN: Amount Out: 135859, Impact: 30.24%
   PACT: No pool found
✅ SELECTED: TINYMAN
   Reason: Only available DEX
```

#### Test Price Oracle
```bash
npx tsx scripts/test-price-oracle.ts
```

**Expected Output:**
```
✅ Price sources:
   Tinyman: $0.145
   CoinGecko: $0.147
   Weighted Average: $0.146
```

### Manual Testing Checklist

- [ ] Connect wallet (Pera/Defly)
- [ ] Check portfolio balance
- [ ] Get price quote for swap
- [ ] Execute small test swap
- [ ] Verify transaction on explorer
- [ ] Create autopilot rule
- [ ] Trigger manual poller
- [ ] Check execution logs

---

## Development Workflow

### Project Structure

```
10xSwap/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (marketing)/      # Public pages
│   │   ├── (dashboard)/      # Protected pages
│   │   └── api/              # API routes
│   ├── components/           # React components
│   ├── lib/                  # Core business logic
│   ├── hooks/                # Custom React hooks
│   └── features/             # Feature modules
├── scripts/                  # Development scripts
├── docs/                     # Documentation
├── artifacts/                # Compiled smart contracts
├── Blockchain/               # Smart contract source
└── data/                     # Runtime data (logs, db)
```

### Adding a New Feature

1. **Create feature folder** in `src/features/`
2. **Add components** in `src/components/features/`
3. **Add API routes** in `src/app/api/`
4. **Add types** in `src/lib/types.ts`
5. **Add tests** in `scripts/test-*.ts`
6. **Update documentation**

### Code Style Guidelines

- Use **TypeScript** for all new files
- Follow **ESLint** rules (`npm run lint`)
- Use **Shadcn UI** components for consistency
- Keep functions **small and focused**
- Add **JSDoc comments** for public APIs
- Use **meaningful variable names**

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add my feature"

# Push to GitHub
git push origin feature/my-feature

# Create Pull Request on GitHub
```

---

## Deployment

### Deploy to Vercel (Recommended)

1. **Connect GitHub repository** to Vercel
2. **Configure environment variables**:
   - Go to Project Settings → Environment Variables
   - Add ALL variables from your `.env` file
   - Use production values (not development)
3. **Deploy:**
   - Push to `main` branch
   - Vercel auto-deploys

### Production Environment Variables

⚠️ **Important changes for production:**

- Change `NEXT_PUBLIC_ALGORAND_NETWORK="mainnet"` (if deploying to mainnet)
- Use mainnet contract App IDs
- Use production database
- Rotate all security secrets
- Use production API keys (not free tiers)

### Deploy Smart Contracts to Mainnet

```bash
cd Blockchain/projects/10x_Swap

# Deploy to mainnet (use with caution)
npm run deploy:mainnet
```

⚠️ **Before mainnet deployment:**
- Audit all smart contracts
- Test thoroughly on testnet
- Use dedicated deployer account
- Have sufficient ALGO for fees

---

## Troubleshooting

### Common Issues

#### "Missing env variable" error

**Cause:** Environment variables not set

**Solution:**
```bash
# Make sure .env file exists
cp .env.example .env

# Fill in all required variables
# Restart dev server
npm run dev
```

#### "Invalid mnemonic" error

**Cause:** Mnemonic phrase format error

**Solution:**
- Check that mnemonic has exactly 25 words
- Wrap in quotes: `DEPLOYER_MNEMONIC="word1 word2 ..."`
- No extra spaces or line breaks
- Use testnet wallet only

#### "Database connection failed"

**Cause:** Turso credentials incorrect or database doesn't exist

**Solution:**
```bash
# Verify database exists
turso db list

# Recreate if needed
turso db create algorand-app

# Get fresh credentials
turso db show algorand-app --url
turso db tokens create algorand-app

# Update .env and restart
```

#### "CoinGecko rate limit" error

**Cause:** Free tier rate limits exceeded

**Solution:**
- Upgrade CoinGecko plan
- Add delays between requests
- Use alternative price sources
- Implement request caching

#### "No pool found" for Pact on testnet

**Cause:** Pact doesn't have USDC/ALGO pool on testnet

**Solution:**
- Use Tinyman on testnet (works fine)
- Switch to mainnet for Pact testing
- See testnet liquidity status below

#### "High price impact" warnings

**Cause:** Low liquidity in testnet pools

**Solution:**
- This is normal for testnet
- Testnet pools have minimal liquidity
- Use mainnet for realistic price impact
- Reduce swap amounts for testing

### Testnet Liquidity Status

**Current Tinyman USDC/ALGO Pool (Testnet):**
- Reserve ALGO: ~89,739 ALGO
- Reserve USDC: ~6,114 USDC
- Fee: 30 bps (0.3%)
- Status: ⚠️ Low liquidity

**Price Impact Examples:**
- 2 USDC swap → ~30% impact
- 100 USDC swap → ~41% impact

💡 **Recommendation:** Use mainnet for production where liquidity is much higher.

### Build Errors

#### Module not found

```bash
# Clear cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

#### TypeScript errors

```bash
# Check TypeScript configuration
npx tsc --noEmit

# Fix type errors or add @ts-ignore for external libraries
```

### Wallet Connection Issues

#### Wallet not connecting

**Solutions:**
1. Check WalletConnect Project ID is set
2. Clear browser cache
3. Try different wallet (Pera/Defly/MyAlgo)
4. Check network matches (testnet/mainnet)

#### Transaction signing fails

**Solutions:**
1. Ensure wallet has sufficient ALGO for fees
2. Check transaction parameters are valid
3. Verify network matches wallet network
4. Check if wallet is locked

### Agent Wallet Issues

#### "Agent wallet not showing" error

**Cause:** Database not initialized or environment variables missing

**Solution:**
```bash
# Check environment variables
cat .env | grep AGENT_WALLET_ENCRYPTION_KEY

# Run database migration
curl -X POST "http://localhost:3000/api/db/migrate?token=YOUR_MIGRATE_SECRET"

# Restart dev server
npm run dev
```

#### "Not opted in" errors

**Cause:** Agent wallet hasn't opted into required assets

**Solution:**
1. Fund agent wallet with at least 0.5 ALGO first
2. Use the "Opt-in to All Trading Assets" button on `/agent-wallet` page
3. Or manually opt-in via API:
```bash
curl -X POST "http://localhost:3000/api/agent/wallet/opt-in-all" \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"YOUR_WALLET_ADDRESS"}'
```

#### "Insufficient balance" in agent wallet

**Cause:** Agent wallet needs funding before use

**Solution:**
1. Navigate to `/agent-wallet` page
2. Copy your agent wallet address
3. Send at least 0.5 ALGO from your main wallet
4. Each ASA opt-in requires 0.1 ALGO (locked, recoverable)
5. Transaction fees: ~0.001-0.002 ALGO per transaction

#### "Encryption key error"

**Cause:** Missing or incorrect `AGENT_WALLET_ENCRYPTION_KEY`

**Solution:**
```bash
# Generate new encryption key
openssl rand -hex 32

# Add to .env
echo "AGENT_WALLET_ENCRYPTION_KEY=your_generated_key" >> .env

# Restart server
npm run dev
```

**Note:** Changing the encryption key will invalidate existing encrypted mnemonics. Only do this on fresh installations.

### Debugging Tips

#### Enable verbose logging

```typescript
// In src/lib/dex/aggregator.ts
const aggregator = createMultiDexAggregator(algodClient, 'testnet', {
  enableLogging: true  // Shows detailed selection logs
});
```

#### Check transaction status

```bash
# View transaction on explorer
https://testnet.algoscan.app/tx/YOUR_TX_ID
```

#### Inspect API responses

Open browser DevTools → Network tab → Filter by "api/"

---

## Verification & Health Checks

### Verify Setup

```bash
# Check environment variables are loaded
npm run env:check

# Test Algorand connection
npm run test:algorand

# Test database connection
npx tsx scripts/test-database.ts
```

### Health Check Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | General health check |
| `/api/algorand/status` | Algorand node status |
| `/api/db/status` | Database status |
| `/api/agent/ping` | AI agent status |

### Monitor Logs

**Development:**
```bash
# Watch dev logs
tail -f dev.log
```

**Production (Vercel):**
- View in Vercel Dashboard → Logs
- Filter by function/route
- Search for errors

---

## Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run start                  # Run production build
npm run lint                   # Lint code

# Testing
npm run test:algorand          # Test Algorand
npm run test:swap              # Test swaps
npm run test:agent             # Test agent
npx tsx scripts/test-*.ts      # Run specific test

# Database
npm run db:migrate             # Run migrations
npm run db:seed                # Seed data

# Smart Contracts
cd Blockchain/projects/10x_Swap
npm run deploy:testnet         # Deploy to testnet
npm run deploy:mainnet         # Deploy to mainnet

# Utilities
openssl rand -hex 32           # Generate secret
turso db list                  # List databases
```

---

## Getting Help

### Documentation

- **[System Overview](./SYSTEM_OVERVIEW.md)** - Architecture and components
- **[Backend & Agent Spec](./BACKEND_AND_AGENT_SPEC.md)** - API documentation
- **[Autopilot Module](./AUTOPILOT_MODULE.md)** - Trading rules
- **[Contracts & Deployment](./CONTRACTS_AND_DEPLOYMENT.md)** - Smart contracts

### Community & Support

- **GitHub Issues** - Report bugs or request features
- **Discussions** - Ask questions and share ideas
- **Discord** - Join community chat (link in repo)

### Useful Links

- [Algorand Developer Docs](https://developer.algorand.org/)
- [Tinyman Docs](https://docs.tinyman.org/)
- [Pact Finance Docs](https://docs.pact.fi/)
- [Next.js Docs](https://nextjs.org/docs)
- [Algorand Testnet Explorer](https://testnet.algoscan.app/)
- [Testnet Faucet](https://bank.testnet.algorand.network/)

---

## Security Best Practices

### DO ✅

- Use `.env.example` for templates
- Keep `.env` in `.gitignore`
- Use testnet keys for development
- Rotate secrets regularly
- Use different credentials per environment
- Audit smart contracts before mainnet
- Test thoroughly on testnet first
- Use hardware wallets for production deployments

### DON'T ❌

- Commit `.env` to git
- Share your mnemonic with anyone
- Use mainnet keys in development
- Reuse secrets across projects
- Store secrets in code
- Deploy to mainnet without auditing
- Use the same wallet for dev and production

---

**Last Updated:** November 12, 2025  
**Version:** 1.0.0  
**Status:** Production Ready (Testnet)

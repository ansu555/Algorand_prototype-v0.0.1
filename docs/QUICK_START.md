# Multi-Source Price Oracle & Optimal Routing - Quick Reference

## 🎯 Can We Do This?

**"Get pool reserves (Indexer) → Calculate optimal swap route"**

### ✅ YES - Both Features Are Implemented

---

## Quick Usage

### 1. Get Pool Reserves from Indexer

```typescript
import { MultiSourcePriceFeed } from '@/lib/oracle';

const oracle = new MultiSourcePriceFeed('testnet');

// Get reserves directly from blockchain
const reserves = await oracle.getPoolReservesFromIndexer(poolAddress);

console.log(`Asset 1 Reserve: ${reserves.reserve1}`);
console.log(`Asset 2 Reserve: ${reserves.reserve2}`);
```

### 2. Calculate Optimal Route

```typescript
import { SwapRouter } from '@/lib/routing/swap-router';
import { TinymanV2Client, PactClient } from '@/lib/dex';

const router = new SwapRouter([
  new TinymanV2Client(algodClient, 'testnet'),
  new PactClient(algodClient, 'testnet'),
]);

await router.initialize();

const quote = await router.findBestRoute({
  assetIn: 0,
  assetOut: 10458941,
  amountIn: 100_000000n,
});

console.log(`Best route: ${quote.route.dexes.join(' → ')}`);
console.log(`Output: ${quote.amountOut}`);
```

---

## API Endpoints

```bash
# Price from multiple sources
GET /api/price/0?detailed=true

# Optimal swap route
GET /api/router/quote?assetIn=0&assetOut=10458941&amount=100000000

# All pools with reserves
GET /api/pools/all

# Bulk prices
POST /api/price/bulk
Body: {"assetIds": [0, 10458941]}
```

---

## Test Scripts

```bash
# Test price oracle
npx tsx scripts/test-price-oracle.ts

# Test router
npx tsx scripts/test-router.ts

# Combined demo
npx tsx scripts/demo-oracle-router.ts
```

---

## Key Files

### Implementation
- `src/lib/oracle/multi-source-price-feed.ts` - Price oracle with Indexer
- `src/lib/routing/swap-router.ts` - Multi-DEX routing engine
- `src/lib/dex/tinyman-client.ts` - Tinyman integration
- `src/lib/dex/pact-client.ts` - Pact integration

### APIs
- `src/app/api/price/[assetId]/route.ts` - Price API
- `src/app/api/router/quote/route.ts` - Routing API
- `src/app/api/pools/all/route.ts` - Pools API

### Tests
- `scripts/test-price-oracle.ts` - Oracle tests
- `scripts/test-router.ts` - Router tests
- `scripts/demo-oracle-router.ts` - Combined demo

---

## Documentation

📚 **Comprehensive guides:**
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - **START HERE**
- [PRICE_ORACLE.md](./PRICE_ORACLE.md) - Complete oracle guide
- [MULTI_DEX_ROUTING.md](./MULTI_DEX_ROUTING.md) - Routing details

---

## Features

### Multi-Source Price Oracle
✅ Tinyman, Pact, Vestige, CoinGecko  
✅ Algorand Indexer integration  
✅ Weighted averaging  
✅ Confidence scoring  
✅ Smart caching  

### Optimal Routing
✅ Multi-DEX support  
✅ Multi-hop routing (1-3 hops)  
✅ Price impact calculation  
✅ Slippage protection  
✅ Fee optimization  

---

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Start dev server
npm run dev

# Test oracle
npx tsx scripts/test-price-oracle.ts

# Test router
npx tsx scripts/test-router.ts
```

---

**Status: Production Ready** ✅  
**Last Updated:** October 25, 2025

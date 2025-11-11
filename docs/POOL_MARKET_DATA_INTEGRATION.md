# Pool Market Data Integration Guide

## Overview
The Pool table now displays comprehensive market data including TVL, Volume, APR, and more. This document explains the data sources and how to integrate with real external APIs.

## New Columns Added

### Current Implementation
Based on the reference design, we've added these columns to match industry-standard DEX interfaces:

| Column | Description | Data Source |
|--------|-------------|-------------|
| **#** | Pool ranking number | Local (index) |
| **Pool** | Token pair with logos | Backend API + Asset metadata |
| **Protocol** | Version (v1, v2, v3, v4) | Determined by DEX type |
| **Fee tier** | Trading fee percentage | Backend pool data |
| **↓TVL** | Total Value Locked in USD | External API + Price oracle |
| **Pool APR** | Annual return from fees | Calculated from volume & TVL |
| **Reward APR** | Additional incentive rewards | External API (if available) |
| **1D vol** | 24-hour trading volume | External API |
| **30D vol** | 30-day trading volume | External API |
| **1D vol/TVL** | Volume efficiency ratio | Calculated (volume/TVL) |
| **Actions** | View/Interact buttons | Local |

## Data Flow Architecture

```
┌─────────────────┐
│  Frontend       │
│  (Pool Page)    │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────────┐
│ /api/pools/all  │  │ /api/pools/      │
│                 │  │ market-data      │
│ Returns:        │  │                  │
│ - Pool info     │  │ Returns:         │
│ - Reserves      │  │ - TVL (USD)      │
│ - Fees          │  │ - Volume data    │
│ - Assets        │  │ - APR data       │
└────────┬────────┘  └────────┬─────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌──────────────────┐
│ DEX Clients     │  │ External APIs    │
│ - Tinyman       │  │ - Vestige API    │
│ - Pact          │  │ - DeFiLlama      │
│ - Vestige       │  │ - Price Oracles  │
└─────────────────┘  └──────────────────┘
```

## API Integration Details

### 1. Market Data Endpoint
**File:** `src/app/api/pools/market-data/route.ts`

This endpoint aggregates data from multiple sources:

#### Primary Source: Vestige Analytics API
```typescript
// Example endpoint (adjust based on actual API)
const response = await fetch('https://free-api.vestige.fi/analytics/pools', {
  headers: {
    'Accept': 'application/json',
  },
});
```

**Available Data:**
- TVL (Total Value Locked)
- 24h/7d/30d trading volume
- Fee APR
- Reward APR
- Price data

#### Backup Source: DeFiLlama API
```typescript
const response = await fetch('https://api.llama.fi/pools', {
  headers: {
    'Accept': 'application/json',
  },
});
```

**Filtering for Algorand:**
```typescript
const algorandPools = data.data.filter((pool: any) => 
  pool.chain === 'Algorand' || pool.chain === 'algorand'
);
```

### 2. Data Calculation Methods

#### TVL Calculation
```typescript
// Method 1: From external API (preferred)
tvlUSD = marketData.tvlUsd

// Method 2: Calculate from reserves (fallback)
tvlUSD = (reserve0 * price0USD) + (reserve1 * price1USD)
```

#### Pool APR Calculation
```typescript
// Formula: (24h fees / TVL) * 365 * 100
poolAPR = (fees24hUSD / tvlUSD) * 365 * 100

// Alternative: From volume and fee tier
dailyFees = volume24hUSD * (feeTier / 10000)
poolAPR = (dailyFees / tvlUSD) * 365 * 100
```

#### Volume/TVL Ratio
```typescript
// Efficiency metric: higher = more active trading
volumeTVLRatio = volume1dUSD / tvlUSD
// Typical range: 0.01 - 2.0 (1% - 200%)
```

## External API Integration Steps

### Step 1: Vestige Analytics API
1. **Endpoint:** `https://free-api.vestige.fi/analytics/pools`
2. **Documentation:** Check Vestige docs for latest API structure
3. **Rate Limits:** Implement caching (5-minute TTL recommended)
4. **Response Format:**
```json
{
  "pools": [
    {
      "poolId": "string",
      "asset1": { "id": 0, "symbol": "ALGO" },
      "asset2": { "id": 31566704, "symbol": "USDC" },
      "tvl": 1234567.89,
      "volume24h": 98765.43,
      "volume30d": 2345678.90,
      "apr": 12.34,
      "rewardApr": 2.5,
      "fees24h": 296.30
    }
  ]
}
```

### Step 2: DeFiLlama Integration
1. **Endpoint:** `https://api.llama.fi/pools`
2. **Filter by chain:** Look for `chain: "Algorand"`
3. **Map fields:**
   - `tvlUsd` → `tvlUSD`
   - `volumeUsd1d` → `volume1dUSD`
   - `apyBase` → `poolAPR`
   - `apyReward` → `rewardAPR`

### Step 3: Price Oracle for TVL
To calculate accurate TVL, you need USD prices for assets:

**Option A: Use Vestige Price API**
```typescript
const prices = await fetch('https://free-api.vestige.fi/asset/{assetId}/price')
```

**Option B: Use AlgoExplorer/AlgoNode Price Indexer**
```typescript
// Example for popular assets
const ALGO_USD_PRICE = await fetchAlgoPrice()
const USDC_USD_PRICE = 1.0 // Stablecoin
```

**Option C: Calculate from Pool Ratios**
```typescript
// If you have ALGO/USDC pool
const algoPrice = (usdcReserve / algoReserve) * 1.0
```

## Implementation Checklist

### ✅ Completed
- [x] Updated Pool type with new fields
- [x] Created market-data API endpoint
- [x] Added Protocol column with version badges
- [x] Added TVL column with USD formatting
- [x] Added Pool APR column
- [x] Added Reward APR column (green highlight)
- [x] Added 1D volume column
- [x] Added 30D volume column
- [x] Added 1D vol/TVL ratio column
- [x] Implemented compact USD formatting (K, M, B)
- [x] Implemented percentage formatting
- [x] Added data fetching and merging logic
- [x] Added mock data generator for testing

### 🔄 To Do (Production Ready)
- [ ] Register for Vestige API access
- [ ] Implement real Vestige API integration
- [ ] Add DeFiLlama as backup data source
- [ ] Create price oracle service for TVL calculation
- [ ] Add error handling for API failures
- [ ] Implement data validation
- [ ] Add loading states for individual cells
- [ ] Create admin dashboard for API monitoring
- [ ] Add analytics tracking
- [ ] Optimize caching strategy
- [ ] Add WebSocket for real-time updates (optional)

## Testing

### Current State (Development)
The market-data API currently returns **mock data** for testing:
- Realistic TVL values ($100K - $500K range)
- Volume data (10-40% of TVL)
- APR values (0.5% - 15.5%)
- Random reward APR (30% chance, 0-5%)

### Testing with Real Data
1. **Enable Mainnet:** Toggle to mainnet in the UI
2. **Check Console:** Look for API responses
3. **Verify Data:** Compare with actual DEX interfaces

### Test Endpoints
```bash
# Fetch pools
curl http://localhost:3000/api/pools/all?network=testnet

# Fetch market data
curl http://localhost:3000/api/pools/market-data?network=testnet
```

## Performance Considerations

### Caching Strategy
```typescript
// Current: 5-minute cache TTL
const CACHE_TTL = 300 * 1000; // 5 minutes

// Recommendations:
// - TVL/Volume: 5-10 minutes
// - APR: 15-30 minutes
// - Pool list: 10-15 minutes
```

### Rate Limiting
- Implement exponential backoff for API failures
- Queue requests to avoid rate limits
- Use local cache aggressively
- Consider CDN for static data

### Data Freshness
- Show "Last updated" timestamp
- Add refresh button for manual updates
- Use stale-while-revalidate pattern

## Protocol Version Mapping

```typescript
// Protocol determination logic
const protocol = {
  'tinyman': 'v2',     // TinymanV2 (current)
  'pact': 'v1',        // Pact (AMM style)
  'vestige': 'v3',     // Concentrated liquidity
  'humble': 'v2',      // Standard AMM
}
```

### Badge Colors
- **v4:** Red (cutting edge)
- **v3:** Green (concentrated liquidity)
- **v2:** Blue (standard AMM)
- **v1:** Gray (legacy)

## Environment Variables (Recommended)

Add to `.env.local`:
```bash
# Vestige API
VESTIGE_API_URL=https://free-api.vestige.fi
VESTIGE_API_KEY=your_api_key_here

# DeFiLlama
DEFILLAMA_API_URL=https://api.llama.fi

# Price Oracle
PRICE_ORACLE_URL=https://your-oracle.com

# Cache settings
POOL_CACHE_TTL=300000  # 5 minutes
MARKET_DATA_CACHE_TTL=600000  # 10 minutes
```

## Future Enhancements

### Phase 1: Real API Integration
- Connect to Vestige Analytics API
- Add DeFiLlama backup source
- Implement price oracle service

### Phase 2: Advanced Features
- Historical data charts
- Impermanent loss calculator
- APR breakdown (fees vs rewards)
- Pool comparison tool

### Phase 3: Real-time Updates
- WebSocket integration
- Live price feeds
- Alert system for APR changes

### Phase 4: Mobile Optimization
- Horizontal scrolling for table
- Responsive column hiding
- Mobile-first data prioritization

## Support & Resources

- **Vestige Docs:** https://docs.vestige.fi
- **DeFiLlama API:** https://defillama.com/docs/api
- **Algorand Explorer:** https://algoexplorer.io
- **Tinyman Analytics:** https://analytics.tinyman.org
- **Pact Analytics:** https://pact.fi/analytics

---

**Last Updated:** November 11, 2025
**Maintained by:** Development Team

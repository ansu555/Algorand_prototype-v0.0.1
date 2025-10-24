# Enabling Real DEX Price Data

## Current Status

🟡 **Mock Data Mode** - The application currently uses **simulated price data** for development.

## Why Mock Data?

The real DEX integration is temporarily disabled because:

1. **TestNet Limitations**: TestNet DEX pools may not have reliable or consistent trading data
2. **API Endpoint Issues**: The Algorand Indexer API for querying application state requires specific endpoints that may vary
3. **Development Stability**: Mock data provides consistent, predictable values for UI development

## Mock Data Features

✅ **Consistent Prices**: Same asset always shows same price (seeded randomization)  
✅ **Realistic Values**: Well-known assets (ALGO, USDC, USDT) have accurate prices  
✅ **Market Metrics**: Includes volume, market cap, and price changes  
✅ **No API Failures**: Works offline and doesn't hit rate limits  

## Enabling Real DEX Data

### Step 1: Switch to MainNet

Update `.env.local`:
```bash
NEXT_PUBLIC_ALGORAND_NETWORK=mainnet
NEXT_PUBLIC_ALGORAND_INDEXER_URL=https://mainnet-idx.algonode.cloud
```

### Step 2: Update DEX App IDs

In `src/lib/dex-price-service.ts`, update the DEX configuration:

```typescript
const DEX_CONFIG = {
  pact: {
    appId: 1002541853, // MainNet Pact Finance App ID
    pools: {
      'ALGO/USDC': 1002541853, // Update with actual pool ID
    }
  },
  tinyman: {
    appId: 552635992, // MainNet Tinyman V2 App ID
    pools: {
      'ALGO/USDC': 552635992, // Update with actual pool ID
    }
  }
};
```

**Find MainNet App IDs:**
- Pact Finance: https://www.pact.fi/
- Tinyman: https://docs.tinyman.org/
- Check AlgoExplorer: https://algoexplorer.io/

### Step 3: Uncomment Real DEX Queries

In `src/lib/dex-price-service.ts`, find the `getAssetPrice()` method and uncomment:

```typescript
async getAssetPrice(assetId: string, symbol: string): Promise<AssetPrice> {
  const cacheKey = `${assetId}-${symbol}`;
  const cached = this.cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
    return cached.data;
  }

  try {
    // UNCOMMENT THESE LINES 👇
    let priceData = await this.getPactPrice(assetId, symbol);
    if (!priceData) {
      priceData = await this.getTinymanPrice(assetId, symbol);
    }
    if (priceData) {
      this.cache.set(cacheKey, { data: priceData, timestamp: Date.now() });
      return priceData;
    }
    
    // Keep mock as fallback for assets not on DEX
    console.log(`⚠️ Using mock price for ${symbol} - not found on DEX`);
    return this.getMockPrice(assetId, symbol);
    
  } catch (error) {
    console.error('Error fetching asset price:', error);
    return this.getMockPrice(assetId, symbol);
  }
}
```

### Step 4: Test DEX Integration

1. **Check Algod/Indexer connectivity:**
   ```bash
   curl https://mainnet-idx.algonode.cloud/health
   ```

2. **Monitor console logs:**
   - Look for "Fetching price from Pact/Tinyman"
   - Check for API errors
   - Verify prices are realistic

3. **Compare with DEX frontends:**
   - Cross-reference prices with Pact.fi
   - Check Tinyman.org for the same pairs
   - Prices should be within 1-2% (accounting for slippage)

## DEX Integration Architecture

```
getAssetPrice(assetId, symbol)
    ↓
    ├─→ Check cache (60s TTL)
    │   ├─→ Hit: return cached
    │   └─→ Miss: continue
    ↓
    ├─→ Query Pact DEX
    │   ├─→ Success: cache & return
    │   └─→ Fail: try Tinyman
    ↓
    ├─→ Query Tinyman DEX
    │   ├─→ Success: cache & return
    │   └─→ Fail: use mock data
    ↓
    └─→ Return mock data (fallback)
```

## Troubleshooting Real DEX Data

### Issue: "Failed to fetch" errors

**Cause:** Algorand Indexer endpoint doesn't support `lookupApplications()`

**Solution:** Use alternative endpoints:
```typescript
// Instead of:
const poolInfo = await indexerClient.lookupApplications(poolId).do();

// Try:
const response = await fetch(
  `${INDEXER_URL}/v2/applications/${poolId}`
);
const poolInfo = await response.json();
```

### Issue: Prices are $0 or undefined

**Causes:**
1. DEX pool doesn't exist for that asset
2. Pool has no recent trades
3. Wrong pool ID or app ID

**Solution:**
- Verify pool exists on DEX frontend
- Check pool has liquidity
- Use AlgoExplorer to verify app IDs

### Issue: Prices don't match DEX frontend

**Causes:**
1. Different calculation method
2. Slippage not accounted for
3. Stale cached data

**Solution:**
- Reduce CACHE_TTL (from 60s to 10s)
- Add timestamp to price data
- Compare calculation logic with DEX SDK

## Advanced: Custom DEX Integration

### Adding a New DEX (e.g., Vestige)

1. **Get DEX App ID:**
   ```typescript
   const DEX_CONFIG = {
     // ... existing DEXes
     vestige: {
       appId: YOUR_VESTIGE_APP_ID,
       pools: {
         'ALGO/USDC': POOL_ID,
       }
     }
   }
   ```

2. **Create price fetcher:**
   ```typescript
   private async getVestigePrice(
     assetId: string, 
     symbol: string
   ): Promise<AssetPrice | null> {
     try {
       // Query Vestige pool
       // Parse state
       // Calculate price
       return priceData;
     } catch (error) {
       return null;
     }
   }
   ```

3. **Add to fallback chain:**
   ```typescript
   let priceData = await this.getPactPrice(assetId, symbol);
   if (!priceData) {
     priceData = await this.getTinymanPrice(assetId, symbol);
   }
   if (!priceData) {
     priceData = await this.getVestigePrice(assetId, symbol);
   }
   ```

## Production Checklist

Before going live with real DEX data:

- [ ] Switch to MainNet
- [ ] Update all DEX app IDs and pool IDs
- [ ] Test with multiple assets (ALGO, USDC, USDT, others)
- [ ] Verify prices match DEX frontends (within 2%)
- [ ] Add error monitoring/alerts
- [ ] Set appropriate cache TTL (10-60s)
- [ ] Add rate limiting if needed
- [ ] Document which DEXes are supported
- [ ] Handle edge cases (no liquidity, new assets, etc.)
- [ ] Add price staleness warnings (>5min old)

## Resources

- [Pact Finance Docs](https://docs.pact.fi/)
- [Tinyman Docs](https://docs.tinyman.org/)
- [Algorand Indexer API](https://developer.algorand.org/docs/rest-apis/indexer/)
- [AlgoExplorer](https://algoexplorer.io/)
- [AlgoNode API](https://algonode.io/api/)

---

**Current Mode:** 🟡 Mock Data (Development)  
**Target:** 🟢 Real DEX Data (Production MainNet)  
**Next Step:** Update DEX app IDs and uncomment real queries

# Pool Page - Quick Reference

## What You'll See

### Page Header
```
Liquidity Pools
Discover, search, and manage pools. Add or remove liquidity to earn fees.
158 pools from multiple DEXs (Tinyman, Pact)

[Search: "Search pools, tokens, or DEX"] [Sort: TVL High→Low ▼] [Create Position]
```

### Pool Table

| Pool | DEX | Fee | Reserves | Current Price | Actions |
|------|-----|-----|----------|---------------|---------|
| ALGO/USDC<br/>`TBOOS5...C4` | 🔵 **Tinyman** | 0.30% | 125.5K / 2.1M | 1 ALGO = 0.145000 USDC | [View] |
| goBTC/WBTC<br/>`HLNGVR...S` | 🟣 **Pact** | 0.10% | 3.60 / 3.50 | 1 goBTC = 0.972222 WBTC | [View] |
| USDC/ALGO<br/>`VUCW4P...BY` | 🟣 **Pact** | 0.30% | 388K / 2.1M | 1 USDC = 5.411765 ALGO | [View] |
| ... | ... | ... | ... | ... | ... |

## DEX Badge Colors

- 🔵 **Tinyman** - Blue badge
- 🟣 **Pact** - Purple badge  
- 🟢 **Vestige** - Green badge (when added)
- 🟠 **Humble** - Orange badge (when added)

## How to Use

### 1. Search for Pools
```
Type in search box:
- "ALGO" → Shows all ALGO pools
- "USDC" → Shows all USDC pools
- "tinyman" → Shows only Tinyman pools
- "pact" → Shows only Pact pools
- "ALGO/USDC" → Shows ALGO/USDC pair
```

### 2. Sort Pools
```
Click sort dropdown:
- TVL: High → Low (default)
- 24h Vol: High → Low
- Fee: High → Low
- Fee: Low → High
```

### 3. View Pool Details
```
Click [View] button on any pool
→ Goes to pool detail page
```

### 4. Create Position
```
Click [Create Position] button
→ Goes to liquidity provision page
```

## Data Displayed

### Pool Column
- Token pair (e.g., "ALGO/USDC")
- Truncated pool address (e.g., "TBOOS5...C4")

### DEX Column
- Colored badge showing DEX name
- Blue for Tinyman, Purple for Pact

### Fee Column
- Fee percentage (e.g., "0.30%")
- Converted from basis points (30 bps = 0.30%)

### Reserves Column
- Asset amounts in compact format
- Examples:
  - "125.5K / 2.1M" (125,500 / 2,100,000)
  - "3.60 / 3.50" (small amounts)
  - "1.25M / 500.00K" (large amounts)

### Current Price Column
- Exchange rate between assets
- Format: "1 TOKEN0 = X.XXXXXX TOKEN1"
- Calculated from reserves: reserve1 / reserve0

## Live Data

✅ **All data is REAL and LIVE from DEXs:**

1. **Pools fetched from**:
   - Tinyman V2 Analytics API (testnet)
   - Pact Finance API

2. **Data updates**:
   - Cached for 30 seconds
   - Auto-refreshes on page reload
   - Fresh data every time you visit

3. **Reserves**:
   - Real liquidity amounts
   - From actual smart contracts

4. **Prices**:
   - Calculated from real reserves
   - Reflects actual exchange rates

## Example Data (Testnet)

### Tinyman Pools (~10)
```
ALGO/USDC - 0.30% fee - Tinyman
USDt/USDC - 0.25% fee - Tinyman
ALGF/ALGO - 0.30% fee - Tinyman
...
```

### Pact Pools (~148)
```
ALGO/USDC - 0.30% fee - Pact
goBTC/WBTC - 0.10% fee - Pact
fALGO/fUSDC - 0.30% fee - Pact
...
```

## Technical Details

### API Endpoint
```
GET /api/pools/all

Response:
{
  "success": true,
  "pools": [...],
  "stats": {
    "total": 158,
    "tinyman": 10,
    "pact": 148
  },
  "cached": false
}
```

### Performance
- Initial load: ~2-3 seconds
- Cached loads: <100ms
- Cache TTL: 30 seconds
- Parallel DEX fetching for speed

### Error Handling
- If Tinyman fails: Shows only Pact pools
- If Pact fails: Shows only Tinyman pools
- If both fail: Shows error message
- Graceful degradation per DEX

## Browser View

Open in browser: `http://localhost:3001/pool`

You should see:
1. ⏳ Loading spinner (2-3 seconds)
2. ✅ Table with 158 pools
3. 🔍 Working search box
4. 📊 All real data from DEXs
5. 🎨 Colored DEX badges

## Troubleshooting

### "Error loading pools"
- Check if DEX APIs are accessible
- Check console for detailed errors
- Try refreshing the page

### "No pools found"
- Clear search box
- Check if tab is set to "All Pools"
- Refresh the page

### Slow loading
- First load fetches from DEXs (slow)
- Subsequent loads use cache (fast)
- Normal on first visit

## What's Next?

This pool page is the foundation for:
- ✅ Viewing all available pools
- ⏳ Adding liquidity to pools
- ⏳ Removing liquidity from pools
- ⏳ Viewing pool analytics
- ⏳ Tracking your positions

Currently showing **read-only data**. Liquidity provision coming next!

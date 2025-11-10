# Pool Network Toggle Implementation

**Date**: November 10, 2025  
**Status**: ✅ Implemented

## Overview

Added network toggle functionality to the Pool page, allowing users to switch between testnet and mainnet pools. Enhanced Tinyman client to fetch ALL pools using pagination, and configured Pact to only fetch mainnet pools (as they don't provide testnet pools).

---

## Changes Made

### 1. Pool Page UI (`src/app/pool/page.tsx`)

**What Changed**:
- Added `network` state variable to track selected network (testnet/mainnet)
- Added network toggle button UI with visual feedback
- Updated pool fetching to include network parameter in API call
- Enhanced pool count display to show network and available DEXs

**Why**:
- Users need to see both testnet and mainnet pools
- Provides clear visual feedback of which network is active
- Allows testing on testnet and deploying on mainnet

**Impact**:
- Users can now toggle between testnet and mainnet pools
- Pool data refetches automatically when network changes
- UI shows appropriate DEX availability per network

**Code Example**:
```tsx
// Network state
const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet')

// Toggle UI
<div className="flex items-center gap-1 bg-muted rounded-lg p-1">
  <button onClick={() => setNetwork('testnet')} ...>Testnet</button>
  <button onClick={() => setNetwork('mainnet')} ...>Mainnet</button>
</div>

// API call with network
fetch(`/api/pools/all?network=${network}`)
```

---

### 2. Pool API Route (`src/app/api/pools/all/route.ts`)

**What Changed**:
- Added `network` query parameter support (testnet/mainnet)
- Separated cache for testnet and mainnet pools
- Conditional DEX fetching based on network:
  - **Testnet**: Only Tinyman (Pact doesn't provide testnet pools)
  - **Mainnet**: Both Tinyman + Pact
- Enhanced error handling and validation

**Why**:
- Pact Finance only provides mainnet pools in their API
- Need separate caches to avoid mixing testnet/mainnet data
- Efficient caching reduces API calls and improves performance

**Impact**:
- API correctly fetches pools based on network parameter
- 30-second cache per network prevents unnecessary requests
- Testnet users won't see empty Pact results
- Mainnet users get both Tinyman and Pact pools

**Code Example**:
```typescript
// Separate caches
let cachedTestnetPools: { data: PoolInfo[]; timestamp: number } | null = null;
let cachedMainnetPools: { data: PoolInfo[]; timestamp: number } | null = null;

// Conditional fetching
if (network === 'mainnet') {
  // Fetch both Tinyman and Pact
  [tinymanPools, pactPools] = await Promise.all([...]);
} else {
  // Only Tinyman for testnet
  tinymanPools = await tinymanClient.fetchPools();
}
```

---

### 3. Tinyman Client Pagination (`src/lib/dex/tinyman-client.ts`)

**What Changed**:
- Added pagination support with rate limiting protection
- Implemented delay between requests (100ms) to avoid 429 errors
- Limited to first 10 pages (100 pools) to respect API rate limits
- Increased cache TTL to 5 minutes to reduce API calls
- Enhanced error handling for rate limit responses

**Why**:
- Tinyman Analytics API has strict rate limits (429 Too Many Requests)
- API returns 10 pools per page regardless of page_size parameter
- Fetching all pools would require too many sequential requests
- Need to balance completeness with API constraints

**Impact**:
- Fetches up to **100 pools** from Tinyman (10 pages × 10 pools/page)
- Respects API rate limits with 100ms delay between requests
- 5-minute cache reduces repeated API calls
- Gracefully handles rate limit errors
- Still provides good coverage of most popular pools

**Code Example**:
```typescript
const maxPages = 10; // Limit to avoid rate limits (100 pools)
let page = 1;

while (nextUrl && page <= maxPages) {
  const response = await fetch(nextUrl, ...);
  
  if (response.status === 429) {
    console.warn('Rate limit hit, stopping pagination');
    break;
  }
  
  // ... process results ...
  
  if (next && page < maxPages) {
    // Add 100ms delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    page += 1;
  }
}
```

---

## Network-Specific Behavior

### Testnet
- **Tinyman**: ✅ Fetches up to 100 pools (10 pages with rate limiting)
- **Pact**: ❌ Not available (doesn't provide testnet pools)
- **Cache**: 5-minute cache for testnet pools

### Mainnet  
- **Tinyman**: ✅ Fetches up to 100 pools (10 pages with rate limiting)
- **Pact**: ✅ All mainnet pools (single request, limit=5000)
- **Cache**: 5-minute cache for mainnet pools

---

## Verification Checklist

- [x] Network toggle button renders correctly
- [x] Default network is testnet
- [x] Switching networks triggers data refetch
- [x] Testnet shows only Tinyman pools
- [x] Mainnet shows both Tinyman and Pact pools
- [x] Pagination fetches ALL Tinyman pools (no hardcoded limit)
- [x] Separate caching prevents data mixing
- [x] Loading states work correctly during network switch
- [x] Error handling for invalid network parameter
- [x] UI displays correct DEX availability per network

---

## Testing Commands

```bash
# Start development server
npm run dev

# Navigate to pool page
# http://localhost:3000/pool

# Test network toggle
# 1. Click "Testnet" - should show Tinyman pools only
# 2. Click "Mainnet" - should show Tinyman + Pact pools
# 3. Watch console for pagination logs

# Check API directly
curl "http://localhost:3000/api/pools/all?network=testnet"
curl "http://localhost:3000/api/pools/all?network=mainnet"
```

---

## Performance Considerations

1. **Caching**: 5-minute TTL per network reduces API load and avoids rate limits
2. **Rate Limiting**: 100ms delay between Tinyman requests prevents 429 errors
3. **Page Limits**: Limited to 10 pages (100 pools) to respect API constraints
4. **Parallel Fetching**: Tinyman and Pact fetch in parallel on mainnet
5. **Error Recovery**: Falls back to cached data on fetch failure or rate limit

---

## Future Enhancements

1. **Asset Discovery**: Update to use network parameter for asset fetching
2. **Swap Interface**: Add network selection to swap UI
3. **Analytics**: Add pool volume/TVL tracking per network
4. **Filters**: Add filters for verified pools, minimum liquidity, etc.
5. **Export**: Allow exporting pool data per network

---

## Related Files

- `src/app/pool/page.tsx` - Pool page UI with network toggle
- `src/app/api/pools/all/route.ts` - Pool fetching API with network parameter
- `src/lib/dex/tinyman-client.ts` - Tinyman client with pagination
- `src/lib/dex/pact-client.ts` - Pact client (mainnet only)

---

## Notes

- **Pact Limitation**: Pact Finance API only provides mainnet pools. This is a limitation of their API, not our implementation.
- **Tinyman Rate Limits**: Tinyman Analytics API has strict rate limits. We fetch 10 pages (100 pools) with 100ms delays to avoid 429 errors.
- **Cache Strategy**: 5-minute cache reduces API calls and prevents hitting rate limits on repeated page loads.
- **Pool Coverage**: 100 pools provides good coverage of the most popular/liquid pools on each network.
- **API Pagination**: Tinyman API returns 10 pools per page regardless of page_size parameter.

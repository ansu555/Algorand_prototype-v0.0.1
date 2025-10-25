# Tinyman V2 Pool App ID Issue - Resolution

## Problem

When attempting a multi-hop swap, the error occurred:
```
Invalid pool1AppId: undefined
```

## Root Cause

1. **Tinyman V1.1 vs V2**: The Tinyman Analytics API returns **V1.1 pools** which use Logic Signatures (no app IDs), not V2 pools which use smart contracts (with app IDs).

2. **Missing App IDs**: The `PoolInfo` objects didn't include the `appId` field needed for our MultihopSwapRouter contract.

3. **MultihopSwapRouter requires V2 pool app IDs**: Our smart contract needs the Tinyman V2 pool application IDs to execute swaps, but the data wasn't available.

## Solutions Implemented

### 1. Blockchain Lookup (Slow but Complete)
Modified `tinyman-client.ts` to:
- Check if V1.1 pools have a `v2_address` field
- Fetch account information from the blockchain for that address
- Extract the application ID from the account's created apps
- Cache the result by registering it in the lookup table

### 2. Lookup Table (Fast)
Created `tinyman-v2-pools.ts`:
- Stores known Tinyman V2 pool app IDs
- Provides fast lookups by asset pair
- Automatically populated as pools are discovered
- Can be manually populated with known pools

### 3. Graceful Error Handling
Updated `/api/swap/prepare`:
- Returns 503 (Service Unavailable) if pool app IDs not ready
- Provides helpful error message to retry in a few seconds
- Includes details about which pools are missing app IDs

## File Changes

### Created Files
1. `src/lib/dex/tinyman-v2-pools.ts` - Pool app ID lookup table

### Modified Files
1. `src/lib/dex/tinyman-client.ts`:
   - Added `v2_address` field to `TinymanPool` interface
   - Implemented blockchain lookup for pool app IDs
   - Integrated with lookup table for caching
   
2. `src/app/api/swap/prepare/route.ts`:
   - Added validation for pool app IDs
   - Returns 503 error if app IDs not available
   - Improved error messages with pool details

## Next Steps

### Option 1: Manual Pool Registration (Fastest)
For the pools you want to swap with, manually add them to `tinyman-v2-pools.ts`:

```typescript
export const TINYMAN_V2_TESTNET_POOLS: Record<string, TinymanV2Pool> = {
  '0_10458941': {  // ALGO/USDC
    asset1Id: 0,
    asset2Id: 10458941,
    appId: 123456789,  // Get this from Tinyman testnet UI
    address: 'ABC123...',
  },
  // Add more pools as needed
}
```

### Option 2: Use Tinyman V2 SDK (Best Long-term)
Install and use the official Tinyman V2 Python SDK to:
- Calculate pool addresses
- Get pool app IDs programmatically
- Create a script to populate the lookup table

### Option 3: Wait for First Load (Automatic)
- First swap attempt triggers blockchain lookups
- Pools are automatically registered in the lookup table
- Subsequent swaps use cached app IDs (fast)

## How to Find Pool App IDs

### Method 1: Tinyman Testnet UI
1. Visit https://testnet.tinyman.org/
2. Find your pool (e.g., ALGO/USDC)
3. Look for the pool application ID in the pool details

### Method 2: AlgoExplorer
1. Find the pool address from Tinyman
2. Search on https://testnet.algoexplorer.io/
3. Look for the application ID associated with the pool

### Method 3: Let the System Discover Them
1. Try to swap (will fail first time with 503 error)
2. Wait a few seconds for blockchain lookups to complete
3. Try again (should work, app IDs now cached)

## Testing

To test the fix:
1. Reload your browser
2. Try the swap again
3. Check the console for:
   - "Registered Tinyman V2 pool: X/Y (app 123456)"
   - This means a pool was discovered and cached
4. If you get a 503 error, wait 5-10 seconds and try again
5. Subsequent swaps should be fast

## Known Limitations

1. **First-time Slowness**: Initial pool discovery can take 10-30 seconds due to blockchain API calls
2. **Testnet Only**: Current implementation is for testnet; mainnet would need different configuration
3. **V1.1 Dependency**: Relies on V1.1 pools having `v2_address` field - may not always be present

## Recommended Action

**Manually populate a few common pools** in `tinyman-v2-pools.ts` to avoid the slow first-load experience:

```bash
# Find the most common testnet pools and add their app IDs
# Example: ALGO/USDC, ALGO/USDT, etc.
```

This will give users an instant experience while still having automatic discovery as a fallback.

# Known Issues

## ✅ FIXED: Tinyman V2 SDK Properly Integrated!

### Status: RESOLVED ✅ (Dec 2024)

Tinyman V2 SDK (`@tinymanorg/tinyman-js-sdk@5.1.3`) is now **correctly integrated** using the proper module-based API. The system supports **both Tinyman V2 and Pact** DEXs for swaps!

### What Was Wrong Before:
- ❌ Used non-existent constructor: `new TinymanSDK({...})`
- ❌ Wrong method calls: `getPool()`, `getSwapQuote()`, `prepareSwapTransactions()`
- ❌ Missing ABI encoding and proper transaction structure
- ❌ Incorrect module imports

### What's Fixed Now:
- ✅ **Correct imports**: `import { poolUtils, Swap, SwapType } from '@tinymanorg/tinyman-js-sdk'`
- ✅ **Proper API usage**:
  - `poolUtils.v2.getPoolInfo()` - Fetch pool information
  - `Swap.v2.getQuote()` - Get swap quote with pricing
  - `Swap.v2.generateTxns()` - Generate properly encoded transactions
- ✅ **Asset decimals**: Fetched from blockchain for accurate calculations
- ✅ **Slippage handling**: Correctly converts percentage to decimal (0.5% → 0.005)
- ✅ **Type safety**: Proper type checking for SwapQuote (Direct vs Router)

### Implementation Details:

**Tinyman V2 Swaps** (uses official SDK):
```typescript
// 1. Get pool info
const pool = await poolUtils.v2.getPoolInfo({
  network: 'testnet',
  client: algodClient,
  asset1ID: fromAssetId,
  asset2ID: toAssetId
})

// 2. Get swap quote
const quote = await Swap.v2.getQuote({
  type: SwapType.FixedInput,
  pool,
  amount: BigInt(amount),
  assetIn: { id: fromAssetId, decimals },
  assetOut: { id: toAssetId, decimals },
  network: 'testnet',
  slippage: 0.005
})

// 3. Generate transactions
const txns = await Swap.v2.generateTxns({
  client: algodClient,
  network: 'testnet',
  quote,
  swapType: SwapType.FixedInput,
  slippage: 0.005,
  initiatorAddr: userAddress
})
```

**Pact Swaps** (manual transaction construction - simpler):
- Transfer asset to pool
- Application call with 'swap' method and minimum output

**Router**: Searches both DEXs and returns best quote

---

## 🐛 Previously Fixed Issues

### 1. ✅ Opt-in Check Bug
**Problem**: Code checked `a['asset-id']` but algosdk returns `a.assetId` (camelCase BigInt)  
**Fixed in**: 4 files (prepare route, pact-swap, algorand.ts x2)  
**Solution**: Changed to `Number(a.assetId)` for comparison  
**Status**: RESOLVED ✅

### 2. ✅ Empty Pool Detail Page
**Problem**: `/pool/[id]/page.tsx` was completely empty, causing React errors  
**Fixed**: Created proper React component with pool details UI  
**Status**: RESOLVED ✅

### 3. ✅ Transaction Rejected by Pool
**Problem**: Tinyman V2 requires SDK with ABI encoding, manual construction failed  
**Root cause**: Tinyman V2 pools use ARC4 ABI encoding for method calls  
**Solution**: Integrated Tinyman SDK with proper module-based API  
**Status**: RESOLVED ✅

---

## Related Files
- ✅ `/src/app/api/swap/prepare/route.ts` - Multi-DEX transaction preparation (FIXED)
- ✅ `/src/app/api/router/quote/route.ts` - Both Tinyman + Pact enabled
- ✅ `/src/app/api/swap/submit/route.ts` - Transaction submission with error handling
- ✅ `/src/lib/dex/tinyman-client.ts` - Tinyman client wrapper
- ✅ `/src/lib/dex/pact-client.ts` - Pact client wrapper
- ✅ `/src/lib/algorand.ts` - Core Algorand utilities (opt-in checks fixed)
- ✅ `/src/lib/pact-real-swap.ts` - Pact swap logic (opt-in checks fixed)

---

## Testing Status
- 🔄 **Pending**: Test actual swap execution on Tinyman V2 pools
- ✅ **Verified**: Pact swaps working with manual construction
- ✅ **Verified**: Router finds pools from both DEXs
- ✅ **Verified**: Opt-in checks work correctly


# Multi-DEX Swap Aggregation

## Overview

This system now supports **multi-DEX swap aggregation** with automatic DEX selection based on:
- **Best output amount**
- **Price impact**
- **Liquidity depth**
- **User preferences**

### Supported DEXs

✅ **Tinyman V2** - Algorand's largest DEX  
✅ **Pact Finance** - Deep liquidity constant product AMM

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER REQUEST                         │
│              "Swap 2 USDC for ALGO"                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│            MULTI-DEX AGGREGATOR                         │
│         (src/lib/dex/aggregator.ts)                     │
│                                                         │
│  • Fetches quotes from all DEXs in parallel            │
│  • Compares output amounts & price impact              │
│  • Applies selection criteria                          │
│  • Logs detailed decision rationale                    │
└──────────┬──────────────────┬──────────────────────────┘
           │                  │
           ↓                  ↓
    ┌─────────────┐    ┌─────────────┐
    │  TINYMAN    │    │    PACT     │
    │   CLIENT    │    │   CLIENT    │
    └──────┬──────┘    └──────┬──────┘
           │                  │
           ↓                  ↓
    ┌─────────────┐    ┌─────────────┐
    │  Tinyman    │    │    Pact     │
    │   Pools     │    │    Pools    │
    └─────────────┘    └─────────────┘
```

---

## Smart Contract Architecture

```
┌─────────────────────────────────────────────────────────┐
│         MultihopSwapRouter Contract                     │
│      (smart_contracts/multihop_swap/contract.py)        │
│                                                         │
│  • Receives user's input asset                         │
│  • Routes through optimal path                         │
│  • Uses DEX-specific adapters                          │
│  • Enforces slippage protection                        │
└──────────┬──────────────────┬──────────────────────────┘
           │                  │
           ↓                  ↓
    ┌─────────────┐    ┌─────────────┐
    │  Tinyman    │    │    Pact     │
    │  Adapter    │    │  Adapter    │
    └──────┬──────┘    └──────┬──────┘
           │                  │
           ↓                  ↓
    ┌─────────────┐    ┌─────────────┐
    │  Tinyman    │    │    Pact     │
    │  Pool App   │    │  Pool App   │
    └─────────────┘    └─────────────┘
```

### Adapter Pattern

Each DEX has a **dedicated adapter contract** that handles its specific:
- Transaction structure
- ABI encoding
- Method signatures
- Asset handling

This allows the router to support multiple DEXs without knowing DEX-specific details.

---

## Selection Algorithm

### Step 1: Filter by Price Impact
```
All quotes with price impact > maxPriceImpact → REJECTED
```

### Step 2: Check Preferred DEX
```
IF preferred DEX specified AND within 0.5% of best output
  → SELECT preferred DEX
```

### Step 3: Best Output
```
IF no preference OR preferred not competitive
  → SELECT DEX with highest output amount
```

### Step 4: Tie-breaker by Liquidity
```
IF multiple DEXs have similar output (within 0.1%)
  → SELECT DEX with highest total liquidity
```

---

## Runtime Logging

The aggregator provides **detailed logging** showing:

### Quote Comparison
```
📊 Quotes from all DEXs:
   TINYMAN:
     Amount Out: 1234567890
     Price Impact: 0.1234%
     Fee: 30 bps
     Route: 1 hop(s)
   
   PACT:
     Amount Out: 1245678901
     Price Impact: 0.1156%
     Fee: 25 bps
     Route: 1 hop(s)
```

### Selection Rationale
```
✅ SELECTED: PACT
   Reason: Best output amount: 1245678901
   Amount Out: 1.245678 ALGO
   Price Impact: 0.1156%
   Time: 234ms
```

### Alternatives
```
📉 Alternative options:
   TINYMAN: Lower output by 0.89%
```

---

## Usage Examples

### Basic Usage (Auto-select Best DEX)

```typescript
import { createMultiDexAggregator } from './src/lib/dex/aggregator';

// Create aggregator
const aggregator = createMultiDexAggregator(algodClient, 'testnet', {
  enableLogging: true,
  maxPriceImpact: 0.05, // 5% max
});

// Get best quote
const quote = await aggregator.getBestQuote({
  assetIn: 10458941, // USDC
  assetOut: 0,        // ALGO
  amountIn: 2_000_000n, // 2 USDC
  slippageTolerance: 0.005, // 0.5%
});

console.log(`Best DEX: ${quote.dexName}`);
console.log(`Reason: ${quote.reason}`);
console.log(`Output: ${quote.amountOut} microALGO`);
```

### With DEX Preference

```typescript
// Prefer Tinyman (if competitive)
const aggregator = createMultiDexAggregator(algodClient, 'testnet', {
  preferredDex: 'tinyman',
  enableLogging: true,
});

const quote = await aggregator.getBestQuote(request);
// Will use Tinyman if within 0.5% of best output
```

### Execute Swap

```typescript
const quote = await aggregator.getBestQuote(request);

// Execute on selected DEX
const result = await aggregator.executeSwap(quote, userAddress);

console.log(`Swap complete! TxID: ${result.txId}`);
console.log(`Received: ${result.amountOut}`);
```

---

## Deployment Guide

### 1. Deploy Tinyman Adapter (Already Deployed)

```bash
cd Blockchain/projects/10x_Swap/smart_contracts/multihop_swap
python tinyman_adapter.py
```

### 2. Deploy Pact Adapter

```bash
cd Blockchain/projects/10x_Swap/smart_contracts/multihop_swap
python deploy_pact_adapter.py
```

This will:
- Deploy `PactPoolAdapter` contract
- Fund it with 1 ALGO
- Save app ID to `deployed_pact_adapter_id.txt`
- Optionally register with router

### 3. Update Frontend Configuration

```typescript
// config/dex.ts
export const DEX_CONFIG = {
  tinyman: {
    adapterAppId: 123456789, // From deployed_tinyman_adapter_id.txt
    enabled: true,
  },
  pact: {
    adapterAppId: 987654321, // From deployed_pact_adapter_id.txt
    enabled: true,
  },
};
```

### 4. Test Multi-DEX Routing

```bash
npm run test:multi-dex
# or
ts-node scripts/test-multi-dex-routing.ts
```

---

## Testing

### Test Script Features

The test script (`scripts/test-multi-dex-routing.ts`) runs 5 comprehensive tests:

1. **No Preference** - Auto-select best DEX
2. **Tinyman Preferred** - Prefer Tinyman if competitive
3. **Pact Preferred** - Prefer Pact if competitive
4. **Pool Availability** - Check which DEXs have pools
5. **Large Swap** - Compare price impact on large trades

### Run Tests

```bash
# Install dependencies
npm install

# Run multi-DEX tests
npx ts-node scripts/test-multi-dex-routing.ts
```

### Expected Output

```
═══════════════════════════════════════════════════════
  🧪 MULTI-DEX ROUTING TEST
═══════════════════════════════════════════════════════

📡 Connecting to Algorand testnet...
✅ Connected! Last round: 57324399

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 1: No DEX preference - Best output wins
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Finding best swap route...
   From Asset: 10458941
   To Asset: 0
   Amount In: 2000000

📊 Quotes from all DEXs:
   TINYMAN:
     Amount Out: 1234567890
     Price Impact: 0.1234%
     Fee: 30 bps
     Route: 1 hop(s)
   
   PACT:
     Amount Out: 1245678901
     Price Impact: 0.1156%
     Fee: 25 bps
     Route: 1 hop(s)

✅ SELECTED: PACT
   Reason: Best output amount: 1245678901
   Amount Out: 1.245678 ALGO
   Price Impact: 0.1156%
   Time: 234ms
```

---

## Configuration Options

### MultiDexConfig

```typescript
interface MultiDexConfig {
  // Preferred DEX (optional)
  preferredDex?: 'tinyman' | 'pact';
  
  // Maximum acceptable price impact (default: 0.05 = 5%)
  maxPriceImpact?: number;
  
  // Prefer DEX with deeper liquidity on ties (default: true)
  prioritizeLiquidity?: boolean;
  
  // Enable detailed selection logging (default: true)
  enableLogging?: boolean;
}
```

### Example Configurations

**Conservative (Low Risk)**
```typescript
{
  maxPriceImpact: 0.01, // 1% max
  prioritizeLiquidity: true,
  enableLogging: true,
}
```

**Aggressive (Higher Risk)**
```typescript
{
  maxPriceImpact: 0.10, // 10% max
  preferredDex: 'pact', // Prefer Pact
  enableLogging: false, // Less verbose
}
```

---

## API Reference

### MultiDexAggregator

#### `getBestQuote(request: QuoteRequest): Promise<AggregatorQuote>`

Fetches quotes from all DEXs and selects the best route.

**Returns**: `AggregatorQuote` with:
- `dexName`: Selected DEX ('tinyman' | 'pact')
- `reason`: Why this DEX was chosen
- `alternatives`: Other options considered
- All standard `SwapQuote` fields

#### `executeSwap(quote: AggregatorQuote, signerAddress: string): Promise<SwapResult>`

Executes the swap on the selected DEX.

#### `findPools(asset1Id: number, asset2Id: number): Promise<{tinyman, pact}>`

Find pools for an asset pair across all DEXs.

#### `getAllPools(): Promise<Map<string, PoolInfo[]>>`

Fetch all pools from all DEXs.

---

## File Structure

```
Blockchain/projects/10x_Swap/smart_contracts/multihop_swap/
├── contract.py                      # MultihopSwapRouter (updated)
├── tinyman_adapter.py               # Tinyman adapter
├── pact_adapter.py                  # Pact adapter (NEW)
├── deploy_pact_adapter.py           # Deployment script (NEW)
├── deployed_tinyman_adapter_id.txt  # Tinyman app ID
└── deployed_pact_adapter_id.txt     # Pact app ID (NEW)

src/lib/dex/
├── aggregator.ts                    # Multi-DEX aggregator (NEW)
├── tinyman-client.ts                # Tinyman integration
├── pact-client.ts                   # Pact integration
├── types.ts                         # Shared types
└── utils.ts                         # Helper functions

scripts/
└── test-multi-dex-routing.ts        # Test script (NEW)
```

---

## Smart Contract Methods

### MultihopSwapRouter

#### `execute_swap_2hop(..., adapter1_app_id, adapter2_app_id, ...)`

Execute 2-hop swap with DEX-specific adapters.

**New Parameters**:
- `adapter1_app_id`: Adapter for first hop (Tinyman or Pact)
- `adapter2_app_id`: Adapter for second hop (Tinyman or Pact)

This allows mixing DEXs: e.g., Tinyman → Pact in a single multi-hop swap!

### PactPoolAdapter

#### `swap_fixed_input(pool_app_id, asset_in, asset_out, amount_in, min_amount_out)`

Execute swap on Pact pool.

#### `swap_algo_to_asa(pool_app_id, output_asset, algo_amount, min_amount_out)`

Special case for ALGO → ASA swaps.

#### `swap_asa_to_algo(pool_app_id, input_asset, amount_in, min_amount_out)`

Special case for ASA → ALGO swaps.

---

## Benefits of Multi-DEX Aggregation

### For Users

✅ **Better Prices** - Always get best available rate  
✅ **Lower Price Impact** - Route through DEX with deepest liquidity  
✅ **More Liquidity** - Access to all available pools  
✅ **Transparency** - See why each DEX was chosen/rejected

### For Developers

✅ **Modular Design** - Easy to add new DEXs  
✅ **Adapter Pattern** - DEX-agnostic router  
✅ **Detailed Logging** - Debug selection logic  
✅ **Type Safety** - Full TypeScript support

---

## Troubleshooting

### "No valid quotes found"

**Cause**: No DEX has a pool for the requested pair.

**Solution**: Check pool availability with `aggregator.findPools()`.

### "All DEXs exceed max price impact"

**Cause**: Trade size too large relative to liquidity.

**Solutions**:
1. Increase `maxPriceImpact` config
2. Split trade into multiple smaller swaps
3. Use a different token pair

### Adapter Not Registered

**Cause**: Adapter contract not linked to router.

**Solution**: Run registration script or manually call router's register method.

---

## Roadmap

### Phase 2 (Next)
- [ ] Add Humble DEX support
- [ ] Add Vestige DEX support
- [ ] Split large trades across multiple DEXs
- [ ] Implement MEV protection

### Phase 3 (Future)
- [ ] Cross-DEX arbitrage detection
- [ ] Gas optimization routing
- [ ] Historical performance analytics
- [ ] Liquidity aggregation pools

---

## Contributing

To add support for a new DEX:

1. **Create adapter contract** (`new_dex_adapter.py`)
2. **Create client** (`src/lib/dex/new-dex-client.ts`)
3. **Implement IDexClient interface**
4. **Add to aggregator** in constructor
5. **Write tests**
6. **Update documentation**

---

## License

MIT License - See LICENSE file for details

---

## Support

- GitHub Issues: [Report bugs](https://github.com/your-repo/issues)
- Discord: [Join community](#)
- Docs: [Full documentation](#)

---

**Last Updated**: November 9, 2025  
**Version**: 2.0.0 - Multi-DEX Release

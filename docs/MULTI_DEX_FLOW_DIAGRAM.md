# Multi-DEX Swap Flow Visualization

## Complete Swap Flow with Adapter Selection

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER INITIATES SWAP                        │
│                    "Swap 2 USDC for ALGO"                         │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│                    FRONTEND / API LAYER                            │
│                  (src/app/api/swap/prepare)                        │
│                                                                     │
│  1. Receives user request                                         │
│  2. Creates MultiDexAggregator                                    │
│  3. Requests quotes from all DEXs                                 │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│                   MULTI-DEX AGGREGATOR                             │
│                  (src/lib/dex/aggregator.ts)                       │
│                                                                     │
│  📊 PARALLEL QUOTE FETCHING                                       │
│  ┌─────────────────┐          ┌─────────────────┐               │
│  │  Tinyman Client │          │   Pact Client   │               │
│  │  getQuote()     │          │   getQuote()    │               │
│  └────────┬────────┘          └────────┬────────┘               │
│           │                             │                         │
│           ↓                             ↓                         │
│     Tinyman API                    Pact API                       │
│     Quote: 1.234 ALGO              Quote: 1.245 ALGO             │
│     Impact: 0.12%                  Impact: 0.11%                 │
│                                                                     │
│  🎯 SELECTION ALGORITHM                                           │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 1. Filter by max price impact (5%)       ✅ Both │           │
│  │ 2. Check preferred DEX                   ❌ None │           │
│  │ 3. Select highest output            → PACT WINS  │           │
│  │ 4. Liquidity tie-breaker (if needed)    N/A      │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                     │
│  📝 LOGGING OUTPUT:                                               │
│  "✅ SELECTED: PACT                                               │
│   Reason: Best output amount: 1245000 microALGO                  │
│   Price Impact: 0.11%"                                            │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│                   TRANSACTION BUILDER                              │
│                  (Selected DEX: PACT)                              │
│                                                                     │
│  Builds atomic transaction group:                                 │
│  ┌────────────────────────────────────────────────┐              │
│  │ Txn 0: Asset Transfer                          │              │
│  │   Sender: User                                 │              │
│  │   Receiver: MultihopSwapRouter                 │              │
│  │   Asset: USDC (10458941)                       │              │
│  │   Amount: 2,000,000 microUSDC                  │              │
│  └────────────────────────────────────────────────┘              │
│                                                                     │
│  ┌────────────────────────────────────────────────┐              │
│  │ Txn 1: Application Call                        │              │
│  │   App: MultihopSwapRouter                      │              │
│  │   Method: execute_swap_2hop()                  │              │
│  │   Args:                                         │              │
│  │     - pool_app_id: PACT_POOL_ID               │              │
│  │     - adapter_app_id: PACT_ADAPTER_ID   ← KEY │              │
│  │     - min_output: 1,233,000 (w/ slippage)     │              │
│  └────────────────────────────────────────────────┘              │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│              ON-CHAIN: MULTIHOP SWAP ROUTER                        │
│         (MultihopSwapRouter Smart Contract)                        │
│                                                                     │
│  1. Receives 2 USDC from user                                     │
│  2. Validates transaction group                                    │
│  3. Calls _swap_via_adapter() subroutine                          │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│              ON-CHAIN: PACT POOL ADAPTER                           │
│           (PactPoolAdapter Smart Contract)                         │
│                                                                     │
│  📝 ADAPTER-SPECIFIC LOGIC FOR PACT:                              │
│                                                                     │
│  1. Receives 2 USDC from router                                   │
│  2. Transfers USDC to Pact pool                                   │
│  3. Calls Pact's SWAP method with correct ABI:                    │
│     Method: "SWAP(uint64,uint64)uint64"                           │
│     Args: [amount_in, min_out]                                    │
│  4. Receives output ALGO from pool                                │
│  5. Returns output amount to router                               │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│                    ON-CHAIN: PACT POOL                             │
│                 (Pact Finance Pool App)                            │
│                                                                     │
│  Pool State:                                                       │
│  - USDC Reserve: 1,000,000 → 1,000,002 (+2)                      │
│  - ALGO Reserve: 500,000 → 498,755 (-1.245)                      │
│                                                                     │
│  Calculation (Constant Product):                                   │
│  output = (amount_in × reserve_out × 9975) /                      │
│           (reserve_in × 10000 + amount_in × 9975)                 │
│         = 1,245,000 microALGO                                     │
│                                                                     │
│  ✅ Sends 1.245 ALGO back to adapter                              │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│              BACK TO: PACT POOL ADAPTER                            │
│                                                                     │
│  Received: 1,245,000 microALGO from pool                          │
│  Verifies: output >= min_amount_out ✅                            │
│  Transfers: 1.245 ALGO to router                                  │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│              BACK TO: MULTIHOP SWAP ROUTER                         │
│                                                                     │
│  Received: 1,245,000 microALGO from adapter                       │
│  Verifies: output >= min_output ✅                                │
│  Transfers: 1.245 ALGO to USER                                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│                     TRANSACTION CONFIRMED                          │
│                                                                     │
│  Block: 57324399                                                   │
│  TxID: V47MI6Y3PBOASAK2LVNQ7D3QNQVXY2IEEM5KG2LONHGKHPMBU5MA       │
│                                                                     │
│  USER BALANCES (BEFORE → AFTER):                                  │
│  • USDC: 100 → 98 (-2)                                            │
│  • ALGO: 50 → 51.245 (+1.245)                                     │
│                                                                     │
│  🎉 SWAP COMPLETE!                                                │
└────────────────────────────────────────────────────────────────────┘
```

---

## Why This Architecture?

### 🎯 Adapter Pattern Benefits

```
┌─────────────────────────────────────────────────────────────┐
│  WITHOUT ADAPTERS (Old Way)                                 │
│                                                              │
│  Router needs to know:                                      │
│  • Tinyman's method signature: "swap(uint64,uint64)uint64" │
│  • Pact's method signature: "SWAP(uint64,uint64)uint64"    │
│  • Humble's method signature: "execute_swap(...)"           │
│  • Each DEX's transaction structure                         │
│                                                              │
│  ❌ Router becomes bloated and complex                      │
│  ❌ Hard to add new DEXs                                    │
│  ❌ Can't mix DEXs in multi-hop                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  WITH ADAPTERS (New Way)                                    │
│                                                              │
│  Router only knows:                                         │
│  • Universal adapter interface:                             │
│    "swap_fixed_input(pool, asset_in, asset_out, ...)       │
│  • How to call adapters                                     │
│                                                              │
│  Adapters handle DEX-specific details:                      │
│  • TinymanAdapter → Tinyman-specific logic                 │
│  • PactAdapter → Pact-specific logic                       │
│  • HumbleAdapter → Humble-specific logic                   │
│                                                              │
│  ✅ Clean, modular design                                   │
│  ✅ Easy to add new DEXs (just add adapter)                │
│  ✅ Can mix DEXs: Tinyman → Pact → Humble                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Multi-Hop with Mixed DEXs

```
USER WANTS: USDC → PLANET → ALGO

Step 1: Aggregator finds best route
┌────────────────────────────────────────────────┐
│ Route Option 1: All Tinyman                   │
│ USDC → PLANET (Tinyman) → ALGO (Tinyman)     │
│ Output: 1.20 ALGO, Impact: 0.5%              │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ Route Option 2: Mixed DEXs  ← BEST            │
│ USDC → PLANET (Pact) → ALGO (Tinyman)        │
│ Output: 1.25 ALGO, Impact: 0.3%              │
└────────────────────────────────────────────────┘

Step 2: Router executes with TWO different adapters
┌──────────────────────────────────────────────────────┐
│ MultihopSwapRouter.execute_swap_2hop(               │
│   input_asset: USDC,                                 │
│   intermediate_asset: PLANET,                        │
│   output_asset: ALGO,                                │
│   pool1_app_id: PACT_PLANET_USDC_POOL,              │
│   pool2_app_id: TINYMAN_ALGO_PLANET_POOL,           │
│   adapter1_app_id: PACT_ADAPTER,        ← Pact      │
│   adapter2_app_id: TINYMAN_ADAPTER,     ← Tinyman   │
│   min_output: 1.24 ALGO,                            │
│   receiver: USER                                     │
│ )                                                    │
└──────────────────────────────────────────────────────┘

Result: Best of both DEXs in ONE atomic swap! 🎉
```

---

## Selection Decision Tree

```
                    START: Get Quotes
                           │
                           ↓
        ┌──────────────────────────────────┐
        │  Fetch quotes from ALL DEXs      │
        │  • Tinyman                       │
        │  • Pact                          │
        │  • Future: Humble, Vestige, etc. │
        └──────────┬───────────────────────┘
                   │
                   ↓
        ┌──────────────────────────────────┐
        │  Filter by Price Impact          │
        │  Max: 5% (configurable)          │
        └──────────┬───────────────────────┘
                   │
        ┌──────────┴───────────┐
        │                      │
        ↓                      ↓
   All pass              Some rejected
        │                      │
        │              Log: "Rejected due to
        │               high price impact"
        │                      │
        └──────────┬───────────┘
                   │
                   ↓
        ┌──────────────────────────────────┐
        │  Check for Preferred DEX         │
        │  (if configured)                 │
        └──────────┬───────────────────────┘
                   │
        ┌──────────┴───────────┐
        │                      │
        ↓                      ↓
   No preference        Has preference
        │                      │
        │              ┌───────┴────────┐
        │              │                │
        │              ↓                ↓
        │         Within 0.5%?     Outside 0.5%?
        │              │                │
        │              ↓                ↓
        │         Use preferred    Ignore preference
        │              │                │
        └──────────────┴────────────────┘
                       │
                       ↓
        ┌──────────────────────────────────┐
        │  Select by Best Output           │
        └──────────┬───────────────────────┘
                   │
                   ↓
        ┌──────────────────────────────────┐
        │  Tie? (within 0.1%)              │
        │  → Choose highest liquidity      │
        └──────────┬───────────────────────┘
                   │
                   ↓
        ┌──────────────────────────────────┐
        │  🎯 DEX SELECTED!                │
        │                                  │
        │  Log:                            │
        │  "✅ SELECTED: PACT              │
        │   Reason: Best output amount     │
        │   Output: 1.245 ALGO             │
        │   Price Impact: 0.11%"           │
        └──────────┬───────────────────────┘
                   │
                   ↓
        ┌──────────────────────────────────┐
        │  Execute Swap on Selected DEX    │
        └──────────────────────────────────┘
```

---

## Logging Output Example

```
🔄 Multi-DEX Aggregator initialized
   Available DEXs: tinyman, pact
   Network: testnet
   Config: { maxPriceImpact: 0.05, prioritizeLiquidity: true }

🔍 Finding best swap route...
   From Asset: 10458941 (USDC)
   To Asset: 0 (ALGO)
   Amount In: 2000000 microUSDC

📊 Quotes from all DEXs:
   TINYMAN:
     Amount Out: 1234567
     Price Impact: 0.1234%
     Fee: 30 bps
     Route: 1 hop(s)
     Pool Liquidity: 5000000000
   
   PACT:
     Amount Out: 1245678
     Price Impact: 0.1156%
     Fee: 25 bps
     Route: 1 hop(s)
     Pool Liquidity: 8000000000

✅ SELECTED: PACT
   Reason: Best output amount: 1245678
   Amount Out: 1.245678 ALGO
   Price Impact: 0.1156%
   Time: 234ms

📉 Alternative options:
   TINYMAN: Lower output by 0.89%

🚀 Executing swap on PACT...
   Adapter App ID: 987654321
   Pool App ID: 605316866
   Min Output: 1239548 (w/ 0.5% slippage)

✅ Swap completed!
   Transaction ID: V47MI6Y3PBOASAK2LVNQ7D3QNQVXY2IEEM5KG2LONHGKHPMBU5MA
   Confirmed Round: 57324399
   Amount Out: 1245678 microALGO (1.245678 ALGO)
   
   YOUR BALANCES:
   USDC: 100 → 98 (-2)
   ALGO: 50 → 51.245678 (+1.245678)
```

---

## Summary

### What Makes This Architecture Powerful?

1. **🔄 Automatic DEX Selection**
   - No manual DEX choice needed
   - Always gets best available rate

2. **📊 Transparent Decision Making**
   - See exactly why each DEX was chosen
   - Compare alternatives

3. **🧩 Modular Design**
   - Easy to add new DEXs
   - Each DEX isolated in adapter

4. **🚀 Mixed DEX Multi-Hop**
   - Can use Tinyman for hop 1, Pact for hop 2
   - Optimize each leg independently

5. **⚡ Performance**
   - Parallel quote fetching
   - Efficient on-chain execution

---

**Next**: See `MULTI_DEX_CHECKLIST.md` for deployment steps!

# Under The Hood: 10xSwap Technical Deep Dive

**A technical exploration of how 10xSwap's core features work internally - from bonding curves to multi-DEX routing.**

**Last Updated:** 2025-11-15

---

## Table of Contents

1. [MCP Server Analytics](#1-mcp-server-analytics)
2. [Token Launchpad (WaveBreak)](#2-token-launchpad-wavebreak)
3. [Multiroute/Multihop Swaps](#3-multiroutemultihop-swaps)
4. [Autopilot Rules System](#4-autopilot-rules-system)

---

## 1. MCP Server Analytics

### What is MCP?

The **Model Context Protocol (MCP) Server** is 10xSwap's analytics engine that provides cryptocurrency market analysis, price predictions, and strategy recommendations. It acts as a backend intelligence layer that powers the AI agent's analytical capabilities.

**Location:** `src/lib/mcp_server/main.ts`

### How It Works

#### Architecture

```
┌─────────────────────────────────────────────────────┐
│          Frontend AI Chat Interface                 │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP POST
                   ▼
┌─────────────────────────────────────────────────────┐
│          MCP Server (Express.js)                    │
│          Port: 8080 (configurable)                  │
│                                                     │
│  POST /analyze                                      │
│  POST /suggest-rule                                 │
│  GET  /rule-model                                   │
│  GET  /health                                       │
└──────────────────┬──────────────────────────────────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
      ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ CoinGecko│ │Technical │ │  Chart   │
│   API    │ │Indicators│ │Generator │
└──────────┘ └──────────┘ └──────────┘
```

#### Core Analysis Pipeline

When a user requests analysis for a cryptocurrency (e.g., "Analyze Bitcoin"):

**Step 1: Data Fetching**
```typescript
// Fetch real historical price data from CoinGecko
const historicalData = await fetchHistoricalData(coin, horizonDays, granularity)

// Returns OHLCV data structure:
interface OHLCV {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}
```

**Step 2: Technical Indicator Computation**
```typescript
const indicators = computeIndicators(historicalData)

// Calculates:
// - RSI (Relative Strength Index - 14 period)
// - MACD (Moving Average Convergence Divergence)
// - 30/50-day Moving Averages
// - Historical Volatility
// - Trend Strength (R² coefficient)
// - Momentum indicators
```

**Step 3: Multi-Factor Analysis**

The server performs parallel analysis tasks:

1. **Summary Generation**
   - Current price vs moving averages
   - RSI overbought/oversold signals
   - MACD trend signals
   - Volatility assessment

2. **Price Prediction**
   ```typescript
   // Multi-factor regression model
   function generatePredictionsDetailed(historicalData, horizonDays, currentPrice) {
     const trend = calculateTrendLine(historicalData)
     const volatility = calculateVolatility(historicalData)
     const momentum = calculateMomentum(historicalData)
     
     // Generate predictions with confidence intervals
     // Confidence decreases exponentially with time horizon
     return predictions.map((pred, index) => ({
       date: futureDate,
       price: predictedPrice,
       probability: confidence * Math.exp(-index * decayFactor)
     }))
   }
   ```

3. **Strategy Recommendations**
   - DCA (Dollar-Cost Averaging) suggestions
   - Rebalancing opportunities
   - Risk-adjusted position sizing

4. **Chart Generation**
   - Creates visual charts stored in `mcp_server/charts/`
   - Supports: line, bar, candlestick, area charts
   - Overlays technical indicators and predictions

**Step 4: Response Assembly**
```typescript
const response: AnalyzeResponse = {
  ok: true,
  summary: "Bitcoin currently trading at $45,230...",
  insights: [
    "RSI at 58 indicates neutral momentum",
    "Price above 50-day MA ($42,100) - bullish signal",
    "MACD histogram positive - uptrend confirmed"
  ],
  predictions: [
    { date: "2025-11-22", price: 47500, probability: 0.85 },
    { date: "2025-11-29", price: 49200, probability: 0.72 }
  ],
  strategies: [
    { name: "DCA Strategy", description: "...", risk: "low" }
  ],
  charts: [
    { title: "BTC Price Chart", url: "/charts/btc-price-1234.png" }
  ],
  methodology: {
    dataPoints: 720,
    timeframe: "30 days (30 data points per day)",
    method: "Multi-Factor Regression + Technical Analysis",
    indicators: ["RSI (14-period)", "MACD", "30/50-day MA"],
    confidence: "Based on 720 real price points from CoinGecko API",
    calculations: "Detailed breakdown..." 
  }
}
```

### Current Capabilities

✅ **Working Well:**
- Real-time data fetching from CoinGecko API
- Accurate technical indicator calculations (RSI, MACD, MA)
- Multi-factor prediction algorithm with confidence intervals
- Automated chart generation (4 chart types supported)
- RESTful API with proper error handling
- Methodology transparency (shows calculations)

### Needs Improvement

⚠️ **Areas for Enhancement:**

1. **Prediction Accuracy**
   - Current: Simple regression with technical indicators
   - Needed: Machine learning models (LSTM, Prophet, ensemble methods)
   - Challenge: Crypto markets are highly volatile and unpredictable

2. **Data Sources**
   - Current: Only CoinGecko API
   - Needed: Multi-source aggregation (Binance, Kraken, on-chain data)
   - Benefit: More robust analysis with cross-validation

3. **Real-Time Analysis**
   - Current: On-demand analysis only
   - Needed: WebSocket streaming for live updates
   - Use case: Real-time alerts and autopilot triggers

4. **Advanced Indicators**
   - Current: Basic TA indicators
   - Needed: On-chain metrics (TVL, whale activity, gas fees)
   - Platform-specific: Algorand TPS, staking metrics, ASA flows

5. **Caching Layer**
   - Current: No caching - every request fetches fresh data
   - Needed: Redis/in-memory cache with configurable TTL
   - Benefit: Faster responses, reduced API calls

6. **Rate Limiting**
   - Current: Basic authorization with API key
   - Needed: Per-user rate limits, request quotas
   - Protection: Prevent API abuse and cost overruns

---

## 2. Token Launchpad (WaveBreak)

### What is WaveBreak?

**WaveBreak** is a fair-launch platform that uses **bonding curves** to enable transparent, bot-resistant token distribution. Instead of traditional fixed-price presales, prices adjust algorithmically based on demand.

**Smart Contract:** `src/lib/launchpad/contracts/bonding_curve.py` (PyTeal)

### Bonding Curve Mathematics

A bonding curve is a mathematical function that determines token price based on supply sold:

```
Price = f(tokens_sold, tokens_for_sale, base_price, max_price)
```

#### 1. Linear Bonding Curve

**Formula:**
```python
price = base_price + (max_price - base_price) * (tokens_sold / tokens_for_sale)
```

**How it works:**
- Price increases **linearly** as tokens are sold
- Predictable, steady price growth
- Fair for gradual accumulation

**Example:**
```
Tokens for sale: 1,000,000
Base price: 0.001 ALGO
Max price: 0.010 ALGO

At 0% sold:    price = 0.001 ALGO
At 25% sold:   price = 0.00325 ALGO
At 50% sold:   price = 0.0055 ALGO
At 75% sold:   price = 0.00775 ALGO
At 100% sold:  price = 0.010 ALGO
```

**Visualization:**
```
Price │         ╱
      │       ╱
      │     ╱
      │   ╱
      │ ╱
      └─────────────> Supply Sold
```

#### 2. Exponential Bonding Curve

**Formula (Integer Approximation):**
```python
progress = tokens_sold * 100 / tokens_for_sale  # 0-100%
multiplier = 2 ** (progress / 50)  # Doubles every 50%
price = base_price * multiplier
```

**How it works:**
- Price **accelerates** as more tokens are sold
- Incentivizes early buyers heavily
- Late buyers pay exponentially more

**Example:**
```
Base price: 0.001 ALGO
Max price: 0.016 ALGO

At 0% sold:    price = 0.001 ALGO  (1x)
At 25% sold:   price = 0.0014 ALGO (1.41x)
At 50% sold:   price = 0.002 ALGO  (2x)
At 75% sold:   price = 0.0028 ALGO (2.83x)
At 100% sold:  price = 0.004 ALGO  (4x)
```

**Visualization:**
```
Price │              ╱
      │           ╱
      │        ╱
      │     ╱
      │  ╱
      └─────────────> Supply Sold
```

#### 3. Sigmoid Bonding Curve (S-Curve)

**Formula (Piecewise Approximation):**
```python
progress = tokens_sold * 100 / tokens_for_sale

if progress < 25%:
    # Slow start
    growth_rate = 1.0
    price_delta = (max_price - base_price) * progress / 100
    
elif progress < 75%:
    # Rapid middle
    growth_rate = 2.0
    price_delta = (max_price - base_price) * 2 * (progress - 25) / 100
    
else:
    # Slow end
    growth_rate = 0.5
    price_delta = (max_price - base_price) * (50 + (progress - 75) / 2) / 100

price = base_price + price_delta
```

**How it works:**
- **Slow start** (0-25%): Gentle price increase
- **Rapid middle** (25-75%): Steep price acceleration
- **Slow end** (75-100%): Price plateaus

**Example:**
```
Base price: 0.001 ALGO
Max price: 0.010 ALGO

At 0% sold:    price = 0.001 ALGO
At 25% sold:   price = 0.00325 ALGO  (slow)
At 50% sold:   price = 0.0055 ALGO   (rapid)
At 75% sold:   price = 0.0055 ALGO   (plateau)
At 100% sold:  price = 0.010 ALGO
```

**Visualization:**
```
Price │        ╭────
      │      ╱
      │     │
      │    ╱
      │  ╱
      └─────────────> Supply Sold
```

### Contract Functions Explained

#### `initialize()`
**Purpose:** Configure bonding curve parameters before activation

**Key Logic:**
```python
@app.external(authorize=Authorize.only(Global.creator_address()))
def initialize(
    token_asa_id, curve_type, base_price, max_price,
    bonding_target, tokens_for_sale, liquidity_percentage,
    lp_lock_duration, max_purchase_per_txn, cooldown_rounds
):
    # Validation
    Assert(app.state.is_active.get() == Int(0))  # Must be pending
    Assert(curve_type.get() <= Int(2))           # Valid curve type
    Assert(base_price.get() < max_price.get())   # Sensible pricing
    
    # Store configuration
    app.state.token_asa_id.set(token_asa_id.get())
    app.state.curve_type.set(curve_type.get())
    # ... store other params
```

**Anti-Manipulation:**
- Only creator can initialize
- Can only initialize once (when status = pending)
- Validates parameters (curve type, price ranges)

#### `activate()`
**Purpose:** Start the token sale after contract is funded

**Key Logic:**
```python
@app.external(authorize=Authorize.only(Global.creator_address()))
def activate():
    # Verify contract holds the tokens
    token_balance = AssetHolding.balance(
        Global.current_application_address(),
        app.state.token_asa_id.get()
    )
    Assert(token_balance.value() >= app.state.tokens_for_sale.get())
    
    # Activate
    app.state.is_active.set(Int(1))  # Status = ACTIVE
    app.state.launch_round.set(Global.round())
```

**Safety Check:**
- Verifies contract actually holds the tokens
- Prevents activation without funding
- Records launch round for analytics

#### `buy_tokens()`
**Purpose:** Purchase tokens from the bonding curve

**Key Logic:**
```python
@app.external
def buy_tokens(payment, token_amount, *, output):
    # 1. Validate sale is active
    Assert(app.state.is_active.get() == Int(1))
    
    # 2. Check anti-bot cooldown
    Assert(
        Global.round() >= 
        user_last_purchase + app.state.cooldown_rounds.get()
    )
    
    # 3. Check purchase limits
    Assert(token_amount.get() <= app.state.max_purchase_per_txn.get())
    
    # 4. Calculate current price from curve
    current_price.store(get_current_price())
    cost.store(current_price.load() * token_amount.get() / 1_000_000)
    
    # 5. Verify payment
    Assert(payment.get().amount() >= cost.load())
    
    # 6. Calculate early buyer points
    points.store(calculate_early_buyer_points(token_amount.get()))
    
    # 7. Transfer tokens to buyer
    InnerTxnBuilder.Execute({
        TxnField.type_enum: TxnType.AssetTransfer,
        TxnField.xfer_asset: app.state.token_asa_id.get(),
        TxnField.asset_amount: token_amount.get(),
        TxnField.asset_receiver: Txn.sender(),
    })
    
    # 8. Update global state
    app.state.tokens_sold.set(tokens_sold + token_amount)
    app.state.algo_raised.set(algo_raised + cost)
    
    # 9. Update user local state
    user_local_state.tokens_purchased.set(...)
    user_local_state.points_earned.set(...)
    user_local_state.last_purchase_round.set(Global.round())
```

**Multi-Layer Protection:**
1. **Active sale check** - Can't buy when paused/graduated
2. **Cooldown enforcement** - Prevents rapid-fire bot purchases
3. **Purchase limits** - Max tokens per transaction
4. **Price calculation** - Real-time curve-based pricing
5. **Payment verification** - Must send enough ALGO
6. **Points calculation** - Rewards early buyers
7. **Atomic execution** - All-or-nothing transaction
8. **State updates** - Global + user tracking

### Anti-Bot Mechanisms

#### 1. Cooldown Periods
```python
# User must wait N rounds between purchases
cooldown_rounds = 100  # ~8.3 minutes on Algorand

if user_last_purchase_round > 0:
    assert Global.round() >= user_last_purchase_round + cooldown_rounds
```

**Why it works:**
- Bots often make rapid consecutive purchases
- Forces spacing between transactions
- Humans naturally spaced, bots artificially delayed

#### 2. Per-Transaction Limits
```python
# Maximum tokens per single transaction
max_purchase_per_txn = 10_000 tokens

assert token_amount <= max_purchase_per_txn
```

**Why it works:**
- Prevents whale dumps
- Ensures wider distribution
- Bots can't scoop entire supply

#### 3. Opt-In Requirement
```python
@app.opt_in
def opt_in():
    # User must opt-in to store local state
    return Approve()
```

**Why it works:**
- Requires intentional action
- Costs MBR (Minimum Balance Requirement)
- Creates friction for bot accounts

#### 4. Early Buyer Rewards
```python
def calculate_early_buyer_points(tokens_purchased):
    progress = tokens_sold * 100 / tokens_for_sale
    multiplier = 100 - progress  # 100 → 0 as sale progresses
    return tokens_purchased * multiplier / 100
```

**Why it works:**
- Incentivizes genuine early supporters
- Points = 3x at start, 1x at end
- Future utility (governance, airdrops, fee discounts)

### Automated DEX Graduation

#### `graduate_to_dex()`
**Purpose:** Create liquidity pool when funding target reached

**Key Logic:**
```python
@app.external(authorize=Authorize.only(Global.creator_address()))
def graduate_to_dex(dex_pool_app_id):
    # Validate target reached
    Assert(app.state.algo_raised.get() >= app.state.bonding_target.get())
    
    # Calculate liquidity amounts
    liquidity_algo = algo_raised * liquidity_percentage / 100
    liquidity_tokens = tokens_for_sale - tokens_sold
    
    # Mark as graduated
    app.state.is_active.set(Int(2))  # Status = GRADUATED
    app.state.dex_pool_app_id.set(dex_pool_app_id.get())
    app.state.graduation_round.set(Global.round())
```

**Off-Chain Process:**
1. Monitor bonding curve contract
2. When `algo_raised >= bonding_target`:
   - Create Tinyman/Pact liquidity pool
   - Add liquidity (80% of raised ALGO + remaining tokens)
   - Lock LP tokens for 6 months
   - Call `graduate_to_dex()` with pool ID
3. Token now tradable on DEX!

### Current Outcomes

✅ **Working Well:**
- Three flexible bonding curve models
- Robust anti-bot protections
- Transparent on-chain pricing
- Early buyer incentives with points system
- Automated graduation tracking

### Needs Improvement

⚠️ **Areas for Enhancement:**

1. **Vesting Implementation**
   - Current: Points system without vesting
   - Needed: 30-day linear vesting contract
   - Benefit: Prevents immediate dumps after graduation

2. **LP Lock Enforcement**
   - Current: Graduation tracked, but LP lock is off-chain
   - Needed: Smart contract-enforced LP token lock
   - Security: Prevents rug pulls

3. **Dynamic Fee Structure**
   - Current: Fixed pricing from curve
   - Needed: Small protocol fee (0.5-1%) for platform sustainability
   - Use: Fund development, rewards pool

4. **Multi-Asset Support**
   - Current: ALGO-only purchases
   - Needed: Accept USDC, other stablecoins
   - Benefit: Lower barrier to entry

5. **Refund Mechanism**
   - Current: No refunds if target not reached
   - Needed: Refund contract if bonding target fails
   - Trust: Ensures participants don't lose funds

6. **Front-Running Protection**
   - Current: Public mempool allows front-running
   - Needed: Commit-reveal scheme or private transactions
   - Fairness: Prevents MEV exploitation

---

## 3. Multiroute/Multihop Swaps

### What is Multihop Routing?

**Multihop routing** enables swaps between any two assets by chaining multiple DEX pools together, even if no direct pool exists between them.

**Example:** Swap `ASA-A → ASA-B` through intermediate `ALGO`
```
ASA-A → ALGO (Tinyman Pool)
ALGO → ASA-B (Pact Pool)
```

**Smart Contracts:**
- Router: `Blockchain/projects/10x_Swap/smart_contracts/multihop_swap/contract.py`
- Tinyman Adapter: `multihop_swap/tinyman_adapter.py`
- Pact Adapter: `multihop_swap/pact_adapter.py`

### Routing Algorithm (Off-Chain)

**Location:** Frontend calculation before submitting swap

**Steps:**

1. **Graph Construction**
   ```typescript
   // Build graph of all available pools
   const pools = await fetchAllPools() // Tinyman + Pact
   const graph = buildPoolGraph(pools)
   
   // Graph structure:
   // {
   //   "ALGO": {
   //     "USDC": { dex: "tinyman", poolId: 123, fee: 0.003 },
   //     "USDT": { dex: "pact", poolId: 456, fee: 0.0025 }
   //   },
   //   "USDC": {
   //     "ALGO": { dex: "tinyman", poolId: 123, fee: 0.003 },
   //     "BTC": { dex: "pact", poolId: 789, fee: 0.003 }
   //   }
   // }
   ```

2. **Path Finding (Dijkstra's Algorithm)**
   ```typescript
   function findBestPath(assetIn, assetOut, amountIn, graph) {
     const paths = []
     
     // Find all possible paths (max 3 hops)
     for (const intermediate of Object.keys(graph[assetIn])) {
       // 1-hop: direct path
       if (graph[assetIn][assetOut]) {
         paths.push([assetIn, assetOut])
       }
       
       // 2-hop: through 1 intermediate
       if (graph[intermediate][assetOut]) {
         paths.push([assetIn, intermediate, assetOut])
       }
       
       // 3-hop: through 2 intermediates
       for (const intermediate2 of Object.keys(graph[intermediate])) {
         if (graph[intermediate2][assetOut]) {
           paths.push([assetIn, intermediate, intermediate2, assetOut])
         }
       }
     }
     
     // Simulate each path and rank by output amount
     const simulations = await Promise.all(
       paths.map(path => simulatePath(path, amountIn))
     )
     
     // Return path with highest output (accounting for fees)
     return simulations.sort((a, b) => b.outputAmount - a.outputAmount)[0]
   }
   ```

3. **Path Simulation**
   ```typescript
   async function simulatePath(path, amountIn) {
     let currentAmount = amountIn
     let totalFees = 0
     
     for (let i = 0; i < path.length - 1; i++) {
       const assetFrom = path[i]
       const assetTo = path[i + 1]
       const pool = graph[assetFrom][assetTo]
       
       // Get pool reserves
       const { reserve0, reserve1 } = await fetchPoolReserves(pool.poolId)
       
       // Calculate output using constant product formula
       const outputAmount = calculateSwapOutput(
         currentAmount,
         reserve0,
         reserve1,
         pool.fee
       )
       
       const fee = currentAmount * pool.fee
       totalFees += fee
       currentAmount = outputAmount
     }
     
     return {
       path,
       outputAmount: currentAmount,
       totalFees,
       priceImpact: calculatePriceImpact(amountIn, currentAmount)
     }
   }
   ```

4. **Constant Product Formula (AMM Math)**
   ```typescript
   function calculateSwapOutput(amountIn, reserveIn, reserveOut, fee) {
     // x * y = k (constant product)
     // amountOut = (reserveOut * amountIn) / (reserveIn + amountIn)
     
     const amountInWithFee = amountIn * (1 - fee)
     const numerator = reserveOut * amountInWithFee
     const denominator = reserveIn + amountInWithFee
     const amountOut = numerator / denominator
     
     return amountOut
   }
   ```

### On-Chain Execution

#### MultihopSwapRouter Contract

**Key Method: `execute_swap_2hop()`**

```python
@abimethod
def execute_swap_2hop(
    self,
    input_asset: Asset,
    intermediate_asset: Asset,
    output_asset: Asset,
    pool1_app_id: Application,
    pool2_app_id: Application,
    adapter1_app_id: Application,  # Tinyman or Pact adapter
    adapter2_app_id: Application,  # Tinyman or Pact adapter
    min_output: UInt64,
    receiver: Account,
) -> ARC4UInt64:
    # Step 1: Verify atomic group
    assert Global.group_size == UInt64(2)
    assert gtxn.Transaction(0).type == TransactionType.AssetTransfer
    assert gtxn.AssetTransferTransaction(0).xfer_asset == input_asset
    assert gtxn.AssetTransferTransaction(0).asset_receiver == Global.current_application_address
    
    input_amount = gtxn.AssetTransferTransaction(0).asset_amount
    
    # Step 2: Execute first hop (Input → Intermediate)
    intermediate_amount = self._swap_via_adapter(
        adapter_app_id=adapter1_app_id,
        pool_app_id=pool1_app_id,
        asset_in=input_asset,
        asset_out=intermediate_asset,
        amount_in=input_amount,
        min_amount_out=UInt64(0),  # No min check on intermediate hop
    )
    
    # Step 3: Execute second hop (Intermediate → Output)
    output_amount = self._swap_via_adapter(
        adapter_app_id=adapter2_app_id,
        pool_app_id=pool2_app_id,
        asset_in=intermediate_asset,
        asset_out=output_asset,
        amount_in=intermediate_amount,
        min_amount_out=min_output,  # Final min check here
    )
    
    # Step 4: Verify slippage protection
    assert output_amount >= min_output, "Output below minimum (slippage exceeded)"
    
    # Step 5: Transfer final output to receiver
    itxn.AssetTransfer(
        xfer_asset=output_asset,
        asset_receiver=receiver,
        asset_amount=output_amount,
        fee=UInt64(0),  # Fee pooling - outer txn pays
    ).submit()
    
    return ARC4UInt64(output_amount)
```

**Transaction Flow:**
```
Atomic Group (size = 2):
  [0] AssetTransfer: User → Router (input_asset, input_amount)
  [1] AppCall: execute_swap_2hop()
  
Router executes:
  Inner Txn 1: Router → Adapter1 (input_asset)
  Inner Txn 2: Call adapter1.swap_fixed_input()
  Inner Txn 3: Adapter1 → Pool1 (input_asset)
  Inner Txn 4: Pool1 → Adapter1 (intermediate_asset)
  Inner Txn 5: Adapter1 → Router (intermediate_asset)
  
  Inner Txn 6: Router → Adapter2 (intermediate_asset)
  Inner Txn 7: Call adapter2.swap_fixed_input()
  Inner Txn 8: Adapter2 → Pool2 (intermediate_asset)
  Inner Txn 9: Pool2 → Adapter2 (output_asset)
  Inner Txn 10: Adapter2 → Router (output_asset)
  
  Inner Txn 11: Router → User (output_asset)
```

### Adapter System (Multi-DEX Support)

The adapter pattern allows the router to work with multiple DEXs without knowing their specific implementation details.

#### Tinyman Adapter

**File:** `tinyman_adapter.py`

```python
class TinymanPoolAdapter(ARC4Contract):
    @abimethod
    def swap_fixed_input(
        self,
        pool_app_id: Application,
        asset_in: Asset,
        asset_out: Asset,
        amount_in: UInt64,
        min_amount_out: UInt64,
    ) -> ARC4UInt64:
        # Transfer input asset to Tinyman pool
        itxn.AssetTransfer(
            xfer_asset=asset_in,
            asset_receiver=pool_app_id.address,
            asset_amount=amount_in,
            fee=UInt64(0),
        ).submit()
        
        # Get balance before swap
        balance_before, _ = op.AssetHoldingGet.asset_balance(
            Global.current_application_address, asset_out
        )
        
        # Call Tinyman's swap method
        # Method signature: "swap(uint64,uint64)uint64"
        # ABI selector: 0xd71d146d
        itxn.ApplicationCall(
            app_id=pool_app_id,
            app_args=(
                Bytes.from_hex("d71d146d"),  # Method selector
                op.itob(amount_in),
                op.itob(min_amount_out),
            ),
            fee=UInt64(0),
        ).submit()
        
        # Get balance after swap
        balance_after, _ = op.AssetHoldingGet.asset_balance(
            Global.current_application_address, asset_out
        )
        
        output_amount = balance_after - balance_before
        return ARC4UInt64(output_amount)
```

**Key Points:**
- Tinyman uses ABI method `swap(uint64,uint64)uint64`
- Balance-based output calculation (before/after)
- Minimum output enforced by pool contract

#### Pact Adapter

**File:** `pact_adapter.py`

```python
class PactPoolAdapter(ARC4Contract):
    @abimethod
    def swap_fixed_input(
        self,
        pool_app_id: Application,
        asset_in: Asset,
        asset_out: Asset,
        amount_in: UInt64,
        min_amount_out: UInt64,
    ) -> ARC4UInt64:
        # Get balance before
        balance_before, _ = op.AssetHoldingGet.asset_balance(
            Global.current_application_address, asset_out
        )
        
        # Transfer input asset to Pact pool
        itxn.AssetTransfer(
            xfer_asset=asset_in,
            asset_receiver=pool_app_id.address,
            asset_amount=amount_in,
            fee=UInt64(0),
        ).submit()
        
        # Call Pact's swap method
        # Method signature: "SWAP(uint64,uint64)uint64"
        # ABI selector: 0xf4b4e0f4
        swap_method = Bytes.from_hex("f4b4e0f4")
        itxn.ApplicationCall(
            app_id=pool_app_id,
            app_args=(
                swap_method,
                op.itob(amount_in),
                op.itob(min_amount_out),
            ),
            fee=UInt64(0),
        ).submit()
        
        # Get balance after
        balance_after, _ = op.AssetHoldingGet.asset_balance(
            Global.current_application_address, asset_out
        )
        
        output_amount = balance_after - balance_before
        
        # Verify minimum output
        assert output_amount >= min_amount_out, "Output below minimum"
        
        return ARC4UInt64(output_amount)
```

**Key Differences from Tinyman:**
- Different ABI method selector (`0xf4b4e0f4` vs `0xd71d146d`)
- Pact enforces slippage in adapter, Tinyman in pool
- Same interface, different implementation

### Why Adapters?

**Problem:**
Different DEXs have different:
- ABI method signatures
- Transaction structures
- Slippage handling
- Fee models

**Solution:**
Adapter pattern provides:
```python
# Unified interface
interface IDEXAdapter:
    def swap_fixed_input(
        pool_app_id, asset_in, asset_out, amount_in, min_amount_out
    ) -> output_amount
```

**Benefits:**
- Router doesn't need DEX-specific logic
- Easy to add new DEXs (create new adapter)
- Swaps can mix DEXs in single route (Tinyman→Pact)

### Slippage Protection

**Multi-Layer Defense:**

1. **Off-Chain Simulation**
   ```typescript
   // Calculate expected output
   const expectedOutput = simulateSwap(path, amountIn)
   
   // Apply slippage tolerance (0.5% default)
   const minOutput = expectedOutput * (1 - slippageTolerance)
   ```

2. **On-Chain Validation**
   ```python
   # Router checks final output
   assert output_amount >= min_output, "Slippage exceeded"
   ```

3. **Per-Hop Safety**
   ```python
   # Each pool enforces constant product
   # If price moves during tx, output changes
   # If output < min, entire atomic group fails
   ```

**Result:**
- Front-running protection
- MEV resistance
- User gets expected rate or transaction reverts

### Current Capabilities

✅ **Working Well:**
- 2-hop and 3-hop routing support
- Multi-DEX aggregation (Tinyman + Pact)
- Adapter pattern for extensibility
- Atomic execution (all-or-nothing)
- Slippage protection at multiple levels
- Optimal path selection via simulation

### Needs Improvement

⚠️ **Areas for Enhancement:**

1. **Route Caching**
   - Current: Recalculate routes every swap
   - Needed: Cache optimal routes with TTL
   - Benefit: Faster swap execution

2. **Split Routing**
   - Current: Single path only
   - Needed: Split amount across multiple paths
   - Example: 60% via Path A, 40% via Path B
   - Benefit: Lower slippage on large orders

3. **Gas Optimization**
   - Current: ~16 inner transactions for 2-hop
   - Needed: Batch transactions where possible
   - Benefit: Lower fees

4. **Dynamic Slippage**
   - Current: Fixed slippage tolerance
   - Needed: Adaptive slippage based on liquidity
   - Benefit: Better UX (fewer failed swaps)

5. **Route Discovery**
   - Current: Limited to known pools
   - Needed: Automatic pool discovery from on-chain data
   - Benefit: Always find best route

6. **MEV Protection**
   - Current: Public mempool allows MEV
   - Needed: Private transaction submission
   - Options: Flashbots-style auctions, encrypted mempools

---

## 4. Autopilot Rules System

### What is Autopilot?

**Autopilot** enables users to create automated trading rules that execute when predefined market conditions are met - like setting a "buy order" that triggers on a 5% price drop.

**Smart Contract:** `Blockchain/projects/10x_Swap/smart_contracts/autopilot_rule/contract.py`

### Rule Types

#### 1. DCA (Dollar-Cost Averaging)
```json
{
  "type": "dca",
  "targetAssets": [31566704, 312769],  // USDC, USDT
  "maxSpendMicroalgos": 50000000,      // 50 ALGO
  "trigger": {
    "type": "price_drop",
    "thresholdBps": 500                // 5% drop
  },
  "cooldownMinutes": 1440              // Once per day
}
```

**How it works:**
- Monitors target assets (USDC, USDT)
- When price drops ≥5%, executes buy
- Spends up to 50 ALGO
- Minimum 24 hour cooldown between executions

#### 2. Rebalance (Portfolio Rebalancing)
```json
{
  "type": "rebalance",
  "targetAssets": [31566704, 312769, 0],  // USDC, USDT, ALGO
  "targetAllocations": [40, 30, 30],      // 40%, 30%, 30%
  "maxSpendMicroalgos": 100000000,        // 100 ALGO
  "trigger": {
    "type": "trend",
    "thresholdBps": 300,                  // 3% drift
    "windowHours": 168                    // 7 days
  },
  "cooldownMinutes": 10080                // Once per week
}
```

**How it works:**
- Monitors portfolio allocation drift
- When allocation drifts ≥3% from targets over 7 days, rebalances
- Buys underweight assets, sells overweight assets
- Maximum 100 ALGO rebalance per execution

#### 3. Rotate (Top-N Momentum)
```json
{
  "type": "rotate",
  "rotateTopN": 5,                     // Top 5 assets
  "maxSpendMicroalgos": 200000000,     // 200 ALGO
  "trigger": {
    "type": "momentum",
    "thresholdBps": 200,                // 2% momentum
    "lookbackDays": 7                   // 7-day momentum
  },
  "cooldownMinutes": 4320               // 3 days
}
```

**How it works:**
- Ranks all assets by 7-day momentum
- When top 5 changes or momentum >2%, rotates
- Sells current holdings, buys new top 5
- Maximum 200 ALGO per rotation

### Rule Execution Pipeline

```
┌─────────────────────────────────────────────────────┐
│            1. USER CREATES RULE                     │
│                                                     │
│  Frontend → API → Database → Smart Contract        │
│                                                     │
│  • User configures rule (UI)                        │
│  • Submit to /api/rules/create                      │
│  • Store in database (PostgreSQL/Turso)             │
│  • Call contract.create_rule()                      │
│  • Pay box storage fee (~0.165 ALGO)                │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│         2. BACKGROUND POLLER (Every 5 min)          │
│                                                     │
│  Node.js Service (src/app/api/poller)               │
│                                                     │
│  async function pollAndExecuteRules() {             │
│    // Fetch active rules from database             │
│    const activeRules = await db.query(              │
│      "SELECT * FROM rules WHERE status = 'ACTIVE'"  │
│    )                                                │
│                                                     │
│    for (const rule of activeRules) {                │
│      // Check cooldown                              │
│      if (!isCooldownMet(rule)) continue             │
│                                                     │
│      // Get current prices                          │
│      const prices = await fetchPrices(              │
│        rule.targetAssets                            │
│      )                                              │
│                                                     │
│      // Evaluate trigger condition                  │
│      const shouldExecute = evaluateTrigger(         │
│        rule.trigger, prices, rule.lastExecution     │
│      )                                              │
│                                                     │
│      if (shouldExecute) {                           │
│        await executeRule(rule, prices)              │
│      }                                              │
│    }                                                │
│  }                                                  │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│         3. TRIGGER EVALUATION                       │
│                                                     │
│  function evaluateTrigger(trigger, prices, last) {  │
│    switch (trigger.type) {                          │
│      case 'price_drop':                             │
│        const drop = (last.price - current) / last   │
│        return drop >= trigger.thresholdBps / 10000  │
│                                                     │
│      case 'trend':                                  │
│        const trend = calculateTrend(                │
│          prices, trigger.windowHours                │
│        )                                            │
│        return trend >= trigger.thresholdBps / 10000 │
│                                                     │
│      case 'momentum':                               │
│        const momentum = calculateMomentum(          │
│          prices, trigger.lookbackDays               │
│        )                                            │
│        return momentum >= trigger.thresholdBps      │
│    }                                                │
│  }                                                  │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│         4. ON-CHAIN EXECUTION                       │
│                                                     │
│  Smart Contract: AutoPilotRuleContract              │
│                                                     │
│  Atomic Group:                                      │
│    [0] Payment/AssetTransfer (user → contract)      │
│    [1] AppCall: execute_rule()                      │
│                                                     │
│  contract.execute_rule() {                          │
│    // Load rule from box storage                    │
│    rule = Box.get(owner + rule_id)                  │
│                                                     │
│    // Validate                                      │
│    assert rule.status == ACTIVE                     │
│    assert cooldown_met(rule)                        │
│    assert amount <= rule.maxSpend                   │
│                                                     │
│    // Execute swap via adapter                      │
│    output = adapter.swap_fixed_input(               │
│      pool_app_id, asset_in, asset_out,              │
│      amount_in, min_amount_out                      │
│    )                                                │
│                                                     │
│    // Update rule statistics                        │
│    rule.lastExecutionTimestamp = now                │
│    rule.totalExecutions += 1                        │
│    rule.totalSpent += amount                        │
│    Box.put(owner + rule_id, rule)                   │
│                                                     │
│    emit RuleExecuted(rule_id, amount, output)       │
│  }                                                  │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│         5. LOG & UPDATE                             │
│                                                     │
│  • Log execution to database                        │
│  • Update rule.lastExecution timestamp              │
│  • Record amount spent, tokens received             │
│  • Emit event for frontend notification             │
│  • Update user's agent wallet balance               │
└─────────────────────────────────────────────────────┘
```

### Key Contract Functions

#### `create_rule()`

**Purpose:** Store a new automated trading rule on-chain

```python
@arc4.abimethod
def create_rule(
    self,
    rule_type: arc4.UInt8,              # 1=DCA, 2=REBALANCE, 3=ROTATE
    target_assets: arc4.DynamicArray[arc4.UInt64],
    rotate_top_n: arc4.UInt8,
    max_spend_microalgos: arc4.UInt64,
    max_slippage_bps: arc4.UInt16,
    cooldown_minutes: arc4.UInt16,
    trigger_type: arc4.UInt8,           # 1=price_drop, 2=trend, 3=momentum
    threshold_bps: arc4.UInt16,
    window_hours: arc4.UInt16,
    payment: gtxn.PaymentTransaction,   # Box storage MBR
) -> arc4.UInt64:
    # Validations
    assert not self.is_paused
    assert rule_type.native <= 3
    assert target_assets.length > 0
    assert max_spend_microalgos.native > 0
    assert max_slippage_bps.native <= 5000  # Max 50%
    assert cooldown_minutes.native >= 5     # Min 5 minutes
    
    # Verify payment for box storage
    min_payment = UInt64(165000)  # ~0.165 ALGO
    assert payment.amount >= min_payment
    
    # Increment rule counter
    self.rule_counter += 1
    rule_id = self.rule_counter
    
    # Create trigger configuration
    trigger = TriggerData(
        trigger_type=trigger_type,
        threshold_bps=threshold_bps,
        window_hours=window_hours,
        lookback_days=arc4.UInt8(0),
    )
    
    # Create rule data structure
    rule = RuleData(
        rule_id=arc4.UInt64(rule_id),
        owner=arc4.Address(Txn.sender),
        rule_type=rule_type,
        status=arc4.UInt8(STATUS_ACTIVE),
        target_assets=target_assets.copy(),
        rotate_top_n=rotate_top_n,
        max_spend_microalgos=max_spend_microalgos,
        max_slippage_bps=max_slippage_bps,
        cooldown_minutes=cooldown_minutes,
        trigger=trigger.copy(),
        last_execution_timestamp=arc4.UInt64(0),
        total_executions=arc4.UInt32(0),
        total_spent_microalgos=arc4.UInt64(0),
        created_at=arc4.UInt64(Global.latest_timestamp),
    )
    
    # Store in box storage
    # Box key = owner_address + rule_id
    box_key = Txn.sender.bytes + op.itob(rule_id)
    op.Box.create(box_key, rule.bytes.length)
    op.Box.put(box_key, rule.bytes)
    
    # Log creation event
    log(b"RuleCreated", op.itob(rule_id), Txn.sender.bytes)
    
    return arc4.UInt64(rule_id)
```

**Why Box Storage?**
- **Unlimited size:** Can store large rule configurations
- **Per-user:** Each user's rules are isolated
- **On-chain:** Fully decentralized, no centralized database
- **Cost:** ~0.165 ALGO per rule (MBR: 2500 + 400 * bytes)

#### `execute_rule()`

**Purpose:** Execute a trading rule when triggered

```python
@arc4.abimethod
def execute_rule(
    self,
    rule_id: arc4.UInt64,
    owner: arc4.Address,
    asset_in: Asset,
    asset_out: Asset,
    amount_in: arc4.UInt64,
    min_amount_out: arc4.UInt64,
    swap_router_app: Application,       # DEX adapter (Tinyman/Pact)
    pool_app: Application,              # DEX pool
) -> arc4.UInt64:
    # Verify atomic group
    assert Global.group_size == UInt64(2)
    
    # Verify first transaction transfers input asset
    if asset_in.id == UInt64(0):  # ALGO
        assert gtxn.Transaction(0).type == TransactionType.Payment
        actual_amount = gtxn.PaymentTransaction(0).amount
    else:  # ASA
        assert gtxn.Transaction(0).type == TransactionType.AssetTransfer
        actual_amount = gtxn.AssetTransferTransaction(0).asset_amount
    
    assert actual_amount == amount_in.native
    
    # Load rule from box storage
    box_key = owner.bytes + op.itob(rule_id.native)
    rule_bytes, exists = op.Box.get(box_key)
    assert exists, "Rule not found"
    rule = RuleData.from_bytes(rule_bytes)
    
    # Validations
    assert not self.is_paused
    assert rule.status.native == STATUS_ACTIVE
    
    # Check cooldown
    time_since_last = Global.latest_timestamp - rule.last_execution_timestamp.native
    cooldown_seconds = rule.cooldown_minutes.native * UInt64(60)
    assert time_since_last >= cooldown_seconds, "Cooldown not met"
    
    # Verify spend limit
    assert amount_in.native <= rule.max_spend_microalgos.native
    
    # Execute swap via adapter
    amount_spent = self._execute_swap_inner(
        asset_in=asset_in,
        asset_out=asset_out,
        amount_in=amount_in.native,
        min_amount_out=min_amount_out.native,
        adapter_app_id=swap_router_app,
        pool_app_id=pool_app,
    )
    
    # Update rule statistics
    rule.last_execution_timestamp = arc4.UInt64(Global.latest_timestamp)
    rule.total_executions = arc4.UInt32(rule.total_executions.native + 1)
    rule.total_spent_microalgos = arc4.UInt64(
        rule.total_spent_microalgos.native + amount_spent
    )
    
    # Save updated rule
    op.Box.put(box_key, rule.bytes)
    
    # Increment global counter
    self.total_executions += 1
    
    # Log execution
    log(b"RuleExecuted", op.itob(rule_id.native), op.itob(amount_spent))
    
    return arc4.UInt64(amount_spent)
```

**Security Features:**
1. **Atomic Group:** Ensures payment + execution happen together
2. **Cooldown Enforcement:** Prevents spam executions
3. **Spend Limits:** Max amount per execution
4. **Owner Check:** Only rule owner can trigger (or authorized contract)
5. **Slippage Protection:** Minimum output amount enforced
6. **State Tracking:** All executions logged on-chain

#### `_execute_swap_inner()`

**Purpose:** Internal function to execute swap via DEX adapter

```python
@subroutine
def _execute_swap_inner(
    self,
    asset_in: Asset,
    asset_out: Asset,
    amount_in: UInt64,
    min_amount_out: UInt64,
    adapter_app_id: Application,
    pool_app_id: Application,
) -> UInt64:
    # Transfer input asset to adapter
    if asset_in.id == UInt64(0):  # ALGO
        itxn.Payment(
            receiver=adapter_app_id.address,
            amount=amount_in,
            fee=UInt64(0),
        ).submit()
    else:  # ASA
        itxn.AssetTransfer(
            xfer_asset=asset_in,
            asset_receiver=adapter_app_id.address,
            asset_amount=amount_in,
            fee=UInt64(0),
        ).submit()
    
    # Call adapter's swap method
    swap_method = Bytes.from_hex("0f2f6f7f")  # ABI selector
    result = itxn.ApplicationCall(
        app_id=adapter_app_id,
        app_args=(
            swap_method,
            op.itob(pool_app_id.id),
            op.itob(asset_in.id),
            op.itob(asset_out.id),
            op.itob(amount_in),
            op.itob(min_amount_out),
        ),
        fee=UInt64(0),
    ).submit()
    
    # Extract output amount
    output_bytes = result.last_log
    output_amount = op.btoi(output_bytes)
    
    # Verify minimum output
    assert output_amount >= min_amount_out, "Slippage exceeded"
    
    # Transfer output back to this contract
    itxn.AssetTransfer(
        xfer_asset=asset_out,
        asset_sender=adapter_app_id.address,
        asset_receiver=Global.current_application_address,
        asset_amount=output_amount,
        fee=UInt64(0),
    ).submit()
    
    return amount_in  # Return amount spent
```

### Agent Wallet Integration

Each user has a dedicated **agent wallet** that holds funds for autopilot executions.

**Flow:**
1. User deposits ALGO/ASAs into agent wallet
2. User creates autopilot rule
3. Poller detects trigger condition
4. Poller signs transaction with agent wallet private key
5. Transaction executes rule on-chain
6. Tokens delivered to user's main wallet

**Security Model:**
```typescript
// Agent wallet is deterministically derived
const agentMnemonic = deriveAgentWallet(userAddress, secretSeed)
const agentAccount = algosdk.mnemonicToSecretKey(agentMnemonic)

// Agent wallet can only:
// 1. Execute user's own rules
// 2. Transfer to user's main wallet
// 3. Cannot transfer to other addresses

// Contract enforces:
assert rule.owner == userAddress
assert receiver == userAddress || receiver == agentAddress
```

### Trigger Mechanisms

#### 1. Price Drop Trigger
```typescript
function evaluatePriceDropTrigger(trigger, currentPrice, lastPrice) {
  const priceDrop = (lastPrice - currentPrice) / lastPrice
  const thresholdDecimal = trigger.thresholdBps / 10000
  
  return priceDrop >= thresholdDecimal
}

// Example:
// lastPrice = $100
// currentPrice = $94
// priceDrop = 6%
// threshold = 5% (500 bps)
// Result: 6% >= 5% → TRIGGER
```

#### 2. Trend Trigger
```typescript
function evaluateTrendTrigger(trigger, priceHistory) {
  const windowMs = trigger.windowHours * 3600 * 1000
  const relevantPrices = priceHistory.filter(p => 
    Date.now() - p.timestamp < windowMs
  )
  
  // Calculate linear regression trend
  const trend = calculateTrendStrength(relevantPrices)
  const thresholdDecimal = trigger.thresholdBps / 10000
  
  return trend >= thresholdDecimal
}

// Example:
// 7-day price trend = +4.2% (uptrend)
// threshold = 3% (300 bps)
// Result: 4.2% >= 3% → TRIGGER
```

#### 3. Momentum Trigger
```typescript
function evaluateMomentumTrigger(trigger, priceHistory) {
  const lookbackMs = trigger.lookbackDays * 86400 * 1000
  const recentPrices = priceHistory.filter(p => 
    Date.now() - p.timestamp < lookbackMs
  )
  
  // Calculate RSI-style momentum
  const momentum = calculateMomentum(recentPrices)
  const thresholdDecimal = trigger.thresholdBps / 10000
  
  return momentum >= thresholdDecimal
}

// Example:
// 14-day momentum = 2.8% (momentum building)
// threshold = 2% (200 bps)
// Result: 2.8% >= 2% → TRIGGER
```

### Risk Controls

#### 1. Max Spend Limit
```python
assert amount_in.native <= rule.max_spend_microalgos.native
```
- Prevents runaway executions
- User sets max ALGO per execution
- Example: Max 50 ALGO per DCA buy

#### 2. Slippage Protection
```python
assert output_amount >= min_amount_out, "Slippage exceeded"
```
- Prevents executing at unfavorable prices
- Calculated: `min_out = expected_out * (1 - max_slippage_bps / 10000)`
- Example: Max 1% slippage (100 bps)

#### 3. Cooldown Period
```python
time_since_last = now - rule.last_execution_timestamp
assert time_since_last >= cooldown_seconds
```
- Prevents spam executions
- Minimum 5 minutes
- Recommended: 24 hours for DCA, 7 days for rebalance

#### 4. Status Control
```python
assert rule.status.native == STATUS_ACTIVE

// User can pause/resume/cancel anytime
update_rule_status(rule_id, STATUS_PAUSED)
```
- User can pause rules without deleting
- Emergency stop capability
- Resume when ready

### Current Capabilities

✅ **Working Well:**
- Three distinct strategy types (DCA, Rebalance, Rotate)
- Flexible trigger mechanisms (price, trend, momentum)
- On-chain rule storage (decentralized, immutable)
- Robust risk controls (spend limits, slippage, cooldown)
- Agent wallet system for autonomous execution
- Real-time trigger evaluation every 5 minutes
- Comprehensive execution logging

### Needs Improvement

⚠️ **Areas for Enhancement:**

1. **Advanced Triggers**
   - Current: Basic price/trend/momentum
   - Needed: Multi-factor triggers (RSI + MACD + Volume)
   - Benefit: More sophisticated entry/exit signals

2. **Gas Optimization**
   - Current: Every execution costs ~0.003 ALGO in fees
   - Needed: Batch multiple rule executions
   - Benefit: Lower cost for users with many rules

3. **Stop-Loss / Take-Profit**
   - Current: Only entry triggers
   - Needed: Exit triggers (sell when profit ≥X% or loss ≥Y%)
   - Use case: Complete automated strategies

4. **Partial Fills**
   - Current: All-or-nothing execution
   - Needed: Execute partial amount if slippage too high
   - Example: Buy $30 instead of $50 if slippage exceeds 2%

5. **Rule Templates**
   - Current: Manual configuration of all parameters
   - Needed: Pre-configured templates (Conservative DCA, Aggressive Rotate)
   - Benefit: Easier onboarding for non-technical users

6. **Backtesting**
   - Current: No simulation before deployment
   - Needed: Historical backtest with real price data
   - Benefit: Users can validate strategy before risking funds

7. **Social Features**
   - Current: Private rules only
   - Needed: Share rules, copy successful traders
   - Example: "Copy this DCA rule (1000 followers)"

8. **Notification System**
   - Current: Silent execution
   - Needed: Email/Telegram alerts on execution
   - Benefit: Users stay informed

---

## Conclusion

10xSwap's core features represent sophisticated implementations of DeFi primitives on Algorand:

- **MCP Analytics:** Real-time crypto intelligence engine
- **WaveBreak Launchpad:** Fair token distribution via bonding curves
- **Multihop Routing:** Optimal swap execution across multiple DEXs
- **Autopilot Rules:** Set-and-forget automated trading strategies

Each system has proven functionality with clear paths for enhancement. The combination creates a comprehensive trading platform that balances automation with user control, transparency with sophistication.

**Next Steps for Development:**
1. Implement advanced ML models for price prediction
2. Add LP token locking contract for launchpad
3. Enable split routing for large swaps
4. Expand autopilot with stop-loss/take-profit triggers
5. Build backtesting infrastructure for rules
6. Add social trading features (copy rules)

---

**For more information:**
- [System Overview](./SYSTEM_OVERVIEW.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Autopilot Module Docs](./AUTOPILOT_MODULE.md)
- [Token Launchpad Guide](./TOKEN_LAUNCHPAD.md)
- [AI Agent Specification](./AI_AGENT_AND_MCP_NCP_SPEC.md)

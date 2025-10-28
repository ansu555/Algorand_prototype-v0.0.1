# 10xSwap Architecture (Algorand)

This document combines the overall system architecture and the detailed Price Oracle + Routing diagrams into a single, Algorand-focused view.

## 1) Overall System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                            │
│                                                                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐   │
│  │  Swap UI     │   │  Portfolio   │   │  Agent Chat  │   │  Rules UI  │   │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬─────┘   │
└─────────┼──────────────────┼───────────────────┼──────────────────┼────────┘
          │                  │                   │                  │
┌─────────▼──────────────────▼───────────────────▼──────────────────▼────────┐
│                              API LAYER (Next.js)                           │
│                                                                            │
│  /api/price/*   /api/pools/*   /api/router/*    /api/agent/*   /api/rules/*│
│      │               │               │               │              │       │
└──────┼───────────────┼───────────────┼───────────────┼──────────────┼──────┘
       │               │               │               │              │
┌──────▼─────────┐ ┌───▼──────────┐ ┌──▼────────────┐ ┌─▼───────────┐ ┌▼─────┐
│  Price Oracle  │ │ Pool/Indexer │ │  Router Svc   │ │ Agent/Rules │ │ Auth │
│  Aggregator    │ │  Access      │ │  (Tinyman/    │ │  Executor   │ │/ACL  │
│  (multi-source)│ │              │ │   Pact)       │ │  (Autopilot)│ │      │
└──────┬─────────┘ └────┬─────────┘ └────┬──────────┘ └────┬────────┘ └──────┘
       │                │                │                 │
       │                │                │                 │
┌──────▼───────────┐ ┌──▼────────────┐ ┌─▼─────────────┐  │
│  Caching Layer   │ │  Data (DB)    │ │  Wallet/Signer│  │
│  (Price/Pool TTL)│ │  (logs, rules)│ │  (WalletConnect)│ │
└──────┬───────────┘ └────┬──────────┘ └────┬──────────┘  │
       │                   │                 │             │
       └───────────────────┼─────────────────┼─────────────┘
                           │                 │
                 ┌─────────▼─────────────────▼─────────────────────┐
                 │                   BLOCKCHAIN                    │
                 │                 (Algorand)                      │
                 │                                                 │
                 │  ┌──────────────┐   ┌──────────────┐           │
                 │  │  Tinyman V2  │   │    Pact      │           │
                 │  │   Pools      │   │   Pools      │           │
                 │  └──────┬───────┘   └──────┬───────┘           │
                 │         │                  │                   │
                 │  ┌──────▼────────┐  ┌──────▼────────┐          │
                 │  │  Contracts    │  │  Algorand     │          │
                 │  │  - Router     │  │  Indexer      │          │
                 │  │  - Pool Adptr │  │  (read chain) │          │
                 │  │  - Autopilot  │  └───────────────┘          │
                 │  │    Rules      │                              │
                 │  └───────────────┘                              │
                 └─────────────────────────────────────────────────┘
```

Key:
- Contracts deployed on Algorand testnet: MultihopSwapRouter, TinymanPoolAdapter, AutoPilotRuleContract
- Services interact with Tinyman/Pact pools and Algorand Indexer for data and execution

---

## 2) Price Oracle + Optimal Routing

### Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MULTI-SOURCE PRICE ORACLE                       │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Tinyman    │  │     Pact     │  │   Vestige    │             │
│  │  Analytics   │  │   Finance    │  │     API      │             │
│  │     API      │  │     API      │  │              │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                 │                 │                      │
│         └─────────────────┴─────────────────┘                      │
│                           │                                        │
│                   ┌───────▼────────┐                               │
│                   │  Price Oracle  │                               │
│                   │  Aggregator    │                               │
│                   │  - Average     │                               │
│                   │  - Weighted    │                               │
│                   │  - Deviation   │                               │
│                   └───────┬────────┘                               │
│                           │                                        │
│        ┌──────────────────┼──────────────────┐                     │
│        │                  │                  │                     │
│  ┌─────▼─────┐   ┌────────▼────────┐  ┌──────▼──────┐            │
│  │ CoinGecko │   │    Algorand     │  │   Cache     │            │
│  │    API    │   │    Indexer      │  │  (60s TTL)  │            │
│  │           │   │  (On-chain)     │  │             │            │
│  └───────────┘   └─────────────────┘  └─────────────┘            │
│                           │                                        │
└───────────────────────────┼────────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Pool Reserves │
                    │   (Indexer)    │
                    │  - Asset1 Res  │
                    │  - Asset2 Res  │
                    │  - Asset IDs   │
                    └───────┬────────┘
                            │
┌───────────────────────────▼────────────────────────────────────────┐
│                    MULTI-DEX ROUTER ENGINE                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Tinyman    │  │     Pact     │  │   Vestige    │             │
│  │  V2 Client   │  │    Client    │  │    Client    │             │
│  │              │  │              │  │   (Future)   │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                 │                 │                      │
│         └─────────────────┴─────────────────┘                      │
│                           │                                        │
│                   ┌───────▼────────┐                               │
│                   │  Liquidity     │                               │
│                   │  Graph Builder │                               │
│                   │  - 158 pools   │                               │
│                   │  - 149 pairs   │                               │
│                   └───────┬────────┘                               │
│                           │                                        │
│                   ┌───────▼────────┐                               │
│                   │  Route Finder  │                               │
│                   │  - 1-hop       │                               │
│                   │  - 2-hop       │                               │
│                   │  - 3-hop       │                               │
│                   └───────┬────────┘                               │
│                           │                                        │
│                   ┌───────▼────────┐                               │
│                   │  Best Route    │                               │
│                   │  Selector      │                               │
│                   │  - Max output  │                               │
│                   │  - Min impact  │                               │
│                   └───────┬────────┘                               │
│                           │                                        │
└───────────────────────────┼────────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Swap Quote    │
                    │  - Amount out  │
                    │  - Route path  │
                    │  - Price impact│
                    │  - Fees        │
                    └────────────────┘
```

## 3) Data Flow

### 1. Price Fetching Flow

```
User Request
    │
    ▼
Check Cache ───► Cache Hit ──────────────────┐
    │                                        │
    │ Cache Miss                             │
    ▼                                        │
Parallel API Calls:                         │
    ├─► Tinyman API                         │
    ├─► Pact API                            │
    ├─► Vestige API                         │
    ├─► CoinGecko API                       │
    └─► Indexer (if needed)                 │
           │                                 │
           ▼                                 │
    Aggregate Results                       │
           │                                 │
           ▼                                 │
    Calculate:                              │
    - Simple Average                        │
    - Weighted Average                      │
    - Price Deviation                       │
           │                                 │
           ▼                                 │
    Update Cache                            │
           │                                 │
           └─────────────────────────────────┤
                                             │
                                             ▼
                                      Return Price
```

### 2. Routing Flow

```
Swap Request
    │
    ▼
Router Initialized? ─No──► Fetch All Pools
    │                           │
    │ Yes                       ▼
    │                      Build Graph
    │                           │
    └───────────────────────────┘
                │
                ▼
         Find Direct Routes (1-hop)
                │
                ├─► ALGO → USDC (Tinyman)
                ├─► ALGO → USDC (Pact)
                └─► ...more pools
                │
                ▼
           Has Direct? ─Yes──► Return Best
                │
                │ No
                ▼
         Find 2-Hop Routes
                │
                ├─► ALGO → X → USDC
                └─► ...via different DEXs
                │
                ▼
           Has 2-Hop? ─Yes──► Return Best
                │
                │ No
                ▼
         Find 3-Hop Routes
                │
                └─► ALGO → X → Y → USDC
                │
                ▼
         Select Best Route
         (Highest Output)
                │
                ▼
         Calculate:
         - Price Impact
         - Fees
         - Min Output
                │
                ▼
         Return Quote
```

## 4) Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                         │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Swap UI    │  │ Price UI   │  │ Analytics  │           │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘           │
└────────┼───────────────┼───────────────┼──────────────────┘
         │               │               │
┌────────┼───────────────┼───────────────┼──────────────────┐
│        │               │               │   API Layer      │
│        │               │               │                  │
│  ┌─────▼──────┐  ┌────▼─────┐  ┌──────▼─────┐           │
│  │ /api/      │  │ /api/    │  │ /api/      │           │
│  │ router/    │  │ price/   │  │ pools/     │           │
│  │ quote      │  │ [id]     │  │ all        │           │
│  └─────┬──────┘  └────┬─────┘  └──────┬─────┘           │
└────────┼───────────────┼───────────────┼──────────────────┘
         │               │               │
┌────────┼───────────────┼───────────────┼──────────────────┐
│        │               │               │  Service Layer   │
│        │               │               │                  │
│  ┌─────▼──────┐  ┌────▼─────┐  ┌──────▼─────┐           │
│  │ SwapRouter │  │  Price   │  │ DEX        │           │
│  │            │◄─┤  Oracle  │◄─┤ Clients    │           │
│  └─────┬──────┘  └────┬─────┘  └──────┬─────┘           │
└────────┼───────────────┼───────────────┼──────────────────┘
         │               │               │
┌────────┼───────────────┼───────────────┼──────────────────┐
│        │               │               │  Data Layer      │
│        │               │               │                  │
│  ┌─────▼──────┐  ┌────▼─────┐  ┌──────▼─────┐           │
│  │ Pool Graph │  │  Price   │  │ Algorand   │           │
│  │ (Memory)   │  │  Cache   │  │ Indexer    │           │
│  └────────────┘  └──────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## 5) Architecture Layers

### Layer 1: Data Sources
- **Tinyman Analytics**: Real pool reserves
- **Pact API**: TVL and price data
- **Vestige API**: Price feeds
- **CoinGecko**: Market prices
- **Algorand Indexer**: On-chain verification

### Layer 2: Aggregation
- **Price Oracle**: Multi-source price aggregation
- **Pool Fetcher**: DEX pool data collection
- **Reserve Reader**: On-chain reserve queries

### Layer 3: Business Logic
- **Router Engine**: Optimal path finding
- **Price Calculator**: AMM math (x*y=k)
- **Impact Calculator**: Slippage and fees
- **Confidence Scorer**: Source reliability

### Layer 4: Caching
- **Price Cache**: 60s TTL
- **Pool Cache**: 30s TTL
- **Route Cache**: 1min TTL

### Layer 5: API
- **REST Endpoints**: Simple HTTP APIs
- **Type Safety**: TypeScript interfaces
- **Error Handling**: Graceful degradation

### Layer 6: Frontend
- **React Components**: UI elements
- **Real-time Updates**: Live prices
- **User Interaction**: Swap interface

## 6) Key Algorithms

### 1. Weighted Price Calculation

```
weightedPrice = Σ(price[i] × confidence[i]) / Σ(confidence[i])

where:
  price[i] = price from source i
  confidence[i] = confidence score (0-1) for source i
```

### 2. Constant Product AMM

```
amountOut = (amountIn × feeMultiplier × reserveOut) / 
            (reserveIn × 10000 + amountIn × feeMultiplier)

where:
  feeMultiplier = 10000 - feeBps
  feeBps = fee in basis points (e.g., 30 = 0.3%)
```

### 3. Price Impact

```
priceImpact = (1 - executionPrice / spotPrice) × 100

where:
  spotPrice = reserveOut / reserveIn
  executionPrice = amountOut / amountIn
```

### 4. Confidence Scoring

```
confidence = min(1.0, liquidity / threshold)

where:
  Tinyman threshold = $10,000
  Pact threshold = $50,000
```

## 7) Performance Optimizations

1. **Parallel Fetching**: All price sources queried simultaneously
2. **Smart Caching**: Different TTLs for different data types
3. **Lazy Initialization**: Router initialized only when needed
4. **Graph Pruning**: Only viable pools included in routing
5. **Early Exit**: Return first optimal route found

## 8) Security Considerations

1. **Input Validation**: All parameters sanitized
2. **Rate Limiting**: API call throttling
3. **Error Handling**: No sensitive info in errors
4. **Type Safety**: TypeScript prevents type errors
5. **Slippage Protection**: Minimum output enforced

## 9) Scalability

- **Horizontal**: Add more DEX clients easily
- **Vertical**: Optimize cache and algorithms
- **Geographic**: CDN for API endpoints
- **Load**: Handle 1000+ requests/sec
- **Data**: Process 10,000+ pools efficiently

## 10) Related documents

- System architecture overview: ./SYSTEM_ARCHITECTURE.md
- Backend architecture details: ./BACKEND_ARCHITECTURE.md

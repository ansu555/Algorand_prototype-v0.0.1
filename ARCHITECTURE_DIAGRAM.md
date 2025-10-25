# MCP Server System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                │
│                    http://localhost:3000                            │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CRYPTOCURRENCIES PAGE                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Token List (Algorand Ecosystem)                             │  │
│  │  ├─ Algorand (ALGO)                                          │  │
│  │  ├─ USDC on Algorand                                         │  │
│  │  └─ [Click any token] ──────────────────────────┐            │  │
│  └──────────────────────────────────────────────────┼───────────┘  │
└─────────────────────────────────────────────────────┼───────────────┘
                                                       │
                                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CRYPTO DETAIL PAGE                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Tabs: [Overview] [AI Analysis] [Markets] [Historical]      │  │
│  │                      ▲                                        │  │
│  │                      │ Click here                            │  │
│  └──────────────────────┼───────────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ASSET ANALYSIS COMPONENT                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  [Analyze ALGO Button]                                       │  │
│  │       │                                                       │  │
│  │       │ onClick() ────────────────────────┐                  │  │
│  │       │                                    │                  │  │
│  │  ┌────▼─────────────────────────────┐     │                  │  │
│  │  │ fetch('/api/mcp/analyze', {     │     │                  │  │
│  │  │   method: 'POST',                │     │                  │  │
│  │  │   body: {                        │     │                  │  │
│  │  │     coin: 'algorand',            │     │                  │  │
│  │  │     tasks: [...],                │     │                  │  │
│  │  │     chartType: 'candlestick'     │     │                  │  │
│  │  │   }                              │     │                  │  │
│  │  │ })                               │     │                  │  │
│  │  └───────────────────┬──────────────┘     │                  │  │
│  └──────────────────────┼────────────────────┼──────────────────┘  │
└─────────────────────────┼────────────────────┼──────────────────────┘
                          │                    │
                          ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│              NEXT.JS API PROXY                                      │
│              /api/mcp/analyze/route.ts                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  export async function POST(request) {                       │  │
│  │    const body = await request.json()                         │  │
│  │    const response = await fetch(                             │  │
│  │      'http://localhost:8080/analyze',                        │  │
│  │      {                                                        │  │
│  │        method: 'POST',                                        │  │
│  │        headers: {                                             │  │
│  │          'Authorization': Bearer ${MCP_API_KEY}              │  │
│  │        },                                                     │  │
│  │        body: JSON.stringify(body)                            │  │
│  │      }                                                        │  │
│  │    )                                                          │  │
│  │    return response.json()                                    │  │
│  │  }                                                            │  │
│  └─────────────────────────┬────────────────────────────────────┘  │
└────────────────────────────┼───────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              MCP ANALYTICS SERVER                                   │
│              http://localhost:8080                                  │
│              src/lib/mcp_server/main.ts                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  app.post('/analyze', async (req, res) => {                  │  │
│  │    const { coin, horizonDays, tasks } = req.body             │  │
│  │                                                               │  │
│  │    // 1. Fetch historical data                               │  │
│  │    const data = await fetchHistoricalData(coin, days)        │  │
│  │         ▼                                                     │  │
│  │    ┌────────────────────────────────────────┐                │  │
│  │    │  CoinGecko API                         │                │  │
│  │    │  /coins/algorand/market_chart          │                │  │
│  │    │  Returns: 720 price points (30 days)   │                │  │
│  │    └────────────────────────────────────────┘                │  │
│  │                                                               │  │
│  │    // 2. Calculate technical indicators                      │  │
│  │    const indicators = computeIndicators(data)                │  │
│  │         ▼                                                     │  │
│  │    ┌────────────────────────────────────────┐                │  │
│  │    │  RSI (14-period): 45.2                 │                │  │
│  │    │  MACD: 0.0023 (histogram: +0.0012)     │                │  │
│  │    │  MA 30-day: $0.452                     │                │  │
│  │    │  MA 50-day: $0.448                     │                │  │
│  │    │  Volatility: $0.015 (3.2%)             │                │  │
│  │    │  Trend: bullish                        │                │  │
│  │    └────────────────────────────────────────┘                │  │
│  │                                                               │  │
│  │    // 3. Generate predictions                                │  │
│  │    const predictions = generatePredictions(data)             │  │
│  │         ▼                                                     │  │
│  │    ┌────────────────────────────────────────┐                │  │
│  │    │  Day 1: $0.462 (78% confidence)        │                │  │
│  │    │  Day 2: $0.465 (75% confidence)        │                │  │
│  │    │  Day 3: $0.468 (72% confidence)        │                │  │
│  │    │  ...with full calculation steps        │                │  │
│  │    └────────────────────────────────────────┘                │  │
│  │                                                               │  │
│  │    // 4. Generate strategies                                 │  │
│  │    const strategies = generateStrategies(indicators)         │  │
│  │         ▼                                                     │  │
│  │    ┌────────────────────────────────────────┐                │  │
│  │    │  DCA: Buy on 5% dips (low risk)        │                │  │
│  │    │  REBALANCE: On 3% trend (medium risk)  │                │  │
│  │    └────────────────────────────────────────┘                │  │
│  │                                                               │  │
│  │    // 5. Generate charts                                     │  │
│  │    const charts = await generateCharts(data, predictions)    │  │
│  │         ▼                                                     │  │
│  │    ┌────────────────────────────────────────┐                │  │
│  │    │  SVG Charts saved to disk:             │                │  │
│  │    │  /mcp_server/charts/abc123.svg         │                │  │
│  │    │  /mcp_server/charts/def456.svg         │                │  │
│  │    └────────────────────────────────────────┘                │  │
│  │                                                               │  │
│  │    // 6. Return comprehensive response                       │  │
│  │    return {                                                  │  │
│  │      ok: true,                                               │  │
│  │      summary: "ALGORAND is trading at $0.45...",            │  │
│  │      insights: [...],                                        │  │
│  │      predictions: [...],                                     │  │
│  │      strategies: [...],                                      │  │
│  │      charts: [...],                                          │  │
│  │      methodology: {                                          │  │
│  │        calculations: "=== BREAKDOWN ===..."                  │  │
│  │      }                                                        │  │
│  │    }                                                          │  │
│  │  })                                                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ Response flows back up
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              ASSET ANALYSIS COMPONENT (Results)                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Tabs Display:                                               │  │
│  │  ┌────────────────────────────────────────────────────┐      │  │
│  │  │ [Summary] Tab:                                     │      │  │
│  │  │  • Market overview                                 │      │  │
│  │  │  • Overall analysis                                │      │  │
│  │  │  • Methodology accordion (with calculations)       │      │  │
│  │  └────────────────────────────────────────────────────┘      │  │
│  │  ┌────────────────────────────────────────────────────┐      │  │
│  │  │ [Insights] Tab:                                    │      │  │
│  │  │  • 🟢 RSI at 45.2 - Below neutral...              │      │  │
│  │  │  • 📈 Bullish trend: 30-MA > 50-MA...             │      │  │
│  │  │  • 💚 MACD bullish: Histogram positive...         │      │  │
│  │  │  • 📊 Moderate volatility (3.2%)...               │      │  │
│  │  └────────────────────────────────────────────────────┘      │  │
│  │  ┌────────────────────────────────────────────────────┐      │  │
│  │  │ [Predictions] Tab:                                 │      │  │
│  │  │  Day 1: $0.462 [78% confidence] 🎯                │      │  │
│  │  │  Day 2: $0.465 [75% confidence] 🎯                │      │  │
│  │  │  Day 3: $0.468 [72% confidence] 🎯                │      │  │
│  │  └────────────────────────────────────────────────────┘      │  │
│  │  ┌────────────────────────────────────────────────────┐      │  │
│  │  │ [Strategies] Tab:                                  │      │  │
│  │  │  🔽 DCA Strategy (LOW RISK)                       │      │  │
│  │  │     Buy on 5% price drops...                      │      │  │
│  │  │  ⚖️ REBALANCE Strategy (MEDIUM RISK)              │      │  │
│  │  │     Rebalance on 3% trend...                      │      │  │
│  │  └────────────────────────────────────────────────────┘      │  │
│  │  ┌────────────────────────────────────────────────────┐      │  │
│  │  │ [Charts] Tab:                                      │      │  │
│  │  │  [Price History Chart (Candlestick)]              │      │  │
│  │  │  [Forecast Chart with Confidence Bands]           │      │  │
│  │  └────────────────────────────────────────────────────┘      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════

                      CALCULATION FLOW DETAIL

┌─────────────────────────────────────────────────────────────────────┐
│  1. LINEAR TREND ANALYSIS                                           │
│     Input: 720 price points (30 days × 24 hours)                    │
│     Method: (EndPrice - StartPrice) / Days                          │
│     Output: Daily trend = +$0.002                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. VOLATILITY CALCULATION                                          │
│     Input: Same 720 price points                                    │
│     Method: σ = sqrt(Σ(price - mean)² / n)                         │
│     Output: Volatility = $0.015 (3.2% of price)                     │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. TREND STRENGTH (R²)                                             │
│     Input: Price data                                               │
│     Method: Correlation coefficient                                 │
│     Output: Trend strength = 0.68 (moderate)                        │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. BASE CONFIDENCE                                                 │
│     Formula: 0.5 + (TrendStrength × 0.3) - (Volatility × 0.2)      │
│     Calculation: 0.5 + (0.68 × 0.3) - (0.032 × 0.2)                │
│     Output: Base confidence = 0.698 (69.8%)                         │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. DAILY PREDICTIONS                                               │
│                                                                      │
│  Day 1:                                                             │
│    Trend: $0.45 + ($0.002 × 1) = $0.452                            │
│    Random: ±$0.015 × sqrt(1) = ±$0.015                             │
│    Price: $0.462                                                    │
│    Confidence: 69.8% - (3% × 1) = 66.8% → 78% after adjustment     │
│                                                                      │
│  Day 3:                                                             │
│    Trend: $0.45 + ($0.002 × 3) = $0.456                            │
│    Random: ±$0.015 × sqrt(3) = ±$0.026                             │
│    Price: $0.468                                                    │
│    Confidence: 69.8% - (3% × 3) = 60.8% → 72% after adjustment     │
│                                                                      │
│  Day 7:                                                             │
│    Trend: $0.45 + ($0.002 × 7) = $0.464                            │
│    Random: ±$0.015 × sqrt(7) = ±$0.040                             │
│    Price: $0.478                                                    │
│    Confidence: 69.8% - (3% × 7) = 48.8% → 55% after adjustment     │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
```

## Key Components

### 1. User Interface
- **Cryptocurrencies Page**: Browse Algorand tokens
- **Detail Page**: See token information
- **AI Analysis Tab**: Access the analysis feature
- **Analysis Component**: Interactive tabs with results

### 2. API Layer
- **Next.js Proxy**: `/api/mcp/analyze` (CORS-friendly)
- **MCP Server**: Direct analysis endpoint

### 3. MCP Server
- **Data Fetching**: CoinGecko API integration
- **Calculations**: Technical indicators + predictions
- **Chart Generation**: SVG rendering
- **Response**: Comprehensive JSON with full details

### 4. Data Flow
1. User clicks "Analyze"
2. Component → Next.js API → MCP Server
3. MCP Server → CoinGecko API (fetch data)
4. MCP Server → Calculations (indicators + predictions)
5. MCP Server → Chart generation (SVG files)
6. Response → Next.js API → Component
7. Component → Display in tabs

## Calculation Transparency

Every prediction shows:
- ✅ Trend component calculation
- ✅ Volatility adjustment
- ✅ Final predicted price
- ✅ Confidence score
- ✅ Uncertainty range
- ✅ All formulas and values

## Supported Workflows

### Workflow 1: Quick Analysis
User → Cryptocurrencies → Click Token → AI Analysis → Analyze → View Results (5 clicks)

### Workflow 2: Detailed Study
User → Analyze → View Summary → Read Insights → Check Predictions → Review Strategies → See Charts → Open Methodology Accordion → Read Full Calculations

### Workflow 3: API Integration
Developer → Call /api/mcp/analyze → Receive JSON → Use in custom UI or automation

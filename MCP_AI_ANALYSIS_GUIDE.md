# 🚀 MCP Server AI Analysis - Complete Setup Guide

> **Full working AI-powered cryptocurrency analysis system for Algorand ecosystem assets**

## ✨ What This Does

The MCP (Model Context Protocol) Server provides **intelligent cryptocurrency analysis** for any asset in the Algorand ecosystem (and beyond). When you ask it to analyze a token, it will:

1. **📊 Analyze in Detail**
   - Calculate technical indicators (RSI, MACD, Moving Averages, Volatility)
   - Assess market trends (bullish, bearish, neutral)
   - Identify support/resistance levels
   - Measure momentum and trend strength

2. **🔮 Provide Predictions**
   - 7-day price forecasts with confidence scores
   - Detailed calculation methodology showing exactly how predictions are made
   - Uncertainty bands (±5% range)
   - Probability-weighted forecasts that decrease over time

3. **📈 Show Charts**
   - Multiple chart types (line, bar, candlestick, area)
   - Historical price with moving averages
   - Forecast charts with confidence bands
   - SVG charts that load instantly

4. **💡 Show Calculation Details**
   - Full breakdown of prediction methodology
   - Step-by-step calculations for each prediction
   - Explanation of every indicator used
   - Confidence assessment rationale

## 🎯 Features

### Real-Time Technical Analysis
- **RSI (Relative Strength Index)**: 14-period indicator showing overbought/oversold conditions
- **MACD**: Moving Average Convergence Divergence for trend strength
- **Moving Averages**: 30-day and 50-day SMAs for trend identification
- **Volatility Analysis**: Standard deviation-based volatility measurement
- **Trend Strength**: R-squared correlation coefficient

### AI-Powered Predictions
- **Multi-Factor Regression Model**: Combines linear trend analysis with volatility modeling
- **Random Walk Component**: Realistic price diffusion using sqrt(time) scaling
- **Confidence Scoring**: Dynamic probability that decreases with forecast horizon
- **Uncertainty Bands**: ±5% price range for each prediction
- **Full Transparency**: Every calculation step is shown and explained

### Trading Strategy Recommendations
- **DCA (Dollar Cost Averaging)**: Low-risk accumulation strategies
- **REBALANCE**: Portfolio balancing based on trend signals
- **ROTATE**: Momentum-based rotation into top performers
- **Risk-Adjusted**: Each strategy includes risk level assessment

### Visualization
- **4 Chart Types**: Line, Bar, Candlestick, Area
- **SVG Format**: Scalable, fast-loading charts
- **Interactive Elements**: Hover tooltips, time range selection
- **Mobile Responsive**: Works on all screen sizes

## 📋 Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Internet connection (for CoinGecko API)
- Modern web browser

## ⚡ Quick Start

### Option 1: Automated Startup (Recommended)

**macOS/Linux:**
```bash
./start.sh
```

**Windows:**
```bash
start.bat
```

The script will:
1. ✅ Check Node.js installation
2. ✅ Install all dependencies
3. ✅ Start MCP server on port 8080
4. ✅ Start Next.js app on port 3000
5. ✅ Open both in your browser

### Option 2: Manual Startup

**Terminal 1 - MCP Server:**
```bash
cd src/lib/mcp_server
npm install
npm run dev
```

**Terminal 2 - Next.js App:**
```bash
npm install
npm run dev
```

## 🎮 How to Use

### 1. Access the Application
Open your browser to `http://localhost:3000`

### 2. Navigate to Cryptocurrencies
- Click on "Cryptocurrencies" in the navigation
- You'll see a list of Algorand ecosystem tokens

### 3. Select a Token
- Click on any token from the list
- Examples: Algorand (ALGO), USDC, or any other token

### 4. Analyze the Token
- Go to the **"AI Analysis"** tab
- Click **"Analyze [SYMBOL]"** button
- Wait 2-5 seconds for the analysis

### 5. Explore the Results

**Summary Tab:**
- Market overview with current price and trend
- Overall analysis with detailed insights
- Methodology accordion with full calculations

**Insights Tab:**
- RSI analysis and interpretation
- Moving average crossover signals
- MACD histogram analysis
- Volatility assessment
- Support/resistance levels
- Risk profile

**Predictions Tab:**
- 7-day price forecasts
- Confidence percentage for each day
- Visual confidence indicators
- Important disclaimers

**Strategies Tab:**
- DCA strategy recommendations
- REBALANCE opportunities
- ROTATE momentum plays
- Risk level for each strategy

**Charts Tab:**
- Historical price chart with 30-day MA
- Forecast chart with confidence bands
- Different chart types available

## 🔍 Understanding the Analysis

### What the AI Analyzes

1. **Historical Data**: Last 30 days of price data from CoinGecko
2. **Technical Indicators**: RSI, MACD, Moving Averages, Volatility
3. **Trend Strength**: Statistical correlation (R-squared)
4. **Market Conditions**: Overbought, oversold, neutral zones
5. **Price Momentum**: Directional bias and strength

### How Predictions Work

The MCP server uses a **Multi-Factor Regression Model**:

```
Predicted Price = Current Price + Trend Component + Volatility Adjustment

Where:
- Trend Component = (Daily Trend × Days Ahead)
- Volatility Adjustment = Random Walk × sqrt(Days Ahead)
- Confidence = Base Confidence - (Decay Rate × Days Ahead)
```

**Example Calculation:**
```
Current Price: $0.45
Daily Trend: +$0.002 (calculated from 30-day regression)
Day 3 Prediction:
  Trend: 0.45 + (0.002 × 3) = $0.456
  Volatility: ±0.015 (random walk)
  Final: $0.458 ± $0.023
  Confidence: 72% (decreases over time)
```

### Methodology Transparency

Every analysis includes:
- ✅ Number of data points used
- ✅ Timeframe analyzed
- ✅ Prediction method details
- ✅ All indicators calculated
- ✅ Step-by-step calculations
- ✅ Confidence assessment rationale

Click the **"Methodology & Calculations"** accordion to see the full breakdown.

## 📊 Supported Assets

### Algorand Ecosystem
The MCP server has **full support** for all Algorand ecosystem tokens from CoinGecko's "algorand-ecosystem" category, including:
- Algorand (ALGO)
- USDC on Algorand
- All ASAs (Algorand Standard Assets) with market data

### Global Cryptocurrencies
Also supports major cryptocurrencies:
- Bitcoin (btc, bitcoin)
- Ethereum (eth, ethereum)
- Solana (sol, solana)
- Cardano (ada, cardano)
- And 10,000+ more from CoinGecko

**To find coin IDs**: Check the `id` field in the cryptocurrencies table.

## 🛠️ Configuration

### Environment Variables

The MCP server uses these environment variables (already configured in `.env`):

```env
# MCP Server Configuration
MCP_PORT=8080
MCP_BASE_URL=http://localhost:8080
MCP_ANALYTICS_API_KEY=7adf6888b6d771afd7259753434e74a3b612205b436dfe098fca0b163f6f17c9

# CoinGecko API
COINGECKO_API_KEY=CG-yBGPehgHHsHoKf6haCAaEAWf
```

### Customizing Analysis

You can customize the analysis by modifying the request:

```typescript
{
  coin: "algorand",           // Required: CoinGecko ID
  horizonDays: 90,            // Optional: Days of data (default: 30)
  granularity: "1d",          // Optional: "1h", "4h", "1d" (default: "1d")
  tasks: [                    // Optional: Specific tasks
    "analysis",
    "prediction",
    "strategy",
    "charts"
  ],
  chartType: "candlestick"    // Optional: "line", "bar", "candlestick", "area"
}
```

## 🔧 Troubleshooting

### MCP Server Won't Start

**Problem**: Port 8080 is already in use

**Solution**:
```bash
# macOS/Linux
lsof -i :8080
kill -9 <PID>

# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Analysis Returns Error

**Problem**: "No data available for [coin]"

**Solution**:
1. Verify coin ID is correct (check cryptocurrencies table)
2. Use CoinGecko ID, not symbol (e.g., "algorand" not "ALGO")
3. Ensure coin has sufficient historical data

**Problem**: "Failed to connect to MCP server"

**Solution**:
1. Check MCP server is running: `curl http://localhost:8080/health`
2. Check logs: `tail -f mcp-server.log`
3. Restart MCP server: `cd src/lib/mcp_server && npm run dev`

### Charts Not Displaying

**Problem**: Chart URLs return 404

**Solution**:
1. Check charts directory exists: `src/lib/mcp_server/mcp_server/charts/`
2. Verify permissions: `chmod -R 755 src/lib/mcp_server/mcp_server/`
3. Check MCP_BASE_URL matches server URL

### Slow Analysis

**Problem**: Analysis takes > 10 seconds

**Solution**:
1. **CoinGecko API rate limit**: Free tier has limits
2. **Network latency**: Check internet connection
3. **Too much historical data**: Reduce `horizonDays` parameter

## 📚 API Reference

### POST /api/mcp/analyze

Analyze a cryptocurrency and get predictions.

**Request:**
```json
{
  "coin": "algorand",
  "horizonDays": 30,
  "tasks": ["analysis", "prediction", "strategy", "charts"],
  "chartType": "candlestick"
}
```

**Response:**
```json
{
  "ok": true,
  "summary": "ALGORAND is trading at $0.45...",
  "insights": ["🟢 RSI at 45.2...", "📈 Bullish trend..."],
  "predictions": [
    {
      "date": "2025-10-26",
      "price": 0.4623,
      "probability": 0.78
    }
  ],
  "strategies": [
    {
      "name": "DCA Strategy",
      "description": "ALGORAND is neutral...",
      "risk": "low"
    }
  ],
  "charts": [
    {
      "title": "Price History (candlestick chart)...",
      "url": "http://localhost:8080/charts/abc123.svg"
    }
  ],
  "methodology": {
    "dataPoints": 720,
    "timeframe": "30 days",
    "method": "Multi-Factor Regression + Technical Analysis",
    "indicators": ["RSI", "MACD", "MA", "Volatility"],
    "confidence": "Based on 720 real price points...",
    "calculations": "=== PREDICTION CALCULATION BREAKDOWN ===\n..."
  },
  "overallAnalysis": "ALGORAND is in a strong bullish trend..."
}
```

## 🎓 Best Practices

### For Accurate Predictions
1. ✅ Use 30-day analysis for balanced results
2. ✅ Check confidence scores (>70% is high confidence)
3. ✅ Read the full methodology section
4. ✅ Consider multiple chart types
5. ✅ Review insights and overall analysis together

### For Trading Strategies
1. ✅ Match strategies to your risk tolerance
2. ✅ DCA = Low risk, steady accumulation
3. ✅ REBALANCE = Medium risk, portfolio balance
4. ✅ ROTATE = High risk, momentum plays
5. ✅ Always use stop losses and position sizing

### For Interpretation
1. ✅ Predictions are directional bias, not precise targets
2. ✅ Confidence decreases with forecast horizon
3. ✅ External events can invalidate predictions
4. ✅ Use as one input in your decision-making
5. ✅ Combine with fundamental analysis

## 📖 Additional Resources

- **MCP Server Setup**: See `MCP_SERVER_SETUP.md` for detailed server documentation
- **CoinGecko API**: https://www.coingecko.com/en/api/documentation
- **Technical Indicators**: Search for RSI, MACD, Moving Averages tutorials
- **Trading Strategies**: Research DCA, rebalancing, and momentum strategies

## 🤝 Support

If you encounter issues:

1. **Check the logs**:
   ```bash
   tail -f mcp-server.log
   tail -f nextjs.log
   ```

2. **Verify setup**:
   ```bash
   # Check MCP server
   curl http://localhost:8080/health
   
   # Check Next.js
   curl http://localhost:3000
   ```

3. **Restart everything**:
   ```bash
   # Kill all processes
   pkill -f "npm run dev"
   
   # Restart
   ./start.sh  # or start.bat on Windows
   ```

4. **Check environment**:
   - Node.js version: `node --version` (should be 18+)
   - npm version: `npm --version`
   - Internet connection
   - CoinGecko API key validity

## 📝 License

MIT License - See LICENSE file for details

## 🎉 You're All Set!

The MCP server is now fully working and ready to analyze any Algorand ecosystem asset (or any cryptocurrency from CoinGecko).

**Next Steps:**
1. Start the servers with `./start.sh` (or `start.bat`)
2. Open `http://localhost:3000`
3. Navigate to Cryptocurrencies
4. Click on any token
5. Go to "AI Analysis" tab
6. Click "Analyze" and explore!

**Enjoy your AI-powered crypto analysis! 🚀**

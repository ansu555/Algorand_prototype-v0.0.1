## 🤖 NEW: AI-Powered Asset Analysis

The MCP (Model Context Protocol) Server now provides **intelligent cryptocurrency analysis** for Algorand ecosystem assets!

### ✨ Features
- 📊 **Technical Analysis**: RSI, MACD, Moving Averages, Volatility
- 🔮 **Price Predictions**: 7-day forecasts with confidence scores
- 📈 **Trading Strategies**: DCA, REBALANCE, ROTATE recommendations
- 📉 **Dynamic Charts**: Line, Bar, Candlestick, Area charts
- 🎯 **Full Transparency**: Detailed calculation breakdowns

### 🚀 Quick Start

**Option 1: Automated (Recommended)**
```bash
# macOS/Linux
./start.sh

# Windows
start.bat
```

**Option 2: Manual**
```bash
# Terminal 1: Start MCP Server
cd src/lib/mcp_server && npm install && npm run dev

# Terminal 2: Start Next.js App
npm install && npm run dev
```

### 🎮 How to Use

1. Open `http://localhost:3000`
2. Navigate to **Cryptocurrencies** page
3. Click on any **Algorand ecosystem token**
4. Go to **"AI Analysis"** tab
5. Click **"Analyze [SYMBOL]"**

### 📚 Documentation

- **[Complete Setup Guide](./MCP_AI_ANALYSIS_GUIDE.md)** - Full walkthrough with examples
- **[MCP Server Setup](./MCP_SERVER_SETUP.md)** - Detailed server documentation

### 🎯 What You Get

When you analyze a token, you receive:

**1. Market Analysis**
- Current price and 24h change
- Trend classification (bullish/bearish/neutral)
- Volatility assessment
- Technical indicators (RSI, MACD, MAs)

**2. Price Predictions**
- 7-day price forecasts
- Confidence scores (78%, 72%, etc.)
- Full calculation methodology
- Uncertainty bands

**3. Trading Strategies**
- DCA (low risk): Steady accumulation
- REBALANCE (medium risk): Portfolio balance
- ROTATE (high risk): Momentum plays

**4. Visual Charts**
- Historical price with moving averages
- Forecast with confidence bands
- Multiple chart types

**5. Detailed Calculations**
```
Day 1 (2025-10-26):
  - Trend component: $0.45 + ($0.002 × 1) = $0.452
  - Volatility adjustment: ±$0.015 (random walk)
  - Predicted price: $0.4623
  - Confidence: 78% (decays 3% per day)
  - Range: $0.439 - $0.486 (±5% uncertainty band)
```

### 🔍 Example Analysis

```typescript
// Analyze Algorand
const response = await fetch('/api/mcp/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    coin: 'algorand',
    tasks: ['analysis', 'prediction', 'strategy', 'charts'],
    chartType: 'candlestick'
  })
})

const { summary, insights, predictions, strategies, charts, methodology } = await response.json()
```

### 📊 Supported Assets

- ✅ **All Algorand ecosystem tokens** (from CoinGecko "algorand-ecosystem")
- ✅ **Major cryptocurrencies** (Bitcoin, Ethereum, Solana, etc.)
- ✅ **10,000+ coins** from CoinGecko

### 🛠️ Configuration

The MCP server is pre-configured with:
- Port: 8080
- CoinGecko API key (included)
- Authentication key (included)

All environment variables are in `src/lib/mcp_server/.env`

### 🎓 Understanding Predictions

**Methodology**:
1. **Linear Trend Analysis**: 30-day regression
2. **Volatility Modeling**: Standard deviation
3. **Trend Strength**: R-squared correlation
4. **Confidence Scoring**: Decreases with time horizon
5. **Random Walk**: Realistic price diffusion

**Confidence Levels**:
- 🟢 High (>70%): Strong trend, low volatility
- 🟡 Medium (40-70%): Moderate conditions
- 🔴 Low (<40%): Weak trend, high volatility

### 🔧 Troubleshooting

**MCP Server won't start?**
```bash
# Check port 8080
lsof -i :8080

# Restart
cd src/lib/mcp_server && npm run dev
```

**Analysis fails?**
- Verify coin ID is correct (use CoinGecko ID)
- Check MCP server is running: `curl http://localhost:8080/health`
- Review logs: `tail -f mcp-server.log`

**No charts?**
- Charts are generated at `src/lib/mcp_server/mcp_server/charts/`
- Ensure directory is writable
- Check MCP_BASE_URL matches server URL

### 📖 API Endpoints

**POST /api/mcp/analyze** - Analyze cryptocurrency
```json
{
  "coin": "algorand",
  "horizonDays": 30,
  "tasks": ["analysis", "prediction", "strategy", "charts"],
  "chartType": "candlestick"
}
```

**GET /api/mcp/analyze** - Health check and documentation

### 🎉 Ready to Start!

1. Run `./start.sh` (or `start.bat` on Windows)
2. Open `http://localhost:3000`
3. Explore the Cryptocurrencies page
4. Analyze any Algorand token!

For detailed documentation, see:
- **[Complete AI Analysis Guide](./MCP_AI_ANALYSIS_GUIDE.md)**
- **[MCP Server Documentation](./MCP_SERVER_SETUP.md)**

---

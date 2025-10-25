# MCP Server Setup Guide

## Quick Start Guide for the MCP Analytics Server

### Prerequisites
- Node.js 18+ installed
- CoinGecko API key (free tier works)
- MCP server running on port 8080

### Step 1: Navigate to MCP Server Directory

```bash
cd src/lib/mcp_server
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management
- `tsx` - TypeScript execution

### Step 3: Verify Environment Variables

The `.env` file should already be configured:

```env
MCP_PORT=8080
MCP_BASE_URL=http://localhost:8080
MCP_ANALYTICS_API_KEY=7adf6888b6d771afd7259753434e74a3b612205b436dfe098fca0b163f6f17c9
COINGECKO_API_KEY=CG-yBGPehgHHsHoKf6haCAaEAWf
```

### Step 4: Start the MCP Server

```bash
# Development mode (recommended) - auto-reloads on changes
npm run dev

# OR production mode
npm start
```

You should see:
```
🚀 MCP Analytics Server running on port 8080
📊 Health check: http://localhost:8080/health
🔐 API Key: Configured
```

### Step 5: Test the Server

Open a new terminal and run:

```bash
# Health check
curl http://localhost:8080/health

# Test analysis (Algorand)
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 7adf6888b6d771afd7259753434e74a3b612205b436dfe098fca0b163f6f17c9" \
  -d '{"coin":"algorand","tasks":["analysis","prediction"]}'
```

### Step 6: Start the Next.js App

In a **new terminal**, from the project root:

```bash
npm run dev
```

### Step 7: Access the Application

1. Open your browser to `http://localhost:3000`
2. Navigate to the Cryptocurrencies page
3. Click on any Algorand ecosystem token
4. Go to the "AI Analysis" tab
5. Click "Analyze [SYMBOL]" to get detailed analysis

## Features Available

### 1. Market Analysis
- Real-time technical indicators (RSI, MACD, Moving Averages)
- Trend identification (bullish, bearish, neutral)
- Volatility assessment
- Key support/resistance levels

### 2. Price Predictions
- 7-day price forecasts
- Confidence scores for each prediction
- Detailed calculation methodology
- Uncertainty bands (±5% range)

### 3. Trading Strategies
- **DCA (Dollar Cost Averaging)**: Accumulate over time
- **REBALANCE**: Maintain portfolio allocation
- **ROTATE**: Shift into top performers
- Risk assessment for each strategy

### 4. Charts
- Line charts (simple trends)
- Bar charts (daily movements)
- Candlestick charts (technical analysis)
- Area charts (price ranges)
- Forecast charts with confidence bands

### 5. Detailed Methodology
- Calculation breakdowns for all predictions
- Data sources and confidence assessment
- Indicator explanations
- Risk disclaimers

## How to Analyze Any Token

### From the UI

1. **Go to Cryptocurrencies Page**: `/cryptocurrencies`
2. **Search for a token**: Use the search bar
3. **Click on the token**: Opens detail page
4. **Click "AI Analysis" tab**: Access the analysis feature
5. **Click "Analyze [SYMBOL]"**: Generates comprehensive analysis

### From the API

```bash
# Analyze Algorand
curl -X POST http://localhost:3000/api/mcp/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "coin": "algorand",
    "horizonDays": 30,
    "tasks": ["analysis", "prediction", "strategy", "charts"],
    "chartType": "candlestick"
  }'

# Analyze Bitcoin
curl -X POST http://localhost:3000/api/mcp/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "coin": "bitcoin",
    "tasks": ["prediction"]
  }'
```

### Supported Coins

The MCP server supports **ALL coins from CoinGecko**, including:

#### Algorand Ecosystem (from explore page)
- Algorand (ALGO)
- USDC on Algorand
- All tokens in "algorand-ecosystem" category

#### Major Cryptocurrencies
- Bitcoin (`btc` or `bitcoin`)
- Ethereum (`eth` or `ethereum`)
- Solana (`sol` or `solana`)
- Avalanche (`avax` or `avalanche-2`)
- Cardano (`ada` or `cardano`)
- Polkadot (`dot` or `polkadot`)
- Polygon (`matic` or `matic-network`)

**To find coin IDs**: Check the `id` field in the cryptocurrencies table on the explore page.

## Understanding the Analysis

### Summary Section
- Current price and 24h change
- Market trend classification
- Volatility assessment

### Insights Section
Detailed breakdowns of:
- RSI levels and interpretation
- Moving average crossovers
- MACD signals
- Volatility conditions
- Support/resistance levels
- Risk profile

### Predictions Section
7-day forecasts showing:
- Date
- Predicted price
- Confidence percentage
- Calculation method in methodology accordion

### Strategies Section
Recommended approaches:
- **DCA**: Best for steady accumulation, low risk
- **REBALANCE**: Good for maintaining portfolio balance, medium risk
- **ROTATE**: For momentum trading, higher risk

### Charts Section
Visual representations:
- Historical price with moving averages
- Forecast with confidence bands
- Multiple chart types available

### Methodology Accordion
Detailed breakdowns:
- Data points used
- Timeframe analyzed
- Prediction method
- Indicators calculated
- Full calculation steps
- Confidence assessment

## Troubleshooting

### MCP Server Won't Start

```bash
# Check if port 8080 is in use
lsof -i :8080

# Kill the process if needed
kill -9 <PID>

# Restart the server
npm run dev
```

### Analysis Returns Error

1. **Check MCP server is running**: `curl http://localhost:8080/health`
2. **Verify coin ID**: Use exact ID from CoinGecko
3. **Check API key**: Ensure CoinGecko API key is valid
4. **Check logs**: Look at MCP server console for errors

### Charts Not Displaying

1. **Check charts directory**: Should be created automatically at `src/lib/mcp_server/mcp_server/charts/`
2. **Verify permissions**: Directory must be writable
3. **Check MCP_BASE_URL**: Should match server URL

### No Predictions Generated

1. **Insufficient data**: Coin needs at least 2 days of historical data
2. **API rate limit**: CoinGecko free tier has limits
3. **Invalid coin ID**: Check spelling and use CoinGecko ID

## Production Deployment

### 1. Build the MCP Server

```bash
cd src/lib/mcp_server
npm run build
```

### 2. Set Environment Variables

```bash
export MCP_PORT=8080
export MCP_BASE_URL=https://your-domain.com
export MCP_ANALYTICS_API_KEY=your-secure-key
export COINGECKO_API_KEY=your-api-key
```

### 3. Use Process Manager

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start npm --name "mcp-server" -- start

# Save PM2 config
pm2 save

# Setup auto-restart on boot
pm2 startup
```

### 4. Set Up Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Advanced Usage

### Custom Analysis Request

```typescript
const response = await fetch('/api/mcp/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    coin: 'algorand',
    horizonDays: 90,          // Analyze last 90 days
    granularity: '1d',        // Daily data
    tasks: ['prediction'],    // Only predictions
    chartType: 'candlestick'  // Candlestick chart
  })
})

const data = await response.json()
console.log(data.predictions)
console.log(data.methodology.calculations)
```

### Batch Analysis

```typescript
const coins = ['algorand', 'bitcoin', 'ethereum']

const analyses = await Promise.all(
  coins.map(coin =>
    fetch('/api/mcp/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coin, tasks: ['analysis'] })
    }).then(r => r.json())
  )
)
```

## API Response Structure

```typescript
interface AnalyzeResponse {
  ok: boolean
  summary?: string
  insights?: string[]
  predictions?: Array<{
    date: string
    price: number
    probability: number
  }>
  strategies?: Array<{
    name: string
    description: string
    risk: 'low' | 'medium' | 'high'
  }>
  charts?: Array<{
    title: string
    url: string
  }>
  methodology?: {
    dataPoints: number
    timeframe: string
    method: string
    indicators: string[]
    confidence: string
    calculations?: string  // Full calculation breakdown
  }
  overallAnalysis?: string
  error?: string
  suggestion?: string
}
```

## Tips for Best Results

1. **Use full CoinGecko IDs**: More reliable than symbols
2. **Start with 30-day analysis**: Good balance of data and relevance
3. **Check methodology section**: Understand how predictions are made
4. **Consider confidence scores**: Lower confidence = higher uncertainty
5. **Use multiple chart types**: Different perspectives on the data
6. **Read the full analysis**: Summary + insights + overall analysis
7. **Understand risk levels**: Match strategies to your risk tolerance

## Support

For issues or questions:
1. Check the server console logs
2. Verify all environment variables are set
3. Test with well-known coins first (bitcoin, ethereum)
4. Check CoinGecko API status
5. Review the methodology section for calculation details

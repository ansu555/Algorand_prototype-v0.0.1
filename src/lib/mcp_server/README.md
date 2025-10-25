# MCP Analytics Server

Advanced crypto market analysis service providing technical analysis, predictions, trading strategies, and chart generation.

## Features

- **Technical Analysis**: RSI, MACD, Moving Averages, Volatility
- **Price Predictions**: 7-day forecasts with probability scores
- **Trading Strategies**: DCA, momentum, mean reversion, trend following
- **Chart Generation**: SVG charts with historical data and forecasts

## Installation

```bash
cd mcp_server
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit the `.env` file:

```env
MCP_PORT=8080
MCP_BASE_URL=http://localhost:8080
MCP_ANALYTICS_API_KEY=your-secret-key-here
```

## Running

### Development (with auto-reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "ok": true,
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

### Analyze Coin
```bash
POST /analyze
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "coin": "btc",
  "horizonDays": 30,
  "granularity": "1d",
  "tasks": ["analysis", "prediction", "strategy", "charts"]
}
```

**Parameters:**
- `coin` (required): Coin symbol (btc, eth, sol, avax, etc.)
- `horizonDays` (optional, default: 30): Days of historical data to analyze
- `granularity` (optional, default: "1d"): Data granularity - "1h", "4h", or "1d"
- `tasks` (optional): Array of tasks to perform. If empty, performs all tasks.

**Response:**
```json
{
  "ok": true,
  "summary": "BTC is trading at $64250.00 (+2.45% 24h). The market shows a bullish trend with neutral conditions. Volatility is moderate.",
  "insights": [
    "RSI at 58.3 shows neutral momentum",
    "30-day MA above 50-day MA indicates bullish momentum",
    "MACD histogram positive, suggesting upward momentum",
    "Volatility is moderate, exercise caution with position sizing"
  ],
  "predictions": [
    {
      "date": "2025-10-17",
      "price": 64800.25,
      "probability": 0.68
    }
  ],
  "strategies": [
    {
      "name": "DCA Core",
      "description": "Weekly DCA into BTC over 4-8 weeks, rebalance monthly",
      "risk": "low"
    }
  ],
  "charts": [
    {
      "title": "Price History with Moving Averages",
      "url": "http://localhost:8080/charts/abc123.svg"
    },
    {
      "title": "Price Forecast with Confidence Bands",
      "url": "http://localhost:8080/charts/def456.svg"
    }
  ]
}
```

## Supported Coins

- BTC (Bitcoin)
- ETH (Ethereum)
- SOL (Solana)
- AVAX (Avalanche)
- ADA (Cardano)
- DOT (Polkadot)
- MATIC (Polygon)
- LINK (Chainlink)

More coins can be added by extending the `coinMap` in `main.ts`.

## Integration with Next.js Frontend

The MCP server is called via the Next.js API proxy at `/api/mcp/analyze`.

Example from chat agent:
```typescript
const response = await fetch('/api/mcp/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ coin: 'btc', tasks: ['analysis', 'prediction'] })
})
```

## Development Notes

- Charts are generated as SVG files and stored in `mcp_server/charts/`
- Historical data is currently synthetic for demo purposes
- To integrate real data, update `fetchHistoricalData()` to call CoinGecko or similar APIs
- API key authentication is optional but recommended for production

## Future Enhancements

- [ ] Integrate real historical data from CoinGecko/CoinMarketCap
- [ ] Add more sophisticated prediction models (Prophet, LSTM)
- [ ] Store analysis results in database for caching
- [ ] Add portfolio simulation and backtesting
- [ ] Support custom time ranges and indicators
- [ ] Add WebSocket support for real-time updates

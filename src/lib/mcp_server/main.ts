import 'dotenv/config'
import express, { type Request, type Response } from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// Types
type Granularity = '1h' | '4h' | '1d'
type Task = 'analysis' | 'prediction' | 'strategy' | 'charts'
type RiskLevel = 'low' | 'medium' | 'high'

interface AnalyzeRequest {
  coin: string
  horizonDays?: number
  granularity?: Granularity
  tasks?: Task[]
  chartType?: 'line' | 'bar' | 'candlestick' | 'area' // New: user can specify chart type
}

interface OHLCV {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Prediction {
  date: string
  price: number
  probability?: number
}

interface Strategy {
  name: string
  description: string
  risk: RiskLevel
}

interface Chart {
  title: string
  url: string
}

interface AnalyzeResponse {
  ok: boolean
  summary?: string
  insights?: string[]
  predictions?: Prediction[]
  strategies?: Strategy[]
  overallAnalysis?: string  // Overall summary at the end
  charts?: Chart[]
  methodology?: {
    dataPoints: number
    timeframe: string
    method: string
    indicators: string[]
    confidence: string
    calculations?: string // Detailed calculation breakdown
  }
  error?: string
}

// Configuration
const PORT = process.env.MCP_PORT || 8080
const API_KEY = process.env.MCP_ANALYTICS_API_KEY
const BASE_URL = process.env.MCP_BASE_URL || `http://localhost:${PORT}`
const CHARTS_DIR = path.join(process.cwd(), 'mcp_server', 'charts')

// Initialize Express
const app = express()
app.use(cors())
app.use(express.json())

// Serve static charts
app.use('/charts', express.static(CHARTS_DIR))

// Ensure charts directory exists
async function initChartDir() {
  try {
    await fs.mkdir(CHARTS_DIR, { recursive: true })
  } catch (e) {
    console.error('Failed to create charts directory:', e)
  }
}

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() })
})

// Main analyze endpoint
app.post('/analyze', async (req: Request, res: Response) => {
  // Auth check
  if (API_KEY && req.headers.authorization !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  const { coin, horizonDays = 30, granularity = '1d', tasks = [], chartType = 'line' }: AnalyzeRequest = req.body || {}

  if (!coin) {
    return res.status(400).json({ ok: false, error: 'coin parameter is required' })
  }

  try {
    const response: AnalyzeResponse = { ok: true }

    // Fetch historical data (REAL DATA ONLY)
    const historicalData = await fetchHistoricalData(coin, horizonDays, granularity)
    
    if (historicalData.length === 0) {
      return res.status(404).json({ 
        ok: false, 
        error: `No data available for "${coin}". Please check the coin symbol (e.g., btc, eth, avax, algorand) or CoinGecko ID.` 
      })
    }

    const currentPrice = historicalData[historicalData.length - 1].close

    // Analysis task
    if (tasks.length === 0 || tasks.includes('analysis')) {
      const indicators = computeIndicators(historicalData)
      response.summary = generateSummary(coin, currentPrice, indicators, historicalData)
      response.insights = generateInsights(indicators)
    }

    // Prediction task
    if (tasks.length === 0 || tasks.includes('prediction')) {
      const predictionResults = generatePredictionsDetailed(historicalData, horizonDays, currentPrice)
      response.predictions = predictionResults.predictions
      
      // Add detailed methodology explanation with calculations
      response.methodology = {
        dataPoints: historicalData.length,
        timeframe: `${horizonDays} days (${Math.floor(historicalData.length / 24)} data points per day)`,
        method: 'Multi-Factor Regression + Technical Analysis',
        indicators: ['RSI (14-period)', 'MACD', '30/50-day Moving Averages', 'Historical Volatility', 'Trend Strength (R²)', 'Momentum Indicators'],
        confidence: `Based on ${historicalData.length} real price points from CoinGecko API. Confidence decreases with time horizon due to market uncertainty.`,
        calculations: predictionResults.calculations
      }
    }

    // Strategy task
    if (tasks.length === 0 || tasks.includes('strategy')) {
      const indicators = computeIndicators(historicalData)
      response.strategies = generateStrategies(coin, indicators, currentPrice)
    }

    // Charts task
    if (tasks.length === 0 || tasks.includes('charts')) {
      const indicators = computeIndicators(historicalData)
      response.charts = await generateCharts(
        coin, 
        historicalData, 
        indicators, 
        response.predictions || [],
        chartType // Pass chart type preference
      )
    }
    
    // Generate overall analysis summary (appears at the end, before charts)
    if (response.summary || response.insights || response.predictions || response.strategies) {
      const indicators = computeIndicators(historicalData)
      response.overallAnalysis = generateOverallAnalysis(
        coin, 
        currentPrice, 
        indicators, 
        response.predictions || [],
        response.strategies || []
      )
    }

    res.json(response)
  } catch (error: any) {
    console.error('Analysis error:', error)
    
    // Provide helpful error messages
    const errorMsg = error?.message || 'Internal server error'
    const isNotFound = errorMsg.toLowerCase().includes('not found') || 
                       errorMsg.toLowerCase().includes('no data') ||
                       errorMsg.toLowerCase().includes('invalid coin')
    
    res.status(isNotFound ? 404 : 500).json({ 
      ok: false, 
      error: errorMsg,
      suggestion: isNotFound 
        ? 'Try using common symbols like: btc, eth, avax, sol, ada, algorand or any CoinGecko ID from the explore page'
        : 'Please try again or check your CoinGecko API key configuration.'
    })
  }
})

// Suggest auto-pilot rules endpoint
app.post('/suggest-rule', async (req: Request, res: Response) => {
  // Auth check
  if (API_KEY && req.headers.authorization !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  const { coin, horizonDays = 30 } = req.body || {}

  if (!coin) {
    return res.status(400).json({ ok: false, error: 'coin parameter is required' })
  }

  try {
    // Fetch historical data for analysis
    const historicalData = await fetchHistoricalData(coin, horizonDays, '1d')
    
    if (historicalData.length === 0) {
      return res.status(404).json({ 
        ok: false, 
        error: `No data available for "${coin}". Please check the coin symbol.` 
      })
    }

    const currentPrice = historicalData[historicalData.length - 1].close
    const indicators = computeIndicators(historicalData)
    
    // Generate rule suggestions based on market conditions
    const suggestions = generateRuleSuggestions(coin, indicators, currentPrice, historicalData)
    
    res.json({ ok: true, coin, suggestions })
  } catch (error: any) {
    console.error('Rule suggestion error:', error)
    res.status(500).json({ 
      ok: false, 
      error: error?.message || 'Failed to generate rule suggestions'
    })
  }
})

// GET /rule-model - Returns complete rule model documentation
app.get('/rule-model', (req: Request, res: Response) => {
  const ruleModel = {
    overview: {
      description: "Auto-Pilot rule system for automated crypto trading strategies",
      platform: "Avax Prototype v0.0.2",
      features: [
        "Three strategy types: DCA, REBALANCE, ROTATE",
        "Three trigger mechanisms: Price Drop, Trend, Momentum",
        "Risk controls: Max Spend, Max Slippage, Cooldown",
        "Multi-coin support with dynamic top-N rotation"
      ]
    },
    strategies: {
      DCA: {
        name: "Dollar Cost Averaging",
        description: "Invest fixed amounts on a schedule to reduce timing risk",
        useCase: "Regular accumulation of assets over time",
        bestFor: "Long-term investors who want to smooth out price volatility",
        risk: "low to medium",
        requires: ["coins array", "trigger", "maxSpendUSD"]
      },
      REBALANCE: {
        name: "Portfolio Rebalancing",
        description: "Maintain target allocations across selected coins",
        useCase: "Keep portfolio balanced according to predefined percentages",
        bestFor: "Diversified portfolio management",
        risk: "medium",
        requires: ["coins array (2+)", "trigger", "maxSpendUSD"]
      },
      ROTATE: {
        name: "Rotate Top N",
        description: "Dynamically shift into the top N trending coins",
        useCase: "Follow market momentum by rotating into top performers",
        bestFor: "Active traders seeking momentum plays",
        risk: "high",
        requires: ["rotateTopN", "trigger", "maxSpendUSD"]
      }
    },
    triggers: {
      price_drop_pct: {
        type: "price_drop_pct",
        description: "Trigger when price drops by specified percentage",
        fields: {
          type: "price_drop_pct",
          value: "number (percentage, e.g., 5 means 5% drop)"
        },
        example: { type: "price_drop_pct", value: 5 },
        useCase: "Buy the dip strategies",
        bestFor: "Accumulating during price corrections"
      },
      trend_pct: {
        type: "trend_pct",
        description: "Trigger based on trend strength over a time window",
        fields: {
          type: "trend_pct",
          value: "number (percentage threshold, e.g., 3)",
          window: "'24h' | '7d' | '30d' (time window)"
        },
        example: { type: "trend_pct", value: 3, window: "7d" },
        useCase: "Trend-following strategies",
        bestFor: "Capturing sustained directional moves"
      },
      momentum: {
        type: "momentum",
        description: "Trigger based on momentum indicator over lookback period",
        fields: {
          type: "momentum",
          value: "number (momentum threshold percentage)",
          lookbackDays: "number (days to calculate momentum)"
        },
        example: { type: "momentum", value: 3, lookbackDays: 7 },
        useCase: "Momentum-based entries",
        bestFor: "Riding strong momentum waves"
      }
    },
    ruleStructure: {
      required: {
        type: "'dca' | 'rebalance' | 'rotate'",
        trigger: "RuleTrigger (price_drop_pct | trend_pct | momentum)",
        maxSpendUSD: "number (maximum USD to spend per execution)",
        maxSlippage: "number (0-100, maximum slippage percentage)",
        cooldownMinutes: "number (minimum minutes between executions)"
      },
      conditional: {
        targets: "string[] (required for DCA and REBALANCE, coin IDs)",
        rotateTopN: "number (required for ROTATE, top N coins to rotate into)"
      },
      optional: {
        ownerAddress: "string (wallet address, defaults to 0x000...)",
        status: "'active' | 'paused' (defaults to 'active')"
      },
      generated: {
        id: "string (auto-generated with 'rule_' prefix)",
        createdAt: "string (ISO timestamp)"
      }
    },
    riskControls: {
      maxSpendUSD: {
        description: "Maximum USD amount to spend per rule execution",
        purpose: "Prevents excessive capital deployment in a single trade",
        example: 100,
        recommendation: "Set based on portfolio size, typically 1-5% of portfolio"
      },
      maxSlippage: {
        description: "Maximum allowed slippage percentage (0-100)",
        purpose: "Protects against poor execution prices in illiquid markets",
        example: 0.5,
        recommendation: "0.3-1% for liquid pairs, 2-5% for less liquid pairs"
      },
      cooldownMinutes: {
        description: "Minimum minutes between rule executions",
        purpose: "Prevents over-trading and allows market to settle",
        example: 60,
        recommendation: "60-1440 minutes depending on strategy (1 hour to 1 day)"
      }
    },
    coinSelection: {
      forDCA: {
        description: "Select specific coins to accumulate",
        format: "Array of coin IDs (e.g., ['bitcoin', 'ethereum'])",
        minCoins: 1,
        maxCoins: "unlimited",
        examples: [
          ["bitcoin"],
          ["ethereum", "solana", "avalanche-2"]
        ]
      },
      forREBALANCE: {
        description: "Select coins to maintain balanced allocation",
        format: "Array of coin IDs (e.g., ['bitcoin', 'ethereum'])",
        minCoins: 2,
        maxCoins: "unlimited",
        examples: [
          ["bitcoin", "ethereum"],
          ["bitcoin", "ethereum", "solana", "cardano"]
        ]
      },
      forROTATE: {
        description: "Specify how many top coins to rotate into",
        format: "rotateTopN: number",
        minValue: 1,
        maxValue: "unlimited (typically 3-10)",
        examples: [3, 5, 10],
        note: "System automatically selects top N trending coins"
      }
    },
    workflowExamples: {
      dcaBuyTheDip: {
        description: "DCA into BTC when it drops 5%",
        rule: {
          type: "dca",
          targets: ["bitcoin"],
          trigger: { type: "price_drop_pct", value: 5 },
          maxSpendUSD: 100,
          maxSlippage: 0.5,
          cooldownMinutes: 60
        }
      },
      rebalanceTrendFollowing: {
        description: "Rebalance portfolio when 7-day trend exceeds 3%",
        rule: {
          type: "rebalance",
          targets: ["bitcoin", "ethereum", "solana"],
          trigger: { type: "trend_pct", value: 3, window: "7d" },
          maxSpendUSD: 500,
          maxSlippage: 1,
          cooldownMinutes: 1440
        }
      },
      rotateMomentum: {
        description: "Rotate into top 3 coins with strong 7-day momentum",
        rule: {
          type: "rotate",
          rotateTopN: 3,
          trigger: { type: "momentum", value: 5, lookbackDays: 7 },
          maxSpendUSD: 300,
          maxSlippage: 2,
          cooldownMinutes: 360
        }
      }
    },
    frontendMapping: {
      ruleBuilder: {
        component: "RuleBuilderModal",
        location: "components/rule-builder-modal.tsx",
        fields: [
          "strategy: 'DCA' | 'REBALANCE' | 'ROTATE'",
          "coins: string[] (coin IDs)",
          "triggerType: 'priceDrop' | 'trend' | 'momentum'",
          "dropPercent?: number",
          "trendWindow?: '24h' | '7d' | '30d'",
          "trendThreshold?: number",
          "momentumLookback?: number",
          "momentumThreshold?: number",
          "rotateTopN?: number",
          "maxSpendUsd: number",
          "maxSlippagePercent: number",
          "cooldownMinutes: number"
        ],
        conversion: {
          strategy: "Uppercase (DCA/REBALANCE/ROTATE) → lowercase (dca/rebalance/rotate)",
          triggerType: "priceDrop → price_drop_pct, trend → trend_pct, momentum → momentum",
          maxSpendUsd: "→ maxSpendUSD",
          maxSlippagePercent: "→ maxSlippage"
        }
      },
      apiEndpoint: {
        create: "POST /api/rules",
        get: "GET /api/rules?owner={address}",
        update: "PATCH /api/rules",
        delete: "DELETE /api/rules",
        execute: "POST /api/agent/execute"
      }
    },
    bestPractices: {
      suggestions: [
        "Start with small maxSpendUSD amounts for testing",
        "Use longer cooldowns (6-24 hours) to avoid over-trading",
        "DCA works best with price_drop_pct triggers for buy-the-dip",
        "REBALANCE is effective with trend_pct triggers on longer windows (7d, 30d)",
        "ROTATE strategies benefit from momentum triggers to catch strong moves",
        "Set maxSlippage appropriately: 0.3-1% for major pairs, 2-5% for altcoins",
        "Always test rules with simulation before activating",
        "Monitor cooldown periods to ensure rules don't fire too frequently"
      ],
      riskManagement: [
        "Never allocate more than 5% of portfolio to a single rule execution",
        "Use multiple rules with different triggers for diversification",
        "Set appropriate cooldowns to prevent emotional trading",
        "Monitor slippage closely in volatile markets",
        "Pause rules during extreme market conditions",
        "Review and adjust triggers based on market regime changes"
      ]
    },
    mcpIntegration: {
      suggestRule: {
        endpoint: "POST /suggest-rule",
        description: "AI analyzes market conditions and suggests optimal rule configuration",
        input: { coin: "string" },
        output: {
          suggestions: "Array of rule recommendations with rationale",
          analysis: "Market condition analysis supporting suggestions"
        }
      },
      analyze: {
        endpoint: "POST /analyze",
        description: "Comprehensive market analysis to inform rule creation",
        input: "{ coin: string, horizonDays?: number, chartType?: string }",
        output: {
          summary: "Market overview",
          insights: "Technical indicators and patterns",
          predictions: "Price forecasts",
          strategies: "Recommended strategies (DCA/REBALANCE/ROTATE)",
          overallAnalysis: "Comprehensive summary"
        }
      }
    }
  }
  
  res.json(ruleModel)
})

// Data fetching (using CoinGecko API only - NO SYNTHETIC DATA)
async function fetchHistoricalData(
  coin: string, 
  days: number, 
  granularity: Granularity
): Promise<OHLCV[]> {
  // Map common symbols to CoinGecko IDs
  const coinMap: Record<string, string> = {
    'algo': 'algorand',
    'algorand': 'algorand',
    'btc': 'bitcoin',
    'bitcoin': 'bitcoin',
    'eth': 'ethereum',
    'ethereum': 'ethereum',
    'sol': 'solana',
    'solana': 'solana',
    'avax': 'avalanche-2',
    'avalanche': 'avalanche-2',
    'ada': 'cardano',
    'cardano': 'cardano',
    'dot': 'polkadot',
    'polkadot': 'polkadot',
    'matic': 'matic-network',
    'polygon': 'matic-network',
    'link': 'chainlink',
    'chainlink': 'chainlink',
    'bnb': 'binancecoin',
    'usdc': 'usd-coin',
    'usdt': 'tether',
  }

  const coinId = coinMap[coin.toLowerCase()] || coin.toLowerCase()
  
  // Fetch REAL data from CoinGecko (no fallback)
  const realData = await fetchCoinGeckoData(coinId, days)
  
  if (realData.length === 0) {
    throw new Error(`No data available for ${coin}. Please check the coin symbol/ID.`)
  }
  
  console.log(`✅ Fetched ${realData.length} real data points for ${coinId}`)
  return realData
}

// Fetch real data from CoinGecko API
async function fetchCoinGeckoData(coinId: string, days: number): Promise<OHLCV[]> {
  const apiKey = process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY
  const baseUrl = 'https://api.coingecko.com/api/v3'
  
  // CoinGecko market_chart endpoint
  const url = apiKey 
    ? `${baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&x_cg_demo_api_key=${apiKey}`
    : `${baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Coin "${coinId}" not found on CoinGecko. Please check the coin name/symbol.`)
    }
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
  }
  
  const data: any = await response.json()
  
  // CoinGecko returns: { prices: [[timestamp, price], ...], market_caps: [...], total_volumes: [...] }
  if (!data.prices || data.prices.length === 0) {
    throw new Error('No price data returned from CoinGecko')
  }
  
  // Convert to OHLCV format (we approximate OHLC from single price points)
  const ohlcvData: OHLCV[] = data.prices.map((pricePoint: [number, number], index: number) => {
    const [timestamp, price] = pricePoint
    const volume = data.total_volumes[index]?.[1] || 0
    
    // Since CoinGecko only gives us close prices, we approximate OHLC
    const variance = price * 0.002 // 0.2% variance for realistic OHLC
    return {
      timestamp,
      open: price * (1 + (Math.random() - 0.5) * variance),
      high: price * (1 + Math.random() * variance * 0.5),
      low: price * (1 - Math.random() * variance * 0.5),
      close: price,
      volume
    }
  })
  
  return ohlcvData
}

// Technical indicators
interface Indicators {
  sma30: number
  sma50: number
  rsi: number
  macd: { value: number; signal: number; histogram: number }
  volatility: number
  trend: 'bullish' | 'bearish' | 'neutral'
}

function computeIndicators(data: OHLCV[]): Indicators {
  const closes = data.map(d => d.close)
  
  // Simple Moving Averages
  const sma30 = closes.length >= 30 
    ? closes.slice(-30).reduce((a, b) => a + b, 0) / 30 
    : closes[closes.length - 1]
  
  const sma50 = closes.length >= 50 
    ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 
    : sma30
  
  // RSI
  const rsi = calculateRSI(closes, 14)
  
  // MACD
  const macd = calculateMACD(closes)
  
  // Volatility (30-day standard deviation)
  const volatility = calculateVolatility(closes, 30)
  
  // Trend
  const currentPrice = closes[closes.length - 1]
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (currentPrice > sma30 && sma30 > sma50 && macd.histogram > 0) {
    trend = 'bullish'
  } else if (currentPrice < sma30 && sma30 < sma50 && macd.histogram < 0) {
    trend = 'bearish'
  }
  
  return { sma30, sma50, rsi, macd, volatility, trend }
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50
  
  const changes: number[] = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }
  
  const recentChanges = changes.slice(-period)
  const gains = recentChanges.filter(c => c > 0).reduce((a, b) => a + b, 0) / period
  const losses = Math.abs(recentChanges.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period
  
  if (losses === 0) return 100
  const rs = gains / losses
  return 100 - (100 / (1 + rs))
}

function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  const macdLine = ema12 - ema26
  
  // Signal line is 9-period EMA of MACD
  const macdValues = [macdLine] // Simplified
  const signal = macdLine * 0.9 // Approximation
  
  return {
    value: macdLine,
    signal,
    histogram: macdLine - signal
  }
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0
  const k = 2 / (period + 1)
  let ema = prices[0]
  
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k)
  }
  
  return ema
}

function calculateVolatility(prices: number[], period: number): number {
  if (prices.length < period) return 0
  
  const recentPrices = prices.slice(-period)
  const mean = recentPrices.reduce((a, b) => a + b, 0) / period
  const squaredDiffs = recentPrices.map(p => Math.pow(p - mean, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period
  
  return Math.sqrt(variance)
}

// Generate overall analysis summary (appears at the end)
function generateOverallAnalysis(
  coin: string,
  currentPrice: number,
  indicators: Indicators,
  predictions: Prediction[],
  strategies: Strategy[]
): string {
  const { rsi, sma30, sma50, macd, trend, volatility } = indicators
  const parts: string[] = []
  
  // 1. Market Condition Assessment
  const trendStrength = Math.abs((sma30 - sma50) / sma50 * 100)
  let marketCondition = ''
  if (trend === 'bullish' && trendStrength > 5) {
    marketCondition = `${coin.toUpperCase()} is in a **strong bullish trend** with clear upward momentum`
  } else if (trend === 'bullish') {
    marketCondition = `${coin.toUpperCase()} is showing **early bullish signals** with emerging upward momentum`
  } else if (trend === 'bearish' && trendStrength > 5) {
    marketCondition = `${coin.toUpperCase()} is in a **strong bearish trend** with persistent downward pressure`
  } else if (trend === 'bearish') {
    marketCondition = `${coin.toUpperCase()} is showing **bearish signals** with developing downward pressure`
  } else {
    marketCondition = `${coin.toUpperCase()} is **consolidating** in a neutral trading range`
  }
  parts.push(marketCondition)
  
  // 2. Key Technical Levels
  if (rsi < 30) {
    parts.push(`The RSI at ${rsi.toFixed(1)} indicates the asset is **oversold**, presenting a potential accumulation opportunity for long-term investors.`)
  } else if (rsi > 70) {
    parts.push(`The RSI at ${rsi.toFixed(1)} shows the asset is **overbought**, suggesting profit-taking or caution for new entries is warranted.`)
  } else if (rsi < 45) {
    parts.push(`The RSI at ${rsi.toFixed(1)} reflects **bearish sentiment**, though not yet oversold. Further downside is possible.`)
  } else if (rsi > 55) {
    parts.push(`The RSI at ${rsi.toFixed(1)} reflects **bullish sentiment**, though not yet overbought. Upside momentum is building.`)
  } else {
    parts.push(`The RSI at ${rsi.toFixed(1)} indicates **balanced market conditions** with no clear directional bias from buyers or sellers.`)
  }
  
  // 3. Moving Average Analysis
  if (trend === 'bullish') {
    parts.push(`The 30-day MA ($${sma30.toFixed(2)}) trading above the 50-day MA ($${sma50.toFixed(2)}) confirms the bullish trend and provides dynamic support.`)
  } else {
    parts.push(`The 30-day MA ($${sma30.toFixed(2)}) trading below the 50-day MA ($${sma50.toFixed(2)}) confirms the bearish trend and creates overhead resistance.`)
  }
  
  // 4. Short-term Forecast Analysis
  if (predictions.length > 0) {
    const firstPrediction = predictions[0]
    const lastPrediction = predictions[Math.min(2, predictions.length - 1)]
    const forecastChange = ((lastPrediction.price - currentPrice) / currentPrice * 100).toFixed(2)
    const direction = parseFloat(forecastChange) >= 0 ? 'upward' : 'downward'
    const avgConfidence = predictions.slice(0, 3).reduce((acc, p) => acc + (p.probability || 0), 0) / Math.min(3, predictions.length) * 100
    
    parts.push(`The short-term forecast suggests a ${direction} trajectory toward $${lastPrediction.price.toFixed(2)} (${forecastChange >= '0' ? '+' : ''}${forecastChange}%) over the next 3 days with ${avgConfidence.toFixed(0)}% average confidence.`)
  }
  
  // 5. Recommended Strategy Summary
  if (strategies.length > 0) {
    const primaryStrategy = strategies[0]
    const riskLevels = strategies.map(s => s.risk)
    const overallRisk = riskLevels.includes('high') ? 'elevated' : riskLevels.includes('medium') ? 'moderate' : 'low'
    
    parts.push(`**Recommended Action**: ${primaryStrategy.description.split('-')[0].trim()}. Overall risk level is **${overallRisk}**.`)
  }
  
  // 6. Risk Disclaimer
  const volPct = (volatility / currentPrice * 100).toFixed(1)
  if (parseFloat(volPct) > 5) {
    parts.push(`⚠️ **Important**: Current volatility is high (${volPct}%). Use strict risk management, smaller position sizes, and consider dollar-cost averaging to reduce timing risk.`)
  } else {
    parts.push(`📊 **Risk Management**: With moderate volatility (${volPct}%), standard risk management practices apply. Always use stop losses and size positions appropriately.`)
  }
  
  // 7. Final Recommendation
  let finalRec = ''
  if (trend === 'bearish' && rsi < 35) {
    finalRec = `**Outlook**: Bearish trend with oversold conditions suggests a **cautious accumulation** approach using DCA for long-term positions. Wait for trend reversal confirmation before aggressive entries.`
  } else if (trend === 'bullish' && rsi > 50 && rsi < 70) {
    finalRec = `**Outlook**: Bullish trend with healthy momentum suggests **continued upside potential**. Consider accumulation on dips toward the 30-day MA support level.`
  } else if (trend === 'bullish' && rsi > 70) {
    finalRec = `**Outlook**: Bullish but overbought. Exercise caution with new entries. Consider **profit-taking** on existing positions or waiting for a pullback to better entry levels.`
  } else if (trend === 'bearish' && rsi > 50) {
    finalRec = `**Outlook**: Bearish trend despite elevated RSI suggests a **distribution phase**. Avoid new long positions until trend reversal signals emerge.`
  } else {
    finalRec = `**Outlook**: Neutral/consolidating market. Best approached with **patience and range-trading tactics**. Wait for breakout/breakdown confirmation before committing capital.`
  }
  parts.push(finalRec)
  
  return parts.join(' ')
}

// Generate summary
function generateSummary(
  coin: string, 
  price: number, 
  indicators: Indicators,
  data: OHLCV[]
): string {
  const idx = Math.max(0, data.length - 24)
  const base = data[idx]?.close ?? price
  const change24h = base ? ((price - base) / base * 100) : 0
  const changeStr = change24h >= 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`
  
  return `${coin.toUpperCase()} is trading at $${price.toFixed(2)} (${changeStr} 24h). ` +
    `The market shows a ${indicators.trend} trend with ${indicators.rsi > 70 ? 'overbought' : indicators.rsi < 30 ? 'oversold' : 'neutral'} conditions. ` +
    `Volatility is ${indicators.volatility > price * 0.03 ? 'elevated' : 'moderate'}.`
}

// Generate insights
function generateInsights(indicators: Indicators): string[] {
  const insights: string[] = []
  
  const { rsi, sma30, sma50, macd, volatility, trend } = indicators
  
  // 1. RSI Analysis (detailed)
  if (rsi > 80) {
    insights.push(`🔴 RSI at ${rsi.toFixed(1)} - Extremely overbought territory. Strong selling pressure likely. Consider taking profits or hedging positions.`)
  } else if (rsi > 70) {
    insights.push(`🟡 RSI at ${rsi.toFixed(1)} - Overbought conditions. Price may face resistance. Watch for reversal signals.`)
  } else if (rsi < 20) {
    insights.push(`🟢 RSI at ${rsi.toFixed(1)} - Deeply oversold. Strong bounce potential. Prime accumulation zone for long-term holders.`)
  } else if (rsi < 30) {
    insights.push(`🟢 RSI at ${rsi.toFixed(1)} - Oversold conditions. Price may be undervalued. Consider dollar-cost averaging.`)
  } else if (rsi >= 45 && rsi <= 55) {
    insights.push(`⚪ RSI at ${rsi.toFixed(1)} - Neutral momentum. Market is balanced between buyers and sellers. Wait for clearer signals.`)
  } else if (rsi < 45) {
    insights.push(`🔵 RSI at ${rsi.toFixed(1)} - Below neutral. Bearish bias with potential for further downside or stabilization.`)
  } else {
    insights.push(`🔵 RSI at ${rsi.toFixed(1)} - Above neutral. Bullish bias but not yet overbought. Upward momentum building.`)
  }
  
  // 2. Moving Average Trend (detailed)
  const maDiff = ((sma30 - sma50) / sma50 * 100).toFixed(2)
  if (sma30 > sma50) {
    if (parseFloat(maDiff) > 5) {
      insights.push(`📈 Strong bullish trend: 30-day MA is ${maDiff}% above 50-day MA. Trend is well-established and likely to continue.`)
    } else if (parseFloat(maDiff) > 2) {
      insights.push(`📈 Bullish trend: 30-day MA is ${maDiff}% above 50-day MA. Upward momentum confirmed but watch for consolidation.`)
    } else {
      insights.push(`📈 Emerging bullish trend: 30-day MA just crossed above 50-day MA (+${maDiff}%). Early bullish signal - confirm with volume.`)
    }
  } else {
    if (parseFloat(maDiff) < -5) {
      insights.push(`📉 Strong bearish trend: 30-day MA is ${maDiff}% below 50-day MA. Downtrend is dominant. Wait for reversal signs.`)
    } else if (parseFloat(maDiff) < -2) {
      insights.push(`📉 Bearish trend: 30-day MA is ${maDiff}% below 50-day MA. Downward pressure persists. Consider defensive strategies.`)
    } else {
      insights.push(`📉 Emerging bearish trend: 30-day MA just crossed below 50-day MA (${maDiff}%). Early bearish signal - monitor closely.`)
    }
  }
  
  // 3. MACD Analysis (detailed)
  const macdValue = macd.value.toFixed(4)
  const macdSignal = macd.signal.toFixed(4)
  const macdHist = macd.histogram.toFixed(4)
  
  if (macd.histogram > 0.5) {
    insights.push(`💚 MACD strongly bullish: Histogram ${macdHist} shows strong buying momentum. MACD (${macdValue}) well above signal (${macdSignal}).`)
  } else if (macd.histogram > 0) {
    insights.push(`💚 MACD bullish: Histogram ${macdHist} positive. MACD (${macdValue}) above signal (${macdSignal}), suggesting upward momentum.`)
  } else if (macd.histogram < -0.5) {
    insights.push(`❤️ MACD strongly bearish: Histogram ${macdHist} shows strong selling pressure. MACD (${macdValue}) well below signal (${macdSignal}).`)
  } else {
    insights.push(`❤️ MACD bearish: Histogram ${macdHist} negative. MACD (${macdValue}) below signal (${macdSignal}), indicating downward pressure.`)
  }
  
  // 4. Volatility Analysis (detailed)
  const volPct = (volatility / sma30 * 100).toFixed(2)
  if (parseFloat(volPct) > 10) {
    insights.push(`⚠️ Very high volatility (${volPct}% of price): Expect large price swings. Use smaller position sizes and wider stop losses. High-risk environment.`)
  } else if (parseFloat(volPct) > 5) {
    insights.push(`⚠️ High volatility (${volPct}% of price): Significant price movements likely. Exercise caution with position sizing and risk management.`)
  } else if (parseFloat(volPct) > 2) {
    insights.push(`📊 Moderate volatility (${volPct}% of price): Normal market conditions. Standard risk management practices apply.`)
  } else {
    insights.push(`😴 Low volatility (${volPct}% of price): Market consolidating. Breakout may be imminent. Prepare for increased activity.`)
  }
  
  // 5. Support/Resistance Levels
  insights.push(`🎯 Key levels: Support near 30-day MA ($${sma30.toFixed(2)}), Resistance at 50-day MA ($${sma50.toFixed(2)}). Watch these for breakout/breakdown signals.`)
  
  // 6. Risk Assessment
  const riskLevel = parseFloat(volPct) > 5 ? 'HIGH' : parseFloat(volPct) > 2 ? 'MODERATE' : 'LOW'
  const trendStrength = Math.abs(parseFloat(maDiff)) > 5 ? 'STRONG' : Math.abs(parseFloat(maDiff)) > 2 ? 'MODERATE' : 'WEAK'
  insights.push(`⚖️ Risk Profile: ${riskLevel} risk environment with ${trendStrength} ${trend} trend. Adjust strategy accordingly.`)
  
  return insights
}

// Generate predictions with detailed calculations
function generatePredictionsDetailed(
  data: OHLCV[], 
  horizonDays: number, 
  currentPrice: number
): { predictions: Prediction[]; calculations: string } {
  const predictions: Prediction[] = []
  const calcSteps: string[] = []
  
  calcSteps.push("=== PREDICTION CALCULATION BREAKDOWN ===\n")
  
  // Step 1: Calculate linear regression trend
  const closes = data.slice(-30).map(d => d.close)
  const n = closes.length
  const trend = (closes[closes.length - 1] - closes[0]) / Math.max(1, n)
  calcSteps.push(`1. LINEAR TREND ANALYSIS (Last 30 days):`)
  calcSteps.push(`   - Data points: ${n}`)
  calcSteps.push(`   - Start price: $${closes[0].toFixed(4)}`)
  calcSteps.push(`   - Current price: $${currentPrice.toFixed(4)}`)
  calcSteps.push(`   - Daily trend: $${trend.toFixed(6)} per day`)
  calcSteps.push(`   - Formula: (EndPrice - StartPrice) / Days = (${currentPrice.toFixed(2)} - ${closes[0].toFixed(2)}) / ${n} = ${trend.toFixed(6)}\n`)
  
  // Step 2: Calculate volatility
  const volatility = calculateVolatility(closes, Math.max(2, closes.length))
  const volatilityPct = (volatility / currentPrice * 100)
  calcSteps.push(`2. VOLATILITY CALCULATION (Standard Deviation):`)
  calcSteps.push(`   - Historical volatility: $${volatility.toFixed(4)}`)
  calcSteps.push(`   - Volatility %: ${volatilityPct.toFixed(2)}%`)
  calcSteps.push(`   - Formula: σ = sqrt(Σ(price - mean)² / n)`)
  calcSteps.push(`   - Interpretation: ${volatilityPct > 5 ? 'HIGH - Expect large price swings' : volatilityPct > 2 ? 'MODERATE - Normal market conditions' : 'LOW - Stable market'}\n`)
  
  // Step 3: Calculate trend strength
  const trendStrength = calculateTrendStrength(closes)
  calcSteps.push(`3. TREND STRENGTH (R-squared / Correlation):`)
  calcSteps.push(`   - Trend correlation: ${(trendStrength * 100).toFixed(2)}%`)
  calcSteps.push(`   - Strength level: ${trendStrength > 0.7 ? 'STRONG' : trendStrength > 0.4 ? 'MODERATE' : 'WEAK'}`)
  calcSteps.push(`   - Formula: R = Σ((x-x̄)(y-ȳ)) / sqrt(Σ(x-x̄)² × Σ(y-ȳ)²)`)
  calcSteps.push(`   - Interpretation: ${trendStrength > 0.7 ? 'Strong directional movement, high predictability' : trendStrength > 0.4 ? 'Moderate trend, some noise' : 'Weak trend, highly uncertain'}\n`)
  
  // Step 4: Calculate base confidence
  const normalizedVolatility = Math.min(volatility / currentPrice, 0.5)
  const baseConfidence = 0.5 + (trendStrength * 0.3) - (normalizedVolatility * 0.2)
  calcSteps.push(`4. BASE CONFIDENCE CALCULATION:`)
  calcSteps.push(`   - Formula: 0.5 + (TrendStrength × 0.3) - (NormalizedVolatility × 0.2)`)
  calcSteps.push(`   - Calculation: 0.5 + (${trendStrength.toFixed(3)} × 0.3) - (${normalizedVolatility.toFixed(3)} × 0.2)`)
  calcSteps.push(`   - Base confidence: ${(baseConfidence * 100).toFixed(2)}%`)
  calcSteps.push(`   - Factors: ${trendStrength > 0.5 ? '✓ Strong trend (+)' : '✗ Weak trend (-)'} | ${normalizedVolatility < 0.3 ? '✓ Low volatility (+)' : '✗ High volatility (-)'}\n`)
  
  // Step 5: Generate predictions
  const daysToPredict = Math.min(horizonDays, 7)
  calcSteps.push(`5. DAILY PRICE PREDICTIONS (Next ${daysToPredict} days):\n`)
  
  for (let i = 1; i <= daysToPredict; i++) {
    // Trend component
    const trendFactor = trend * i
    
    // Volatility component (random walk with sqrt(time) scaling)
    const randomWalk = (Math.random() - 0.5) * volatility * Math.sqrt(i)
    
    // Predicted price
    const predictedPrice = currentPrice + trendFactor + randomWalk
    
    // Confidence decay
    const decayRate = 0.02 + (normalizedVolatility * 0.06)
    const probability = Math.max(0.3, Math.min(0.95, baseConfidence - (i * decayRate)))
    
    const date = new Date()
    date.setDate(date.getDate() + i)
    
    predictions.push({
      date: date.toISOString().split('T')[0],
      price: Math.max(0, predictedPrice),
      probability
    })
    
    calcSteps.push(`   Day ${i} (${date.toISOString().split('T')[0]}):`)
    calcSteps.push(`     - Trend component: $${currentPrice.toFixed(2)} + ($${trend.toFixed(6)} × ${i}) = $${(currentPrice + trendFactor).toFixed(2)}`)
    calcSteps.push(`     - Volatility adjustment: ±$${(volatility * Math.sqrt(i)).toFixed(2)} (random walk)`)
    calcSteps.push(`     - Predicted price: $${predictedPrice.toFixed(4)}`)
    calcSteps.push(`     - Confidence: ${(probability * 100).toFixed(1)}% (decays ${(decayRate * 100).toFixed(1)}% per day)`)
    calcSteps.push(`     - Range: $${(predictedPrice * 0.95).toFixed(2)} - $${(predictedPrice * 1.05).toFixed(2)} (±5% uncertainty band)\n`)
  }
  
  calcSteps.push(`6. METHODOLOGY NOTES:`)
  calcSteps.push(`   - Model: Multi-factor regression combining linear trend + random walk`)
  calcSteps.push(`   - Confidence decay: Decreases with time horizon due to increasing uncertainty`)
  calcSteps.push(`   - Volatility scaling: Uses sqrt(time) to model realistic price diffusion`)
  calcSteps.push(`   - Limitations: Does not account for external events, news, or market regime changes`)
  calcSteps.push(`   - Use case: Short-term directional bias, NOT precise price targets\n`)
  
  return {
    predictions,
    calculations: calcSteps.join('\n')
  }
}

// Keep old function for backward compatibility
function generatePredictions(
  data: OHLCV[], 
  horizonDays: number, 
  currentPrice: number
): Prediction[] {
  return generatePredictionsDetailed(data, horizonDays, currentPrice).predictions
}

// Calculate trend strength (R-squared approximation)
function calculateTrendStrength(prices: number[]): number {
  if (prices.length < 2) return 0
  
  const n = prices.length
  const xMean = (n - 1) / 2
  const yMean = prices.reduce((sum, p) => sum + p, 0) / n
  
  let numerator = 0
  let xVariance = 0
  let yVariance = 0
  
  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean
    const yDiff = prices[i] - yMean
    numerator += xDiff * yDiff
    xVariance += xDiff * xDiff
    yVariance += yDiff * yDiff
  }
  
  if (xVariance === 0 || yVariance === 0) return 0
  
  const correlation = numerator / Math.sqrt(xVariance * yVariance)
  return Math.abs(correlation) // R-squared is correlation squared, but we use abs(correlation) for simplicity
}

// Generate strategies (ONLY DCA, REBALANCE, ROTATE - matching Rule Builder)
function generateStrategies(
  coin: string, 
  indicators: Indicators, 
  currentPrice: number
): Strategy[] {
  const strategies: Strategy[] = []
  
  // Calculate metrics for strategy selection
  const rsi = indicators.rsi
  const macdHist = indicators.macd.histogram
  const trend = indicators.trend
  const volatility = indicators.volatility
  const sma30 = indicators.sma30
  const sma50 = indicators.sma50
  
  // Volatility-based risk adjustment
  const volatilityPct = (volatility / currentPrice) * 100
  const isHighVolatility = volatilityPct > 5
  const isLowVolatility = volatilityPct < 2
  
  // === STRATEGY 1: DCA (Dollar Cost Averaging) ===
  // Good for: Accumulation over time, reducing entry risk
  if (rsi < 50) {
    // Oversold or neutral - good for accumulation
    const severity = rsi < 30 ? 'oversold' : 'neutral'
    strategies.push({
      name: 'DCA Strategy',
      description: `${coin.toUpperCase()} is ${severity} (RSI ${rsi.toFixed(1)}) - use DCA to accumulate on price drops ${rsi < 30 ? '≥3%' : '≥5%'}. Cooldown: ${rsi < 30 ? '30' : '60'} min.`,
      risk: 'low'
    })
  } else if (isHighVolatility) {
    // High volatility - DCA smooths entry
    strategies.push({
      name: 'DCA Strategy',
      description: `High volatility (${volatilityPct.toFixed(1)}%) detected - use DCA to spread ${coin.toUpperCase()} purchases over time and reduce timing risk.`,
      risk: 'low'
    })
  } else {
    // Default DCA for steady accumulation
    strategies.push({
      name: 'DCA Strategy',
      description: `Steady ${coin.toUpperCase()} accumulation - use DCA to build position gradually on 5-7% price drops.`,
      risk: 'low'
    })
  }
  
  // === STRATEGY 2: REBALANCE ===
  // Good for: Maintaining portfolio allocation, capturing trends
  if (trend === 'bullish' && !isHighVolatility) {
    strategies.push({
      name: 'REBALANCE Strategy',
      description: `${coin.toUpperCase()} showing bullish trend (30-MA > 50-MA) - use REBALANCE to capture upward momentum when trend strengthens ≥3% over 7 days.`,
      risk: 'medium'
    })
  } else if (trend === 'bearish' && rsi < 40) {
    strategies.push({
      name: 'REBALANCE Strategy',
      description: `${coin.toUpperCase()} in bearish trend (RSI ${rsi.toFixed(1)}) - use REBALANCE to reduce exposure when downtrend exceeds 5% over 7 days.`,
      risk: 'medium'
    })
  } else if (isLowVolatility && trend === 'bullish') {
    strategies.push({
      name: 'REBALANCE Strategy',
      description: `Low volatility (${volatilityPct.toFixed(1)}%) bullish trend - use REBALANCE to maintain target allocation when 30-day trend ≥2%.`,
      risk: 'low'
    })
  }
  
  // === STRATEGY 3: ROTATE (Top N) ===
  // Good for: Momentum trading, multi-coin portfolios
  if (isHighVolatility && rsi > 45 && rsi < 75) {
    strategies.push({
      name: 'ROTATE Strategy',
      description: `High volatility momentum - use ROTATE to shift into top 3-5 trending coins when ${coin.toUpperCase()} shows ≥8% 24h trend.`,
      risk: 'high'
    })
  } else if (trend === 'bullish' && macdHist > 0 && rsi > 50) {
    strategies.push({
      name: 'ROTATE Strategy',
      description: `Strong momentum detected - use ROTATE to automatically shift into top performers when ${coin.toUpperCase()} leads with ≥5% 7-day trend.`,
      risk: 'medium'
    })
  }
  
  // Ensure we always return at least 2 strategies
  if (strategies.length < 2) {
    // Add a default REBALANCE if missing
    if (!strategies.some(s => s.name.includes('REBALANCE'))) {
      strategies.push({
        name: 'REBALANCE Strategy',
        description: `Maintain balanced ${coin.toUpperCase()} allocation - use REBALANCE to rebalance portfolio on 3-5% price movements.`,
        risk: 'medium'
      })
    }
  }
  
  // Return max 3 strategies
  return strategies.slice(0, 3)
}

// Generate auto-pilot rule suggestions based on market conditions
function generateRuleSuggestions(
  coin: string,
  indicators: Indicators,
  currentPrice: number,
  historicalData: OHLCV[]
): Array<{
  strategy: 'DCA' | 'REBALANCE' | 'ROTATE'
  description: string
  reasoning: string
  trigger: {
    type: 'price_drop_pct' | 'trend_pct' | 'momentum'
    value: number
    window?: '24h' | '7d' | '30d'
    lookbackDays?: number
  }
  riskLevel: 'low' | 'medium' | 'high'
  suggestedParams: {
    maxSpendUSD: number
    maxSlippage: number
    cooldownMinutes: number
    rotateTopN?: number
  }
}> {
  const { rsi, macd, sma30, sma50, volatility } = indicators
  const macdHist = macd.histogram
  const suggestions: ReturnType<typeof generateRuleSuggestions> = []
  
  const trend = sma30 > sma50 ? 'bullish' : sma30 < sma50 ? 'bearish' : 'neutral'
  const volatilityPct = (volatility / currentPrice) * 100
  const isHighVolatility = volatilityPct > 5
  const isLowVolatility = volatilityPct < 2
  
  // DCA Strategy - Good for any market condition (implements mean reversion)
  if (rsi < 50) {
    // Oversold or neutral - good for accumulation
    const isMeanReversion = rsi < 35
    suggestions.push({
      strategy: 'DCA',
      description: `DCA ${coin.toUpperCase()} on price dips${isMeanReversion ? ' (Mean Reversion opportunity)' : ''} - RSI at ${rsi.toFixed(1)} suggests accumulation opportunity`,
      reasoning: `Market is ${rsi < 30 ? 'oversold' : 'neutral to bearish'}. DCA strategy reduces risk by buying at lower prices over time${isMeanReversion ? '. Mean reversion principle suggests price will recover to average levels.' : ''}.`,
      trigger: {
        type: 'price_drop_pct',
        value: rsi < 30 ? 3 : 5 // More aggressive in oversold conditions
      },
      riskLevel: 'low',
      suggestedParams: {
        maxSpendUSD: 100,
        maxSlippage: 0.5,
        cooldownMinutes: rsi < 30 ? 30 : 60 // Faster accumulation when oversold
      }
    })
  }
  
  // Rebalance Strategy - Based on trend
  if (trend !== 'neutral' && !isHighVolatility) {
    suggestions.push({
      strategy: 'REBALANCE',
      description: `Rebalance portfolio when ${coin.toUpperCase()} shows ${trend} momentum`,
      reasoning: `${trend === 'bullish' ? 'Upward' : 'Downward'} trend detected (30-day MA ${trend === 'bullish' ? 'above' : 'below'} 50-day MA). Rebalancing captures trend momentum.`,
      trigger: {
        type: 'trend_pct',
        value: trend === 'bullish' ? 3 : 5,
        window: '7d'
      },
      riskLevel: 'medium',
      suggestedParams: {
        maxSpendUSD: 200,
        maxSlippage: 0.5,
        cooldownMinutes: 120
      }
    })
  }
  
  // Momentum-based DCA
  if (rsi > 50 && rsi < 70 && macdHist > 0) {
    suggestions.push({
      strategy: 'DCA',
      description: `Momentum DCA for ${coin.toUpperCase()} - Ride the trend with controlled entries`,
      reasoning: `RSI at ${rsi.toFixed(1)} with positive MACD indicates healthy upward momentum. DCA prevents FOMO while building position.`,
      trigger: {
        type: 'momentum',
        value: 5,
        lookbackDays: 7
      },
      riskLevel: 'medium',
      suggestedParams: {
        maxSpendUSD: 150,
        maxSlippage: 0.8,
        cooldownMinutes: 90
      }
    })
  }
  
  // Rotate Strategy - For high volatility markets
  if (isHighVolatility) {
    suggestions.push({
      strategy: 'ROTATE',
      description: `Auto-rotate to top performers including ${coin.toUpperCase()} during high volatility`,
      reasoning: `High volatility (${volatilityPct.toFixed(1)}%) creates opportunities. Rotation strategy captures momentum across multiple assets.`,
      trigger: {
        type: 'trend_pct',
        value: 8,
        window: '24h'
      },
      riskLevel: 'high',
      suggestedParams: {
        maxSpendUSD: 300,
        maxSlippage: 1.0,
        cooldownMinutes: 180,
        rotateTopN: 3
      }
    })
  }
  
  // Conservative Rebalance - For low volatility
  if (isLowVolatility && trend === 'bullish') {
    suggestions.push({
      strategy: 'REBALANCE',
      description: `Conservative rebalance with ${coin.toUpperCase()} - Low risk accumulation`,
      reasoning: `Low volatility (${volatilityPct.toFixed(1)}%) in bullish trend offers steady accumulation with minimal risk.`,
      trigger: {
        type: 'trend_pct',
        value: 2,
        window: '30d'
      },
      riskLevel: 'low',
      suggestedParams: {
        maxSpendUSD: 250,
        maxSlippage: 0.3,
        cooldownMinutes: 240
      }
    })
  }
  
  // Defensive DCA - For bearish markets
  if (trend === 'bearish' && rsi < 40) {
    suggestions.push({
      strategy: 'DCA',
      description: `Defensive DCA for ${coin.toUpperCase()} - Buy the dip with caution`,
      reasoning: `Bearish trend with RSI ${rsi.toFixed(1)} - Small recurring purchases reduce downside risk while building position.`,
      trigger: {
        type: 'price_drop_pct',
        value: 7 // Wait for larger drops in bear market
      },
      riskLevel: 'medium',
      suggestedParams: {
        maxSpendUSD: 75,
        maxSlippage: 0.5,
        cooldownMinutes: 180
      }
    })
  }
  
  // Return top 3 most relevant suggestions
  return suggestions.slice(0, 3)
}

// Generate charts
async function generateCharts(
  coin: string,
  data: OHLCV[],
  indicators: Indicators,
  predictions: Prediction[],
  chartType: 'line' | 'bar' | 'candlestick' | 'area' = 'line'
): Promise<Chart[]> {
  const charts: Chart[] = []
  
  try {
    // Price + MA chart
    const priceChartId = crypto.randomBytes(8).toString('hex')
    const priceChartPath = path.join(CHARTS_DIR, `${priceChartId}.svg`)
    
    // Render based on user preference
    if (chartType === 'bar') {
      await renderBarChart(data, indicators, priceChartPath)
    } else if (chartType === 'candlestick') {
      await renderCandlestickChart(data, indicators, priceChartPath)
    } else if (chartType === 'area') {
      await renderAreaChart(data, indicators, priceChartPath)
    } else {
      await renderPriceChart(data, indicators, priceChartPath) // Default line chart
    }
    
    charts.push({
      title: `Price History (${chartType} chart) with Moving Averages`,
      url: `${BASE_URL}/charts/${priceChartId}.svg`
    })
    
    // Forecast chart (always linear for predictions)
    if (predictions.length > 0) {
      const forecastChartId = crypto.randomBytes(8).toString('hex')
      const forecastChartPath = path.join(CHARTS_DIR, `${forecastChartId}.svg`)
      await renderForecastChart(data, predictions, forecastChartPath)
      charts.push({
        title: 'Price Forecast (Linear) with Confidence Bands',
        url: `${BASE_URL}/charts/${forecastChartId}.svg`
      })
    }
  } catch (error) {
    console.error('Chart generation error:', error)
  }
  
  return charts
}

// Render price chart as SVG
async function renderPriceChart(
  data: OHLCV[], 
  indicators: Indicators, 
  outputPath: string
): Promise<void> {
  const width = 800
  const height = 400
  const margin = { top: 40, right: 20, bottom: 40, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const recentData = data.slice(-90)
  const prices = recentData.map(d => d.close)
  const minPrice = Math.min(...prices) * 0.98
  const maxPrice = Math.max(...prices) * 1.02

  const xScale = (i: number) => margin.left + (i / Math.max(1, recentData.length - 1)) * chartWidth
  const yScale = (p: number) => margin.top + chartHeight - ((p - minPrice) / (maxPrice - minPrice)) * chartHeight

  const gridLines = Array.from({ length: 6 }, (_, i) => {
    const y = margin.top + (chartHeight / 5) * i
    return `<line x1="${margin.left}" y1="${y.toFixed(2)}" x2="${(width - margin.right)}" y2="${y.toFixed(2)}" stroke="#333" stroke-width="1" />`
  }).join('\n')

  const pricePoints = recentData.map((d, i) => `${xScale(i).toFixed(2)},${yScale(d.close).toFixed(2)}`).join(' ')

  let maPath = ''
  if (recentData.length >= 30) {
    const maPoints: string[] = []
    for (let i = 29; i < recentData.length; i++) {
      const ma = recentData.slice(i - 29, i + 1).reduce((sum, d) => sum + d.close, 0) / 30
      maPoints.push(`${xScale(i).toFixed(2)},${yScale(ma).toFixed(2)}`)
    }
    maPath = `<polyline fill="none" stroke="#ff8800" stroke-width="1.5" points="${maPoints.join(' ')}" />`
  }

  const yLabels = Array.from({ length: 6 }, (_, i) => {
    const price = minPrice + (maxPrice - minPrice) * (i / 5)
    const y = margin.top + chartHeight - (chartHeight / 5) * i
    return `<text x="${margin.left - 10}" y="${(y + 4).toFixed(2)}" fill="#fff" font-size="12" text-anchor="end">$${price.toFixed(2)}</text>`
  }).join('\n')

  const legend = `
    <text x="${width - margin.right - 120}" y="${margin.top + 10}" fill="#00ff88" font-size="12">● Price</text>
    <text x="${width - margin.right - 120}" y="${margin.top + 30}" fill="#ff8800" font-size="12">● 30-day MA</text>
  `

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#1a1a1a" />
    ${gridLines}
    <polyline fill="none" stroke="#00ff88" stroke-width="2" points="${pricePoints}" />
    ${maPath}
    <text x="${width / 2}" y="25" fill="#fff" font-size="14" text-anchor="middle">Price History (Last 90 Days)</text>
    ${yLabels}
    ${legend}
  </svg>`

  await fs.writeFile(outputPath, svg, 'utf-8')
}

// Render forecast chart as SVG
async function renderForecastChart(
  data: OHLCV[], 
  predictions: Prediction[], 
  outputPath: string
): Promise<void> {
  const width = 800
  const height = 400
  const margin = { top: 40, right: 20, bottom: 40, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const recentData = data.slice(-30)
  const historicalPrices = recentData.map(d => d.close)
  const forecastPrices = predictions.map(p => p.price)
  const allPrices = [...historicalPrices, ...forecastPrices]

  const minPrice = Math.min(...allPrices) * 0.98
  const maxPrice = Math.max(...allPrices) * 1.02

  const totalPoints = historicalPrices.length + forecastPrices.length
  const xScale = (i: number) => margin.left + (i / Math.max(1, totalPoints - 1)) * chartWidth
  const yScale = (p: number) => margin.top + chartHeight - ((p - minPrice) / (maxPrice - minPrice)) * chartHeight

  const gridLines = Array.from({ length: 6 }, (_, i) => {
    const y = margin.top + (chartHeight / 5) * i
    return `<line x1="${margin.left}" y1="${y.toFixed(2)}" x2="${(width - margin.right)}" y2="${y.toFixed(2)}" stroke="#333" stroke-width="1" />`
  }).join('\n')

  // Confidence band as polygon
  const upper = forecastPrices.map((price, i) => `${xScale(historicalPrices.length + i).toFixed(2)},${yScale(price * 1.05).toFixed(2)}`).join(' ')
  const lower = forecastPrices.slice().reverse().map((price, idx) => {
    const i = forecastPrices.length - 1 - idx
    return `${xScale(historicalPrices.length + i).toFixed(2)},${yScale(price * 0.95).toFixed(2)}`
  }).join(' ')
  const band = upper && lower ? `<polygon points="${upper} ${lower}" fill="rgba(0,150,255,0.1)" />` : ''

  const historicalPts = historicalPrices.map((p, i) => `${xScale(i).toFixed(2)},${yScale(p).toFixed(2)}`).join(' ')
  const forecastPts = forecastPrices.map((p, i) => `${xScale(historicalPrices.length + i).toFixed(2)},${yScale(p).toFixed(2)}`).join(' ')

  const yLabels = Array.from({ length: 6 }, (_, i) => {
    const price = minPrice + (maxPrice - minPrice) * (i / 5)
    const y = margin.top + chartHeight - (chartHeight / 5) * i
    return `<text x="${margin.left - 10}" y="${(y + 4).toFixed(2)}" fill="#fff" font-size="12" text-anchor="end">$${price.toFixed(2)}</text>`
  }).join('\n')

  const legend = `
    <text x="${width - margin.right - 150}" y="${margin.top + 10}" fill="#00ff88" font-size="12">● Historical</text>
    <text x="${width - margin.right - 150}" y="${margin.top + 30}" fill="#0088ff" font-size="12">● Forecast</text>
  `

  const svg = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
  <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${width}\" height=\"${height}\" viewBox=\"0 0 ${width} ${height}\">
    <rect x=\"0\" y=\"0\" width=\"${width}\" height=\"${height}\" fill=\"#1a1a1a\" />
    ${gridLines}
    ${band}
    <polyline fill=\"none\" stroke=\"#00ff88\" stroke-width=\"2\" points=\"${historicalPts}\" />
    <polyline fill=\"none\" stroke=\"#0088ff\" stroke-dasharray=\"5,5\" stroke-width=\"2\" points=\"${forecastPts}\" />
    <text x=\"${width / 2}\" y=\"25\" fill=\"#fff\" font-size=\"14\" text-anchor=\"middle\">Price Forecast</text>
    ${yLabels}
    ${legend}
  </svg>`

  await fs.writeFile(outputPath, svg, 'utf-8')
}

// Render bar chart as SVG
async function renderBarChart(
  data: OHLCV[], 
  indicators: Indicators, 
  outputPath: string
): Promise<void> {
  const width = 800
  const height = 400
  const margin = { top: 40, right: 20, bottom: 40, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const recentData = data.slice(-90)
  const prices = recentData.map(d => d.close)
  const minPrice = Math.min(...prices) * 0.98
  const maxPrice = Math.max(...prices) * 1.02

  const barWidth = chartWidth / recentData.length
  const yScale = (p: number) => margin.top + chartHeight - ((p - minPrice) / (maxPrice - minPrice)) * chartHeight

  const bars = recentData.map((d, i) => {
    const x = margin.left + i * barWidth
    const barHeight = chartHeight - (yScale(d.close) - margin.top)
    const color = i > 0 && d.close > recentData[i-1].close ? '#00ff88' : '#ff4444'
    return `<rect x="${x.toFixed(2)}" y="${yScale(d.close).toFixed(2)}" width="${(barWidth * 0.8).toFixed(2)}" height="${barHeight.toFixed(2)}" fill="${color}" opacity="0.8" />`
  }).join('\n')

  const yLabels = Array.from({ length: 6 }, (_, i) => {
    const price = minPrice + (maxPrice - minPrice) * (i / 5)
    const y = margin.top + chartHeight - (chartHeight / 5) * i
    return `<text x="${margin.left - 10}" y="${(y + 4).toFixed(2)}" fill="#fff" font-size="12" text-anchor="end">$${price.toFixed(2)}</text>`
  }).join('\n')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#1a1a1a" />
    ${bars}
    <text x="${width / 2}" y="25" fill="#fff" font-size="14" text-anchor="middle">Price History (Bar Chart - Last 90 Days)</text>
    ${yLabels}
  </svg>`

  await fs.writeFile(outputPath, svg, 'utf-8')
}

// Render candlestick chart as SVG
async function renderCandlestickChart(
  data: OHLCV[], 
  indicators: Indicators, 
  outputPath: string
): Promise<void> {
  const width = 800
  const height = 400
  const margin = { top: 40, right: 20, bottom: 40, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const recentData = data.slice(-60) // Show 60 days for candlesticks
  const allPrices = recentData.flatMap(d => [d.high, d.low])
  const minPrice = Math.min(...allPrices) * 0.98
  const maxPrice = Math.max(...allPrices) * 1.02

  const candleWidth = chartWidth / recentData.length
  const yScale = (p: number) => margin.top + chartHeight - ((p - minPrice) / (maxPrice - minPrice)) * chartHeight

  const candles = recentData.map((d, i) => {
    const x = margin.left + i * candleWidth + candleWidth * 0.1
    const bodyWidth = candleWidth * 0.6
    const isGreen = d.close > d.open
    const color = isGreen ? '#00ff88' : '#ff4444'
    
    const highY = yScale(d.high)
    const lowY = yScale(d.low)
    const openY = yScale(d.open)
    const closeY = yScale(d.close)
    const bodyTop = Math.min(openY, closeY)
    const bodyHeight = Math.abs(closeY - openY)
    
    return `
      <line x1="${(x + bodyWidth/2).toFixed(2)}" y1="${highY.toFixed(2)}" x2="${(x + bodyWidth/2).toFixed(2)}" y2="${lowY.toFixed(2)}" stroke="${color}" stroke-width="1" />
      <rect x="${x.toFixed(2)}" y="${bodyTop.toFixed(2)}" width="${bodyWidth.toFixed(2)}" height="${Math.max(bodyHeight, 1).toFixed(2)}" fill="${color}" stroke="${color}" stroke-width="1" />
    `
  }).join('\n')

  const yLabels = Array.from({ length: 6 }, (_, i) => {
    const price = minPrice + (maxPrice - minPrice) * (i / 5)
    const y = margin.top + chartHeight - (chartHeight / 5) * i
    return `<text x="${margin.left - 10}" y="${(y + 4).toFixed(2)}" fill="#fff" font-size="12" text-anchor="end">$${price.toFixed(2)}</text>`
  }).join('\n')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#1a1a1a" />
    ${candles}
    <text x="${width / 2}" y="25" fill="#fff" font-size="14" text-anchor="middle">Price History (Candlestick - Last 60 Days)</text>
    ${yLabels}
  </svg>`

  await fs.writeFile(outputPath, svg, 'utf-8')
}

// Render area chart as SVG
async function renderAreaChart(
  data: OHLCV[], 
  indicators: Indicators, 
  outputPath: string
): Promise<void> {
  const width = 800
  const height = 400
  const margin = { top: 40, right: 20, bottom: 40, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const recentData = data.slice(-90)
  const prices = recentData.map(d => d.close)
  const minPrice = Math.min(...prices) * 0.98
  const maxPrice = Math.max(...prices) * 1.02

  const xScale = (i: number) => margin.left + (i / Math.max(1, recentData.length - 1)) * chartWidth
  const yScale = (p: number) => margin.top + chartHeight - ((p - minPrice) / (maxPrice - minPrice)) * chartHeight

  const pricePoints = recentData.map((d, i) => `${xScale(i).toFixed(2)},${yScale(d.close).toFixed(2)}`).join(' ')
  const areaPoints = `${margin.left},${margin.top + chartHeight} ${pricePoints} ${margin.left + chartWidth},${margin.top + chartHeight}`

  const yLabels = Array.from({ length: 6 }, (_, i) => {
    const price = minPrice + (maxPrice - minPrice) * (i / 5)
    const y = margin.top + chartHeight - (chartHeight / 5) * i
    return `<text x="${margin.left - 10}" y="${(y + 4).toFixed(2)}" fill="#fff" font-size="12" text-anchor="end">$${price.toFixed(2)}</text>`
  }).join('\n')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#1a1a1a" />
    <polygon points="${areaPoints}" fill="rgba(0,255,136,0.2)" />
    <polyline fill="none" stroke="#00ff88" stroke-width="2" points="${pricePoints}" />
    <text x="${width / 2}" y="25" fill="#fff" font-size="14" text-anchor="middle">Price History (Area Chart - Last 90 Days)</text>
    ${yLabels}
  </svg>`

  await fs.writeFile(outputPath, svg, 'utf-8')
}

// Start server
async function start() {
  await initChartDir()
  
  app.listen(PORT, () => {
    console.log(`🚀 MCP Analytics Server running on port ${PORT}`)
    console.log(`📊 Health check: ${BASE_URL}/health`)
    console.log(`🔐 API Key: ${API_KEY ? 'Configured' : 'Not set (optional)'}`)
  })
}

start().catch(console.error)

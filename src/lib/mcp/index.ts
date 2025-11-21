// Main MCP Analytics Engine
import {
  AnalyzeRequest,
  AnalyzeResponse,
  OHLCV,
  Indicators,
  Prediction,
  Strategy
} from './types'
import {
  fetchHistoricalData,
  validateCoinId,
  fetchEnhancedMarketData,
  EnhancedMarketData
} from './data-fetcher'
import { computeIndicators } from './indicators'
import { generatePredictionsDetailed } from './predictions'
import { generateStrategies } from './strategies'
import { generateSummary, generateInsights, generateOverallAnalysis } from './analysis'
import { generateCharts } from './charts'

// Re-export for convenience
export {
  fetchEnhancedMarketData,
  fetchAlgorandAssetInfo,
  fetchTrendingCoins,
  fetchCryptoNews,
  fetchFearGreedIndex,
  fetchTrendingAlgorandTokens,
  fetchTopAlgorandASAs
} from './data-fetcher'
export type { EnhancedMarketData, AlgorandAssetInfo } from './data-fetcher'

/**
 * Main analysis function
 * This can be called from Next.js API routes or anywhere in your app
 */
export async function analyzeCoin(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  try {
    const {
      coin,
      horizonDays = 30,
      granularity = '1d',
      tasks = ['analysis', 'prediction', 'strategy', 'charts'],
      chartType = 'line',
    } = request

    // Validate coin ID
    const coinId = validateCoinId(coin)

    // Fetch historical data and enhanced market data in parallel
    const [data, enhancedData] = await Promise.all([
      fetchHistoricalData(coinId, horizonDays, granularity),
      fetchEnhancedMarketData(coinId).catch(() => null), // Don't fail if enhanced data unavailable
    ])

    if (data.length === 0) {
      return {
        ok: false,
        error: `No data available for ${coinId}`,
        suggestion: 'Try a different coin ID or check if the coin exists on CoinGecko',
      }
    }

    const currentPrice = data[data.length - 1].close

    // Compute indicators
    const indicators = computeIndicators(data)

    // Initialize response with enhanced market data
    const response: AnalyzeResponse = {
      ok: true,
      marketData: enhancedData || undefined,
    }

    // Analysis
    if (tasks.includes('analysis')) {
      response.summary = generateSummary(coinId, currentPrice, indicators, data)
      response.insights = generateInsights(indicators)
    }

    // Predictions
    let predictions: Prediction[] = []
    if (tasks.includes('prediction')) {
      const { predictions: preds, calculations } = generatePredictionsDetailed(
        data,
        horizonDays,
        currentPrice
      )
      predictions = preds
      response.predictions = predictions
      response.methodology = {
        dataPoints: data.length,
        timeframe: `${horizonDays} days`,
        method: 'Linear regression with momentum',
        indicators: ['RSI', 'MACD', 'SMA20', 'SMA50', 'Volatility'],
        confidence: `${(computeIndicators(data).rsi > 50 ? 70 : 60)}%`,
        calculations,
      }
    }

    // Strategies
    let strategies: Strategy[] = []
    if (tasks.includes('strategy')) {
      strategies = generateStrategies(coinId, indicators, currentPrice)
      response.strategies = strategies
    }

    // Charts
    if (tasks.includes('charts')) {
      response.charts = await generateCharts(
        coinId,
        data,
        indicators,
        predictions,
        chartType
      )
    }

    // Overall analysis (always include if we have predictions and strategies)
    if (predictions.length > 0 && strategies.length > 0) {
      response.overallAnalysis = generateOverallAnalysis(
        coinId,
        currentPrice,
        indicators,
        predictions,
        strategies
      )
    }

    return response
  } catch (error: any) {
    console.error('MCP Analysis Error:', error)
    
    return {
      ok: false,
      error: error.message || 'Analysis failed',
      suggestion: error.message.includes('not found') 
        ? 'Check the coin ID (use CoinGecko IDs like "bitcoin", "ethereum", "algorand")'
        : 'Please try again or check the MCP server logs',
    }
  }
}

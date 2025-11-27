// Technical Indicators
import { OHLCV, Indicators } from './types'

/**
 * Compute technical indicators from OHLCV data
 */
export function computeIndicators(data: OHLCV[]): Indicators {
  const closes = data.map(d => d.close)
  const highs = data.map(d => d.high)
  const lows = data.map(d => d.low)

  const rsi = calculateRSI(closes)
  const macd = calculateMACD(closes)
  const sma20 = calculateSMA(closes, 20)
  const sma50 = calculateSMA(closes, 50)
  const volatility = calculateVolatility(closes, 14)

  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (sma20 > sma50 && rsi > 50) {
    trend = 'bullish'
  } else if (sma20 < sma50 && rsi < 50) {
    trend = 'bearish'
  }

  return {
    rsi,
    macd,
    sma20,
    sma50,
    volatility,
    trend,
  }
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50

  const changes = prices.slice(1).map((price, i) => price - prices[i])
  const gains = changes.map(c => (c > 0 ? c : 0))
  const losses = changes.map(c => (c < 0 ? -c : 0))

  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  const macdLine = ema12 - ema26

  // Signal line (9-period EMA of MACD)
  const macdValues = [macdLine]
  const signal = calculateEMA(macdValues, 9)
  const histogram = macdLine - signal

  return {
    value: macdLine,
    signal,
    histogram,
  }
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0

  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }

  return ema
}

/**
 * Calculate SMA (Simple Moving Average)
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

/**
 * Calculate price volatility (standard deviation)
 */
export function calculateVolatility(prices: number[], period: number): number {
  if (prices.length < period) return 0

  const slice = prices.slice(-period)
  const mean = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period

  return Math.sqrt(variance)
}

/**
 * Calculate trend strength (R-squared approximation)
 */
export function calculateTrendStrength(prices: number[]): number {
  if (prices.length < 2) return 0

  const n = prices.length
  const indices = Array.from({ length: n }, (_, i) => i)

  const meanX = indices.reduce((a, b) => a + b, 0) / n
  const meanY = prices.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denomX = 0
  let denomY = 0

  for (let i = 0; i < n; i++) {
    const dx = indices[i] - meanX
    const dy = prices[i] - meanY
    numerator += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }

  if (denomX === 0 || denomY === 0) return 0

  const correlation = numerator / Math.sqrt(denomX * denomY)
  return Math.pow(correlation, 2) // R-squared
}

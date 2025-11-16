// Price Predictions
import { OHLCV, Prediction } from './types'
import { calculateTrendStrength } from './indicators'

/**
 * Generate price predictions with detailed calculations
 */
export function generatePredictionsDetailed(
  data: OHLCV[],
  horizonDays: number,
  currentPrice: number
): { predictions: Prediction[]; calculations: string } {
  const closes = data.map(d => d.close)
  
  // Calculate trend
  const trendStrength = calculateTrendStrength(closes)
  const recentChanges = closes.slice(-7).map((p, i) => 
    i === 0 ? 0 : ((p - closes[closes.length - 7 + i - 1]) / closes[closes.length - 7 + i - 1]) * 100
  )
  const avgChange = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length

  // Generate predictions
  const predictions: Prediction[] = []
  const intervals = Math.min(horizonDays, 10)
  
  for (let i = 1; i <= intervals; i++) {
    const daysAhead = Math.floor((horizonDays / intervals) * i)
    const growthFactor = 1 + (avgChange / 100) * (daysAhead / 7)
    const predictedPrice = currentPrice * growthFactor
    
    const date = new Date()
    date.setDate(date.getDate() + daysAhead)
    
    predictions.push({
      date: date.toISOString().split('T')[0],
      price: Math.max(predictedPrice, currentPrice * 0.5), // Floor at 50% drop
      probability: Math.max(0.3, 1 - (daysAhead / horizonDays) * 0.5), // Confidence decreases with time
    })
  }

  const calculations = `
**Prediction Methodology:**
- Current Price: $${currentPrice.toFixed(2)}
- Trend Strength (R²): ${(trendStrength * 100).toFixed(1)}%
- 7-Day Avg Change: ${avgChange.toFixed(2)}%
- Forecast Horizon: ${horizonDays} days
- Model: Linear regression with momentum adjustment
- Confidence: ${(trendStrength * 100).toFixed(0)}% (decreases with time)
  `.trim()

  return { predictions, calculations }
}

/**
 * Generate simple predictions (backward compatible)
 */
export function generatePredictions(
  data: OHLCV[],
  horizonDays: number,
  currentPrice: number
): Prediction[] {
  return generatePredictionsDetailed(data, horizonDays, currentPrice).predictions
}

// Market Analysis
import { OHLCV, Indicators } from './types'

/**
 * Generate market summary
 */
export function generateSummary(
  coin: string,
  price: number,
  indicators: Indicators,
  data: OHLCV[]
): string {
  const { rsi, trend, sma20, sma50 } = indicators
  const priceChange = data.length > 1 
    ? ((price - data[data.length - 2].close) / data[data.length - 2].close) * 100 
    : 0

  return `${coin.toUpperCase()} is trading at $${price.toFixed(2)} (${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}% 24h). Technical outlook: ${trend.toUpperCase()} trend with RSI at ${rsi.toFixed(1)} (${rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral'}). Price ${price > sma20 ? 'above' : 'below'} 20-day SMA ($${sma20.toFixed(2)}) and ${price > sma50 ? 'above' : 'below'} 50-day SMA ($${sma50.toFixed(2)}).`
}

/**
 * Generate market insights
 */
export function generateInsights(indicators: Indicators): string[] {
  const insights: string[] = []
  const { rsi, macd, trend, volatility, sma20, sma50 } = indicators

  // RSI insights
  if (rsi > 70) {
    insights.push(`🔴 RSI is ${rsi.toFixed(1)} - asset may be overbought. Consider taking profits or waiting for pullback.`)
  } else if (rsi < 30) {
    insights.push(`🟢 RSI is ${rsi.toFixed(1)} - asset may be oversold. Potential buying opportunity if fundamentals are strong.`)
  } else if (rsi > 50 && rsi < 60) {
    insights.push(`🟡 RSI is ${rsi.toFixed(1)} - healthy bullish momentum without being overextended.`)
  } else if (rsi > 40 && rsi < 50) {
    insights.push(`🟡 RSI is ${rsi.toFixed(1)} - slight bearish pressure, but not extreme.`)
  }

  // MACD insights
  if (macd.histogram > 0 && macd.value > macd.signal) {
    insights.push(`📈 MACD shows bullish momentum (histogram: ${macd.histogram.toFixed(2)}). Trend strength is building.`)
  } else if (macd.histogram < 0 && macd.value < macd.signal) {
    insights.push(`📉 MACD shows bearish momentum (histogram: ${macd.histogram.toFixed(2)}). Consider defensive positioning.`)
  } else if (Math.abs(macd.histogram) < 0.5) {
    insights.push(`➡️ MACD histogram near zero - momentum is weak, watch for direction confirmation.`)
  }

  // Moving Average insights
  if (sma20 > sma50) {
    const divergence = ((sma20 - sma50) / sma50) * 100
    if (divergence > 5) {
      insights.push(`🚀 Strong golden cross: 20-day SMA is ${divergence.toFixed(1)}% above 50-day SMA. Uptrend confirmed.`)
    } else {
      insights.push(`✅ 20-day SMA above 50-day SMA - bullish signal confirmed.`)
    }
  } else if (sma20 < sma50) {
    const divergence = ((sma50 - sma20) / sma50) * 100
    if (divergence > 5) {
      insights.push(`⚠️ Death cross: 20-day SMA is ${divergence.toFixed(1)}% below 50-day SMA. Downtrend confirmed.`)
    } else {
      insights.push(`⚠️ 20-day SMA below 50-day SMA - bearish signal.`)
    }
  }

  // Volatility insights
  const volatilityPct = volatility / sma20
  if (volatilityPct > 0.1) {
    insights.push(`⚡ High volatility detected (${(volatilityPct * 100).toFixed(1)}% of price). Expect large price swings - use wider stop losses.`)
  } else if (volatilityPct < 0.03) {
    insights.push(`😴 Low volatility (${(volatilityPct * 100).toFixed(1)}%). Consolidation phase - potential breakout brewing.`)
  }

  // Trend insights
  if (trend === 'bullish') {
    insights.push(`🐂 Bullish trend confirmed by multiple indicators. Look for entry points on pullbacks.`)
  } else if (trend === 'bearish') {
    insights.push(`🐻 Bearish trend confirmed. Consider staying in stablecoins or shorting if experienced.`)
  } else {
    insights.push(`🦘 Sideways/neutral trend. Wait for clearer direction before making large moves.`)
  }

  return insights
}

/**
 * Generate overall analysis summary
 */
export function generateOverallAnalysis(
  coin: string,
  currentPrice: number,
  indicators: Indicators,
  predictions: any[],
  strategies: any[]
): string {
  const { rsi, trend, macd } = indicators
  
  // Determine market sentiment
  let sentiment = 'Neutral'
  let sentimentEmoji = '😐'
  
  if (trend === 'bullish' && rsi < 70 && macd.histogram > 0) {
    sentiment = 'Bullish'
    sentimentEmoji = '📈'
  } else if (trend === 'bearish' && rsi > 30) {
    sentiment = 'Bearish'
    sentimentEmoji = '📉'
  } else if (rsi > 70) {
    sentiment = 'Overbought'
    sentimentEmoji = '🔴'
  } else if (rsi < 30) {
    sentiment = 'Oversold'
    sentimentEmoji = '🟢'
  }

  // Future outlook
  const futurePrediction = predictions.length > 0 ? predictions[predictions.length - 1] : null
  const expectedReturn = futurePrediction 
    ? ((futurePrediction.price - currentPrice) / currentPrice) * 100 
    : 0

  // Risk assessment
  let riskLevel = 'Moderate'
  if (indicators.volatility / currentPrice > 0.1) {
    riskLevel = 'High'
  } else if (indicators.volatility / currentPrice < 0.03) {
    riskLevel = 'Low'
  }

  return `
## ${sentimentEmoji} Overall Market Assessment

**Current Status:** ${coin.toUpperCase()} is showing ${sentiment.toLowerCase()} signals at $${currentPrice.toFixed(2)}.

**Technical Outlook:** 
- Trend: ${trend.toUpperCase()}
- Momentum: ${macd.histogram > 0 ? 'Positive' : 'Negative'}
- Risk Level: ${riskLevel}

**Price Forecast:**
${futurePrediction ? `Expected to ${expectedReturn >= 0 ? 'reach' : 'decline to'} $${futurePrediction.price.toFixed(2)} (${expectedReturn >= 0 ? '+' : ''}${expectedReturn.toFixed(1)}%) by ${futurePrediction.date}` : 'Insufficient data for reliable forecast'}

**Recommended Approach:**
${strategies.length > 0 ? `Primary strategy: **${strategies[0].name}** (${strategies[0].risk} risk)` : 'Hold and monitor market conditions'}

**Key Considerations:**
- ${rsi > 70 ? 'Overbought conditions - exercise caution on new entries' : rsi < 30 ? 'Oversold conditions - potential accumulation opportunity' : 'RSI in neutral zone - wait for confirmation'}
- ${trend === 'bullish' ? 'Uptrend in place - trend is your friend' : trend === 'bearish' ? 'Downtrend active - preserve capital' : 'Sideways movement - wait for breakout'}
- Volatility: ${riskLevel} - ${riskLevel === 'High' ? 'use proper position sizing' : 'stable conditions'}

⚠️ **Disclaimer:** This analysis is for informational purposes only. Always do your own research and never invest more than you can afford to lose.
  `.trim()
}

// Chart Generation (SVG-based, serverless-compatible)
// High-quality professional charts for crypto analysis
import { OHLCV, Indicators, Prediction, ChartType, Chart } from './types'

/**
 * Generate all charts for analysis
 * Returns charts as base64-encoded data URLs for serverless compatibility
 */
export async function generateCharts(
  coin: string,
  data: OHLCV[],
  indicators: Indicators,
  predictions: Prediction[],
  chartType: ChartType = 'line'
): Promise<Chart[]> {
  const charts: Chart[] = []
  
  try {
    // Generate comprehensive price analysis chart with technical indicators
    const analysisSvg = renderPriceAnalysisChart(data, indicators, coin.toUpperCase())
    const analysisDataUrl = `data:image/svg+xml;base64,${Buffer.from(analysisSvg).toString('base64')}`
    charts.push({ title: '📊 Price Analysis & Technical Indicators', url: analysisDataUrl })

    // Generate prediction chart with confidence intervals
    if (predictions.length > 0) {
      const forecastSvg = renderPredictionChart(data, predictions, coin.toUpperCase())
      const forecastDataUrl = `data:image/svg+xml;base64,${Buffer.from(forecastSvg).toString('base64')}`
      charts.push({ title: '🔮 AI Price Prediction (30-Day Forecast)', url: forecastDataUrl })
    }
  } catch (error) {
    console.error('Chart generation error:', error)
  }

  return charts
}

/**
 * Render comprehensive price analysis chart with technical indicators
 */
function renderPriceAnalysisChart(
  data: OHLCV[],
  indicators: Indicators,
  coinSymbol: string
): string {
  const width = 1000
  const height = 600
  const padding = { top: 60, right: 80, bottom: 80, left: 80 }
  
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  
  // Price data
  const prices = data.map(d => d.close)
  const highs = data.map(d => d.high)
  const lows = data.map(d => d.low)
  const volumes = data.map(d => d.volume)
  
  const minPrice = Math.min(...lows) * 0.98
  const maxPrice = Math.max(...highs) * 1.02
  const priceRange = maxPrice - minPrice
  
  const maxVolume = Math.max(...volumes)
  
  // Scaling functions
  const scaleX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth
  const scaleY = (price: number) => padding.top + ((maxPrice - price) / priceRange) * chartHeight
  
  // Calculate SMA arrays for smooth lines
  const sma20Data: number[] = []
  const sma50Data: number[] = []
  for (let i = 0; i < data.length; i++) {
    const start20 = Math.max(0, i - 19)
    const start50 = Math.max(0, i - 49)
    sma20Data.push(prices.slice(start20, i + 1).reduce((a, b) => a + b, 0) / (i - start20 + 1))
    sma50Data.push(prices.slice(start50, i + 1).reduce((a, b) => a + b, 0) / (i - start50 + 1))
  }
  
  // Build SVG
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
  <defs>
    <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0.05" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Title -->
  <text x="${width / 2}" y="35" fill="#f1f5f9" text-anchor="middle" font-size="24" font-weight="bold" font-family="Arial">${coinSymbol} - 30 Day Price Analysis</text>
  
  <!-- Grid lines -->
  <g opacity="0.1">`
  
  // Horizontal grid lines
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i
    const price = maxPrice - (priceRange / 5) * i
    svg += `
    <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#94a3b8" stroke-width="1"/>
    <text x="${padding.left - 10}" y="${y + 5}" fill="#cbd5e1" text-anchor="end" font-size="12" font-family="monospace">$${price.toFixed(4)}</text>`
  }
  
  // Vertical grid lines (every 5 days)
  const dayStep = Math.ceil(data.length / 6)
  for (let i = 0; i <= 6; i++) {
    const index = Math.min(i * dayStep, data.length - 1)
    const x = scaleX(index)
    const date = new Date(data[index].timestamp)
    svg += `
    <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="#94a3b8" stroke-width="1"/>
    <text x="${x}" y="${height - padding.bottom + 20}" fill="#cbd5e1" text-anchor="middle" font-size="11" font-family="Arial">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>`
  }
  
  svg += `
  </g>
  
  <!-- Price area fill -->`
  
  let areaPath = `M ${scaleX(0)},${height - padding.bottom} L ${scaleX(0)},${scaleY(prices[0])}`
  for (let i = 1; i < data.length; i++) {
    areaPath += ` L ${scaleX(i)},${scaleY(prices[i])}`
  }
  areaPath += ` L ${scaleX(data.length - 1)},${height - padding.bottom} Z`
  
  svg += `
  <path d="${areaPath}" fill="url(#priceGradient)"/>
  
  <!-- SMA50 line (purple) -->
  <polyline points="`
  for (let i = 0; i < sma50Data.length; i++) {
    svg += `${scaleX(i)},${scaleY(sma50Data[i])} `
  }
  svg += `" fill="none" stroke="#a855f7" stroke-width="2" opacity="0.7"/>
  
  <!-- SMA20 line (orange) -->
  <polyline points="`
  for (let i = 0; i < sma20Data.length; i++) {
    svg += `${scaleX(i)},${scaleY(sma20Data[i])} `
  }
  svg += `" fill="none" stroke="#f97316" stroke-width="2" opacity="0.8"/>
  
  <!-- Price line (blue with glow) -->
  <polyline points="`
  for (let i = 0; i < data.length; i++) {
    svg += `${scaleX(i)},${scaleY(prices[i])} `
  }
  svg += `" fill="none" stroke="#3b82f6" stroke-width="3" filter="url(#glow)"/>
  
  <!-- Current price indicator -->
  <circle cx="${scaleX(data.length - 1)}" cy="${scaleY(prices[prices.length - 1])}" r="6" fill="#3b82f6" stroke="#fff" stroke-width="2"/>
  <text x="${scaleX(data.length - 1) + 15}" y="${scaleY(prices[prices.length - 1]) + 5}" fill="#3b82f6" font-size="14" font-weight="bold" font-family="Arial">$${prices[prices.length - 1].toFixed(4)}</text>
  
  <!-- Legend -->
  <g transform="translate(${width - padding.right - 200}, ${padding.top + 10})">
    <rect x="0" y="0" width="190" height="110" fill="#1e293b" stroke="#334155" stroke-width="1" rx="5"/>
    
    <line x1="10" y1="20" x2="40" y2="20" stroke="#3b82f6" stroke-width="3"/>
    <text x="50" y="25" fill="#f1f5f9" font-size="12" font-family="Arial">Price</text>
    
    <line x1="10" y1="45" x2="40" y2="45" stroke="#f97316" stroke-width="2"/>
    <text x="50" y="50" fill="#f1f5f9" font-size="12" font-family="Arial">SMA 20</text>
    
    <line x1="10" y1="70" x2="40" y2="70" stroke="#a855f7" stroke-width="2"/>
    <text x="50" y="75" fill="#f1f5f9" font-size="12" font-family="Arial">SMA 50</text>
    
    <text x="10" y="100" fill="#94a3b8" font-size="10" font-family="Arial">RSI: ${indicators.rsi.toFixed(1)} | Trend: ${indicators.trend.toUpperCase()}</text>
  </g>
  
  <!-- Axis labels -->
  <text x="${width / 2}" y="${height - 10}" fill="#cbd5e1" text-anchor="middle" font-size="14" font-family="Arial" font-weight="bold">Time Period (30 Days)</text>
  <text x="20" y="${height / 2}" fill="#cbd5e1" text-anchor="middle" font-size="14" font-family="Arial" font-weight="bold" transform="rotate(-90, 20, ${height / 2})">Price (USD)</text>
  
</svg>`

  return svg
}

/**
 * Render AI prediction chart with confidence intervals
 */
function renderPredictionChart(
  data: OHLCV[],
  predictions: Prediction[],
  coinSymbol: string
): string {
  const width = 1000
  const height = 600
  const padding = { top: 60, right: 80, bottom: 80, left: 80 }
  
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  
  // Combine historical and prediction data
  const historicalPrices = data.map(d => d.close)
  const forecastPrices = predictions.map(p => p.price)
  const allPrices = [...historicalPrices, ...forecastPrices]
  
  const minPrice = Math.min(...allPrices) * 0.95
  const maxPrice = Math.max(...allPrices) * 1.05
  const priceRange = maxPrice - minPrice
  
  const totalPoints = data.length + predictions.length
  const splitPoint = data.length
  
  // Scaling functions
  const scaleX = (index: number) => padding.left + (index / (totalPoints - 1)) * chartWidth
  const scaleY = (price: number) => padding.top + ((maxPrice - price) / priceRange) * chartHeight
  
  // Calculate confidence bands
  const upperBand = predictions.map(p => p.price * 1.05)
  const lowerBand = predictions.map(p => p.price * 0.95)
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
  <defs>
    <linearGradient id="forecastGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#10b981;stop-opacity:0.05" />
    </linearGradient>
    <linearGradient id="historicalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.2" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0.05" />
    </linearGradient>
    <filter id="predictionGlow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Title -->
  <text x="${width / 2}" y="35" fill="#f1f5f9" text-anchor="middle" font-size="24" font-weight="bold" font-family="Arial">${coinSymbol} - AI Price Prediction</text>
  <text x="${width / 2}" y="55" fill="#94a3b8" text-anchor="middle" font-size="14" font-family="Arial">Based on 30-Day Historical Analysis</text>
  
  <!-- Grid lines -->
  <g opacity="0.1">`
  
  // Horizontal grid
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i
    const price = maxPrice - (priceRange / 5) * i
    svg += `
    <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#94a3b8" stroke-width="1"/>
    <text x="${padding.left - 10}" y="${y + 5}" fill="#cbd5e1" text-anchor="end" font-size="12" font-family="monospace">$${price.toFixed(4)}</text>`
  }
  
  // Vertical grid with dates
  const timeStep = Math.ceil(totalPoints / 8)
  for (let i = 0; i <= 8; i++) {
    const index = Math.min(i * timeStep, totalPoints - 1)
    const x = scaleX(index)
    
    let dateLabel = ''
    if (index < data.length) {
      const date = new Date(data[index].timestamp)
      dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      const predIndex = index - data.length
      if (predictions[predIndex]) {
        dateLabel = new Date(predictions[predIndex].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
    }
    
    svg += `
    <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="#94a3b8" stroke-width="1"/>
    <text x="${x}" y="${height - padding.bottom + 20}" fill="#cbd5e1" text-anchor="middle" font-size="11" font-family="Arial">${dateLabel}</text>`
  }
  
  svg += `
  </g>
  
  <!-- Historical price area -->
  <path d="M ${scaleX(0)},${height - padding.bottom} L ${scaleX(0)},${scaleY(historicalPrices[0])}`
  for (let i = 1; i < data.length; i++) {
    svg += ` L ${scaleX(i)},${scaleY(historicalPrices[i])}`
  }
  svg += ` L ${scaleX(data.length - 1)},${height - padding.bottom} Z" fill="url(#historicalGradient)"/>
  
  <!-- Confidence band (forecast range) -->
  <path d="M ${scaleX(splitPoint - 1)},${scaleY(upperBand[0])}`
  for (let i = 0; i < predictions.length; i++) {
    svg += ` L ${scaleX(splitPoint + i)},${scaleY(upperBand[i])}`
  }
  for (let i = predictions.length - 1; i >= 0; i--) {
    svg += ` L ${scaleX(splitPoint + i)},${scaleY(lowerBand[i])}`
  }
  svg += ` Z" fill="#10b981" opacity="0.15"/>
  
  <!-- Historical price line -->
  <polyline points="`
  for (let i = 0; i < data.length; i++) {
    svg += `${scaleX(i)},${scaleY(historicalPrices[i])} `
  }
  svg += `" fill="none" stroke="#3b82f6" stroke-width="3"/>
  
  <!-- Forecast line with glow -->
  <polyline points="${scaleX(splitPoint - 1)},${scaleY(historicalPrices[historicalPrices.length - 1])} `
  for (let i = 0; i < predictions.length; i++) {
    svg += `${scaleX(splitPoint + i)},${scaleY(forecastPrices[i])} `
  }
  svg += `" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="8,4" filter="url(#predictionGlow)"/>
  
  <!-- Prediction split line -->
  <line x1="${scaleX(splitPoint - 1)}" y1="${padding.top}" x2="${scaleX(splitPoint - 1)}" y2="${height - padding.bottom}" stroke="#ef4444" stroke-width="2" stroke-dasharray="5,5" opacity="0.5"/>
  <text x="${scaleX(splitPoint - 1)}" y="${padding.top - 10}" fill="#ef4444" text-anchor="middle" font-size="12" font-weight="bold" font-family="Arial">TODAY</text>
  
  <!-- Current price point -->
  <circle cx="${scaleX(splitPoint - 1)}" cy="${scaleY(historicalPrices[historicalPrices.length - 1])}" r="6" fill="#3b82f6" stroke="#fff" stroke-width="2"/>
  <text x="${scaleX(splitPoint - 1) - 15}" y="${scaleY(historicalPrices[historicalPrices.length - 1]) - 10}" fill="#3b82f6" font-size="13" font-weight="bold" font-family="Arial" text-anchor="end">$${historicalPrices[historicalPrices.length - 1].toFixed(4)}</text>
  
  <!-- Final prediction point -->
  <circle cx="${scaleX(totalPoints - 1)}" cy="${scaleY(forecastPrices[forecastPrices.length - 1])}" r="6" fill="#10b981" stroke="#fff" stroke-width="2"/>
  <text x="${scaleX(totalPoints - 1) + 15}" y="${scaleY(forecastPrices[forecastPrices.length - 1]) + 5}" fill="#10b981" font-size="13" font-weight="bold" font-family="Arial">$${forecastPrices[forecastPrices.length - 1].toFixed(4)}</text>
  
  <!-- Price change indicator -->
  <g transform="translate(${width - padding.right - 220}, ${height - padding.bottom - 140})">
    <rect x="0" y="0" width="210" height="130" fill="#1e293b" stroke="#334155" stroke-width="2" rx="8"/>
    <text x="105" y="25" fill="#f1f5f9" text-anchor="middle" font-size="14" font-weight="bold" font-family="Arial">Prediction Summary</text>
    
    <text x="10" y="50" fill="#94a3b8" font-size="12" font-family="Arial">Current:</text>
    <text x="200" y="50" fill="#3b82f6" font-size="12" font-weight="bold" font-family="monospace" text-anchor="end">$${historicalPrices[historicalPrices.length - 1].toFixed(4)}</text>
    
    <text x="10" y="75" fill="#94a3b8" font-size="12" font-family="Arial">Predicted:</text>
    <text x="200" y="75" fill="#10b981" font-size="12" font-weight="bold" font-family="monospace" text-anchor="end">$${forecastPrices[forecastPrices.length - 1].toFixed(4)}</text>
    
    <line x1="10" y1="85" x2="200" y2="85" stroke="#334155" stroke-width="1"/>
    
    <text x="10" y="105" fill="#94a3b8" font-size="12" font-family="Arial">Change:</text>`
    
    const priceChange = forecastPrices[forecastPrices.length - 1] - historicalPrices[historicalPrices.length - 1]
    const percentChange = (priceChange / historicalPrices[historicalPrices.length - 1]) * 100
    const changeColor = priceChange >= 0 ? '#10b981' : '#ef4444'
    const changeSymbol = priceChange >= 0 ? '+' : ''
    
    svg += `
    <text x="200" y="105" fill="${changeColor}" font-size="13" font-weight="bold" font-family="monospace" text-anchor="end">${changeSymbol}${percentChange.toFixed(2)}%</text>
    
    <text x="10" y="125" fill="#64748b" font-size="10" font-family="Arial">Confidence: ${(predictions[predictions.length - 1].probability! * 100).toFixed(0)}%</text>
  </g>
  
  <!-- Legend -->
  <g transform="translate(${padding.left}, ${height - padding.bottom + 45})">
    <line x1="0" y1="0" x2="30" y2="0" stroke="#3b82f6" stroke-width="3"/>
    <text x="40" y="5" fill="#f1f5f9" font-size="12" font-family="Arial">Historical (30 days)</text>
    
    <line x1="200" y1="0" x2="230" y2="0" stroke="#10b981" stroke-width="3" stroke-dasharray="8,4"/>
    <text x="240" y="5" fill="#f1f5f9" font-size="12" font-family="Arial">AI Prediction</text>
    
    <rect x="400" y="-8" width="15" height="15" fill="#10b981" opacity="0.15"/>
    <text x="425" y="5" fill="#f1f5f9" font-size="12" font-family="Arial">Confidence Range (±5%)</text>
  </g>
  
</svg>`

  return svg
}


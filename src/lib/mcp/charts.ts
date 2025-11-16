// Chart Generation (SVG-based)
import { OHLCV, Indicators, Prediction, ChartType, Chart } from './types'
import * as fs from 'fs/promises'
import * as path from 'path'

const CHARTS_DIR = path.join(process.cwd(), 'public', 'charts')

/**
 * Generate all charts for analysis
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
    // Ensure charts directory exists
    await fs.mkdir(CHARTS_DIR, { recursive: true })

    const timestamp = Date.now()
    
    // Price chart
    const priceChartPath = path.join(CHARTS_DIR, `${coin}_price_${timestamp}.svg`)
    if (chartType === 'candlestick') {
      await renderCandlestickChart(data, indicators, priceChartPath)
    } else if (chartType === 'area') {
      await renderAreaChart(data, indicators, priceChartPath)
    } else if (chartType === 'bar') {
      await renderBarChart(data, indicators, priceChartPath)
    } else {
      await renderPriceChart(data, indicators, priceChartPath)
    }
    charts.push({ title: 'Price & Indicators', url: `/charts/${coin}_price_${timestamp}.svg` })

    // Forecast chart
    if (predictions.length > 0) {
      const forecastChartPath = path.join(CHARTS_DIR, `${coin}_forecast_${timestamp}.svg`)
      await renderForecastChart(data, predictions, forecastChartPath)
      charts.push({ title: 'Price Forecast', url: `/charts/${coin}_forecast_${timestamp}.svg` })
    }
  } catch (error) {
    console.error('Chart generation error:', error)
  }

  return charts
}

/**
 * Render price chart with indicators (Line)
 */
async function renderPriceChart(
  data: OHLCV[],
  indicators: Indicators,
  outputPath: string
): Promise<void> {
  const width = 800
  const height = 400
  const padding = 60

  const prices = data.map(d => d.close)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice

  const scaleX = (index: number) => padding + (index / (data.length - 1)) * (width - 2 * padding)
  const scaleY = (price: number) => height - padding - ((price - minPrice) / priceRange) * (height - 2 * padding)

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#1a1a1a"/>
  <text x="${width / 2}" y="30" fill="#fff" text-anchor="middle" font-size="20" font-weight="bold">Price Chart</text>
  
  <!-- Grid lines -->
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  
  <!-- Price line -->
  <polyline points="`

  for (let i = 0; i < data.length; i++) {
    svg += `${scaleX(i)},${scaleY(data[i].close)} `
  }

  svg += `" fill="none" stroke="#00d4ff" stroke-width="2"/>
  
  <!-- SMA lines -->
  <line x1="${padding}" y1="${scaleY(indicators.sma20)}" x2="${width - padding}" y2="${scaleY(indicators.sma20)}" stroke="#ffa500" stroke-width="1" stroke-dasharray="5,5"/>
  <line x1="${padding}" y1="${scaleY(indicators.sma50)}" x2="${width - padding}" y2="${scaleY(indicators.sma50)}" stroke="#ff00ff" stroke-width="1" stroke-dasharray="5,5"/>
  
  <!-- Y-axis labels -->
  <text x="${padding - 10}" y="${scaleY(maxPrice)}" fill="#fff" text-anchor="end" font-size="12">${maxPrice.toFixed(2)}</text>
  <text x="${padding - 10}" y="${scaleY(minPrice)}" fill="#fff" text-anchor="end" font-size="12">${minPrice.toFixed(2)}</text>
  
  <!-- Legend -->
  <text x="${width - 150}" y="50" fill="#00d4ff" font-size="12">— Price</text>
  <text x="${width - 150}" y="70" fill="#ffa500" font-size="12">- - SMA20</text>
  <text x="${width - 150}" y="90" fill="#ff00ff" font-size="12">- - SMA50</text>
  
</svg>`

  await fs.writeFile(outputPath, svg)
}

/**
 * Render forecast chart
 */
async function renderForecastChart(
  data: OHLCV[],
  predictions: Prediction[],
  outputPath: string
): Promise<void> {
  const width = 800
  const height = 400
  const padding = 60

  const historicalPrices = data.map(d => d.close)
  const forecastPrices = predictions.map(p => p.price)
  const allPrices = [...historicalPrices, ...forecastPrices]
  
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const priceRange = maxPrice - minPrice

  const totalPoints = data.length + predictions.length
  const scaleX = (index: number) => padding + (index / (totalPoints - 1)) * (width - 2 * padding)
  const scaleY = (price: number) => height - padding - ((price - minPrice) / priceRange) * (height - 2 * padding)

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#1a1a1a"/>
  <text x="${width / 2}" y="30" fill="#fff" text-anchor="middle" font-size="20" font-weight="bold">Price Forecast</text>
  
  <!-- Grid -->
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  
  <!-- Historical data -->
  <polyline points="`

  for (let i = 0; i < data.length; i++) {
    svg += `${scaleX(i)},${scaleY(data[i].close)} `
  }

  svg += `" fill="none" stroke="#00d4ff" stroke-width="2"/>
  
  <!-- Forecast data -->
  <polyline points="${scaleX(data.length - 1)},${scaleY(data[data.length - 1].close)} `

  for (let i = 0; i < predictions.length; i++) {
    svg += `${scaleX(data.length + i)},${scaleY(predictions[i].price)} `
  }

  svg += `" fill="none" stroke="#00ff00" stroke-width="2" stroke-dasharray="5,5"/>
  
  <!-- Divider -->
  <line x1="${scaleX(data.length - 1)}" y1="${padding}" x2="${scaleX(data.length - 1)}" y2="${height - padding}" stroke="#ff0000" stroke-width="1" stroke-dasharray="3,3"/>
  
  <!-- Y-axis labels -->
  <text x="${padding - 10}" y="${scaleY(maxPrice)}" fill="#fff" text-anchor="end" font-size="12">${maxPrice.toFixed(2)}</text>
  <text x="${padding - 10}" y="${scaleY(minPrice)}" fill="#fff" text-anchor="end" font-size="12">${minPrice.toFixed(2)}</text>
  
  <!-- Legend -->
  <text x="${width - 150}" y="50" fill="#00d4ff" font-size="12">— Historical</text>
  <text x="${width - 150}" y="70" fill="#00ff00" font-size="12">- - Forecast</text>
  
</svg>`

  await fs.writeFile(outputPath, svg)
}

/**
 * Render bar chart
 */
async function renderBarChart(
  data: OHLCV[],
  indicators: Indicators,
  outputPath: string
): Promise<void> {
  const width = 800
  const height = 400
  const padding = 60

  const prices = data.map(d => d.close)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice

  const barWidth = (width - 2 * padding) / data.length
  const scaleY = (price: number) => height - padding - ((price - minPrice) / priceRange) * (height - 2 * padding)

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#1a1a1a"/>
  <text x="${width / 2}" y="30" fill="#fff" text-anchor="middle" font-size="20" font-weight="bold">Price Bars</text>
  
  <!-- Grid -->
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  
  <!-- Bars -->`

  for (let i = 0; i < data.length; i++) {
    const x = padding + i * barWidth
    const y = scaleY(data[i].close)
    const barHeight = (height - padding) - y
    const color = i > 0 && data[i].close >= data[i - 1].close ? '#00ff00' : '#ff0000'
    
    svg += `
  <rect x="${x + 1}" y="${y}" width="${barWidth - 2}" height="${barHeight}" fill="${color}" opacity="0.7"/>`
  }

  svg += `
  
  <!-- Y-axis labels -->
  <text x="${padding - 10}" y="${scaleY(maxPrice)}" fill="#fff" text-anchor="end" font-size="12">${maxPrice.toFixed(2)}</text>
  <text x="${padding - 10}" y="${scaleY(minPrice)}" fill="#fff" text-anchor="end" font-size="12">${minPrice.toFixed(2)}</text>
  
</svg>`

  await fs.writeFile(outputPath, svg)
}

/**
 * Render candlestick chart
 */
async function renderCandlestickChart(
  data: OHLCV[],
  indicators: Indicators,
  outputPath: string
): Promise<void> {
  const width = 800
  const height = 400
  const padding = 60

  const allPrices = data.flatMap(d => [d.high, d.low])
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const priceRange = maxPrice - minPrice

  const candleWidth = (width - 2 * padding) / data.length * 0.6
  const scaleX = (index: number) => padding + (index / (data.length - 1)) * (width - 2 * padding)
  const scaleY = (price: number) => height - padding - ((price - minPrice) / priceRange) * (height - 2 * padding)

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#1a1a1a"/>
  <text x="${width / 2}" y="30" fill="#fff" text-anchor="middle" font-size="20" font-weight="bold">Candlestick Chart</text>
  
  <!-- Grid -->
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  
  <!-- Candlesticks -->`

  for (let i = 0; i < data.length; i++) {
    const x = scaleX(i)
    const isGreen = data[i].close >= data[i].open
    const color = isGreen ? '#00ff00' : '#ff0000'
    
    const yHigh = scaleY(data[i].high)
    const yLow = scaleY(data[i].low)
    const yOpen = scaleY(data[i].open)
    const yClose = scaleY(data[i].close)
    const bodyTop = Math.min(yOpen, yClose)
    const bodyHeight = Math.abs(yOpen - yClose)
    
    // Wick
    svg += `
  <line x1="${x}" y1="${yHigh}" x2="${x}" y2="${yLow}" stroke="${color}" stroke-width="1"/>`
    
    // Body
    svg += `
  <rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${Math.max(bodyHeight, 1)}" fill="${color}"/>`
  }

  svg += `
  
  <!-- Y-axis labels -->
  <text x="${padding - 10}" y="${scaleY(maxPrice)}" fill="#fff" text-anchor="end" font-size="12">${maxPrice.toFixed(2)}</text>
  <text x="${padding - 10}" y="${scaleY(minPrice)}" fill="#fff" text-anchor="end" font-size="12">${minPrice.toFixed(2)}</text>
  
</svg>`

  await fs.writeFile(outputPath, svg)
}

/**
 * Render area chart
 */
async function renderAreaChart(
  data: OHLCV[],
  indicators: Indicators,
  outputPath: string
): Promise<void> {
  const width = 800
  const height = 400
  const padding = 60

  const prices = data.map(d => d.close)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice

  const scaleX = (index: number) => padding + (index / (data.length - 1)) * (width - 2 * padding)
  const scaleY = (price: number) => height - padding - ((price - minPrice) / priceRange) * (height - 2 * padding)

  let areaPoints = ''
  for (let i = 0; i < data.length; i++) {
    areaPoints += `${scaleX(i)},${scaleY(data[i].close)} `
  }
  
  // Close the area
  areaPoints += `${scaleX(data.length - 1)},${height - padding} ${scaleX(0)},${height - padding}`

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#00d4ff;stop-opacity:0.1" />
    </linearGradient>
  </defs>
  
  <rect width="${width}" height="${height}" fill="#1a1a1a"/>
  <text x="${width / 2}" y="30" fill="#fff" text-anchor="middle" font-size="20" font-weight="bold">Price Area Chart</text>
  
  <!-- Grid -->
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  
  <!-- Area fill -->
  <polygon points="${areaPoints}" fill="url(#areaGradient)"/>
  
  <!-- Price line -->
  <polyline points="`

  for (let i = 0; i < data.length; i++) {
    svg += `${scaleX(i)},${scaleY(data[i].close)} `
  }

  svg += `" fill="none" stroke="#00d4ff" stroke-width="2"/>
  
  <!-- Y-axis labels -->
  <text x="${padding - 10}" y="${scaleY(maxPrice)}" fill="#fff" text-anchor="end" font-size="12">${maxPrice.toFixed(2)}</text>
  <text x="${padding - 10}" y="${scaleY(minPrice)}" fill="#fff" text-anchor="end" font-size="12">${minPrice.toFixed(2)}</text>
  
</svg>`

  await fs.writeFile(outputPath, svg)
}

/**
 * Clean up old charts (optional - call periodically to prevent disk bloat)
 */
export async function cleanupOldCharts(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const files = await fs.readdir(CHARTS_DIR)
    const now = Date.now()
    
    for (const file of files) {
      if (file.endsWith('.svg')) {
        const filePath = path.join(CHARTS_DIR, file)
        const stats = await fs.stat(filePath)
        
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath)
          console.log(`Deleted old chart: ${file}`)
        }
      }
    }
  } catch (error) {
    console.error('Chart cleanup error:', error)
  }
}

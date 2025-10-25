// MCP Analytics Client
// Types and utilities for calling the MCP analytics server

export type Granularity = '1h' | '4h' | '1d'
export type Task = 'analysis' | 'prediction' | 'strategy' | 'charts'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface AnalyzeRequest {
  coin: string
  horizonDays?: number
  granularity?: Granularity
  tasks?: Task[]
}

export interface Prediction {
  date: string
  price: number
  probability?: number
}

export interface Strategy {
  name: string
  description: string
  risk: RiskLevel
}

export interface Chart {
  title: string
  url: string
}

export interface AnalyzeResponse {
  ok: boolean
  summary?: string
  insights?: string[]
  predictions?: Prediction[]
  strategies?: Strategy[]
  charts?: Chart[]
  overallAnalysis?: string
  methodology?: {
    dataPoints: number
    timeframe: string
    method: string
    indicators: string[]
    confidence: string
    calculations?: string
  }
  error?: string
  suggestion?: string
}

/**
 * Call MCP analytics server to analyze a coin
 * This is a server-side utility - call from API routes or server components
 */
export async function analyzeCoin(
  params: AnalyzeRequest
): Promise<AnalyzeResponse> {
  const MCP_BASE_URL = process.env.MCP_BASE_URL || 'http://localhost:8080'
  const MCP_API_KEY = process.env.MCP_ANALYTICS_API_KEY

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (MCP_API_KEY) {
    headers['Authorization'] = `Bearer ${MCP_API_KEY}`
  }

  try {
    const response = await fetch(`${MCP_BASE_URL}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        ok: false,
        error: errorData.error || `HTTP ${response.status}`,
      }
    }

    return await response.json()
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || 'Failed to connect to MCP server',
    }
  }
}

/**
 * Client-side wrapper - calls via Next.js API proxy
 */
export async function analyzeCoinClient(
  params: AnalyzeRequest
): Promise<AnalyzeResponse> {
  try {
    const response = await fetch('/api/mcp/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    return await response.json()
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || 'Network error',
    }
  }
}

/**
 * Format MCP analysis response for chat display
 */
export function formatAnalysisForChat(analysis: AnalyzeResponse): string {
  if (!analysis.ok || analysis.error) {
    return `❌ Analysis failed: ${analysis.error}`
  }

  let output = ''

  // Summary
  if (analysis.summary) {
    output += `📊 **Market Analysis**\n${analysis.summary}\n\n`
  }

  // Insights
  if (analysis.insights && analysis.insights.length > 0) {
    output += `💡 **Key Insights:**\n`
    analysis.insights.forEach(insight => {
      output += `• ${insight}\n`
    })
    output += '\n'
  }

  // Predictions
  if (analysis.predictions && analysis.predictions.length > 0) {
    output += `🔮 **Price Predictions:**\n`
    analysis.predictions.slice(0, 3).forEach(pred => {
      const prob = pred.probability ? ` (${(pred.probability * 100).toFixed(0)}% confidence)` : ''
      output += `• ${pred.date}: $${pred.price.toFixed(2)}${prob}\n`
    })
    output += '\n'
  }

  // Strategies
  if (analysis.strategies && analysis.strategies.length > 0) {
    output += `📈 **Recommended Strategies:**\n`
    analysis.strategies.forEach(strategy => {
      const riskEmoji = strategy.risk === 'low' ? '🟢' : strategy.risk === 'medium' ? '🟡' : '🔴'
      output += `${riskEmoji} **${strategy.name}** (${strategy.risk} risk)\n`
      output += `   ${strategy.description}\n\n`
    })
  }

  // Charts
  if (analysis.charts && analysis.charts.length > 0) {
    output += `📉 **Charts:**\n`
    analysis.charts.forEach(chart => {
      output += `• [${chart.title}](${chart.url})\n`
    })
  }

  return output.trim()
}

/**
 * Extract coin symbols from user message
 */
export function extractCoinFromMessage(message: string): string | null {
  const lowerMsg = message.toLowerCase()
  
  const coinPatterns: Record<string, RegExp> = {
    'btc': /\b(btc|bitcoin)\b/i,
    'eth': /\b(eth|ethereum)\b/i,
    'sol': /\b(sol|solana)\b/i,
    'avax': /\b(avax|avalanche)\b/i,
    'ada': /\b(ada|cardano)\b/i,
    'dot': /\b(dot|polkadot)\b/i,
    'matic': /\b(matic|polygon)\b/i,
    'link': /\b(link|chainlink)\b/i,
  }

  for (const [symbol, pattern] of Object.entries(coinPatterns)) {
    if (pattern.test(lowerMsg)) {
      return symbol
    }
  }

  return null
}

/**
 * Detect if message is requesting analysis
 */
export function isAnalysisRequest(message: string): boolean {
  const lowerMsg = message.toLowerCase()
  const analysisKeywords = [
    'analyze',
    'analysis',
    'predict',
    'forecast',
    'strategy',
    'chart',
    'technical',
    'indicator',
    'trend',
    'outlook',
    'performance',
    'should i buy',
    'should i sell',
  ]

  return analysisKeywords.some(keyword => lowerMsg.includes(keyword))
}

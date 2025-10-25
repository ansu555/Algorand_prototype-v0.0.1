import { NextRequest, NextResponse } from 'next/server'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const STOPWORDS = new Set([
  'analysis',
  'analyze',
  'analyse',
  'price',
  'the',
  'current',
  'what',
  'is',
  'show',
  'me',
  'please',
  'token',
  'coin',
  'do',
  'you',
  'know',
  'now',
  'give',
  'latest',
  'a',
  'an',
  'and'
])

const COIN_MAP: Record<string, string> = {
  algo: 'algorand',
  algorand: 'algorand',
  btc: 'bitcoin',
  bitcoin: 'bitcoin',
  eth: 'ethereum',
  ethereum: 'ethereum',
  sol: 'solana',
  solana: 'solana',
  avax: 'avalanche-2',
  avalanche: 'avalanche-2',
  ada: 'cardano',
  cardano: 'cardano',
  dot: 'polkadot',
  polkadot: 'polkadot',
  matic: 'matic-network',
  polygon: 'matic-network',
  link: 'chainlink',
  chainlink: 'chainlink',
  usdc: 'usd-coin',
  usdt: 'tether'
}

function extractUserMessage(payload: any): string | null {
  if (payload?.message && typeof payload.message === 'string') {
    return payload.message.trim()
  }

  const messages = payload?.messages as ChatMessage[] | undefined
  if (!Array.isArray(messages)) return null

  const lastUserMessage = [...messages].reverse().find((msg) => msg?.role === 'user' && typeof msg.content === 'string')
  return lastUserMessage?.content?.trim() || null
}

function extractCoinSymbol(input: string): string | null {
  const tokens = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  for (const token of tokens) {
    if (!STOPWORDS.has(token) && token.length >= 2 && token.length <= 64) {
      return token
    }
  }

  return null
}

async function fetchMcpAnalysis(coin: string, options?: { horizonDays?: number; tasks?: string[]; chartType?: string }) {
  const mcpBaseUrl = process.env.MCP_BASE_URL || process.env.MCP_ANALYTICS_URL || 'http://localhost:8080'
  const apiKey = process.env.MCP_ANALYTICS_API_KEY

  const payload = {
    coin,
    horizonDays: options?.horizonDays ?? 30,
    tasks: options?.tasks ?? ['analysis', 'prediction', 'strategy', 'charts'],
    chartType: options?.chartType ?? 'line'
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const response = await fetch(`${mcpBaseUrl}/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })

  const text = await response.text()

  if (!text || text.trim() === '') {
    throw new Error('MCP server returned an empty response')
  }

  let data: any
  try {
    data = JSON.parse(text)
  } catch (error: any) {
    throw new Error(`Invalid JSON from MCP server: ${error?.message || error}`)
  }

  if (!response.ok || !data?.ok) {
    const detail = data?.error || `HTTP ${response.status}`
    throw new Error(`MCP analysis failed: ${detail}`)
  }

  return data
}

type MarketOverviewStats = {
  timeframeLabel: string
  sampleSize: number
  current?: number
  high?: number
  low?: number
  changePct?: number
  volatilityPct?: number
}

function mapCoinToId(coin: string): string {
  const lower = coin.toLowerCase()
  return COIN_MAP[lower] || lower
}

async function fetchMarketOverview(coin: string): Promise<MarketOverviewStats | null> {
  try {
    const coinId = mapCoinToId(coin)
    const apiKey = process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY
    const params = new URLSearchParams({ vs_currency: 'usd', days: '365', interval: 'daily' })
    if (apiKey) {
      params.append('x_cg_demo_api_key', apiKey)
    }

    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?${params.toString()}`)
    if (!response.ok) {
      return null
    }

    const json: any = await response.json()
    const prices: number[] = Array.isArray(json?.prices)
      ? json.prices.map((entry: [number, number]) => entry?.[1]).filter((v: number) => typeof v === 'number')
      : []

    if (prices.length === 0) {
      return null
    }

    const current = prices[prices.length - 1]
    const high = Math.max(...prices)
    const low = Math.min(...prices)
    const changePct = ((current - prices[0]) / prices[0]) * 100

    const mean = prices.reduce((sum, value) => sum + value, 0) / prices.length
    const variance = prices.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / prices.length
    const volatilityPct = Math.sqrt(variance) / current * 100

    return {
      timeframeLabel: '1 Year Overview',
      sampleSize: prices.length,
      current,
      high,
      low,
      changePct,
      volatilityPct
    }
  } catch (error) {
    console.error('Market overview fetch failed:', error)
    return null
  }
}

function formatCurrency(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function formatPercent(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function formatAnalysisMessage(
  data: any,
  coin: string,
  overview: MarketOverviewStats | null,
  opts?: { concise?: boolean }
): string {
  const lines: string[] = []
  const upperCoin = coin.toUpperCase()

  lines.push('🔍 **Prediction Methodology**')
  const analyzedLabel = data?.methodology?.dataPoints
    ? `📊 Analyzed: ${data.methodology.dataPoints.toLocaleString()} data points${
        data.methodology.timeframe ? ` over ${data.methodology.timeframe}` : ''
      }`
    : overview?.sampleSize
    ? `📊 Analyzed: ${overview.sampleSize.toLocaleString()} price points over 1 year`
    : null
  if (analyzedLabel) {
    lines.push(analyzedLabel)
  }

  if (data?.methodology?.method) {
    lines.push(`🧮 Method: ${data.methodology.method}`)
  }

  if (Array.isArray(data?.methodology?.indicators)) {
    lines.push(`📈 Indicators: ${data.methodology.indicators.join(', ')}`)
  }

  lines.push(`🎯 Confidence: ${data?.methodology?.confidence ?? 'Not provided'}`)

  if (overview) {
    lines.push('')
    lines.push(`📊 **${upperCoin} - ${overview.timeframeLabel}**`)
    lines.push(
      `💰 Current: ${formatCurrency(overview.current)} | 📈 High: ${formatCurrency(overview.high)} | 📉 Low: ${formatCurrency(overview.low)}`
    )
    lines.push(
      `📊 Change: ${formatPercent(overview.changePct)} | Volatility: ${
        typeof overview.volatilityPct === 'number' ? `${overview.volatilityPct.toFixed(2)}%` : '—'
      }`
    )
  }

  if (data.summary) {
    lines.push('')
    lines.push(`📊 ${data.summary}`)
  }

  if (Array.isArray(data.insights) && data.insights.length > 0 && !opts?.concise) {
    lines.push('')
    lines.push('Insights:')
    data.insights.slice(0, 5).forEach((insight: string) => {
      lines.push(`- ${insight}`)
    })
  }

  if (Array.isArray(data.predictions) && data.predictions.length > 0 && !opts?.concise) {
    lines.push('')
    lines.push('Forecast (next):')
    data.predictions.slice(0, 3).forEach((pred: any) => {
      const confidence = typeof pred.probability === 'number' ? `${Math.round(pred.probability * 100)}%` : '—'
      lines.push(`• ${pred.date}: ${formatCurrency(pred.price)} (${confidence})`)
    })
  }

  if (Array.isArray(data.strategies) && data.strategies.length > 0 && !opts?.concise) {
    lines.push('')
    lines.push('Strategies:')
    data.strategies.slice(0, 3).forEach((strategy: any) => {
      lines.push(`• ${strategy.name} (${strategy.risk}) — ${strategy.description}`)
    })
  }

  if (Array.isArray(data.charts) && data.charts.length > 0) {
    lines.push('')
    lines.push('Charts:')
    data.charts.forEach((chart: any) => {
      lines.push(`• ${chart.title}: ${chart.url}`)
    })
  }

  if (data.overallAnalysis && !opts?.concise) {
    lines.push('')
    lines.push(data.overallAnalysis)
  }

  if (opts?.concise && data.summary) {
    return data.summary
  }

  if (lines.length === 0) {
    return `I couldn't generate a detailed analysis for ${upperCoin}, but you can try again in a moment.`
  }

  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const userMessage = extractUserMessage(body)
    if (!userMessage) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Message is required',
          suggestion: 'Send a message such as "analysis ALGO" or "ALGO price".'
        },
        { status: 400 }
      )
    }

    const normalized = userMessage.toLowerCase()
    const wantsAnalysis = /\b(analysis|analyze|analyse)\b/.test(normalized)
    const wantsPrice = /\bprice\b/.test(normalized)

    const coin = extractCoinSymbol(userMessage)

    if ((wantsAnalysis || wantsPrice) && coin) {
      try {
        const data = await fetchMcpAnalysis(coin, {
          horizonDays: 30,
          tasks: ['analysis', 'prediction', 'strategy', 'charts'],
          chartType: wantsAnalysis ? 'candlestick' : 'line'
        })

        const overview = await fetchMarketOverview(coin)
        const reply = formatAnalysisMessage(data, coin, overview, { concise: wantsPrice && !wantsAnalysis })

        return NextResponse.json({
          ok: true,
          content: reply,
          threadId: body?.threadId ?? null
        })
      } catch (analysisError: any) {
        console.error('Agent analysis error:', analysisError)
        return NextResponse.json(
          {
            ok: false,
            error: analysisError?.message || 'Failed to analyze the asset',
            suggestion: 'Verify that the MCP analytics server is running and reachable.'
          },
          { status: 502 }
        )
      }
    }

    if (!coin && (wantsAnalysis || wantsPrice)) {
      return NextResponse.json({
        ok: true,
        content: 'Please specify which asset to analyze, for example: "analysis ALGO" or "analysis USDC".'
      })
    }

    return NextResponse.json({
      ok: true,
      content: 'I can help with Algorand ecosystem tokens. Try commands like "analysis ALGO" or "ALGO price" for detailed insights.'
    })
  } catch (error: any) {
    console.error('Agent chat error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/agent/chat',
    description: 'AI Agent Chat API for Algorand analytics',
    usage: {
      method: 'POST',
      body: {
        messages: '[{ role: "user" | "assistant", content: string }] (required) - conversation history',
        threadId: 'string (optional) - thread identifier to keep context',
        walletAddress: 'string (optional) - Algorand wallet address for contextual queries',
        chainId: 'number (optional) - chain identifier'
      },
      examples: [
        { message: 'analysis algo' },
        { message: 'algo price' },
        { message: 'analysis opul' }
      ]
    },
    status: 'Operational'
  })
}

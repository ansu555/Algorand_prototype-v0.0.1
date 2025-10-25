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
    tasks: options?.tasks ?? ['analysis', 'prediction', 'strategy'],
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

function formatAnalysisMessage(data: any, coin: string, opts?: { concise?: boolean }): string {
  const lines: string[] = []

  if (data.summary) {
    lines.push(data.summary)
  }

  if (Array.isArray(data.insights) && data.insights.length > 0 && !opts?.concise) {
    const insightHeader = data.insights.length > 1 ? 'Top insights:' : 'Key insight:'
    lines.push('', insightHeader)
    data.insights.slice(0, 3).forEach((insight: string, index: number) => {
      lines.push(`${index + 1}. ${insight}`)
    })
  }

  if (data.predictions?.priceTargets && !opts?.concise) {
    lines.push('', 'Price targets:')
    for (const target of data.predictions.priceTargets.slice(0, 3)) {
      const horizon = target?.horizon ? ` (${target.horizon})` : ''
      lines.push(`• ${target?.label || 'Target'}: $${target?.price?.toFixed?.(4) ?? target?.price}${horizon}`)
    }
  }

  if (lines.length === 0) {
    lines.push(`I couldn't generate a detailed analysis for ${coin.toUpperCase()}, but you can try again in a moment.`)
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
          tasks: wantsAnalysis ? ['analysis', 'prediction', 'strategy'] : ['analysis'],
          chartType: wantsAnalysis ? 'candlestick' : 'line'
        })

        const reply = formatAnalysisMessage(data, coin, { concise: wantsPrice && !wantsAnalysis })

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

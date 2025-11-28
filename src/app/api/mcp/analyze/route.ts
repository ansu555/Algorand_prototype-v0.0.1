import { NextRequest, NextResponse } from 'next/server'
import { analyzeCoin } from '@/lib/mcp'

/**
 * MCP Analyze API
 * Serverless endpoint for cryptocurrency market analysis
 * Supports analyzing any cryptocurrency from CoinGecko
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coin, horizonDays = 30, granularity = '1d', tasks = ['analysis', 'prediction', 'strategy', 'charts'], chartType = 'line' } = body

    if (!coin) {
      return NextResponse.json(
        { ok: false, error: 'Coin ID or symbol is required' },
        { status: 400 }
      )
    }

    console.log(`📊 Analyzing ${coin}...`)

    // Call the analytics engine directly (no separate server needed!)
    const result = await analyzeCoin({
      coin,
      horizonDays,
      granularity,
      tasks,
      chartType,
    })

    if (!result.ok) {
      console.error('MCP analysis error:', result.error)
      return NextResponse.json(result, { status: 400 })
    }

    console.log(`✅ Successfully analyzed ${coin}`)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('MCP analysis error:', error)
    return NextResponse.json(
      { 
        ok: false, 
        error: error?.message || 'Analysis failed',
        suggestion: 'Please try again or check the server logs'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for health check and documentation
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    status: 'online',
    timestamp: new Date().toISOString(),
    usage: {
      endpoint: '/api/mcp/analyze',
      method: 'POST',
      body: {
        coin: 'string (required) - CoinGecko ID or symbol (e.g., "algorand", "bitcoin", "ethereum")',
        horizonDays: 'number (optional, default: 30) - Days of historical data to analyze',
        granularity: 'string (optional, default: "1d") - Data granularity: "1h", "4h", or "1d"',
        tasks: 'string[] (optional) - Specific tasks: ["analysis", "prediction", "strategy", "charts"]',
        chartType: 'string (optional, default: "line") - Chart type: "line", "bar", "candlestick", or "area"'
      },
      examples: [
        {
          description: 'Analyze Algorand with all features',
          request: {
            coin: 'algorand',
            horizonDays: 30,
            tasks: ['analysis', 'prediction', 'strategy', 'charts'],
            chartType: 'candlestick'
          }
        },
        {
          description: 'Quick analysis with predictions only',
          request: {
            coin: 'bitcoin',
            tasks: ['prediction']
          }
        }
      ]
    }
  })
}

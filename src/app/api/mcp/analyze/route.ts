import { NextRequest, NextResponse } from 'next/server'

/**
 * MCP Analyze Proxy API
 * Forwards analysis requests to the MCP Analytics Server
 * Supports analyzing any cryptocurrency from the Algorand ecosystem or global markets
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coin, horizonDays = 30, granularity = '1d', tasks = [], chartType = 'line' } = body

    if (!coin) {
      return NextResponse.json(
        { ok: false, error: 'Coin ID or symbol is required' },
        { status: 400 }
      )
    }

    const MCP_BASE_URL = process.env.MCP_BASE_URL || 'http://localhost:8080'
    const MCP_API_KEY = process.env.MCP_ANALYTICS_API_KEY

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (MCP_API_KEY) {
      headers['Authorization'] = `Bearer ${MCP_API_KEY}`
    }

    console.log(`📊 Analyzing ${coin} via MCP server...`)

    const response = await fetch(`${MCP_BASE_URL}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        coin,
        horizonDays,
        granularity,
        tasks,
        chartType
      }),
    })

    if (!response.ok) {
      let errorData
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json()
        } catch (e) {
          const text = await response.text()
          errorData = { error: `MCP server error: ${response.status} - ${text.substring(0, 200)}` }
        }
      } else {
        const text = await response.text()
        errorData = { error: `MCP server error: ${response.status} - ${text.substring(0, 200)}` }
      }
      
      console.error('MCP analysis error:', errorData)
      
      return NextResponse.json(
        { 
          ok: false, 
          error: errorData.error || 'Analysis failed',
          suggestion: errorData.suggestion || 'Please check MCP server logs'
        },
        { status: response.status }
      )
    }

    // Parse JSON response with better error handling
    let data
    try {
      const text = await response.text()
      console.log(`📥 Response size: ${text.length} bytes`)
      
      if (!text || text.trim() === '') {
        throw new Error('Empty response from MCP server')
      }
      
      data = JSON.parse(text)
      console.log(`✅ Successfully analyzed ${coin}`)
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json(
        { 
          ok: false, 
          error: `Failed to parse MCP server response: ${parseError.message}`,
          suggestion: 'The MCP server may be returning invalid data. Check server logs.'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('MCP proxy error:', error)
    return NextResponse.json(
      { 
        ok: false, 
        error: error?.message || 'Failed to connect to MCP analytics server',
        suggestion: 'Please ensure the MCP server is running on port 8080'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for health check and documentation
 */
export async function GET(request: NextRequest) {
  const MCP_BASE_URL = process.env.MCP_BASE_URL || 'http://localhost:8080'
  
  try {
    const response = await fetch(`${MCP_BASE_URL}/health`)
    const health = await response.json()
    
    return NextResponse.json({
      ok: true,
      mcpServer: {
        url: MCP_BASE_URL,
        status: health.ok ? 'online' : 'offline',
        timestamp: health.timestamp
      },
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
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'MCP server is not running',
      suggestion: 'Start the MCP server: cd src/lib/mcp_server && npm run dev'
    }, { status: 503 })
  }
}

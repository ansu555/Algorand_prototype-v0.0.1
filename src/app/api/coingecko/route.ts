import { NextRequest, NextResponse } from 'next/server'

const COINGECKO_API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const endpoint = searchParams.get('endpoint')
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 })
  }

  try {
    const url = `https://api.coingecko.com/api/v3${endpoint}`
    
    const headers: HeadersInit = {
      'Accept': 'application/json',
    }
    
    if (COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = COINGECKO_API_KEY
    }

    const response = await fetch(url, {
      headers,
      next: { revalidate: 60 } // Cache for 60 seconds
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `CoinGecko API error: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('CoinGecko proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from CoinGecko' },
      { status: 500 }
    )
  }
}

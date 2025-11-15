import { NextRequest, NextResponse } from 'next/server'
import { getLaunchpadTokens, createLaunchpadToken, type LaunchpadToken } from '@/lib/db'
import { randomUUID } from 'crypto'

// GET /api/launchpad/tokens - Get all launchpad tokens with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const creatorAddress = searchParams.get('creatorAddress') || undefined
    const sortBy = (searchParams.get('sortBy') as 'newest' | 'marketCap' | 'cooldown') || 'newest'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

    const tokens = await getLaunchpadTokens({
      status,
      creatorAddress,
      sortBy,
      limit,
      offset
    })

    return NextResponse.json({
      success: true,
      tokens
    })
  } catch (error: any) {
    console.error('Error fetching launchpad tokens:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}

// POST /api/launchpad/tokens - Create a new launchpad token (draft)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      symbol,
      decimals,
      totalSupply,
      creatorAddress,
      description,
      logoPath,
      website,
      twitter,
      telegram,
      initialPrice
    } = body

    // Validation
    if (!name || !symbol || !decimals || !totalSupply || !creatorAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const token: LaunchpadToken = {
      id: randomUUID(),
      name,
      symbol: symbol.toUpperCase(),
      decimals: parseInt(decimals),
      totalSupply,
      creatorAddress,
      description,
      logoPath,
      website,
      twitter,
      telegram,
      status: 'draft',
      initialPrice: initialPrice ? parseFloat(initialPrice) : undefined,
      createdAt: new Date().toISOString()
    }

    const created = await createLaunchpadToken(token)

    return NextResponse.json({
      success: true,
      token: created
    })
  } catch (error: any) {
    console.error('Error creating launchpad token:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create token' },
      { status: 500 }
    )
  }
}

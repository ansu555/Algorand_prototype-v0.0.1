import { NextRequest, NextResponse } from 'next/server'
import { getWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, type TokenWatchlist } from '@/lib/db'
import { randomUUID } from 'crypto'

// GET /api/launchpad/watchlist - Get user's watchlist
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userAddress = searchParams.get('userAddress')

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing userAddress' },
        { status: 400 }
      )
    }

    const tokenIds = await getWatchlist(userAddress)

    return NextResponse.json({
      success: true,
      tokenIds
    })
  } catch (error: any) {
    console.error('Error fetching watchlist:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch watchlist' },
      { status: 500 }
    )
  }
}

// POST /api/launchpad/watchlist - Add token to watchlist
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userAddress, tokenId } = body

    if (!userAddress || !tokenId) {
      return NextResponse.json(
        { success: false, error: 'Missing userAddress or tokenId' },
        { status: 400 }
      )
    }

    const watchlistItem: TokenWatchlist = {
      id: randomUUID(),
      userAddress,
      tokenId,
      createdAt: new Date().toISOString()
    }

    await addToWatchlist(watchlistItem)

    return NextResponse.json({
      success: true,
      message: 'Token added to watchlist'
    })
  } catch (error: any) {
    console.error('Error adding to watchlist:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add to watchlist' },
      { status: 500 }
    )
  }
}

// DELETE /api/launchpad/watchlist - Remove token from watchlist
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userAddress = searchParams.get('userAddress')
    const tokenId = searchParams.get('tokenId')

    if (!userAddress || !tokenId) {
      return NextResponse.json(
        { success: false, error: 'Missing userAddress or tokenId' },
        { status: 400 }
      )
    }

    const success = await removeFromWatchlist(userAddress, tokenId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Token not found in watchlist' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Token removed from watchlist'
    })
  } catch (error: any) {
    console.error('Error removing from watchlist:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove from watchlist' },
      { status: 500 }
    )
  }
}

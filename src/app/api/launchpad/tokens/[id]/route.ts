import { NextRequest, NextResponse } from 'next/server'
import { getLaunchpadTokenById, updateLaunchpadToken, deleteLaunchpadToken } from '@/lib/db'

// GET /api/launchpad/tokens/[id] - Get a specific token
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getLaunchpadTokenById(params.id)
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      token
    })
  } catch (error: any) {
    console.error('Error fetching token:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch token' },
      { status: 500 }
    )
  }
}

// PATCH /api/launchpad/tokens/[id] - Update a token
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { creatorAddress, ...changes } = body

    // Verify ownership if creatorAddress is provided
    const existing = await getLaunchpadTokenById(params.id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      )
    }

    if (creatorAddress && existing.creatorAddress.toLowerCase() !== creatorAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const updated = await updateLaunchpadToken(params.id, changes)

    return NextResponse.json({
      success: true,
      token: updated
    })
  } catch (error: any) {
    console.error('Error updating token:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update token' },
      { status: 500 }
    )
  }
}

// DELETE /api/launchpad/tokens/[id] - Delete a token
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const creatorAddress = searchParams.get('creatorAddress')

    if (!creatorAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing creatorAddress' },
        { status: 400 }
      )
    }

    const success = await deleteLaunchpadToken(params.id, creatorAddress)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Token not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error: any) {
    console.error('Error deleting token:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete token' },
      { status: 500 }
    )
  }
}

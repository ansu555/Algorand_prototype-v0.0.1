import { NextResponse } from 'next/server'
import { buildUserAgentWallet } from '@/lib/agent-wallet'

export const runtime = 'nodejs'

/**
 * POST /api/agent/wallet/opt-in
 * Opt the user's agent wallet into a specific asset
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userAddress, assetId } = body

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing userAddress' },
        { status: 400 }
      )
    }

    if (assetId === undefined || assetId === null) {
      return NextResponse.json(
        { success: false, error: 'Missing assetId' },
        { status: 400 }
      )
    }

    const numericAssetId = Number(assetId)
    if (isNaN(numericAssetId) || numericAssetId < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid assetId - must be a non-negative number' },
        { status: 400 }
      )
    }

    // ALGO (asset ID 0) doesn't need opt-in
    if (numericAssetId === 0) {
      return NextResponse.json({
        success: true,
        message: 'ALGO does not require opt-in',
        status: 'not_required'
      })
    }

    console.log(`🔄 Opting agent wallet into asset ${numericAssetId} for user ${userAddress}...`)

    const agent = await buildUserAgentWallet(userAddress)
    
    try {
      const txId = await agent.optInToAsset(numericAssetId)
      
      if (txId === 'Already opted in') {
        console.log(`✅ Agent wallet already opted into asset ${numericAssetId}`)
        return NextResponse.json({
          success: true,
          message: `Already opted in to asset ${numericAssetId}`,
          status: 'already_opted_in',
          assetId: numericAssetId
        })
      }

      console.log(`✅ Opted into asset ${numericAssetId}, txId: ${txId}`)
      return NextResponse.json({
        success: true,
        message: `Successfully opted in to asset ${numericAssetId}`,
        status: 'success',
        assetId: numericAssetId,
        txId
      })

    } catch (optInError: any) {
      console.error(`❌ Opt-in failed for asset ${numericAssetId}:`, optInError.message)
      
      // Check for common errors
      if (optInError.message?.includes('underflow') || optInError.message?.includes('below min')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Agent wallet has insufficient ALGO balance. Please recharge the agent wallet first.',
            assetId: numericAssetId
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { 
          success: false, 
          error: optInError.message || 'Failed to opt-in to asset',
          assetId: numericAssetId
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('❌ Agent wallet opt-in error:', error)
    
    // Handle specific error types
    if (error.message?.includes('decrypt')) {
      return NextResponse.json(
        { success: false, error: 'Failed to access agent wallet. Please try recharging or resetting the wallet.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

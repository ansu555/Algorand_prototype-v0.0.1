import { NextResponse } from 'next/server'
import { getOrCreateAgentWallet, buildUserAgentWallet } from '@/lib/agent-wallet'

export const runtime = 'nodejs'

/**
 * GET /api/agent/wallet?userAddress=XXX
 * Get or create an agent wallet for a user
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userAddress = searchParams.get('userAddress')

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing userAddress parameter' },
        { status: 400 }
      )
    }

    // Get or create agent wallet
    const { agentAddress, isNew } = await getOrCreateAgentWallet(userAddress)

    // Build agent instance to get account info
    const agent = await buildUserAgentWallet(userAddress)
    const accountInfo = await agent.getAccountInfo()

    return NextResponse.json({
      success: true,
      agentAddress,
      isNew,
      accountInfo,
      network: agent.network
    })
  } catch (error: any) {
    console.error('Agent wallet error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get agent wallet' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/agent/wallet/opt-in
 * Opt agent wallet into an asset
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userAddress, assetId } = body

    if (!userAddress || !assetId) {
      return NextResponse.json(
        { success: false, error: 'Missing userAddress or assetId' },
        { status: 400 }
      )
    }

    const agent = await buildUserAgentWallet(userAddress)
    const txId = await agent.optInToAsset(Number(assetId))

    // Get updated account info
    const accountInfo = await agent.getAccountInfo()

    return NextResponse.json({
      success: true,
      txId,
      accountInfo,
      message: txId === 'Already opted in' ? 'Already opted in' : 'Successfully opted in'
    })
  } catch (error: any) {
    console.error('Opt-in error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to opt in to asset' },
      { status: 500 }
    )
  }
}

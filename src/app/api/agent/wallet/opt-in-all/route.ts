import { NextResponse } from 'next/server'
import { buildUserAgentWallet } from '@/lib/agent-wallet'
import { ALGORAND_ASSETS } from '@/lib/algorand'

export const runtime = 'nodejs'

/**
 * POST /api/agent/wallet/opt-in-all
 * Opt the user's agent wallet into common trading assets
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userAddress } = body

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing userAddress' },
        { status: 400 }
      )
    }

    const agent = await buildUserAgentWallet(userAddress)
    const network = agent.network as 'mainnet' | 'testnet'
    
    // Get all assets for the network (excluding ALGO which has id 0)
    const assets = Object.entries(ALGORAND_ASSETS[network])
      .filter(([_, info]) => info.id !== 0)
      .map(([sym, info]) => ({ assetSymbol: sym, id: info.id, name: info.name, decimals: info.decimals }))

    const results: Array<{
      symbol: string
      assetId: number
      status: 'success' | 'already_opted_in' | 'failed'
      txId?: string
      error?: string
    }> = []

    // Opt into each asset
    for (const asset of assets) {
      try {
        console.log(`🔄 Opting into ${asset.assetSymbol} (${asset.id})...`)
        const txId = await agent.optInToAsset(asset.id)
        
        if (txId === 'Already opted in') {
          results.push({
            symbol: asset.assetSymbol,
            assetId: asset.id,
            status: 'already_opted_in'
          })
        } else {
          results.push({
            symbol: asset.assetSymbol,
            assetId: asset.id,
            status: 'success',
            txId
          })
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error: any) {
        console.error(`❌ Failed to opt into ${asset.assetSymbol}:`, error.message)
        results.push({
          symbol: asset.assetSymbol,
          assetId: asset.id,
          status: 'failed',
          error: error.message
        })
      }
    }

    // Get updated account info
    const accountInfo = await agent.getAccountInfo()

    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === 'success').length,
      alreadyOptedIn: results.filter(r => r.status === 'already_opted_in').length,
      failed: results.filter(r => r.status === 'failed').length
    }

    return NextResponse.json({
      success: true,
      summary,
      results,
      accountInfo,
      message: `Opted into ${summary.successful} new assets. ${summary.alreadyOptedIn} were already opted in.`
    })
  } catch (error: any) {
    console.error('Opt-in-all error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to opt in to assets' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getGlobalPurchases } from '@/lib/launchpad/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId') || undefined
    const limit = searchParams.get('limit') ? Math.max(parseInt(searchParams.get('limit') || '0', 10), 0) : undefined
    const offset = searchParams.get('offset') ? Math.max(parseInt(searchParams.get('offset') || '0', 10), 0) : undefined

    const purchases = await getGlobalPurchases({ projectId, limit, offset })

    const totals = purchases.reduce(
      (acc, purchase) => {
        acc.totalAlgo += purchase.algoPaid
        acc.totalTokens += purchase.tokensAmount
        return acc
      },
      { totalAlgo: 0n, totalTokens: 0n }
    )

    return NextResponse.json({
      success: true,
      data: purchases.map(purchase => ({
        id: purchase.id,
        projectId: purchase.projectId,
        buyerAddress: purchase.buyerAddress,
        tokensAmount: purchase.tokensAmount.toString(),
        algoPaid: purchase.algoPaid.toString(),
        pricePerToken: purchase.pricePerToken.toString(),
        pointsEarned: purchase.pointsEarned.toString(),
        transactionId: purchase.transactionId,
        blockRound: purchase.blockRound.toString(),
        timestamp: purchase.timestamp,
        tokenName: purchase.tokenName,
        tokenSymbol: purchase.tokenSymbol,
        tokenDecimals: purchase.tokenDecimals,
        logoUrl: purchase.logoUrl ?? undefined,
      })),
      stats: {
        total: purchases.length,
        totalAlgo: totals.totalAlgo.toString(),
        totalTokens: totals.totalTokens.toString(),
      }
    })
  } catch (error: any) {
    console.error('Global launchpad purchases error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

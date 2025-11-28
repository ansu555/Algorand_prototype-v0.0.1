import { NextRequest, NextResponse } from 'next/server'
import { getUserPoints, getPurchaseHistory, getUserPortfolio } from '@/lib/launchpad/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('userAddress')
    const projectId = searchParams.get('projectId')
    const action = searchParams.get('action')

    if (!userAddress) {
      return NextResponse.json({
        success: false,
        error: 'Missing userAddress'
      }, { status: 400 })
    }

    if (action === 'points') {
      if (!projectId) {
        return NextResponse.json({
          success: false,
          error: 'Missing projectId'
        }, { status: 400 })
      }
      // Get user points
      const points = await getUserPoints(userAddress, projectId)

      return NextResponse.json({
        success: true,
        data: points ? {
          userAddress: points.userAddress,
          projectId: points.projectId,
          pointsBalance: points.pointsBalance.toString(),
          totalEarned: points.totalEarned.toString(),
          totalClaimed: points.totalClaimed.toString(),
          lastClaimRound: points.lastClaimRound?.toString(),
          createdAt: points.createdAt,
          updatedAt: points.updatedAt
        } : null
      })
    }

    if (action === 'purchases') {
      if (!projectId) {
        return NextResponse.json({
          success: false,
          error: 'Missing projectId'
        }, { status: 400 })
      }
      // Get purchase history
      const purchases = await getPurchaseHistory(projectId, userAddress)

      return NextResponse.json({
        success: true,
        data: purchases.map(p => ({
          id: p.id,
          projectId: p.projectId,
          buyerAddress: p.buyerAddress,
          tokensAmount: p.tokensAmount.toString(),
          algoPaid: p.algoPaid.toString(),
          pricePerToken: p.pricePerToken.toString(),
          pointsEarned: p.pointsEarned.toString(),
          transactionId: p.transactionId,
          blockRound: p.blockRound.toString(),
          timestamp: p.timestamp
        }))
      })
    }

    if (action === 'portfolio') {
      const positions = await getUserPortfolio(userAddress)

      return NextResponse.json({
        success: true,
        data: positions.map(position => ({
          projectId: position.projectId,
          tokenName: position.tokenName,
          tokenSymbol: position.tokenSymbol,
          tokenDecimals: position.tokenDecimals,
          logoUrl: position.logoUrl ?? undefined,
          tokensHeld: position.tokensHeld.toString(),
          algoSpent: position.algoSpent.toString(),
          averagePrice: position.averagePrice.toString(),
          purchaseCount: position.purchaseCount,
          lastPurchaseAt: position.lastPurchaseAt,
        }))
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error: any) {
    console.error('User data error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

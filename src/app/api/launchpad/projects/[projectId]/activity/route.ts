import { NextRequest, NextResponse } from 'next/server'
import { getPurchaseHistory, getProjectHolders } from '@/lib/launchpad/db'

export async function GET(request: NextRequest, context: { params: { projectId: string } }) {
  try {
    const { projectId } = context.params
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.max(parseInt(limitParam, 10), 0) : null

    let transactions = await getPurchaseHistory(projectId)
    if (limit && transactions.length > limit) {
      transactions = transactions.slice(0, limit)
    }

    const holders = await getProjectHolders(projectId)

    const totalAlgo = transactions.reduce((acc, tx) => acc + tx.algoPaid, 0n)
    const totalTokens = transactions.reduce((acc, tx) => acc + tx.tokensAmount, 0n)

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.map(tx => ({
          id: tx.id,
          projectId: tx.projectId,
          buyerAddress: tx.buyerAddress,
          tokensAmount: tx.tokensAmount.toString(),
          algoPaid: tx.algoPaid.toString(),
          pricePerToken: tx.pricePerToken.toString(),
          pointsEarned: tx.pointsEarned.toString(),
          transactionId: tx.transactionId,
          blockRound: tx.blockRound.toString(),
          timestamp: tx.timestamp,
        })),
        holders: holders.map(holder => ({
          buyerAddress: holder.buyerAddress,
          totalTokens: holder.totalTokens.toString(),
          totalAlgo: holder.totalAlgo.toString(),
          purchaseCount: holder.purchaseCount,
          lastPurchaseAt: holder.lastPurchaseAt,
        })),
        stats: {
          totalTransactions: transactions.length,
          uniqueHolders: holders.length,
          totalAlgo: totalAlgo.toString(),
          totalTokens: totalTokens.toString(),
        },
      },
    })
  } catch (error: any) {
    console.error('Project activity error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

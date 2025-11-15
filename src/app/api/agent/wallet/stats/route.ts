import { NextResponse } from 'next/server'
import { getAgentWalletStats } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * GET /api/agent/wallet/stats?userAddress=XXX
 * Get agent wallet statistics (total spend, trades, success rate)
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

    const stats = await getAgentWalletStats(userAddress)

    if (!stats) {
      // Return default stats if not found
      return NextResponse.json({
        success: true,
        stats: {
          totalSpendUSD: 0,
          totalTrades: 0,
          successfulTrades: 0,
          failedTrades: 0,
          successRate: 0,
          lastTradeAt: null
        }
      })
    }

    // Calculate success rate
    const successRate = stats.totalTrades > 0 
      ? (stats.successfulTrades / stats.totalTrades) * 100 
      : 0

    return NextResponse.json({
      success: true,
      stats: {
        totalSpendUSD: stats.totalSpendUSD,
        totalTrades: stats.totalTrades,
        successfulTrades: stats.successfulTrades,
        failedTrades: stats.failedTrades,
        successRate: parseFloat(successRate.toFixed(2)),
        lastTradeAt: stats.lastTradeAt
      }
    })
  } catch (error: any) {
    console.error('Agent wallet stats error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get agent wallet stats' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { tursoDriver } from '@/lib/db/turso'

export const dynamic = 'force-dynamic'

/**
 * GET /api/transactions/all
 * Returns all swap transactions from all users globally
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Fetch all logs (global transactions across all actions)
    const allLogs = await tursoDriver.getLogs()

    // Sort by creation time (newest first)
    allLogs.sort((a: any, b: any) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return timeB - timeA
    })

    // Apply pagination
    const paginatedTransactions = allLogs.slice(offset, offset + limit)

    // Format the response
    const formattedTransactions = paginatedTransactions.map((tx: any) => {
      const details = tx.details || {}
      
      // Debug logging for first transaction
      if (paginatedTransactions.indexOf(tx) === 0) {
        console.log('🔍 First transaction raw data:')
        console.log('  details:', JSON.stringify(details, null, 2))
        console.log('  details.poolAddress:', details.poolAddress)
        console.log('  details.poolId:', details.poolId)
        console.log('  details.routePath:', details.routePath)
        console.log('  details.routePath[0]?.poolId:', Array.isArray(details.routePath) && details.routePath[0]?.poolId)
      }
      
      return {
        id: tx.id,
        createdAt: tx.createdAt,
        status: tx.status,
        action: tx.action,
        txId: details.txId,
        ownerAddress: tx.ownerAddress || details.ownerAddress,
        fromAssetId: details.fromAssetId,
        toAssetId: details.toAssetId,
        fromAssetName: details.fromAssetName,
        toAssetName: details.toAssetName,
        fromAssetUnitName: details.fromAssetUnitName,
        toAssetUnitName: details.toAssetUnitName,
        fromAmount: details.fromAmount,
        toAmount: details.toAmount,
        slippage: details.slippage,
        routePath: details.routePath || details.route || [],
        poolAddress: details.poolAddress || 
                    (Array.isArray(details.routePath) && details.routePath.length > 0 && details.routePath[0]?.poolAddress) ||
                    details.poolId || 
                    (Array.isArray(details.routePath) && details.routePath.length > 0 && details.routePath[0]?.poolId) || 
                    undefined,
        confirmedRound: details.confirmedRound,
      }
    })

    // Derive quick stats
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const tx1d = allLogs.filter((l: any) => now - new Date(l.createdAt).getTime() <= dayMs).length
    const tx30d = allLogs.filter((l: any) => now - new Date(l.createdAt).getTime() <= 30 * dayMs).length

    console.log(`📊 Fetched ${formattedTransactions.length} global transactions (total: ${allLogs.length})`)

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
      total: allLogs.length,
      limit,
      offset,
      stats: {
        total: allLogs.length,
        last1d: tx1d,
        last30d: tx30d,
      }
    })
  } catch (error: any) {
    console.error('❌ Failed to fetch global transactions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch transactions',
      },
      { status: 500 }
    )
  }
}

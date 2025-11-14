/**
 * API Route: Fetch swap transactions for a given pool
 * GET /api/pools/transactions?poolId=<address>&limit=20
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLogs } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const poolId = searchParams.get('poolId') || ''
    const limit = Number(searchParams.get('limit') || 50)

    if (!poolId) {
      return NextResponse.json({ success: false, error: 'poolId is required' }, { status: 400 })
    }

    // Fetch all swap logs from database
    const allLogs = await getLogs()

    // Filter logs that are swaps and match this specific pool
    const poolSwaps = allLogs
      .filter(log => {
        if (log.action !== 'swap') return false
        if (!log.details) return false

        // Check if this swap used the specified pool
        const details = log.details
        
        // Check poolId field
        if (details.poolId === poolId) return true
        
        // Check poolAddress field
        if (details.poolAddress === poolId) return true
        
        // Check routePath array for matching pool
        if (Array.isArray(details.routePath)) {
          return details.routePath.some((hop: any) => 
            hop.poolId === poolId || hop.poolAddress === poolId
          )
        }

        return false
      })
      .slice(0, limit)
      .map(log => {
        const d = log.details || {}
        return {
          id: log.id,
          txId: d.txId,
          timestamp: log.createdAt,
          confirmedRound: d.confirmedRound,
          ownerAddress: log.ownerAddress,
          
          // From asset
          fromAssetId: d.fromAssetId,
          fromAssetSymbol: d.fromAssetUnitName || d.fromAssetName,
          fromAmount: d.fromAmount,
          fromAmountBaseUnits: d.fromAmountBaseUnits,
          fromDecimals: d.fromAssetDecimals,
          
          // To asset
          toAssetId: d.toAssetId,
          toAssetSymbol: d.toAssetUnitName || d.toAssetName,
          toAmount: d.toAmount,
          toAmountEstimated: d.toAmountEstimated,
          toDecimals: d.toAssetDecimals,
          
          // Pool info
          poolId: d.poolId,
          poolAddress: d.poolAddress,
          
          // Additional metadata
          slippage: d.slippage,
          priceImpact: d.priceImpact,
          status: log.status,
        }
      })

    return NextResponse.json({ 
      success: true, 
      items: poolSwaps,
      total: poolSwaps.length 
    })
  } catch (error: any) {
    console.error('Error fetching pool transactions:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch transactions' 
    }, { status: 500 })
  }
}

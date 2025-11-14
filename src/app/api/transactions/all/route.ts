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

    // Filter out system events - only show actual transactions
    const excludedActions = [
      'POLLER_CHECKED',
      'POLLER_TRIGGER_FAILED',
      'RULE_CREATED',
      'RULE_DELETED',
      'EXECUTION_FAILED'
    ]
    
    const actualTransactions = allLogs.filter((log: any) => {
      const action = (log.action || '').toUpperCase()
      // Exclude configured system actions
      if (excludedActions.includes(action)) return false

      // Also exclude failed execute_rule logs (we only want successful executions)
      if (action === 'EXECUTE_RULE') {
        const status = (log.status || '').toLowerCase()
        if (status !== 'success') return false
        const d = log.details || {}
        // Require a valid plan payload to avoid undefined fields in UI
        const plan = d.plan
        if (!plan || plan.assetId == null || plan.totalSpendAmount == null) return false
      }

      return true
    })

    // Sort by creation time (newest first)
    actualTransactions.sort((a: any, b: any) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return timeB - timeA
    })

    // Apply pagination
    const paginatedTransactions = actualTransactions.slice(offset, offset + limit)

    // Format the response
    const formattedTransactions = paginatedTransactions.map((tx: any) => {
      const details = tx.details || {}
      const isExecuteRule = tx.action === 'execute_rule'
      
      // For EXECUTE_RULE, data is in details.swap, details.plan, and details.txHash
      const swapDetails = isExecuteRule ? (details.swap || {}) : details
      const txId = isExecuteRule ? (details.txHash || swapDetails.txId) : details.txId
      
      // Debug logging for first transaction
      if (paginatedTransactions.indexOf(tx) === 0) {
        console.log('🔍 First transaction raw data:')
        console.log('  action:', tx.action)
        console.log('  isExecuteRule:', isExecuteRule)
        console.log('  details:', JSON.stringify(details, null, 2))
        console.log('  swapDetails:', JSON.stringify(swapDetails, null, 2))
        console.log('  txId:', txId)
      }
      
      // For EXECUTE_RULE: details.plan contains assetId, assetSymbol, amount, decimals
      const plan = isExecuteRule ? details.plan : null
      
      // compute base units for execute_rule when plan exists
      const fromAmountBaseUnits = isExecuteRule && plan?.totalSpendAmount != null
        ? Math.round(Number(plan.totalSpendAmount) * Math.pow(10, plan.decimals ?? 6))
        : (swapDetails.fromAmountBaseUnits ?? swapDetails.fromAmountBaseUnits)

      return {
        id: tx.id,
        createdAt: tx.createdAt,
        status: tx.status,
        action: tx.action,
        txId: txId,
        ownerAddress: tx.ownerAddress || swapDetails.ownerAddress,
        
        // For EXECUTE_RULE, use plan data; for swap, use details directly
        fromAssetId: isExecuteRule ? plan?.assetId : swapDetails.fromAssetId,
        toAssetId: isExecuteRule ? undefined : swapDetails.toAssetId,
        fromAssetName: isExecuteRule ? plan?.assetSymbol : swapDetails.fromAssetName,
        toAssetName: isExecuteRule ? undefined : swapDetails.toAssetName,
        fromAssetUnitName: isExecuteRule ? plan?.assetSymbol : swapDetails.fromAssetUnitName,
        toAssetUnitName: isExecuteRule ? undefined : swapDetails.toAssetUnitName,
        // keep human-readable amount for backwards compatibility
        fromAmount: isExecuteRule ? plan?.totalSpendAmount : swapDetails.fromAmount,
        // also expose base units when available so frontend can format consistently
        fromAmountBaseUnits: fromAmountBaseUnits ?? swapDetails.fromAmountBaseUnits,
        toAmount: isExecuteRule ? undefined : swapDetails.toAmount,
        toAmountBaseUnits: isExecuteRule ? undefined : swapDetails.toAmountBaseUnits,
        
        slippage: swapDetails.slippage,
        routePath: swapDetails.routePath || swapDetails.route || [],
        poolAddress: swapDetails.poolAddress || 
                    (Array.isArray(swapDetails.routePath) && swapDetails.routePath.length > 0 && swapDetails.routePath[0]?.poolAddress) ||
                    swapDetails.poolId || 
                    (Array.isArray(swapDetails.routePath) && swapDetails.routePath.length > 0 && swapDetails.routePath[0]?.poolId) || 
                    undefined,
        confirmedRound: swapDetails.confirmedRound,
        
        // Add execute-specific fields
        decimals: isExecuteRule ? plan?.decimals : undefined,
        // Add swap-specific decimals for better formatting
        fromDecimals: isExecuteRule ? plan?.decimals : (swapDetails.fromAssetDecimals ?? swapDetails.fromDecimals),
        toDecimals: isExecuteRule ? undefined : (swapDetails.toAssetDecimals ?? swapDetails.toDecimals),
      }
    })

    // Derive quick stats
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const tx1d = actualTransactions.filter((l: any) => now - new Date(l.createdAt).getTime() <= dayMs).length
    const tx30d = actualTransactions.filter((l: any) => now - new Date(l.createdAt).getTime() <= 30 * dayMs).length

    console.log(`📊 Fetched ${formattedTransactions.length} global transactions (total: ${actualTransactions.length})`)

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
      total: actualTransactions.length,
      limit,
      offset,
      stats: {
        total: actualTransactions.length,
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

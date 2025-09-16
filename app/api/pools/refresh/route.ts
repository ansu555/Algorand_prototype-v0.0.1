// API endpoint to refresh on-chain pool data
// GET /api/pools/refresh - Force refresh all pools from on-chain data
// GET /api/pools/status - Get current pool status and cache info

import { NextRequest, NextResponse } from 'next/server'
import { refreshAllPools, clearPoolCache } from '@/lib/routing/onchain'
import { listPools } from '@/lib/routing/pools'

// Extend Pool type to include isOnChain property
interface PoolWithOnChainStatus {
  id: string
  isOnChain: boolean
  reserve0: bigint
  reserve1: bigint
  token0: { symbol: string }
  token1: { symbol: string }
  pairAddress?: string
  lastUpdated?: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'refresh'

  try {
    if (action === 'refresh') {
      // Clear cache and fetch fresh data
      clearPoolCache()
      const pools = await refreshAllPools()
      
      return NextResponse.json({
        success: true,
        message: `Refreshed ${pools.length} on-chain pools`,
        pools: pools.map(p => ({
          id: p.id,
          pairAddress: p.pairAddress,
          reserve0: p.reserve0.toString(),
          reserve1: p.reserve1.toString(),
          lastUpdated: new Date(p.lastUpdated).toISOString()
        }))
      })
    }
    
    if (action === 'status') {
      const pools = await listPools()
      const allPools = pools.map(p => {
        const pairAddress = (p as any).pairAddress
        return {
          ...p,
          pairAddress,
          isOnChain: Boolean(pairAddress)
        }
      }) as PoolWithOnChainStatus[]
      const onChainPools = allPools.filter(p => p.isOnChain)
      const fallbackPools = allPools.filter(p => !p.isOnChain)
      
      return NextResponse.json({
        success: true,
        total: allPools.length,
        onChain: onChainPools.length,
        fallback: fallbackPools.length,
        pools: allPools.map(p => ({
          id: p.id,
          isOnChain: p.isOnChain,
          reserve0: p.reserve0.toString(),
          reserve1: p.reserve1.toString(),
          token0: p.token0.symbol,
          token1: p.token1.symbol
        }))
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use ?action=refresh or ?action=status'
    }, { status: 400 })
    
  } catch (error) {
    console.error('Pool refresh error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh pools',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
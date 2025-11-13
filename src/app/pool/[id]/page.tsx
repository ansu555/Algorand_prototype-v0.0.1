'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import BackgroundPaths from '@/components/shared/animated-background'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Loader2, Copy, Check, X } from 'lucide-react'
import { SwapCard } from '@/components/features/trading'
import { PoolLiquidityChart } from '@/components/features/trading/pool-liquidity-chart'

interface PoolDetails {
  poolId: string
  dexName: string
  asset1: {
    id: number
    symbol: string
    name: string
    decimals: number
  }
  asset2: {
    id: number
    symbol: string
    name: string
    decimals: number
  }
  reserve1: string
  reserve2: string
  fee: number
  totalLiquidity?: string
}

export default function PoolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const poolId = params.id as string
  const [pool, setPool] = useState<PoolDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [showSwap, setShowSwap] = useState(false)
  const [marketData, setMarketData] = useState<Record<string, any> | null>(null)
  const [marketError, setMarketError] = useState<string | null>(null)
  const isTestnet = process.env.NEXT_PUBLIC_ALGORAND_NETWORK === 'testnet'

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedAddress(text)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const fetchPoolDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/pools/all')
      const data = await response.json()

      if (data.success && data.pools) {
        const foundPool = data.pools.find((p: any) => p.poolId === poolId)
        if (foundPool) {
          setPool(foundPool)
        } else {
          setError('Pool not found')
        }
      } else {
        setError('Failed to fetch pool data')
      }
    } catch (err) {
      setError('Error loading pool details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMarketData = async () => {
    try {
      setMarketError(null)
      const response = await fetch(`/api/pools/market-data?network=${process.env.NEXT_PUBLIC_ALGORAND_NETWORK || 'testnet'}`)
      const data = await response.json()
      if (data.success) {
        setMarketData(data.data || {})
      } else {
        setMarketError('Failed to fetch market data')
      }
    } catch (err) {
      setMarketError('Failed to fetch market data')
      console.error(err)
    }
  }

  useEffect(() => {
    fetchPoolDetails()
    fetchMarketData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolId])

  const md = useMemo(() => (pool && marketData ? marketData[pool.poolId] : null), [marketData, pool])

  const fromAssetInfo = useMemo(() => {
    if (!pool) return null
    return {
      id: pool.asset1.id,
      symbol: pool.asset1.symbol,
      name: pool.asset1.name,
      unitName: pool.asset1.symbol,
      decimals: pool.asset1.decimals,
      total: 0,
      creator: '',
    }
  }, [pool])

  const toAssetInfo = useMemo(() => {
    if (!pool) return null
    return {
      id: pool.asset2.id,
      symbol: pool.asset2.symbol,
      name: pool.asset2.name,
      unitName: pool.asset2.symbol,
      decimals: pool.asset2.decimals,
      total: 0,
      creator: '',
    }
  }, [pool])

  const chartPools = useMemo(() => {
    if (!pool) return []
    return [{ ...pool, totalLiquidity: pool.totalLiquidity || '' }]
  }, [pool])

  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundPaths />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          {/* Back Button */}
          <Link href="/pool">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Pools
            </Button>
          </Link>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-[#F3C623]" />
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="py-20">
                <p className="text-center text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          ) : pool ? (
            <>
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <Link href="/" className="hover:text-gray-900 dark:hover:text-gray-100">Explore</Link>
                <span>›</span>
                <Link href="/pool" className="hover:text-gray-900 dark:hover:text-gray-100">Pools</Link>
                <span>›</span>
                <span className="text-gray-900 dark:text-gray-100">{pool.asset1.symbol} / {pool.asset2.symbol}</span>
                <span className="text-xs text-gray-400">0x{poolId.slice(0, 4)}...{poolId.slice(-4)}</span>
              </div>

              {/* Header Section */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center -space-x-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm border-2 border-background">
                    {pool.asset1.symbol.charAt(0)}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm border-2 border-background">
                    {pool.asset2.symbol.charAt(0)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">
                      {pool.asset1.symbol} / {pool.asset2.symbol}
                    </h1>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-500/20 text-blue-400">
                      v2
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400">
                      {pool.fee / 100}%
                    </span>
                    {/* <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Copy link">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Share">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button> */}
                  </div>
                </div>
              </div>

              {/* Main Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Chart */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Liquidity Chart (real data) */}
                  <div className="relative">
                    <PoolLiquidityChart
                      fromAsset={fromAssetInfo as any}
                      toAsset={toAssetInfo as any}
                      pools={chartPools as any}
                      loading={loading}
                      error={error}
                      onRetry={fetchPoolDetails}
                    />
                    {/* {isTestnet && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-sm">
                        <span className="text-sm text-muted-foreground">Testnet data not available</span>
                      </div>
                    )} */}
                  </div>

                  {/* Transactions Table (moved under chart) */}
                  <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-xl text-pink-600 dark:text-pink-500">Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-gray-200 dark:border-gray-800">
                              <TableHead className="text-left text-pink-600 dark:text-pink-500 font-semibold">Time</TableHead>
                              <TableHead className="text-left text-pink-600 dark:text-pink-500 font-semibold">Type</TableHead>
                              <TableHead className="text-right text-pink-600 dark:text-pink-500 font-semibold">USD</TableHead>
                              <TableHead className="text-right text-pink-600 dark:text-pink-500 font-semibold">{pool.asset1.symbol}</TableHead>
                              <TableHead className="text-right text-pink-600 dark:text-pink-500 font-semibold">{pool.asset2.symbol}</TableHead>
                              <TableHead className="text-left text-pink-600 dark:text-pink-500 font-semibold">Wallet</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* No real transactions available on this view; leaving blank as requested */}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Stats & Links */}
                <div className="space-y-6 scale-[1.01] origin-left">
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button 
                      variant="outline"
                      className="flex-1 border-pink-600 text-pink-600 hover:bg-pink-50 dark:border-pink-500 dark:text-pink-500 dark:hover:bg-pink-950/30"
                      onClick={() => setShowSwap(!showSwap)}
                    >
                      {showSwap ? 'Close' : 'Swap'}
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 border-muted text-muted-foreground cursor-not-allowed"
                      disabled
                    >
                      Add liquidity
                    </Button>
                  </div>

                  {/* Swap Card - Shown when Swap button is clicked */}
                  {showSwap && (
                    <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Swap Tokens</CardTitle>
                          <button
                            onClick={() => setShowSwap(false)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                            title="Close"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <SwapCard 
                          initialFromAssetId={pool.asset1.id}
                          initialToAssetId={pool.asset2.id}
                          showBuySell={false}
                          onSwapSuccess={() => {
                            // Optional: refresh pool data after successful swap
                            console.log('Swap completed successfully!')
                          }}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Total APR Card (blank if unavailable) */}
                  <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 w-[101%]">
                    <CardContent className="pt-6 pb-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total APR</p>
                      <p className="text-4xl font-bold">{md?.poolAPR != null ? `${Number(md.poolAPR).toFixed(2)}%` : ''}</p>
                    </CardContent>
                  </Card>

                  {/* Stats Card (real balances; blanks for missing) */}
                  <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 w-[101%]">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Pool Balances */}
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Pool balances</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-base font-bold">
                              {pool?.reserve1 ? (Number(pool.reserve1) / Math.pow(10, pool.asset1.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : ''} {pool.asset1.symbol}
                            </p>
                            <p className="text-base font-bold">
                              {pool?.reserve2 ? (Number(pool.reserve2) / Math.pow(10, pool.asset2.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : ''} {pool.asset2.symbol}
                            </p>
                          </div>
                          <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                            <div className="flex-1 bg-pink-500" />
                            <div className="flex-1 bg-blue-500" />
                          </div>
                        </div>
                      </div>

                      {/* TVL */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">TVL</p>
                        <p className="text-3xl font-bold">{md?.tvlUSD != null ? `$${Number(md.tvlUSD).toLocaleString()}` : ''}</p>
                      </div>

                      {/* 24h Volume */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">24h volume</p>
                        <p className="text-3xl font-bold">{md?.volume24hUSD != null ? `$${Number(md.volume24hUSD).toLocaleString()}` : ''}</p>
                      </div>

                      {/* 24H Fees */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">24H fees</p>
                        <p className="text-3xl font-bold">{md?.fees24hUSD != null ? `$${Number(md.fees24hUSD).toLocaleString()}` : ''}</p>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Links card removed as requested */}
                </div>
              </div>
              {/* Transactions moved above under chart */}
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}

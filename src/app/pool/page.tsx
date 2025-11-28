"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import BackgroundPaths from "@/components/shared/animated-background"
import { SearchBar } from "@/components/shared/search-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Loader2, TrendingUp, Activity, BarChart3, Copy, Check, CheckCircle2, RefreshCw } from "lucide-react"
import { useMemo, useState, useEffect } from "react"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { toast } from "sonner"
import type { PoolInfo } from "@/lib/dex/types"

type Pool = {
  id: string
  token0: string
  token1: string
  token0Logo?: string // Logo URL for token0
  token1Logo?: string // Logo URL for token1
  token0Decimals?: number // Decimals for token0
  token1Decimals?: number // Decimals for token1
  protocol?: string // Protocol version (v1, v2, v3, v4)
  feeTier: number // in basis points (30 = 0.3%)
  tvlUSD?: number // Total Value Locked in USD
  volume1dUSD?: number // 1-day trading volume in USD
  volume30dUSD?: number // 30-day trading volume in USD
  volume24hUSD?: number // 24h volume (legacy)
  poolAPR?: number // Pool APR from trading fees
  rewardAPR?: number // Additional rewards APR
  myPosition?: boolean
  fees24hUSD?: number
  currentPrice?: number // price of token0 in terms of token1
  dex: string // 'tinyman' | 'pact' | 'vestige' | 'humble'
  reserve0?: bigint
  reserve1?: bigint
  poolAddress?: string
}

export default function PoolPage() {
  const [tab, setTab] = useState("all")
  const [sortBy, setSortBy] = useState("tvl_desc")
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet')
  const [allPools, setAllPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { activeAccount } = useWalletConnection()
  const [optingIds, setOptingIds] = useState<Record<string, boolean>>({})

  const optInAsset = async (assetId: number, assetName: string) => {
    if (!activeAccount?.address) {
      toast.error('Connect your wallet to opt-in')
      return
    }
    if (assetId === 0) {
      toast.info('ALGO does not require opt-in')
      return
    }
    const key = String(assetId)
    setOptingIds((s) => ({ ...s, [key]: true }))
    try {
      const res = await fetch('/api/agent/wallet/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: activeAccount.address, assetId })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Opt-in failed')
      toast.success(data.message || `Opted in to ${assetName}`)
    } catch (e: any) {
      toast.error('Opt-in failed', { description: e?.message || String(e) })
    } finally {
      setOptingIds((s) => ({ ...s, [key]: false }))
    }
  }

  // Fetch pools when network changes
  useEffect(() => {
    async function fetchPools() {
      try {
        setLoading(true)
        setError(null)

        // Fetch from multiple sources in parallel
        const [poolsResponse, marketResponse, tenxSwapResponse] = await Promise.all([
          fetch(`/api/pools/all?network=${network}`),
          fetch(`/api/pools/market-data?network=${network}`).catch(() => null),
          fetch(`/api/pool/list`).catch(() => null), // Fetch 10xSwap pools from on-chain
        ])

        const poolsData = await poolsResponse.json()

        if (!poolsData.success) {
          throw new Error(poolsData.error || 'Failed to fetch pools')
        }

        // Get market data if available
        let marketData: Record<string, any> = {}
        if (marketResponse?.ok) {
          const marketJson = await marketResponse.json()
          if (marketJson.success) {
            marketData = marketJson.data
          }
        }

        // Map PoolInfo to Pool format
        const pools: Pool[] = poolsData.pools.map((poolInfo: any) => {
          // Convert string BigInt values back to BigInt
          const reserve1 = BigInt(poolInfo.reserve1)
          const reserve2 = BigInt(poolInfo.reserve2)

          // Calculate current price from reserves
          let currentPrice: number | undefined
          if (reserve1 && reserve2) {
            const reserve0Num = Number(reserve1) / (10 ** poolInfo.asset1.decimals)
            const reserve1Num = Number(reserve2) / (10 ** poolInfo.asset2.decimals)
            currentPrice = reserve1Num / reserve0Num // price of asset1 in terms of asset2
          }

          // Determine protocol version based on DEX
          let protocol = 'v2' // Default
          if (poolInfo.dexName === 'tinyman') {
            protocol = 'v2' // TinymanV2
          } else if (poolInfo.dexName === 'pact') {
            protocol = 'v1' // Pact is v1-style
          } else if (poolInfo.dexName === 'vestige') {
            protocol = 'v3' // Vestige uses v3-like concentrated liquidity
          }

          // Merge with market data if available
          const poolMarketData = marketData[poolInfo.poolId]

          return {
            id: poolInfo.poolId,
            token0: poolInfo.asset1.symbol,
            token1: poolInfo.asset2.symbol,
            token0Logo: poolInfo.asset1.logoUrl || poolInfo.asset1.logo, // Support both logoUrl and logo properties
            token1Logo: poolInfo.asset2.logoUrl || poolInfo.asset2.logo,
            token0Decimals: poolInfo.asset1.decimals,
            token1Decimals: poolInfo.asset2.decimals,
            protocol,
            feeTier: poolInfo.fee, // Already in basis points
            dex: poolInfo.dexName,
            reserve0: reserve1,
            reserve1: reserve2,
            poolAddress: poolInfo.poolAddress,
            currentPrice,
            // Use market data if available
            tvlUSD: poolMarketData?.tvlUSD,
            volume1dUSD: poolMarketData?.volume1dUSD,
            volume30dUSD: poolMarketData?.volume30dUSD,
            volume24hUSD: poolMarketData?.volume24hUSD,
            poolAPR: poolMarketData?.poolAPR,
            rewardAPR: poolMarketData?.rewardAPR,
            fees24hUSD: poolMarketData?.fees24hUSD,
          }
        })

        // Add 10xSwap pools from on-chain contract
        if (tenxSwapResponse?.ok) {
          const tenxSwapData = await tenxSwapResponse.json()
          if (tenxSwapData.success && tenxSwapData.pools) {
            console.log(`🔟 Found ${tenxSwapData.pools.length} 10xSwap pool(s) on-chain`)

            const tenxSwapPools: Pool[] = tenxSwapData.pools.map((pool: any) => {
              // Convert string BigInt values back to BigInt
              const reserve1 = BigInt(pool.reserve1)
              const reserve2 = BigInt(pool.reserve2)

              // Use actual decimals from the API
              const decimals1 = pool.asset1_decimals || 6
              const decimals2 = pool.asset2_decimals || 6

              // Calculate current price from reserves
              let currentPrice: number | undefined
              if (reserve1 > 0n && reserve2 > 0n) {
                const reserve0Num = Number(reserve1) / Math.pow(10, decimals1)
                const reserve1Num = Number(reserve2) / Math.pow(10, decimals2)
                currentPrice = reserve1Num / reserve0Num
              }

              return {
                id: pool.poolId,
                token0: pool.asset1_name || `Asset ${pool.asset1_id}`,
                token1: pool.asset2_name || `Asset ${pool.asset2_id}`,
                token0Decimals: decimals1,
                token1Decimals: decimals2,
                protocol: 'v2',
                feeTier: pool.fee_bps,
                dex: '10xswap',
                reserve0: reserve1,
                reserve1: reserve2,
                poolAddress: pool.poolAddress,
                currentPrice,
                tvlUSD: undefined, // Not available for 10xSwap pools yet
                volume1dUSD: undefined,
                volume30dUSD: undefined,
                volume24hUSD: undefined,
                poolAPR: undefined,
                rewardAPR: undefined,
                fees24hUSD: undefined,
              }
            })

            // Prepend 10xSwap pools to the beginning (show them first)
            pools.unshift(...tenxSwapPools)
          }
        }

        setAllPools(pools)
        console.log(`✅ Loaded ${pools.length} pools total`)
      } catch (err: any) {
        console.error('Error fetching pools:', err)
        setError(err.message || 'Failed to load pools')
      } finally {
        setLoading(false)
      }
    }

    fetchPools()
  }, [network])

  const pools = useMemo(() => {
    let filtered = allPools
    if (tab === "mine") filtered = filtered.filter((p) => p.myPosition)
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "fee_asc":
          return a.feeTier - b.feeTier
        case "fee_desc":
          return b.feeTier - a.feeTier
        case "tvl_desc":
          return (b.tvlUSD ?? 0) - (a.tvlUSD ?? 0)
        case "vol_desc":
          return (b.volume24hUSD ?? 0) - (a.volume24hUSD ?? 0)
        default:
          return 0
      }
    })
    return sorted
  }, [allPools, tab, sortBy])

  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundPaths />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-2">
        <div className="w-full space-y-2">
          {/* Search Bar */}
          <SearchBar />

          <div className="relative">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Liquidity Pools</h1>
              <p className="text-sm text-muted-foreground">
                Discover, search, and manage pools. Add or remove liquidity to earn fees.
              </p>
              {!loading && !error && (
                <p className="text-xs text-muted-foreground">
                  {allPools.length} pools on {network} (Tinyman{network === 'mainnet' ? ', Pact' : ''}).
                  {network === 'testnet' && (
                    <span className="block mt-1">
                      ⓘ Some values show "—" because testnet doesn't provide market data (TVL, volume, APR).
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Charts Section */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-6">
              {/* Total TVL Chart */}
              <Card className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Total Value Locked
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-3xl font-bold font-mono">
                      ${(pools.reduce((sum, p) => sum + (p.tvlUSD || 0), 0) / 1000000).toFixed(2)}M
                    </div>
                    <div className="h-24 relative">
                      <svg className="w-full h-full" viewBox="0 0 280 96" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="tvlGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,60 L20,52 L40,58 L60,45 L80,50 L100,42 L120,38 L140,45 L160,35 L180,32 L200,28 L220,30 L240,25 L260,22 L280,20 L280,96 L0,96 Z"
                          fill="url(#tvlGradient)"
                        />
                        <path
                          d="M0,60 L20,52 L40,58 L60,45 L80,50 L100,42 L120,38 L140,45 L160,35 L180,32 L200,28 L220,30 L240,25 L260,22 L280,20"
                          fill="none"
                          stroke="rgb(59, 130, 246)"
                          strokeWidth="2"
                        />
                      </svg>
                      {/* Blur overlay for testnet */}
                      {network === 'testnet' && (
                        <div className="absolute inset-0 backdrop-blur-sm bg-white/50 dark:bg-black/50 flex items-center justify-center rounded">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white text-center px-4">
                            This can&apos;t be shown on testnet
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across {pools.length} pools
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 24h Volume Chart */}
              <Card className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    24h Trading Volume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-3xl font-bold font-mono">
                      ${(pools.reduce((sum, p) => sum + (p.volume24hUSD || 0), 0) / 1000000).toFixed(2)}M
                    </div>
                    <div className="h-24 relative">
                      <svg className="w-full h-full" viewBox="0 0 280 96" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="volumeGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,70 L20,65 L40,58 L60,52 L80,55 L100,48 L120,45 L140,40 L160,45 L180,38 L200,42 L220,35 L240,30 L260,32 L280,28 L280,96 L0,96 Z"
                          fill="url(#volumeGradient)"
                        />
                        <path
                          d="M0,70 L20,65 L40,58 L60,52 L80,55 L100,48 L120,45 L140,40 L160,45 L180,38 L200,42 L220,35 L240,30 L260,32 L280,28"
                          fill="none"
                          stroke="rgb(34, 197, 94)"
                          strokeWidth="2"
                        />
                      </svg>
                      {/* Blur overlay for testnet */}
                      {network === 'testnet' && (
                        <div className="absolute inset-0 backdrop-blur-sm bg-white/50 dark:bg-black/50 flex items-center justify-center rounded">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white text-center px-4">
                            This can&apos;t be shown on testnet
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last 24 hours
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Top Pools by TVL */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    Top Pools by TVL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pools
                      .sort((a, b) => (b.tvlUSD || 0) - (a.tvlUSD || 0))
                      .slice(0, 3)
                      .map((pool, index) => (
                        <div key={pool.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              #{index + 1}
                            </span>
                            <span className="text-sm font-medium">
                              {pool.token0}/{pool.token1}
                            </span>
                          </div>
                          <div className="text-sm font-mono text-muted-foreground">
                            ${pool.tvlUSD ? (pool.tvlUSD / 1000).toFixed(1) + 'K' : '—'}
                          </div>
                        </div>
                      ))}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Top 3 of {pools.length} pools
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {error && ( 
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                ⚠️ Error loading pools: {error}
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-[#F3C623]" />
              <span className="ml-2 text-sm text-muted-foreground">Loading pools from DEXs...</span>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              {/* Tabs with controls aligned horizontally */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 flex-wrap">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="all" className="flex-1 sm:flex-none">All Pools ({pools.length})</TabsTrigger>
                  <TabsTrigger value="mine" className="flex-1 sm:flex-none">My Positions</TabsTrigger>
                </TabsList>
                
                {/* Right side controls - Network, Sort, Create Position */}
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  {/* Network Toggle */}
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setNetwork('testnet')}
                      disabled={loading}
                      className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                        network === 'testnet'
                          ? 'bg-white dark:bg-[#171717] shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Testnet
                    </button>
                    <button
                      disabled={true}
                      title="Mainnet is currently disabled"
                      aria-disabled="true"
                      className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors opacity-50 cursor-not-allowed border border-transparent bg-transparent text-muted-foreground`}
                    >
                      Mainnet
                    </button>
                  </div>
                  
                  {/* Sort dropdown */}
                  <Select value={sortBy} onValueChange={setSortBy} disabled={loading}>
                    <SelectTrigger className="w-[140px] sm:w-[160px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tvl_desc">TVL: High → Low</SelectItem>
                      <SelectItem value="vol_desc">24h Vol: High → Low</SelectItem>
                      <SelectItem value="fee_desc">Fee: High → Low</SelectItem>
                      <SelectItem value="fee_asc">Fee: Low → High</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Create Position button */}
                  <Button asChild className="whitespace-nowrap" disabled={loading}>
                    <Link href="/pool/create">Create Position</Link>
                  </Button>
                </div>
              </div>

              <TabsContent value="all" className="mt-4">
                <PoolTable pools={pools} />
              </TabsContent>
              <TabsContent value="mine" className="mt-4">
                <PoolTable pools={pools} emptyLabel="No positions yet." />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  )
}

function PoolTable({ pools, emptyLabel = "No pools found." }: { pools: Pool[]; emptyLabel?: string }) {
  const router = useRouter()
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  const copyToClipboard = (e: React.MouseEvent, address: string) => {
    e.stopPropagation() // Prevent row click
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }
  
  if (!pools.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-10">{emptyLabel}</div>
    )
  }
  
  return (
    <div className="w-full overflow-x-auto">
      <Table>
      <TableHeader>
        <TableRow className="text-red-600 dark:text-red-400">
          <TableHead className="text-center w-16">#</TableHead>
          <TableHead className="text-left">Pool</TableHead>
          <TableHead className="text-center">DEX</TableHead>
          <TableHead className="text-center">Protocol</TableHead>
          <TableHead className="text-center">Fee tier</TableHead>
          <TableHead className="text-center">↓TVL</TableHead>
          <TableHead className="text-center">Pool APR</TableHead>
          <TableHead className="text-center">Reward APR</TableHead>
          <TableHead className="text-center">1D vol</TableHead>
          <TableHead className="text-center">30D vol</TableHead>
          <TableHead className="text-center">1D vol/TVL</TableHead>
          <TableHead className="text-center">Reserves</TableHead>
          <TableHead className="text-center">Current Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pools.map((p, index) => (
          <TableRow 
            key={p.id} 
            className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all hover:shadow-md hover:scale-[1.01] border-b border-gray-100 dark:border-gray-800"
            onClick={() => router.push(`/pool/${p.id}`)}
          >
            <TableCell className="text-center text-muted-foreground">
              {index + 1}
            </TableCell>
            <TableCell className="font-semibold">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden">
                  {/* Half-Half Logo using backend images */}
                  <div className="absolute inset-0 flex">
                    {/* Token 0 Logo (Left Half) */}
                    <div className="w-1/2 relative overflow-hidden">
                      {p.token0Logo ? (
                        <img 
                          src={p.token0Logo} 
                          alt={p.token0}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to gradient if image fails to load
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-blue-500"></div>
                    </div>
                    {/* Token 1 Logo (Right Half) */}
                    <div className="w-1/2 relative overflow-hidden">
                      {p.token1Logo ? (
                        <img 
                          src={p.token1Logo} 
                          alt={p.token1}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to gradient if image fails to load
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-purple-500"></div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold whitespace-nowrap">{p.token0}/{p.token1}</span>
                    {/* Opt-in buttons for both tokens */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Get asset IDs from pool data - you'll need to add these to Pool type
                          // For now, we'll need to extract from pool metadata or pass through
                          toast.info('Token opt-in coming soon - use search bar for now')
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                        title={`Opt-in to ${p.token0}`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-muted-foreground hover:text-blue-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toast.info('Token opt-in coming soon - use search bar for now')
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                        title={`Opt-in to ${p.token1}`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-muted-foreground hover:text-purple-500" />
                      </button>
                    </div>
                  </div>
                  {p.poolAddress && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-mono">
                        {p.poolAddress.slice(0, 6)}...{p.poolAddress.slice(-4)}
                      </span>
                      <button
                        onClick={(e) => copyToClipboard(e, p.poolAddress!)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                        title="Copy pool address"
                      >
                        {copiedAddress === p.poolAddress ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDexBadgeColor(p.dex)}`}>
                {p.dex.charAt(0).toUpperCase() + p.dex.slice(1)}
              </span>
            </TableCell>
            <TableCell className="text-center">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProtocolBadgeColor(p.protocol)}`}>
                {p.protocol || 'v2'}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground text-center">
              {(p.feeTier / 100).toFixed(2)}%
            </TableCell>
            <TableCell className="text-muted-foreground text-center font-medium">
              {formatUSD(p.tvlUSD)}
            </TableCell>
            <TableCell className="text-muted-foreground text-center">
              {formatPercentage(p.poolAPR)}
            </TableCell>
            <TableCell className="text-center">
              {p.rewardAPR ? (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  +{formatPercentage(p.rewardAPR)}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-center">
              {formatCompactUSD(p.volume1dUSD)}
            </TableCell>
            <TableCell className="text-muted-foreground text-center">
              {formatCompactUSD(p.volume30dUSD)}
            </TableCell>
            <TableCell className="text-muted-foreground text-center">
              {formatVolumeTVLRatio(p.volume1dUSD, p.tvlUSD)}
            </TableCell>
            <TableCell className="text-muted-foreground text-center">
              {formatReserves(p)}
            </TableCell>
            <TableCell className="text-muted-foreground text-center">
              {formatPrice(p)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  )
}

function getDexBadgeColor(dex: string) {
  switch (dex) {
    case 'tinyman':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'pact':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    case 'vestige':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'humble':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case '10xswap':
      return 'bg-gradient-to-r from-red-100 to-yellow-100 text-red-800 dark:from-red-900/30 dark:to-yellow-900/30 dark:text-red-300 font-bold'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  }
}

function getProtocolBadgeColor(protocol?: string) {
  switch (protocol) {
    case 'v4':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 'v3':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'v2':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'v1':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  }
}

function formatUSD(v?: number) {
  if (v == null) return "$—"
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
  } catch {
    return "$—"
  }
}

function formatCompactUSD(v?: number) {
  if (v == null) return "$—"
  try {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
    if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
  } catch {
    return "$—"
  }
}

function formatPercentage(v?: number) {
  if (v == null) return "—"
  try {
    return `${v.toFixed(2)}%`
  } catch {
    return "—"
  }
}

function formatVolumeTVLRatio(volume?: number, tvl?: number) {
  if (volume == null || tvl == null || tvl === 0) return "—"
  try {
    const ratio = volume / tvl
    return ratio.toFixed(2)
  } catch {
    return "—"
  }
}

function formatReserves(p: Pool) {
  if (p.reserve0 && p.reserve1 && p.token0Decimals != null && p.token1Decimals != null) {
    // Format reserves using actual token decimals
    const r0 = Number(p.reserve0) / Math.pow(10, p.token0Decimals)
    const r1 = Number(p.reserve1) / Math.pow(10, p.token1Decimals)
    
    if (r0 < 1000 && r1 < 1000) {
      return `${r0.toFixed(2)} / ${r1.toFixed(2)}`
    } else {
      return `${formatCompact(r0)} / ${formatCompact(r1)}`
    }
  }
  return "—"
}

function formatCompact(num: number) {
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
  return num.toFixed(2)
}

function formatPrice(p: Pool) {
  if (p.currentPrice != null) {
    try {
      return `1 ${p.token0} = ${p.currentPrice.toFixed(6)} ${p.token1}`
    } catch {}
  }
  return "—"
}

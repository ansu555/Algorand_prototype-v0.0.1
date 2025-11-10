"use client"

import Link from "next/link"
import BackgroundPaths from "@/components/shared/animated-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Search, Loader2 } from "lucide-react"
import { useMemo, useState, useEffect } from "react"
import type { PoolInfo } from "@/lib/dex/types"

type Pool = {
  id: string
  token0: string
  token1: string
  feeTier: number // in basis points (30 = 0.3%)
  tvlUSD?: number
  volume24hUSD?: number
  myPosition?: boolean
  fees24hUSD?: number
  currentPrice?: number // price of token0 in terms of token1
  dex: string // 'tinyman' | 'pact' | 'vestige' | 'humble'
  reserve0?: bigint
  reserve1?: bigint
  poolAddress?: string
}

export default function PoolPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [tab, setTab] = useState("all")
  const [sortBy, setSortBy] = useState("tvl_desc")
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet')
  const [allPools, setAllPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch pools when network changes
  useEffect(() => {
    async function fetchPools() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/pools/all?network=${network}`)
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch pools')
        }

        // Map PoolInfo to Pool format
        const pools: Pool[] = data.pools.map((poolInfo: any) => {
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

          return {
            id: poolInfo.poolId,
            token0: poolInfo.asset1.symbol,
            token1: poolInfo.asset2.symbol,
            feeTier: poolInfo.fee, // Already in basis points
            dex: poolInfo.dexName,
            reserve0: reserve1,
            reserve1: reserve2,
            poolAddress: poolInfo.poolAddress,
            currentPrice,
            // Note: volume24h and fees24h would need additional API calls
            // For now we'll leave them undefined
          }
        })

        setAllPools(pools)
        console.log(`✅ Loaded ${pools.length} pools from API`)
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
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter((p) => 
        `${p.token0}/${p.token1}`.toLowerCase().includes(q) ||
        p.dex.toLowerCase().includes(q)
      )
    }
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
  }, [allPools, searchQuery, tab, sortBy])

  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundPaths />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Liquidity Pools</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Discover, search, and manage pools. Add or remove liquidity to earn fees.
              </p>
              {!loading && !error && (
                <p className="text-xs text-muted-foreground mt-1">
                  {allPools.length} pools on {network} (Tinyman{network === 'mainnet' ? ', Pact' : ''})
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Network Toggle (Mainnet visible but disabled) */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setNetwork('testnet')}
                  disabled={loading}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    network === 'testnet'
                      ? 'bg-white dark:bg-[#171717] shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Testnet
                </button>

                

                {/* Show Mainnet button but make it visibly disabled to avoid API calls */}
                <button
                  disabled={true}
                  //onClick={() => setNetwork('mainnet')}
                  title="Mainnet is currently disabled"
                  aria-disabled="true"
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors opacity-50 cursor-not-allowed border border-transparent bg-transparent text-muted-foreground`}
                >
                  Mainnet
                </button>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pools, tokens, or DEX"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 bg-white dark:bg-[#171717] border-2 focus-visible:ring-red-600 dark:focus-visible:ring-[#F3C623]"
                  disabled={loading}
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy} disabled={loading}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tvl_desc">TVL: High → Low</SelectItem>
                  <SelectItem value="vol_desc">24h Vol: High → Low</SelectItem>
                  <SelectItem value="fee_desc">Fee: High → Low</SelectItem>
                  <SelectItem value="fee_asc">Fee: Low → High</SelectItem>
                </SelectContent>
              </Select>
              <Button asChild className="whitespace-nowrap" disabled={loading}>
                <Link href="/pool/create">Create Position</Link>
              </Button>
            </div>
          </div>

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
              <TabsList>
                <TabsTrigger value="all">All Pools ({pools.length})</TabsTrigger>
                <TabsTrigger value="mine">My Positions</TabsTrigger>
              </TabsList>

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
  if (!pools.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-10">{emptyLabel}</div>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pool</TableHead>
          <TableHead>DEX</TableHead>
          <TableHead>Fee</TableHead>
          <TableHead>Reserves</TableHead>
          <TableHead>Current Price</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pools.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-semibold">
              <div className="flex flex-col">
                <span>{p.token0}/{p.token1}</span>
                {p.poolAddress && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {p.poolAddress.slice(0, 6)}...{p.poolAddress.slice(-4)}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDexBadgeColor(p.dex)}`}>
                {p.dex.charAt(0).toUpperCase() + p.dex.slice(1)}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {(p.feeTier / 100).toFixed(2)}%
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatReserves(p)}
            </TableCell>
            <TableCell className="text-muted-foreground">{formatPrice(p)}</TableCell>
            <TableCell>
              <Button asChild size="sm" variant="outline">
                <Link href={`/pool/${p.id}`}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  }
}

function formatReserves(p: Pool) {
  if (p.reserve0 && p.reserve1) {
    // Format reserves in a compact way
    const r0 = Number(p.reserve0) / 1e6 // Assume 6 decimals
    const r1 = Number(p.reserve1) / 1e6
    
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

function formatUSD(v?: number) {
  if (v == null) return "$—"
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
  } catch {
    return "$—"
  }
}

function formatPrice(p: Pool) {
  if (p.currentPrice != null) {
    try {
      return `1 ${p.token0} = ${p.currentPrice.toFixed(6)} ${p.token1}`
    } catch {}
  }
  return "—"
}

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import BackgroundPaths from "@/components/shared/animated-background"
import { SwapCard } from "@/components/features/trading/swap-card"
import { SearchBar } from "@/components/shared/search-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { AssetInfo } from "@/hooks/use-tradeable-assets"
import { PoolLiquidityChart, type SerializedPoolInfo } from "@/components/features/trading/pool-liquidity-chart"
import { formatDistanceToNow } from "date-fns"
import { useWalletConnection } from '@/components/providers/txnlab-wallet-provider'

export default function TradePage() {
  const [showChart, setShowChart] = useState(false)
  const [showSwapHistory, setShowSwapHistory] = useState(false)
  const [selectedPair, setSelectedPair] = useState<{ from: AssetInfo | null; to: AssetInfo | null }>({ from: null, to: null })
  const [pools, setPools] = useState<SerializedPoolInfo[] | null>(null)
  const [poolsLoading, setPoolsLoading] = useState(false)
  const [poolsError, setPoolsError] = useState<string | null>(null)
  const hasFetchedPools = useRef(false)
  const { isConnected, activeAccount } = useWalletConnection()

  // Swap history state (per-wallet)
  const [swaps, setSwaps] = useState<any[] | null>(null)
  const [swapsLoading, setSwapsLoading] = useState(false)
  const [swapsError, setSwapsError] = useState<string | null>(null)
  const [swapRefreshTrigger, setSwapRefreshTrigger] = useState(0)

  // Calculate real token metrics from pool reserves
  const tokenMetrics = useMemo(() => {
    if (!selectedPair.from || !selectedPair.to || !pools) {
      return null
    }

    const matchingPool = pools.find((pool) => {
      const ids = [pool.asset1.id, pool.asset2.id]
      return ids.includes(selectedPair.from!.id) && ids.includes(selectedPair.to!.id)
    })

    if (!matchingPool) return null

    const normalizeReserve = (raw: string, decimals: number) => {
      if (!raw) return 0
      const value = Number(raw)
      return Number.isFinite(value) ? value / Math.pow(10, decimals) : 0
    }

    // Determine which asset is which in the pool
    const fromIsAsset1 = matchingPool.asset1.id === selectedPair.from.id
    const fromReserve = normalizeReserve(
      fromIsAsset1 ? matchingPool.reserve1 : matchingPool.reserve2,
      selectedPair.from.decimals
    )
    const toReserve = normalizeReserve(
      fromIsAsset1 ? matchingPool.reserve2 : matchingPool.reserve1,
      selectedPair.to.decimals
    )

    // Calculate exchange rates (price of one token in terms of the other)
    const fromPriceInTo = toReserve > 0 ? fromReserve / toReserve : 0
    const toPriceInFrom = fromReserve > 0 ? toReserve / fromReserve : 0

    return {
      fromReserve,
      toReserve,
      fromPriceInTo,
      toPriceInFrom,
      pool: matchingPool,
    }
  }, [selectedPair.from, selectedPair.to, pools])

  const fetchPools = useCallback(async () => {
    setPoolsLoading(true)
    setPoolsError(null)

    try {
      const response = await fetch("/api/pools/all")
      if (!response.ok) {
        throw new Error("Failed to fetch pool data")
      }

      const json = await response.json()
      if (!json?.success) {
        throw new Error(json?.error || "Unable to load pool data")
      }

      setPools(json.pools as SerializedPoolInfo[])
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load pool data"
      setPoolsError(message)
      setPools(null)
      return false
    } finally {
      setPoolsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!showChart || hasFetchedPools.current) {
      return
    }

    hasFetchedPools.current = true
    fetchPools().then((loaded) => {
      if (!loaded) {
        hasFetchedPools.current = false
      }
    })
  }, [showChart, fetchPools])

  const handlePairChange = useCallback((from: AssetInfo | null, to: AssetInfo | null) => {
    setSelectedPair({ from, to })
  }, [])

  const handleToggleChart = useCallback(() => {
    setShowChart((prev) => !prev)
  }, [])

  // Fetch swaps for the connected wallet when swap history is shown
  useEffect(() => {
    async function loadSwaps() {
      if (!showSwapHistory) return
      if (!isConnected || !activeAccount?.address) {
        setSwaps(null)
        setSwapsError('Connect your wallet to view swap history')
        return
      }

      console.log('🔄 Fetching swap history for:', activeAccount.address)
      setSwapsLoading(true)
      setSwapsError(null)
      try {
        const res = await fetch(`/api/swaps?address=${encodeURIComponent(activeAccount.address)}`)
        if (!res.ok) throw new Error('Failed to fetch swaps')
        const json = await res.json()
        console.log('📥 Swap history response:', json)
        if (!json?.success) throw new Error(json?.error || 'Failed to load swaps')
        setSwaps(json.data || [])
        console.log('✅ Loaded', json.data?.length || 0, 'swaps')
      } catch (err: any) {
        console.error('❌ Failed to load swaps:', err)
        setSwapsError(err?.message || 'Failed to load swap history')
        setSwaps(null)
      } finally {
        setSwapsLoading(false)
      }
    }

    loadSwaps()
  }, [showSwapHistory, isConnected, activeAccount?.address, swapRefreshTrigger])

  const handleToggleSwapHistory = useCallback(() => {
    setShowSwapHistory((prev) => !prev)
  }, [])

  const handleRetryPools = useCallback(() => {
    hasFetchedPools.current = true
    fetchPools().then((loaded) => {
      if (!loaded) {
        hasFetchedPools.current = false
      }
    })
  }, [fetchPools])

  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundPaths />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className={cn("mx-auto space-y-6 transition-all", showChart ? "max-w-6xl" : "max-w-4xl") }>
          {/* Search Bar */}
          <SearchBar />

          <div className={cn("flex flex-col gap-6 lg:gap-8 transition-all", showChart ? "lg:flex-row lg:items-start" : "lg:items-center") }>
            {showChart && (
              <div className="lg:flex-1 lg:order-1 flex flex-col gap-4">
                {/* Use min-height so the chart card can expand naturally without overlapping the history card below. */}
                <div className="lg:min-h-[317px]">
                  <PoolLiquidityChart
                    fromAsset={selectedPair.from}
                    toAsset={selectedPair.to}
                    pools={pools}
                    loading={poolsLoading}
                    error={poolsError}
                    onRetry={handleRetryPools}
                  />
                </div>

                {/* Swap History Section (left under chart) */}
                {showSwapHistory && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Your Swap History</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSwapRefreshTrigger(prev => prev + 1)}
                        disabled={swapsLoading}
                        className="text-xs"
                      >
                        {swapsLoading ? 'Refreshing...' : 'Refresh'}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Time</TableHead>
                              <TableHead>From</TableHead>
                              <TableHead>To</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-right">Received</TableHead>
                              <TableHead>Route</TableHead>
                              <TableHead>Slippage</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {swapsLoading ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-4">Loading swap history…</TableCell>
                              </TableRow>
                            ) : swapsError ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-sm text-destructive py-4">{swapsError}</TableCell>
                              </TableRow>
                            ) : !swaps || swaps.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-4">No swaps found for this wallet.</TableCell>
                              </TableRow>
                            ) : (
                              swaps.map((s: any) => {
                                const d = s.details || {}
                                return (
                                  <TableRow key={s.id} className="hover:bg-muted/50">
                                    <TableCell className="text-sm">
                                      {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{d.fromAssetUnitName || d.fromAssetName || `#${d.fromAssetId}`}</span>
                                        <span className="text-xs text-muted-foreground">{d.fromAmount || '—'}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{d.toAssetUnitName || d.toAssetName || `#${d.toAssetId}`}</span>
                                        <span className="text-xs text-muted-foreground">{d.toAmount || '—'}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                      {d.fromAmount ? `${d.fromAmount} ${d.fromAssetUnitName || ''}` : '—'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                      {d.toAmount ? `~${d.toAmount} ${d.toAssetUnitName || ''}` : '—'}
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-xs">
                                        {d.routePath && d.routePath.length > 0 ? (
                                          <div className="flex flex-col gap-0.5">
                                            {d.routePath.map((r: any, idx: number) => (
                                              <span key={idx} className="text-muted-foreground">
                                                {r.dex || 'DEX'}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">Direct</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {d.slippage ? `${d.slippage}%` : '—'}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col gap-1">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 w-fit">
                                          {s.status}
                                        </span>
                                        {d.txId && (
                                          <a 
                                            href={`https://testnet.algoexplorer.io/tx/${d.txId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-500 hover:underline"
                                          >
                                            View Tx
                                          </a>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <div className={cn(
              "mx-auto w-full max-w-lg transition-all relative flex flex-col gap-6",
              showChart && "lg:order-2 lg:ml-auto"
            )}>
              <div>
                <SwapCard 
                  onPairChange={handlePairChange} 
                  onSwapSuccess={() => setSwapRefreshTrigger(prev => prev + 1)}
                />
                <div className="mt-4 flex flex-row justify-start gap-2">
                  <Button variant="outline" size="sm" onClick={handleToggleChart} className="rounded-full border border-border/70 bg-background/80 backdrop-blur relative z-0 text-xs px-3 py-1 h-8">
                    {showChart ? "Hide Chart" : "Show Chart"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToggleSwapHistory} className="rounded-full border border-border/70 bg-background/80 backdrop-blur relative z-0 text-xs px-3 py-1 h-8">
                    {showSwapHistory ? "Hide History" : "Show History"}
                  </Button>
                </div>

                {/* Token Information Boxes */}
                {selectedPair.from && selectedPair.to && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                  {/* Box 1 - Selling Token Info */}
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {selectedPair.from.unitName?.substring(0, 2) || 'T1'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-foreground font-bold text-base mb-0.5 truncate">
                            {tokenMetrics ? (
                              `${tokenMetrics.fromPriceInTo.toFixed(6)} ${selectedPair.to.unitName || selectedPair.to.name}`
                            ) : (
                              '—'
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {selectedPair.from.unitName || selectedPair.from.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground text-xs font-semibold">
                            {tokenMetrics ? `${tokenMetrics.fromReserve.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                          </div>
                          <div className="text-xs text-muted-foreground/70">Reserve</div>
                        </div>
                      </div>
                      
                      {/* Mini Chart - simple reserve distribution visual */}
                      <div className="h-12 mb-3 flex items-end gap-0.5">
                        {tokenMetrics ? (
                          Array.from({ length: 40 }).map((_, i) => {
                            // Create a simple visual based on reserve ratio
                            const ratio = tokenMetrics.fromReserve / (tokenMetrics.fromReserve + tokenMetrics.toReserve)
                            const baseHeight = ratio * 100
                            const variance = (Math.sin(i * 0.3) * 15) + (Math.cos(i * 0.5) * 10)
                            const height = Math.max(20, Math.min(80, baseHeight + variance))
                            return (
                              <div
                                key={i}
                                className="flex-1 bg-purple-500/60 rounded-sm"
                                style={{ height: `${height}%` }}
                              />
                            )
                          })
                        ) : (
                          Array.from({ length: 40 }).map((_, i) => (
                            <div key={i} className="flex-1 bg-muted/40 rounded-sm" style={{ height: '30%' }} />
                          ))
                        )}
                      </div>

                      <button className="text-muted-foreground hover:text-primary dark:hover:text-[#F3C623] text-xs flex items-center gap-1 transition-colors">
                        Open Page
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </CardContent>
                  </Card>

                  {/* Box 2 - Buying Token Info */}
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {selectedPair.to.unitName?.substring(0, 2) || 'T2'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-foreground font-bold text-base mb-0.5 truncate">
                            {tokenMetrics ? (
                              `${tokenMetrics.toPriceInFrom.toFixed(6)} ${selectedPair.from.unitName || selectedPair.from.name}`
                            ) : (
                              '—'
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {selectedPair.to.unitName || selectedPair.to.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground text-xs font-semibold">
                            {tokenMetrics ? `${tokenMetrics.toReserve.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                          </div>
                          <div className="text-xs text-muted-foreground/70">Reserve</div>
                        </div>
                      </div>
                      
                      {/* Mini Chart - simple reserve distribution visual */}
                      <div className="h-12 mb-3 flex items-end gap-0.5">
                        {tokenMetrics ? (
                          Array.from({ length: 40 }).map((_, i) => {
                            const ratio = tokenMetrics.toReserve / (tokenMetrics.fromReserve + tokenMetrics.toReserve)
                            const baseHeight = ratio * 100
                            const variance = (Math.sin(i * 0.4) * 12) + (Math.cos(i * 0.6) * 8)
                            const height = Math.max(20, Math.min(80, baseHeight + variance))
                            return (
                              <div
                                key={i}
                                className="flex-1 bg-cyan-500/60 rounded-sm"
                                style={{ height: `${height}%` }}
                              />
                            )
                          })
                        ) : (
                          Array.from({ length: 40 }).map((_, i) => (
                            <div key={i} className="flex-1 bg-muted/40 rounded-sm" style={{ height: '30%' }} />
                          ))
                        )}
                      </div>

                      <button className="text-muted-foreground hover:text-primary dark:hover:text-[#F3C623] text-xs flex items-center gap-1 transition-colors">
                        Open Page
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </CardContent>
                  </Card>
                </div>
              )}
              </div>

              {/* Swap History Section (right) - only when chart hidden */}
              {showSwapHistory && !showChart && (
                <Card className="mt-4">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Your Swap History</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSwapRefreshTrigger(prev => prev + 1)}
                      disabled={swapsLoading}
                      className="text-xs"
                    >
                      {swapsLoading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>To</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Received</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Slippage</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {swapsLoading ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-4">Loading swap history…</TableCell>
                            </TableRow>
                          ) : swapsError ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-sm text-destructive py-4">{swapsError}</TableCell>
                            </TableRow>
                          ) : !swaps || swaps.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-4">No swaps found for this wallet.</TableCell>
                            </TableRow>
                          ) : (
                            swaps.map((s: any) => {
                              const d = s.details || {}
                              return (
                                <TableRow key={s.id} className="hover:bg-muted/50">
                                  <TableCell className="text-sm">
                                    {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{d.fromAssetUnitName || d.fromAssetName || `#${d.fromAssetId}`}</span>
                                      <span className="text-xs text-muted-foreground">{d.fromAmount || '—'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{d.toAssetUnitName || d.toAssetName || `#${d.toAssetId}`}</span>
                                      <span className="text-xs text-muted-foreground">{d.toAmount || '—'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {d.fromAmount ? `${d.fromAmount} ${d.fromAssetUnitName || ''}` : '—'}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {d.toAmount ? `~${d.toAmount} ${d.toAssetUnitName || ''}` : '—'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-xs">
                                      {d.routePath && d.routePath.length > 0 ? (
                                        <div className="flex flex-col gap-0.5">
                                          {d.routePath.map((r: any, idx: number) => (
                                            <span key={idx} className="text-muted-foreground">
                                              {r.dex || 'DEX'}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">Direct</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {d.slippage ? `${d.slippage}%` : '—'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 w-fit">
                                        {s.status}
                                      </span>
                                      {d.txId && (
                                        <a 
                                          href={`https://testnet.algoexplorer.io/tx/${d.txId}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-500 hover:underline"
                                        >
                                          View Tx
                                        </a>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

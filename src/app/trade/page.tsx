"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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

export default function TradePage() {
  const [showChart, setShowChart] = useState(false)
  const [showSwapHistory, setShowSwapHistory] = useState(false)
  const [selectedPair, setSelectedPair] = useState<{ from: AssetInfo | null; to: AssetInfo | null }>({ from: null, to: null })
  const [pools, setPools] = useState<SerializedPoolInfo[] | null>(null)
  const [poolsLoading, setPoolsLoading] = useState(false)
  const [poolsError, setPoolsError] = useState<string | null>(null)
  const hasFetchedPools = useRef(false)

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

          <div className={cn("flex flex-col gap-6 lg:gap-8 transition-all", showChart ? "lg:flex-row" : "lg:items-center") }>
            {showChart && (
              <div className="lg:flex-1 lg:order-1">
                <PoolLiquidityChart
                  fromAsset={selectedPair.from}
                  toAsset={selectedPair.to}
                  pools={pools}
                  loading={poolsLoading}
                  error={poolsError}
                  onRetry={handleRetryPools}
                />
              </div>
            )}

            <div className={cn(
              "mx-auto w-full max-w-md transition-all relative",
              showChart && "lg:order-2 lg:ml-auto"
            )}>
              <SwapCard onPairChange={handlePairChange} />
              <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2">
                <Button variant="outline" onClick={handleToggleChart} className="rounded-full border border-border/70 bg-background/80 backdrop-blur relative z-0 w-full sm:w-auto">
                  {showChart ? "Hide Pool Chart" : "Show Pool Chart"}
                </Button>
                <Button variant="outline" onClick={handleToggleSwapHistory} className="rounded-full border border-border/70 bg-background/80 backdrop-blur relative z-0 w-full sm:w-auto">
                  {showSwapHistory ? "Hide Swap History" : "Show Swap History"}
                </Button>
              </div>

              {/* Token Information Boxes */}
              {selectedPair.from && selectedPair.to && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Box 1 - Selling Token Info */}
                  <Card>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-2 sm:gap-3 mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                          {selectedPair.from.unitName?.substring(0, 2) || 'T1'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-foreground font-bold text-base sm:text-lg mb-0.5 truncate">
                            ${selectedPair.from.id === 0 ? '164.50' : '0.99991'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {selectedPair.from.unitName || selectedPair.from.name}...{selectedPair.from.id}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={selectedPair.from.id === 0 ? "text-red-500 text-sm font-semibold" : "text-green-500 text-sm font-semibold"}>
                            {selectedPair.from.id === 0 ? '-2.28%' : '0%'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Mini Chart */}
                      <div className="h-16 mb-3 flex items-end gap-0.5">
                        {Array.from({ length: 40 }).map((_, i) => {
                          const height = Math.random() * 60 + 20;
                          const color = selectedPair.from.id === 0 ? 'bg-red-500/60' : 'bg-green-500/60';
                          return (
                            <div
                              key={i}
                              className={`flex-1 ${color} rounded-sm`}
                              style={{ height: `${height}%` }}
                            />
                          );
                        })}
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
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-2 sm:gap-3 mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                          {selectedPair.to.unitName?.substring(0, 2) || 'T2'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-foreground font-bold text-base sm:text-lg mb-0.5 truncate">
                            ${selectedPair.to.id === 0 ? '164.50' : '0.99991'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {selectedPair.to.unitName || selectedPair.to.name}...{selectedPair.to.id}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={selectedPair.to.id === 0 ? "text-red-500 text-sm font-semibold" : "text-green-500 text-sm font-semibold"}>
                            {selectedPair.to.id === 0 ? '-2.28%' : '0%'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Mini Chart */}
                      <div className="h-16 mb-3 flex items-end gap-0.5">
                        {Array.from({ length: 40 }).map((_, i) => {
                          const height = Math.random() * 60 + 20;
                          const color = selectedPair.to.id === 0 ? 'bg-red-500/60' : 'bg-green-500/60';
                          return (
                            <div
                              key={i}
                              className={`flex-1 ${color} rounded-sm`}
                              style={{ height: `${height}%` }}
                            />
                          );
                        })}
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

              {/* Swap History Section */}
              {showSwapHistory && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Your Swap History</CardTitle>
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
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Mock swap history data */}
                          {[
                            { id: 1, time: new Date(Date.now() - 5 * 60 * 1000), from: 'ALGO', to: 'USDC', amount: '100', status: 'Completed' },
                            { id: 2, time: new Date(Date.now() - 30 * 60 * 1000), from: 'USDC', to: 'ALGO', amount: '50', status: 'Completed' },
                            { id: 3, time: new Date(Date.now() - 2 * 60 * 60 * 1000), from: 'ALGO', to: 'USDC', amount: '200', status: 'Completed' },
                            { id: 4, time: new Date(Date.now() - 5 * 60 * 60 * 1000), from: 'USDC', to: 'ALGO', amount: '150', status: 'Completed' },
                            { id: 5, time: new Date(Date.now() - 24 * 60 * 60 * 1000), from: 'ALGO', to: 'USDC', amount: '75', status: 'Completed' },
                          ].map((swap) => (
                            <TableRow key={swap.id}>
                              <TableCell className="text-sm">
                                {formatDistanceToNow(swap.time, { addSuffix: true })}
                              </TableCell>
                              <TableCell className="font-medium">{swap.from}</TableCell>
                              <TableCell className="font-medium">{swap.to}</TableCell>
                              <TableCell className="text-right font-mono">{swap.amount}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  {swap.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Empty state message */}
                    {false && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No swap history found.</p>
                        <p className="text-sm mt-2">Your completed swaps will appear here.</p>
                      </div>
                    )}
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

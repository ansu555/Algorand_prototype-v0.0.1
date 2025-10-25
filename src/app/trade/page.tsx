"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import BackgroundPaths from "@/components/shared/animated-background"
import { SwapCard } from "@/components/features/trading/swap-card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AssetInfo } from "@/hooks/use-tradeable-assets"
import { PoolLiquidityChart, type SerializedPoolInfo } from "@/components/features/trading/pool-liquidity-chart"

export default function TradePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showChart, setShowChart] = useState(false)
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
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tokens, pools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 h-10 text-sm bg-white dark:bg-[#171717] border-2 focus-visible:ring-primary dark:focus-visible:ring-[#F3C623]"
            />
          </div>

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
              "mx-auto w-full max-w-md transition-all",
              showChart && "lg:order-2 lg:ml-auto lg:max-w-sm"
            )}>
              <SwapCard onPairChange={handlePairChange} />
              <div className="mt-4 flex justify-center lg:justify-end">
                <Button variant="outline" onClick={handleToggleChart} className="rounded-full border border-border/70 bg-background/80 backdrop-blur">
                  {showChart ? "Hide Pool Chart" : "Show Pool Chart"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

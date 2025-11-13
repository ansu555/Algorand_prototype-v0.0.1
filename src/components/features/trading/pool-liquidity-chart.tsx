"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AssetInfo } from "@/hooks/use-tradeable-assets"
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell } from "recharts"
import type { PoolInfo } from "@/lib/dex/types"

export type SerializedPoolInfo = Omit<PoolInfo, "reserve1" | "reserve2" | "totalLiquidity"> & {
  reserve1: string
  reserve2: string
  totalLiquidity: string
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
})

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
})

type PoolLiquidityChartProps = {
  fromAsset: AssetInfo | null
  toAsset: AssetInfo | null
  pools: SerializedPoolInfo[] | null
  loading: boolean
  error: string | null
  onRetry: () => void
}

const normalizeReserve = (raw: string, decimals: number) => {
  if (!raw) return 0
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    return 0
  }
  return value / Math.pow(10, decimals)
}

const resolveTimestamp = (timestamp?: number | null) => {
  if (!timestamp) return null
  const ms = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function PoolLiquidityChart({ fromAsset, toAsset, pools, loading, error, onRetry }: PoolLiquidityChartProps) {
  const matchingPool = useMemo(() => {
    if (!pools || !fromAsset || !toAsset) return null

    return pools.find((pool) => {
      const ids = [pool.asset1.id, pool.asset2.id]
      return ids.includes(fromAsset.id) && ids.includes(toAsset.id)
    })
  }, [pools, fromAsset, toAsset])

  // Keep chart ordering aligned with the user's selection for easier mental mapping.
  const orderedAssets = useMemo(() => {
    if (!matchingPool) return []

    const primaryMatches = matchingPool.asset1.id === fromAsset?.id && matchingPool.asset2.id === toAsset?.id

    if (primaryMatches) {
      return [
        { key: "assetA", asset: matchingPool.asset1, reserve: matchingPool.reserve1 },
        { key: "assetB", asset: matchingPool.asset2, reserve: matchingPool.reserve2 },
      ]
    }

    return [
      { key: "assetA", asset: matchingPool.asset2, reserve: matchingPool.reserve2 },
      { key: "assetB", asset: matchingPool.asset1, reserve: matchingPool.reserve1 },
    ]
  }, [matchingPool, fromAsset?.id, toAsset?.id])

  const chartData = useMemo(() => {
    if (!orderedAssets.length) return []

    return orderedAssets.map(({ key, asset, reserve }) => ({
      key,
      name: asset.unitName || asset.symbol || asset.name,
      value: normalizeReserve(reserve, asset.decimals),
    }))
  }, [orderedAssets])

  const chartConfig: ChartConfig = useMemo(() => ({
    assetA: {
      label: orderedAssets[0]?.asset?.unitName || orderedAssets[0]?.asset?.symbol || orderedAssets[0]?.asset?.name || "Asset A",
      color: "hsl(var(--primary))",
    },
    assetB: {
      label: orderedAssets[1]?.asset?.unitName || orderedAssets[1]?.asset?.symbol || orderedAssets[1]?.asset?.name || "Asset B",
      color: "#F3C623",
    },
  }), [orderedAssets])

  const lastUpdated = useMemo(() => resolveTimestamp(matchingPool?.lastUpdated), [matchingPool])

  if (loading) {
    return (
      <Card className="border border-border/60 bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Pool Liquidity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border border-red-200/50 bg-red-50/60 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Pool Liquidity</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="bg-transparent">
            <AlertTitle>Unable to load pool data</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={onRetry} className="border-red-400 text-red-600 hover:bg-red-500/10 dark:border-red-500 dark:text-red-200">
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!fromAsset || !toAsset) {
    return (
      <Card className="border border-border/60 bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Pool Liquidity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select two tokens to preview pooled liquidity.</p>
        </CardContent>
      </Card>
    )
  }

  if (!matchingPool) {
    return (
      <Card className="border border-border/60 bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Pool Liquidity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-muted/40">
            <AlertTitle>No pool detected for this pair</AlertTitle>
            <AlertDescription>
              We could not locate a pool containing {fromAsset.unitName || fromAsset.name} and {toAsset.unitName || toAsset.name}. Try another combination.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border/60 bg-card/80 backdrop-blur-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-semibold">Pool Liquidity</CardTitle>
        <p className="text-xs text-muted-foreground">{matchingPool.dexName.toUpperCase()}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-60">
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis dataKey="name" type="category" width={90} tickLine={false} axisLine={false} />
              <ChartTooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }} content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">No liquidity data available.</div>
        )}

        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          {orderedAssets.map(({ asset, reserve }) => {
            const formattedReserve = numberFormatter.format(normalizeReserve(reserve, asset.decimals))
            return (
              <div key={asset.id} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{asset.unitName || asset.symbol || asset.name}</div>
                <div className="text-lg font-semibold text-foreground">{formattedReserve}</div>
                <div className="text-xs text-muted-foreground/80">Reserve</div>
              </div>
            )
          })}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Liquidity</div>
            <div className="text-lg font-semibold text-foreground">{compactFormatter.format(Number(matchingPool.totalLiquidity))}</div>
            <div className="text-xs text-muted-foreground/80">Raw units reported by pool</div>
          </div>
          {lastUpdated && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Last Updated</div>
              <div className="text-lg font-semibold text-foreground">{lastUpdated.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground/80">Pool snapshot timestamp</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useGetCryptoDetailsQuery, useGetAlgorandCryptosQuery } from "@/app/services/cryptoApi"

export default function SideAnalytics({ coinId }: { coinId?: string }) {
  const { data: coin, isLoading } = useGetCryptoDetailsQuery(coinId as string, { skip: !coinId }) as any
  // Fallback: read market data from list feed if details lack marketCap/volume
  const { data: listData } = useGetAlgorandCryptosQuery(undefined as any, { skip: !coinId }) as any
  const listCoin = (listData?.coins || []).find((c: any) => (c.uuid || c.id) === coinId)
  const fallbackMarketCap = listCoin?.marketCap ? parseFloat(listCoin.marketCap) : 0
  const fallbackVolume = listCoin?.["24hVolume"] ? parseFloat(listCoin["24hVolume"]) : 0
  const marketCap = (coin?.marketCap && parseFloat(coin.marketCap) > 0) ? parseFloat(coin.marketCap) : fallbackMarketCap
  const volume24h = (coin?.["24hVolume"] && parseFloat(coin["24hVolume"]) > 0) ? parseFloat(coin["24hVolume"]) : fallbackVolume

  if (!coinId) return <div className="text-sm text-muted-foreground">Pick a coin to see analytics.</div>
  if (isLoading) return <SideAnalyticsSkeleton />
  if (!coin) return null

  const formatCompactUSD = (n: number) => {
    if (n == null || isNaN(n)) return "$—"
    const abs = Math.abs(n)
    if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
    return `$${n.toLocaleString()}`
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-sm">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Row label="Market Cap" value={`${formatCompactUSD(marketCap)}`} />
          <Row label="Volume (24h)" value={`${formatCompactUSD(volume24h)}`} />
          <div className="h-px w-full bg-border my-2" />
          <Row label="Circulating" value={`${parseFloat(coin.supply?.circulating || "0").toLocaleString()} ${coin.symbol}`} />
          <Row label="Total" value={`${parseFloat(coin.supply?.total || "0").toLocaleString()} ${coin.symbol}`} />
          <Row label="Max" value={coin.supply?.max && parseFloat(coin.supply.max) > 0 ? `${parseFloat(coin.supply.max).toLocaleString()} ${coin.symbol}` : "∞"} />
          <Row label="% Issued" value={coin.supply?.max && parseFloat(coin.supply.max) > 0 ? `${((parseFloat(coin.supply.circulating) / parseFloat(coin.supply.max)) * 100).toFixed(2)}%` : "N/A"} />
          <Row label="ATH" value={`$${parseFloat(coin.allTimeHigh?.price || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`} />
          <Row label="ATL" value={`$${parseFloat(coin.allTimeLow?.price || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`} />
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground/90">{value}</span>
    </div>
  )
}

function SideAnalyticsSkeleton() {
  return (
    <div className="space-y-3">
      {[1,2].map((i) => (
        <Card key={i}>
          <CardHeader className="py-2"><Skeleton className="h-4 w-28" /></CardHeader>
          <CardContent className="space-y-2">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex justify-between"><Skeleton className="h-3.5 w-20" /><Skeleton className="h-3.5 w-24" /></div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

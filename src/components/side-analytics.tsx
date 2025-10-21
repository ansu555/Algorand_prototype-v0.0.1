"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useGetCryptoDetailsQuery } from "@/app/services/cryptoApi"

export default function SideAnalytics({ coinId }: { coinId?: string }) {
  const { data: coin, isLoading } = useGetCryptoDetailsQuery(coinId as string, { skip: !coinId }) as any

  if (!coinId) return <div className="text-sm text-muted-foreground">Pick a coin to see analytics.</div>
  if (isLoading) return <SideAnalyticsSkeleton />
  if (!coin) return null

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-sm">Supply Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Row label="Circulating" value={`${parseFloat(coin.supply?.circulating || "0").toLocaleString()} ${coin.symbol}`} />
          <Row label="Total" value={`${parseFloat(coin.supply?.total || "0").toLocaleString()} ${coin.symbol}`} />
          <Row label="Max" value={`${parseFloat(coin.supply?.max || "0").toLocaleString()} ${coin.symbol}`} />
          <Row label="% Issued" value={coin.supply?.max ? `${((parseFloat(coin.supply.circulating) / parseFloat(coin.supply.max)) * 100).toFixed(2)}%` : "N/A"} />
          <Row label="ATH" value={`$${parseFloat(coin.allTimeHigh?.price || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <Row label="ATL" value={`N/A`} />
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

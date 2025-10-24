"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useGetAssetDetailsQuery } from "@/app/services/algorandApi"

export default function SideAnalytics({ coinId }: { coinId?: string }) {
  const { data: coin, isLoading } = useGetAssetDetailsQuery(coinId as string, { skip: !coinId }) as any

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
          <Row label="Total Supply" value={`${parseFloat(coin.totalSupply?.toString() || "0").toLocaleString()} ${coin.symbol}`} />
          <Row label="Decimals" value={coin.decimals?.toString() || "0"} />
          <Row label="Creator" value={coin.creator?.slice(0, 8) + "..." || "Unknown"} />
          <Row label="Holders" value={coin.holders?.toString() || "0"} />
          <Row label="Created" value={coin.createdAt ? new Date(coin.createdAt * 1000).toLocaleDateString() : "Unknown"} />
          <Row label="Destroyed" value={coin.destroyed ? "Yes" : "No"} />
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

"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDown, ArrowUp, Star, StarOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGetCryptoDetailsQuery, useGetCryptoHistoryQuery } from "@/app/services/cryptoApi"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import RuleBuilderModal, { type CoinOption } from "@/components/rule-builder-modal"
import { useAccount } from "wagmi"
import { toast } from "@/hooks/use-toast"
import { describeRule } from "@/lib/shared/rules"
import { createRule } from "@/features/agent/api/client"

const TIME_RANGES = {
  "1D": "24h",
  "7D": "7d",
  "1M": "30d",
  "3M": "3m",
  "1Y": "1y",
  "ALL": "5y",
} as const

const fmtDate = (ts: number) => new Date(ts * 1000).toLocaleDateString()

export default function CoinOverviewPane({ coinId }: { coinId?: string }) {
  const [timeRange, setTimeRange] = useState<keyof typeof TIME_RANGES>("3M")
  const [autoOpen, setAutoOpen] = useState(false)
  const [inWatchlist, setInWatchlist] = useState(false)
  const { address } = useAccount()

  const enabled = !!coinId
  const { data: coin, isLoading: loadingDetails } = useGetCryptoDetailsQuery(coinId as string, {
    skip: !enabled,
  }) as any
  const { data: history, isLoading: loadingHistory } = useGetCryptoHistoryQuery(
    { coinId: coinId as string, timePeriod: TIME_RANGES[timeRange] },
    { skip: !enabled }
  ) as any

  const isLoading = !coinId || loadingDetails || loadingHistory

  const chartData = useMemo(
    () =>
      history?.history?.map((pt: { timestamp: number; price: string }) => ({
        date: pt.timestamp,
        price: parseFloat(pt.price),
      })) || [],
    [history]
  )

  const priceChangePct = useMemo(() => {
    if (!chartData.length) return 0
    const start = chartData[0].price
    const end = chartData[chartData.length - 1].price
    return ((end - start) / start) * 100
  }, [chartData])

  if (isLoading) return <PaneSkeleton />
  if (!coin) return <div className="text-sm text-muted-foreground">Select a coin from the right to view details.</div>

  return (
    <div className="space-y-4">
      {/* Header: name + rank + autopilot */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 dark:bg-[#F3C623]/10 rounded-full flex items-center justify-center text-lg font-mono text-primary dark:text-[#F3C623]">
            {coin.symbol?.substring(0, 3)}
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {coin.name} <span className="text-base text-muted-foreground">#{coin.rank}</span>
            </h2>
            <div className="text-muted-foreground">{coin.symbol}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setInWatchlist((v) => !v)}>
            {inWatchlist ? <StarOff className="h-4 w-4 mr-2" /> : <Star className="h-4 w-4 mr-2" />}Watchlist
          </Button>
          <Button size="sm" onClick={() => setAutoOpen(true)}>Add to Auto-Pilot</Button>
        </div>
      </div>


      {/* 3 compact statistic cards on top */}
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Card>
          <CardHeader className="py-2"><CardTitle className="text-[11px]">Price</CardTitle></CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="text-2xl font-bold font-mono">
              ${parseFloat(coin.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={cn("flex items-center text-xs", parseFloat(coin.change) >= 0 ? "text-green-500" : "text-red-500")}> 
              {parseFloat(coin.change) >= 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />} {Math.abs(parseFloat(coin.change)).toFixed(2)}% (24h)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2"><CardTitle className="text-[11px]">Market Cap</CardTitle></CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="text-2xl font-bold font-mono">${(parseFloat(coin.marketCap) / 1_000_000_000).toFixed(1)}B</div>
            <CardDescription className="text-xs">Rank #{coin.rank}</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2"><CardTitle className="text-[11px]">Volume (24h)</CardTitle></CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="text-2xl font-bold font-mono">${(parseFloat(coin["24hVolume"]) / 1_000_000_000).toFixed(1)}B</div>
            <CardDescription className="text-xs">
              {((parseFloat(coin["24hVolume"]) / parseFloat(coin.marketCap)) * 100).toFixed(2)}% of market cap
            </CardDescription>
          </CardContent>
        </Card>
      </div>
      {/* Tabs + Chart below stats */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Price Chart</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(TIME_RANGES).map((r) => (
                    <Button key={r} size="sm" variant={timeRange === (r as any) ? "default" : "outline"} onClick={() => setTimeRange(r as any)}>
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
              <CardDescription>
                <span className={cn(priceChangePct >= 0 ? "text-green-500" : "text-red-500")}>{priceChangePct >= 0 ? "+" : ""}{priceChangePct.toFixed(2)}%</span>
                <span className="ml-2">in the last {timeRange}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ price: { label: "Price", theme: { light: "red-600", dark: "#F3C623" } } }}
                className="h-[360px]"
              >
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={30} />
                  <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} width={70} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="price" stroke="var(--color-price)" fillOpacity={1} fill="url(#priceFill)" />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent History</CardTitle>
              <CardDescription>Latest 10 data points</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.slice(-10).map((d: { date: number; price: number }, i: number, arr: { date: number; price: number }[]) => (
                    <TableRow key={d.date}>
                      <TableCell>{fmtDate(d.date)}</TableCell>
                      <TableCell className="text-right font-mono">${d.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className={cn("text-right", i === 0 ? "text-muted-foreground" : d.price >= arr[i - 1].price ? "text-green-500" : "text-red-500")}> 
                        {i === 0 ? "—" : `${(((d.price - arr[i - 1].price) / arr[i - 1].price) * 100).toFixed(2)}%`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="about">
          <Card>
            <CardHeader><CardTitle>About {coin.name}</CardTitle></CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: coin.description || "No description available." }} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      <RuleBuilderModal
        open={autoOpen}
        onOpenChange={setAutoOpen}
        initialCoins={[coin.uuid || coin.id]}
        availableCoins={[
          { id: coin.uuid || coin.id, symbol: coin.symbol, name: coin.name, iconUrl: (coin as any).iconUrl || (coin as any).icon || (coin as any).image } as CoinOption,
        ]}
        onPreview={(rule) => {
          toast({ title: "Preview", description: describeRule({ ...rule, coins: rule.coins?.length ? rule.coins : [coin.id], strategy: rule.strategy }) })
        }}
        onSave={async (rule) => {
          try {
            const type = rule.strategy === "DCA" ? "dca" : rule.strategy === "REBALANCE" ? "rebalance" : "rotate"
            const payload = {
              ownerAddress: address || "0x0000000000000000000000000000000000000000",
              type,
              targets: Array.isArray(rule.coins) && rule.coins.length ? rule.coins : [coin.id],
              rotateTopN: rule.rotateTopN,
              maxSpendUSD: rule.maxSpendUsd,
              maxSlippage: rule.maxSlippagePercent,
              cooldownMinutes: rule.cooldownMinutes,
              triggerType: rule.triggerType,
              dropPercent: rule.dropPercent,
              trendWindow: rule.trendWindow,
              trendThreshold: rule.trendThreshold,
              momentumLookback: rule.momentumLookback,
              momentumThreshold: rule.momentumThreshold,
              status: "active",
            }
            await createRule(payload)
            toast({ title: "Rule saved", description: describeRule({ ...rule, coins: payload.targets }) })
          } catch (e) {
            console.error(e)
            toast({ title: "Failed to save rule", description: "Please try again.", variant: "destructive" as any })
          } finally {
            setAutoOpen(false)
          }
        }}
      />
    </div>
  )
}

function PaneSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><Skeleton className="h-10 w-56" /><Skeleton className="h-9 w-40" /></div>
      <div className="grid gap-4 sm:grid-cols-3">{[1,2,3].map(i => <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-20" /></CardHeader><CardContent><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-4 w-24" /></CardContent></Card>)}</div>
      <Card><CardHeader><Skeleton className="h-6 w-28" /></CardHeader><CardContent><Skeleton className="h-[360px] w-full" /></CardContent></Card>
    </div>
  )
}

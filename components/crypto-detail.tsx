"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Star,
  StarOff,
  FileText,
  Globe,
  Link as LinkIcon,
  Twitter,
  MessageCircle,
  Github,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useGetCryptoDetailsQuery, useGetCryptoHistoryQuery } from "@/app/services/cryptoApi"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
} from "recharts"
import RuleBuilderModal, { type CoinOption } from "@/components/rule-builder-modal"
import { toast } from "@/hooks/use-toast"
import { describeRule } from "@/lib/shared/rules"
import { createRule } from "@/features/agent/api/client"
import { useAccount } from "wagmi"

// Define time ranges for chart
const TIME_RANGES = {
  "1D": "24h", // Change from "1d" to "24h"
  "7D": "7d",
  "1M": "30d",
  "3M": "3m",
  "1Y": "1y",
  "ALL": "5y",
}

// Map social media to icons
const socialIcons = {
  twitter: <Twitter className="h-4 w-4" />,
  reddit: <MessageCircle className="h-4 w-4" />,
  github: <Github className="h-4 w-4" />,
}

// Helper function to format date
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString();
}

// Define types for ChartContainer props
interface ChartContainerProps {
  children: React.ReactNode;
  config: {
    [key: string]: {
      label: string;
      color: string;
    };
  };
}

// Chart container with theme styling
function ChartContainer({ children, config }: ChartContainerProps) {
  return (
    <div className="w-full h-full" style={{ '--chart-1': '221 83% 53%' } as React.CSSProperties}>
      {children}
    </div>
  );
}

// Custom tooltip for the chart
interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: string | number }>;
  label?: string | number;
}

function ChartTooltipContent({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-sm p-3 text-sm">
        <p className="font-medium">{typeof label === 'number' ? formatDate(label) : label}</p>
        <p className="text-primary">
          Price: ${(typeof payload[0].value === 'string' ? parseFloat(payload[0].value) : payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
}

export function CryptoDetail({ id }: { id: string }) {
  const [timeRange, setTimeRange] = useState<"1D" | "7D" | "1M" | "3M" | "1Y" | "ALL">("7D")
  const [inWatchlist, setInWatchlist] = useState(false)
  const [rbOpen, setRbOpen] = useState(false)
  const { address } = useAccount()

  // Fetch crypto details
  const { 
    data: crypto, 
    isLoading: isLoadingCrypto, 
    error: cryptoError 
  } = useGetCryptoDetailsQuery(id);
  
  // Fetch price history based on time range
  const { 
    data: historyData, 
    isLoading: isLoadingHistory 
  } = useGetCryptoHistoryQuery({ 
    coinId: id, 
    timePeriod: TIME_RANGES[timeRange] 
  });

  // Add a useEffect to handle timeRange changes and debug the response
  useEffect(() => {
    console.log(`Fetching history for time period: ${TIME_RANGES[timeRange]}`);
  }, [timeRange]);
  
  // For debugging
  console.log('Crypto Details:', crypto);
  console.log('History Data:', historyData);

  // Process chart data
  const chartData = historyData?.history?.map((item: { timestamp: number; price: string }) => ({
    date: item.timestamp,
    price: parseFloat(item.price),
  })) || [];
  
  // Calculate price change for selected time range if data is available
  const priceChange = chartData.length > 1 
    ? chartData[chartData.length - 1].price - chartData[0].price 
    : 0;
    
  const priceChangePercentage = chartData.length > 1 && chartData[0].price 
    ? (priceChange / chartData[0].price) * 100 
    : 0;

  // Loading state
  const isLoading = isLoadingCrypto || isLoadingHistory;

  // Show skeleton while loading
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Show error if any
  if (cryptoError) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Cryptocurrency Data</h2>
        <p className="text-muted-foreground mb-6">We couldn't retrieve data for this cryptocurrency.</p>
        <Button asChild>
          <Link href="/cryptocurrencies">Back to All Cryptocurrencies</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/cryptocurrencies" className="hover:text-primary">
          Cryptocurrencies
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{crypto.name}</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-lg font-mono">
            {crypto.symbol.substring(0, 3)}
          </div>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {crypto.name}
              <span className="text-xl text-muted-foreground">#{crypto.rank}</span>
            </h1>
            <div className="text-muted-foreground">{crypto.symbol}</div>
          </div>
        </div>

        <Button variant="outline" size="sm" className="gap-2" onClick={() => setInWatchlist(!inWatchlist)}>
          {inWatchlist ? (
            <>
              <StarOff className="h-4 w-4" />
              Remove from Watchlist
            </>
          ) : (
            <>
              <Star className="h-4 w-4" />
              Add to Watchlist
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              ${parseFloat(crypto.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={cn("flex items-center text-sm", parseFloat(crypto.change) >= 0 ? "text-green-500" : "text-red-500")}>
              {parseFloat(crypto.change) >= 0 ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
              {Math.abs(parseFloat(crypto.change))}% (24h)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Market Cap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              ${(parseFloat(crypto.marketCap) / 1000000000).toFixed(1)}B
            </div>
            <div className="text-sm text-muted-foreground">Rank #{crypto.rank}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Volume (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              ${(parseFloat(crypto["24hVolume"]) / 1000000000).toFixed(1)}B
            </div>
            <div className="text-sm text-muted-foreground">
              {((parseFloat(crypto["24hVolume"]) / parseFloat(crypto.marketCap)) * 100).toFixed(2)}% of market cap
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-center">
          <CardContent className="pt-6">
            <Button 
              className="w-full group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25 dark:hover:shadow-[#F3C623]/25"
              size="lg"
              onClick={() => setRbOpen(true)}
            >
              <span className="relative z-10 transition-colors duration-300 group-hover:text-white dark:group-hover:text-black">
                Add to Auto-Pilot
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 dark:from-[#F3C623] dark:to-[#F3C623]/80 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Automate your investment strategy
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Rule Builder Modal prefilled with this coin */}
      <RuleBuilderModal
        open={rbOpen}
        onOpenChange={setRbOpen}
        initialCoins={[id]}
        availableCoins={[{ id, symbol: crypto.symbol, name: crypto.name, iconUrl: (crypto as any).iconUrl || (crypto as any).icon || (crypto as any).image } as CoinOption]}
        onPreview={(rule) => {
          toast({ title: "Preview", description: describeRule({ ...rule, coins: rule.coins?.length ? rule.coins : [id], strategy: rule.strategy }) })
        }}
        onSave={async (rule) => {
          try {
            const type = rule.strategy === 'DCA' ? 'dca' : rule.strategy === 'REBALANCE' ? 'rebalance' : 'rotate'
            const payload = {
              ownerAddress: address || "0x0000000000000000000000000000000000000000",
              type,
              targets: Array.isArray(rule.coins) && rule.coins.length ? rule.coins : [id],
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
              status: 'active',
            }
            await createRule(payload)
            toast({ title: "Rule saved", description: describeRule({ ...rule, coins: payload.targets }) })
          } catch (e) {
            console.error(e)
            toast({ title: "Failed to save rule", description: "Please try again.", variant: "destructive" as any })
          } finally {
            setRbOpen(false)
          }
        }}
      />

      <Tabs defaultValue="overview" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="historical">Historical Data</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Price Chart</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(TIME_RANGES) as Array<keyof typeof TIME_RANGES>).map((range) => (
                    <Button
                      key={range}
                      variant={timeRange === range ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeRange(range)}
                    >
                      {range}
                    </Button>
                  ))}
                </div>
              </div>
              <CardDescription className="flex items-center">
                <span className={cn(priceChangePercentage >= 0 ? "text-green-500" : "text-red-500")}>
                  {priceChangePercentage >= 0 ? "+" : ""}
                  {priceChangePercentage.toFixed(2)}%
                </span>
                <span className="mx-2">in the last {timeRange}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ChartContainer
                  config={{
                    price: {
                      label: "Price",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDate} 
                        minTickGap={30} 
                        domain={['auto', 'auto']}
                      />
                      <YAxis 
                        domain={['auto', 'auto']} 
                        tickFormatter={(value) => `$${value.toLocaleString()}`} 
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="hsl(var(--chart-1))"
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Supply Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Circulating Supply</span>
                    <span className="font-medium">
                      {parseFloat(crypto.supply?.circulating || '0').toLocaleString()} {crypto.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Supply</span>
                    <span className="font-medium">
                      {parseFloat(crypto.supply?.total || '0').toLocaleString()} {crypto.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Supply</span>
                    <span className="font-medium">
                      {parseFloat(crypto.supply?.max || '0').toLocaleString()} {crypto.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">% of Max Supply Issued</span>
                    <span className="font-medium">
                      {crypto.supply?.max 
                        ? ((parseFloat(crypto.supply.circulating) / parseFloat(crypto.supply.max)) * 100).toFixed(2)
                        : "N/A"}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Price Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">All Time High</span>
                    <div className="text-right">
                      <div className="font-medium">${parseFloat(crypto.allTimeHigh?.price || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="text-sm text-muted-foreground">{crypto.allTimeHigh?.timestamp ? formatDate(crypto.allTimeHigh.timestamp) : "N/A"}</div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price Change (24h)</span>
                    <span className={cn("font-medium", parseFloat(crypto.change) >= 0 ? "text-green-500" : "text-red-500")}>
                      {parseFloat(crypto.change) >= 0 ? "+" : ""}{parseFloat(crypto.change)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trading Volume (24h)</span>
                    <span className="font-medium">${(parseFloat(crypto["24hVolume"]) / 1000000000).toFixed(2)}B</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market Cap Rank</span>
                    <span className="font-medium">#{crypto.rank}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="markets">
          <Card>
            <CardHeader>
              <CardTitle>Markets</CardTitle>
              <CardDescription>
                {crypto.name} is traded on multiple exchanges with a total 24h volume of $
                {(parseFloat(crypto["24hVolume"]) / 1000000000).toFixed(1)}B
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                <p>Detailed market data for {crypto.name} is not available in the API.</p>
                <p className="mt-2">Consider checking cryptocurrency exchanges for real-time market information.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historical">
          <Card>
            <CardHeader>
              <CardTitle>Historical Data</CardTitle>
              <CardDescription>Price history for {crypto.name}</CardDescription>
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
                  {chartData.slice(0, 10).map((day: { date: number; price: number }, index: number) => (
                    <TableRow key={day.date}>
                      <TableCell>{formatDate(day.date)}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${day.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {index < chartData.length - 1 ? (
                          <span
                            className={cn(
                              day.price >= chartData[index + 1].price ? "text-green-500" : "text-red-500"
                            )}
                          >
                            {day.price >= chartData[index + 1].price ? "+" : ""}
                            {(((day.price - chartData[index + 1].price) / chartData[index + 1].price) * 100).toFixed(2)}%
                          </span>
                        ) : (
                          "—"
                        )}
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
            <CardHeader>
              <CardTitle>About {crypto.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Description</h3>
                <div 
                  className="text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: crypto.description || 'No description available.' }}
                />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Links</h3>
                <div className="grid gap-2">
                  {crypto.websiteUrl && (
                    <Link
                      href={crypto.websiteUrl}
                      className="flex items-center gap-2 text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                    </Link>
                  )}
                  
                  {/* Add other links from API if available */}
                  {crypto.links?.map((link: { url: string; type?: string; name?: string }, index: number) => (
                    <Link
                      key={index}
                      href={link.url}
                      className="flex items-center gap-2 text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {link.type || link.name || 'Resource'}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Social media links if available */}
              {crypto.socials && crypto.socials.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Social Media</h3>
                  <div className="grid gap-2">
                    {crypto.socials.map((social: { url: string; type: string }, index: number) => (
                      <Link
                        key={index}
                        href={social.url}
                        className="flex items-center gap-2 text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {socialIcons[social.type.toLowerCase() as keyof typeof socialIcons] || <LinkIcon className="h-4 w-4" />}
                        {social.type}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Debug panel - only shown in development
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded border text-xs">
          <details>
            <summary className="cursor-pointer font-medium">Debug Crypto Details Response</summary>
            <pre className="mt-2 p-2 bg-black text-green-400 overflow-auto max-h-[400px]">
              {JSON.stringify(crypto, null, 2) || "No data yet"}
            </pre>
          </details>
        </div>
      )} */}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-24" />
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div>
            <Skeleton className="h-6 w-40 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div>
        <Skeleton className="h-10 w-64 mb-4" />
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-8 w-64" />
            </div>
            <Skeleton className="h-4 w-40 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

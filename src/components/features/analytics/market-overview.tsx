"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDown, ArrowUp, DollarSign, BarChart3, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGetStatsQuery } from "@/app/services/cryptoApi"
import { Skeleton } from "@/components/ui/skeleton"

export function MarketOverview() {
  const { data: stats, isFetching, error } = useGetStatsQuery({});
  
  // For debugging
  console.log('Stats API Response:', stats);
  console.log('Stats Loading:', isFetching);
  console.log('Stats Error:', error);

  const isLoading = isFetching || !stats;

  // Format large numbers
  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    return value.toFixed(2);
  };

  return (
    <section className="mb-8 sm:mb-10">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 sm:mb-6">Market Overview</h2>
      
      {error ? (
        <div className="text-center p-6 text-red-500">
          Error loading market data. Please try again later.
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Total Market Cap"
            value={`$${formatMarketCap(stats.totalMarketCap)}`}
            change={parseFloat(stats.marketCapChange) || 0}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <StatsCard
            title="24h Volume"
            value={`$${formatMarketCap(stats.total24hVolume)}`}
            change={parseFloat(stats.volume24hChange) || 0}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <StatsCard
            title="BTC Dominance"
            value={`${parseFloat(stats.btcDominance).toFixed(2)}%`}
            change={parseFloat(stats.btcDominanceChange) || 0}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>
      )}
      
      {/* {/* {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded border text-xs">
          <details>
            <summary className="cursor-pointer font-medium">Debug Stats API Response</summary>
            <pre className="mt-2 p-2 bg-black text-green-400 overflow-auto">
              {JSON.stringify(stats, null, 2)}
            </pre>
          </details>
        </div> 
      )}*/}
    </section>
  )
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-28 mb-2" />
        <div className="flex items-center">
          <Skeleton className="h-4 w-16 mr-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsCardProps {
  title: string
  value: string
  change: number
  icon: React.ReactNode
}

function StatsCard({ title, value, change, icon }: StatsCardProps) {
  const isPositive = change >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 p-1 text-primary flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center mt-1">
          <div className={cn("flex items-center text-xs", isPositive ? "text-green-500" : "text-red-500")}>
            {isPositive ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
            {Math.abs(change).toFixed(2)}%
          </div>
          <CardDescription className="ml-2 text-xs">from last 24h</CardDescription>
        </div>
      </CardContent>
    </Card>
  )
}

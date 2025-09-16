"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronRight, Globe, ExternalLink } from "lucide-react"
import { useGetExchangeDetailsQuery } from "@/app/services/exchangeApi"
import { Skeleton } from "@/components/ui/skeleton"

export function ExchangeDetail({ id }: { id: string }) {
  const { data: exchange, isLoading, error } = useGetExchangeDetailsQuery(id);
  
  console.log('Exchange details:', exchange);

  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  if (error || !exchange) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Exchange Data</h2>
        <p className="text-muted-foreground mb-6">We couldn't retrieve data for this exchange.</p>
        <Button asChild>
          <Link href="/exchanges">Back to All Exchanges</Link>
        </Button>
      </div>
    );
  }

  // Extract social media links if available
  const socials = {
    twitter: exchange.twitter_handle ? `https://twitter.com/${exchange.twitter_handle}` : null,
    facebook: exchange.facebook_url,
    telegram: null, // CoinGecko doesn't provide Telegram links
    reddit: exchange.reddit_url,
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/exchanges" className="hover:text-primary">
          Exchanges
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{exchange.name}</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div className="flex items-center gap-4">
          {exchange.image ? (
            <Image 
              src={exchange.image}
              alt={exchange.name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover" 
            />
          ) : (
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-lg">
              {exchange.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{exchange.name}</h1>
            <div className="text-muted-foreground">
              {exchange.year_established ? `Established ${exchange.year_established}` : 'Cryptocurrency Exchange'}
            </div>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href={exchange.url} target="_blank" rel="noopener noreferrer">
            <Globe className="h-4 w-4" />
            Visit Exchange
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Trust Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{exchange.trust_score}/10</div>
            <div className="text-sm text-muted-foreground">
              {exchange.trust_score >= 8 ? 'Highly trusted' : 
                exchange.trust_score >= 6 ? 'Trusted' : 'Average trust'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">24h Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              ${(exchange.trade_volume_24h_btc * 28000 / 1000000000).toFixed(1)}B
            </div>
            <div className="text-sm text-muted-foreground">In Bitcoin equivalent volume</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{exchange.country || 'Global'}</div>
            <div className="text-sm text-muted-foreground">
              {exchange.year_established 
                ? `Operating since ${exchange.year_established}` 
                : 'Cryptocurrency exchange'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="markets">Top Markets</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Exchange Overview</CardTitle>
              <CardDescription>Key information about {exchange.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                {exchange.description || `${exchange.name} is a cryptocurrency exchange based in ${exchange.country || 'multiple countries'}.`}
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Key Statistics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">24h Trading Volume</span>
                      <span className="font-medium">
                        ${(exchange.trade_volume_24h_btc * 28000 / 1000000000).toFixed(1)}B
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trust Rank</span>
                      <span className="font-medium">#{exchange.trust_score_rank}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Year Established</span>
                      <span className="font-medium">{exchange.year_established || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Country</span>
                      <span className="font-medium">{exchange.country || 'Global'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Features</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Has Trading Incentives</span>
                      <span className="font-medium">{exchange.has_trading_incentive ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Centralized</span>
                      <span className="font-medium">{exchange.centralized ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trust Score Rank</span>
                      <span className="font-medium">#{exchange.trust_score_rank}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="markets">
          <Card>
            <CardHeader>
              <CardTitle>Top Markets</CardTitle>
              <CardDescription>Most active trading pairs on {exchange.name} by 24h volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                <p>Detailed market data for {exchange.name} is not available in the free API.</p>
                <p className="mt-2">Consider checking the exchange's official website for real-time market information.</p>
                <Button className="mt-4" asChild variant="outline">
                  <Link href={exchange.url} target="_blank" rel="noopener noreferrer">
                    Visit {exchange.name}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>About {exchange.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">
                  {exchange.description || `${exchange.name} is a cryptocurrency exchange based in ${exchange.country || 'multiple countries'}.`}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Links</h3>
                <div className="grid gap-2">
                  <Link
                    href={exchange.url}
                    className="flex items-center gap-2 text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="h-4 w-4" />
                    Official Website
                  </Link>
                  {Object.entries(socials).map(([platform, url]) => (
                    url && (
                      <Link
                        key={platform}
                        href={url}
                        className="flex items-center gap-2 text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </Link>
                    )
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Debug panel - only in development */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded border text-xs">
          <details>
            <summary className="cursor-pointer font-medium">Debug API Response</summary>
            <pre className="mt-2 p-2 bg-black text-green-400 overflow-auto max-h-[400px]">
              {JSON.stringify(exchange, null, 2) || "No data yet"}
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
      
      <Skeleton className="h-10 w-64" />
    </div>
  );
}

"use client"

import { useState } from "react"
import Link from "next/link"

// Define interfaces for the API response and component data
interface ApiCoin {
  uuid?: string;
  id?: string;
  rank: string;
  name: string;
  symbol: string;
  price: string;
  change: string;
  marketCap: string;
  '24hVolume'?: string;
  sparkline?: string[];
}

type RiskLevel = "Low" | "Medium" | "High";

interface Cryptocurrency {
  id: string;
  rank: number;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  sparkline: number[];
  riskLevel: RiskLevel;
}
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDown, ArrowUp, ChevronRight, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGetCryptosQuery } from "@/app/services/cryptoApi"
import { Skeleton } from "@/components/ui/skeleton"

// Risk Level Analyzer Function (same as in cryptocurrencies-list)
const calculateRiskLevel = (crypto: Omit<Cryptocurrency, 'riskLevel'>): RiskLevel => {
  // Calculate volatility based on price changes (using 24h change for top cryptos)
  const volatility = Math.abs(crypto.change24h) * 3; // Multiply by 3 to estimate total volatility
  
  // Market cap categories (in billions)
  const marketCapBillion = crypto.marketCap / 1000000000;
  
  // Volume to market cap ratio (liquidity indicator)
  const liquidityRatio = crypto.volume24h / crypto.marketCap;
  
  let riskScore = 0;
  
  // Volatility scoring (0-40 points)
  if (volatility > 50) riskScore += 40;
  else if (volatility > 20) riskScore += 25;
  else if (volatility > 10) riskScore += 15;
  else riskScore += 5;
  
  // Market cap scoring (0-30 points) - larger market cap = lower risk
  if (marketCapBillion < 1) riskScore += 30;
  else if (marketCapBillion < 10) riskScore += 20;
  else if (marketCapBillion < 50) riskScore += 10;
  else riskScore += 5;
  
  // Liquidity scoring (0-30 points) - higher liquidity = lower risk
  if (liquidityRatio < 0.01) riskScore += 30;
  else if (liquidityRatio < 0.05) riskScore += 20;
  else if (liquidityRatio < 0.1) riskScore += 10;
  else riskScore += 5;
  
  // Determine risk level based on total score
  if (riskScore <= 30) return "Low";
  else if (riskScore <= 60) return "Medium";
  else return "High";
};

// Risk level badge component
const RiskBadge = ({ risk, size = "sm" }: { risk: RiskLevel; size?: "sm" | "xs" }) => {
  const getBadgeProps = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case "Low":
        return {
          className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-700",
          emoji: "🟢"
        };
      case "Medium":
        return {
          className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
          emoji: "🟡"
        };
      case "High":
        return {
          className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-700",
          emoji: "🔴"
        };
    }
  };

  const { className, emoji } = getBadgeProps(risk);
  const sizeClass = size === "xs" ? "text-xs px-1.5 py-0.5" : "";

  return (
    <Badge className={cn(className, sizeClass)}>
      <span className="mr-1">{emoji}</span>
      {risk}
    </Badge>
  );
};

export function TopCryptocurrencies() {
  const [view, setView] = useState<"table" | "cards">("table")
  const { data: cryptosList, isFetching, error } = useGetCryptosQuery(6); // Fetch top 5 cryptocurrencies
  
  // Add these debug logs
  console.log('API Response:', cryptosList);
  console.log('Loading state:', isFetching);
  console.log('Error:', error);
  
  const isLoading = isFetching || !cryptosList;

  return (
    <section className="mb-8 sm:mb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Top Cryptocurrencies</h2>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>
            Table
          </Button>
          <Button variant={view === "cards" ? "default" : "outline"} size="sm" onClick={() => setView("cards")}>
            Cards
          </Button>
        </div>
      </div>

      {error ? (
        <div className="text-center p-6 text-red-500 dark:text-[#F3C623]">
          Error loading cryptocurrency data. Please try again later.
        </div>
      ) : isLoading ? (
        <LoadingSkeleton view={view} />
      ) : (
        <>
          {view === "table" ? (
            <CryptoTable cryptos={mapApiDataToCryptos(cryptosList.coins)} />
          ) : (
            <CryptoCards cryptos={mapApiDataToCryptos(cryptosList.coins)} />
          )}
        </>
      )}

      <div className="mt-6 text-center">
        <Button asChild variant="outline" className="hover:border-[red-600]/50 hover:text-[red-600] dark:hover:border-[#F3C623]/30 dark:hover:text-[#F3C623]">
          <Link href="/cryptocurrencies">
            View All Cryptocurrencies
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}

// Helper function to map API data to our component's expected format
function mapApiDataToCryptos(apiCoins: ApiCoin[]): Cryptocurrency[] {
  return apiCoins?.map(coin => {
    const cryptoData = {
      id: coin.uuid || coin.id || '',
      rank: parseInt(coin.rank),
      name: coin.name,
      symbol: coin.symbol,
      price: parseFloat(coin.price),
      // Ensure change24h is correctly formatted
      change24h: parseFloat(coin.change),
      marketCap: parseInt(coin.marketCap),
      volume24h: parseInt(coin['24hVolume'] || '0'),
      sparkline: coin.sparkline?.map((price: string) => parseFloat(price)) || [],
    };

    // Calculate risk level
    const riskLevel = calculateRiskLevel(cryptoData);

    return {
      ...cryptoData,
      riskLevel,
    };
  }) || [];
}

function LoadingSkeleton({ view }: { view: "table" | "cards" }) {
  return view === "table" ? (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Rank</TableHead>
              <TableHead className="min-w-[120px]">Name</TableHead>
              <TableHead className="text-right min-w-[80px]">Price</TableHead>
              <TableHead className="text-right min-w-[70px]">24h %</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Market Cap</TableHead>
              <TableHead className="text-right hidden xl:table-cell">Volume (24h)</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-full mr-2 sm:mr-3" />
                    <div>
                      <Skeleton className="h-4 w-16 sm:w-20 mb-1" />
                      <Skeleton className="h-3 w-8 sm:w-10" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-12 sm:w-16 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-10 sm:w-12 ml-auto" /></TableCell>
                <TableCell className="text-right hidden lg:table-cell"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell className="text-right hidden xl:table-cell"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell className="text-center hidden sm:table-cell"><Skeleton className="h-5 w-14 mx-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  ) : (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <Skeleton className="h-8 w-8 rounded-full mr-3" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </div>
              <Skeleton className="h-4 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end">
              <div>
                <Skeleton className="h-6 w-24 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
          <div>
            <Skeleton className="h-4 w-16" />
          </div>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
          </CardContent>
        </Card>
      ))}

    </div>
  );
}

function CryptoTable({ cryptos }: { cryptos: Cryptocurrency[] }) {
  return (
    <div className="rounded-md border border-gray-200/20 bg-gradient-to-br from-white to-[red-600]/5 dark:from-neutral-900 dark:to-[#F3C623]/5 dark:border-[#F3C623]/10 hover:shadow-[red-600]/10 dark:hover:shadow-[#F3C623]/20 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-[red-600]/10 dark:bg-[#F3C623]/10">
            <TableRow>
              <TableHead className="w-[60px] text-[red-600]/80 dark:text-[#F3C623]/80 text-xs sm:text-sm">Rank</TableHead>
              <TableHead className="text-[red-600]/80 dark:text-[#F3C623]/80 text-xs sm:text-sm min-w-[120px]">Name</TableHead>
              <TableHead className="text-right text-[red-600]/80 dark:text-[#F3C623]/80 text-xs sm:text-sm min-w-[80px]">Price</TableHead>
              <TableHead className="text-right text-[red-600]/80 dark:text-[#F3C623]/80 text-xs sm:text-sm min-w-[70px]">24h %</TableHead>
              <TableHead className="text-right hidden lg:table-cell text-[red-600]/80 dark:text-[#F3C623]/80 text-xs sm:text-sm">Market Cap</TableHead>
              <TableHead className="text-right hidden xl:table-cell text-[red-600]/80 dark:text-[#F3C623]/80 text-xs sm:text-sm">Volume (24h)</TableHead>
              <TableHead className="text-center text-[red-600]/80 dark:text-[#F3C623]/80 text-xs sm:text-sm hidden sm:table-cell">
                <Shield className="inline mr-1 h-3 w-3" />
                Risk
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-[red-600]/[0.02] dark:bg-[#F3C623]/[0.01]">
            {cryptos.map((crypto) => (
              <TableRow key={crypto.id} className="hover:bg-[red-600]/5 dark:hover:bg-[#F3C623]/5 border-b border-[red-600]/5 dark:border-[#F3C623]/5 last:border-0">
                <TableCell className="font-medium text-xs sm:text-sm">{crypto.rank}</TableCell>
                <TableCell className="min-w-[120px]">
                  <Link
                    href={`/cryptocurrencies/${crypto.id}`}
                    className="flex items-center hover:text-[red-600] dark:hover:text-[#F3C623] transition-colors"
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[red-600]/10 dark:bg-[#F3C623]/10 rounded-full mr-2 sm:mr-3 flex items-center justify-center text-xs font-mono text-[red-600] dark:text-[#F3C623]">
                      {crypto.symbol.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium text-xs sm:text-sm">{crypto.name}</div>
                      <div className="text-xs text-[red-600]/60 dark:text-[#F3C623]/60">{crypto.symbol}</div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono text-xs sm:text-sm">
                  ${crypto.price >= 1 
                    ? crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : crypto.price.toFixed(6)
                  }
                </TableCell>
                <TableCell className={cn(
                  "text-right text-xs sm:text-sm", 
                  crypto.change24h >= 0 
                    ? "text-green-500 dark:text-[#F3C623]" 
                    : "text-red-500"
                )}>
                  <div className="flex items-center justify-end">
                    {crypto.change24h >= 0 ? (
                      <ArrowUp className="mr-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(crypto.change24h).toFixed(1)}%
                  </div>
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell text-xs sm:text-sm">
                  ${(crypto.marketCap / 1000000000).toFixed(1)}B
                </TableCell>
                <TableCell className="text-right hidden xl:table-cell text-xs sm:text-sm">
                  ${(crypto.volume24h / 1000000000).toFixed(1)}B
                </TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  <RiskBadge risk={crypto.riskLevel} size="xs" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function CryptoCards({ cryptos }: { cryptos: Cryptocurrency[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cryptos.map((crypto) => (
        <Link key={crypto.id} href={`/cryptocurrencies/${crypto.id}`}>
          <Card className="overflow-hidden hover:border-[red-600]/50 dark:hover:border-[#F3C623]/30 hover:shadow-md hover:shadow-[red-600]/10 dark:hover:shadow-[#F3C623]/15 transition-all">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-[red-600]/10 dark:bg-[#F3C623]/10 rounded-full mr-3 flex items-center justify-center text-xs font-mono text-[red-600] dark:text-[#F3C623]">
                    {crypto.symbol.substring(0, 3)}
                  </div>
                  <div>
                    <CardTitle className="text-[red-600] dark:text-[#F3C623]">{crypto.name}</CardTitle>
                    <CardDescription className="text-[red-600]/60 dark:text-[#F3C623]/60">{crypto.symbol}</CardDescription>
                  </div>
                </div>
                <div className="text-sm font-medium text-[red-600] dark:text-[#F3C623]">#{crypto.rank}</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-bold font-mono">
                    ${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div
                    className={cn(
                      "flex items-center text-sm",
                      crypto.change24h >= 0 ? "text-green-500 dark:text-[#F3C623]" : "text-red-500",
                    )}
                  >
                    {crypto.change24h >= 0 ? (
                      <ArrowUp className="mr-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(crypto.change24h)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-[red-600]/80 dark:text-[#F3C623]/80">Market Cap</div>
                  <div className="text-sm text-[red-600]/60 dark:text-[#F3C623]/60">${(crypto.marketCap / 1000000000).toFixed(1)}B</div>
                </div>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <div className="text-xs text-[red-600]/60 dark:text-[#F3C623]/60">Risk Level:</div>
                <RiskBadge risk={crypto.riskLevel} size="xs" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

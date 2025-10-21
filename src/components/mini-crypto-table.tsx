"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import { ArrowDown, ArrowUp, Search, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGetCryptosQuery } from "@/app/services/cryptoApi"
import { Skeleton } from "@/components/ui/skeleton"

type RiskLevel = "Low" | "Medium" | "High"

interface Cryptocurrency {
  id: string
  rank: number
  name: string
  symbol: string
  price: number
  change1h: number
  change24h: number
  marketCap: number
  volume24h: number
  riskLevel: RiskLevel
}

const calculateRiskLevel = (c: Omit<Cryptocurrency, "riskLevel">): RiskLevel => {
  const volatility = Math.abs(c.change1h) + Math.abs(c.change24h)
  const marketCapB = c.marketCap / 1_000_000_000
  const liqRatio = c.volume24h / c.marketCap
  let score = 0
  if (volatility > 30) score += 35
  else if (volatility > 15) score += 20
  else score += 8
  if (marketCapB < 1) score += 30
  else if (marketCapB < 10) score += 18
  else score += 6
  if (liqRatio < 0.02) score += 25
  else if (liqRatio < 0.08) score += 12
  else score += 4
  if (score <= 30) return "Low"
  if (score <= 60) return "Medium"
  return "High"
}

const RiskBadge = ({ risk }: { risk: RiskLevel }) => {
  const styles =
    risk === "Low"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-700"
      : risk === "Medium"
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700"
      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-700"
  const emoji = risk === "Low" ? "🟢" : risk === "Medium" ? "🟡" : "🔴"
  return (
    <Badge className={styles}>
      <span className="mr-1">{emoji}</span>
      {risk}
    </Badge>
  )
}

export function MiniCryptoTable({
  selectedId,
  onSelect,
  onFirstCoinLoaded,
}: {
  selectedId?: string
  onSelect: (id: string) => void
  onFirstCoinLoaded?: (id: string) => void
}) {
  const [search, setSearch] = useState("")
  const [rankFilter, setRankFilter] = useState<string>("all") // all | top10 | top50 | top100
  const [riskFilter, setRiskFilter] = useState<string>("all") // all | Low | Medium | High
  const [sortAsc, setSortAsc] = useState(false) // sort by rank
  const [page, setPage] = useState(1)
  const perPage = 7

  const { data, isFetching, error, refetch } = useGetCryptosQuery(100)

  const coins: Cryptocurrency[] = useMemo(() => {
    const list = (data?.coins || []).map((coin: any) => {
      const base = {
        id: coin.uuid || coin.id || "",
        rank: parseInt(coin.rank),
        name: coin.name,
        symbol: coin.symbol,
        price: parseFloat(coin.price),
        change24h: parseFloat(coin.change),
        change1h: coin.change1h ? parseFloat(coin.change1h) : parseFloat(coin.change) / 24,
        marketCap: parseInt(coin.marketCap),
        volume24h: parseInt(coin["24hVolume"] || "0"),
      }
      return { ...base, riskLevel: calculateRiskLevel(base) }
    }) as Cryptocurrency[]
    return list
  }, [data])

  // Notify first coin to parent when loaded
  useEffect(() => {
    if (!coins.length) return
    if (!selectedId && onFirstCoinLoaded) onFirstCoinLoaded(coins[0].id)
  }, [coins, selectedId, onFirstCoinLoaded])

  const filtered = coins.filter((c) => {
    const matchText = `${c.name} ${c.symbol}`.toLowerCase().includes(search.toLowerCase())
    const matchRisk = riskFilter === "all" || c.riskLevel === (riskFilter as RiskLevel)
    const matchRank =
      rankFilter === "all" ||
      (rankFilter === "top10" && c.rank <= 10) ||
      (rankFilter === "top50" && c.rank <= 50) ||
      (rankFilter === "top100" && c.rank <= 100)
    return matchText && matchRisk && matchRank
  })

  const sorted = [...filtered].sort((a, b) => (sortAsc ? a.rank - b.rank : b.rank - a.rank))

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const slice = sorted.slice((page - 1) * perPage, page * perPage)

  useEffect(() => setPage(1), [search, riskFilter, rankFilter])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search coins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={rankFilter} onValueChange={setRankFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Rank" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="top10">Top 10</SelectItem>
            <SelectItem value="top50">Top 50</SelectItem>
            <SelectItem value="top100">Top 100</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="Low">🟢 Low</SelectItem>
            <SelectItem value="Medium">🟡 Medium</SelectItem>
            <SelectItem value="High">🔴 High</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setSortAsc((s) => !s)} title="Toggle sort by rank">
          Rank {sortAsc ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />}
        </Button>
      </div>

  <div className="rounded-md border overflow-hidden">
        {error ? (
          <div className="p-6 text-sm">Failed to load. <Button variant="link" onClick={() => refetch()}>Retry</Button></div>
        ) : isFetching ? (
          <MiniTableSkeleton />
        ) : (
          <div className="overflow-x-auto">
    <Table>
              <TableHeader>
                <TableRow>
      <TableHead className="w-[64px]">Rank</TableHead>
      <TableHead>Name</TableHead>
      <TableHead className="text-right">1h%</TableHead>
      <TableHead className="text-right">24h%</TableHead>
      <TableHead className="text-center"><Shield className="inline h-3 w-3 mr-1" />Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.map((c) => (
      <TableRow
                    key={c.id}
                    onClick={() => onSelect(c.id)}
        className={cn("cursor-pointer hover:bg-muted/50 dark:hover:bg-[#F3C623]/10", selectedId === c.id && "bg-muted/70 dark:bg-[#F3C623]/10")}
                  >
        <TableCell className="font-medium py-2">{c.rank}</TableCell>
        <TableCell className="py-2">
                      <div className="flex items-center">
                        <div className="w-7 h-7 bg-[red-600]/10 dark:bg-[#F3C623]/10 rounded-full mr-2 flex items-center justify-center text-[10px] font-mono text-[red-600] dark:text-[#F3C623]">
                          {c.symbol.substring(0, 3)}
                        </div>
                        <div>
                          <div className="font-medium leading-tight">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.symbol}</div>
                        </div>
                      </div>
                    </TableCell>
        <TableCell className={cn("text-right py-2", c.change1h >= 0 ? "text-green-500 dark:text-[#F3C623]" : "text-red-500")}> 
                      <div className="flex items-center justify-end">{c.change1h >= 0 ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}{Math.abs(c.change1h).toFixed(2)}%</div>
                    </TableCell>
        <TableCell className={cn("text-right py-2", c.change24h >= 0 ? "text-green-500 dark:text-[#F3C623]" : "text-red-500")}> 
                      <div className="flex items-center justify-end">{c.change24h >= 0 ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}{Math.abs(c.change24h).toFixed(2)}%</div>
                    </TableCell>
        <TableCell className="text-center py-2"><RiskBadge risk={c.riskLevel} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)) }} className={page === 1 ? "pointer-events-none opacity-50" : ""} />
          </PaginationItem>
          {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
            const pageNumber = Math.min(Math.max(1, page - 2), Math.max(1, totalPages - 4)) + i
            if (pageNumber > totalPages) return null
            return (
              <PaginationItem key={pageNumber}>
                <PaginationLink href="#" isActive={pageNumber === page} onClick={(e) => { e.preventDefault(); setPage(pageNumber) }}>{pageNumber}</PaginationLink>
              </PaginationItem>
            )
          })}
          <PaginationItem>
            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)) }} className={page === totalPages ? "pointer-events-none opacity-50" : ""} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

function MiniTableSkeleton() {
  return (
    <div className="p-3">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-4 w-6" />
          <div className="flex-1 flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-12 ml-auto" />
          <Skeleton className="h-4 w-12 ml-auto" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

export default MiniCryptoTable

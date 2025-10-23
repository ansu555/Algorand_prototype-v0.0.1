"use client"

import Link from "next/link"
import BackgroundPaths from "@/components/shared/animated-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { useMemo, useState } from "react"

type Pool = {
  id: string
  token0: string
  token1: string
  feeTier: number // 0.003 for 0.3%
  tvlUSD?: number
  volume24hUSD?: number
  myPosition?: boolean
  fees24hUSD?: number
  currentPrice?: number // price of token0 in terms of token1
}

const mockPools: Pool[] = [
  { id: "1", token0: "ALGO", token1: "USDC", feeTier: 0.003, tvlUSD: 125000, volume24hUSD: 21000, fees24hUSD: 63, currentPrice: 0.145, myPosition: true },
  { id: "2", token0: "ALGO", token1: "USDC", feeTier: 0.001, tvlUSD: 88000, volume24hUSD: 9200, fees24hUSD: 8.8, currentPrice: 0.145 },
  { id: "3", token0: "ALGO", token1: "USDC", feeTier: 0.01, tvlUSD: 157000, volume24hUSD: 34000, fees24hUSD: 340, currentPrice: 0.145 },
]

export default function PoolPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [tab, setTab] = useState("all")
  const [sortBy, setSortBy] = useState("tvl_desc")

  const pools = useMemo(() => {
    let filtered = mockPools
    if (tab === "mine") filtered = filtered.filter((p) => p.myPosition)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter((p) => `${p.token0}/${p.token1}`.toLowerCase().includes(q))
    }
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "fee_asc":
          return a.feeTier - b.feeTier
        case "fee_desc":
          return b.feeTier - a.feeTier
        case "tvl_desc":
          return (b.tvlUSD ?? 0) - (a.tvlUSD ?? 0)
        case "vol_desc":
          return (b.volume24hUSD ?? 0) - (a.volume24hUSD ?? 0)
        default:
          return 0
      }
    })
    return sorted
  }, [searchQuery, tab, sortBy])

  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundPaths />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Liquidity Pools</h1>
              <p className="text-sm text-muted-foreground mt-1">Discover, search, and manage pools. Add or remove liquidity to earn fees.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pools or tokens"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 bg-white dark:bg-[#171717] border-2 focus-visible:ring-red-600 dark:focus-visible:ring-[#F3C623]"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tvl_desc">TVL: High → Low</SelectItem>
                  <SelectItem value="vol_desc">24h Vol: High → Low</SelectItem>
                  <SelectItem value="fee_desc">Fee: High → Low</SelectItem>
                  <SelectItem value="fee_asc">Fee: Low → High</SelectItem>
                </SelectContent>
              </Select>
              <Button asChild className="whitespace-nowrap">
                <Link href="/pool/create">Create Position</Link>
              </Button>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Pools</TabsTrigger>
              <TabsTrigger value="mine">My Positions</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <PoolTable pools={pools} />
            </TabsContent>
            <TabsContent value="mine" className="mt-4">
              <PoolTable pools={pools} emptyLabel="No positions yet." />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

function PoolTable({ pools, emptyLabel = "No pools found." }: { pools: Pool[]; emptyLabel?: string }) {
  if (!pools.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-10">{emptyLabel}</div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200/40 dark:border-[#F3C623]/20">
      <table className="w-full text-sm">
        <thead className="bg-red-50/60 dark:bg-[#F3C623]/10">
          <tr className="text-left">
            <th className="px-4 py-3 font-medium text-gray-700 dark:text-[#F3C623]">Pool</th>
            <th className="px-4 py-3 font-medium text-gray-700 dark:text-[#F3C623]">Yield/TVL</th>
            <th className="px-4 py-3 font-medium text-gray-700 dark:text-[#F3C623]">Volume 24h</th>
            <th className="px-4 py-3 font-medium text-gray-700 dark:text-[#F3C623]">TVL</th>
            <th className="px-4 py-3 font-medium text-gray-700 dark:text-[#F3C623]">Fees 24H</th>
            <th className="px-4 py-3 font-medium text-gray-700 dark:text-[#F3C623]">Current price</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((p) => (
            <tr key={p.id} className="border-t border-gray-200/40 dark:border-[#F3C623]/10">
              <td className="px-4 py-3 font-semibold">
                <Link href={`/pool/${p.token0}-${p.token1}?fee=${p.feeTier}`} className="hover:underline">
                  {p.token0}/{p.token1}
                </Link>
              </td>
              <td className="px-4 py-3">{formatYield(p)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatUSD(p.volume24hUSD)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatUSD(p.tvlUSD)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatUSD(p.fees24hUSD)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatPrice(p)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatUSD(v?: number) {
  if (v == null) return "$—"
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
  } catch {
    return "$—"
  }
}

function formatYield(p: Pool) {
  if (p.tvlUSD && p.tvlUSD > 0 && p.fees24hUSD != null) {
    const y = (p.fees24hUSD / p.tvlUSD) * 100
    return `${y.toFixed(2)}%`
  }
  return "—"
}

function formatPrice(p: Pool) {
  if (p.currentPrice != null) {
    try {
      return `${p.currentPrice.toFixed(4)} ${p.token1}`
    } catch {}
  }
  return "—"
}

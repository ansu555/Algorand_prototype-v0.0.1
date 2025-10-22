"use client"

import BackgroundPaths from "@/components/shared/animated-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useState } from "react"

export default function PoolPage() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundPaths />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto space-y-6">
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
                  className="pl-10 h-10 bg-white dark:bg-[#171717] border-2 focus-visible:ring-primary dark:focus-visible:ring-[#F3C623]"
                />
              </div>
              <Button className="whitespace-nowrap">Create Position</Button>
            </div>
          </div>

          {/* Placeholder content - replace with real pools list when available */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">ALGO/USDC</div>
                  <div className="text-xs text-muted-foreground">Fee: 0.30%</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  TVL: $— • 24h Volume: $—
                </div>
                <Button variant="outline" size="sm" className="w-full">View Pool</Button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

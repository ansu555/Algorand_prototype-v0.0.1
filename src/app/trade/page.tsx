"use client"

import { useState } from "react"
import BackgroundPaths from "@/components/shared/animated-background"
import { SwapCard } from "@/components/features/trading/swap-card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function TradePage() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundPaths />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tokens, pools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 h-10 text-sm bg-white dark:bg-[#171717] border-2 focus-visible:ring-primary dark:focus-visible:ring-[#F3C623]"
            />
          </div>

          {/* Swap Card */}
          <div className="max-w-md mx-auto">
            <SwapCard />
          </div>
        </div>
      </main>
    </div>
  )
}

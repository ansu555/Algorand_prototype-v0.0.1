"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Clock, TrendingUp, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchTab, setSearchTab] = useState<"all" | "tokens" | "pools">("all")
  const searchRef = useRef<HTMLDivElement>(null)

  // Mock data for recent searches and trending tokens
  const recentSearches = [
    { id: 1, name: "USDC/USDT", symbol: "USDC/USDT", badge: "v4", change: "0.001%", address: "0x8aa4...4e47" },
    { id: 2, name: "Ethereum", symbol: "ETH", badge: null, change: null, address: null },
  ]

  const trendingTokens = [
    { id: 1, name: "Ethereum", symbol: "ETH", logo: "🔷", address: null },
    { id: 2, name: "Tether", symbol: "USDT", logo: "💚", address: "0xdAC1...1ec7" },
    { id: 3, name: "USDC", symbol: "USDC", logo: "💙", address: "0xA0b8...eB48" },
  ]

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative max-w-md mx-auto z-[100]" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <Input
          type="text"
          placeholder="Search tokens and pools"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          className="w-full pl-12 pr-14 h-12 text-sm bg-gray-900/5 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 rounded-full focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-[#F3C623] focus-visible:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-gray-200/50 dark:bg-gray-700/50 border border-gray-300/50 dark:border-gray-600/50">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">/</span>
        </div>
      </div>

      {/* Search Dropdown */}
      {searchFocused && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-[9999] overflow-hidden">
          {/* Header with tabs and close button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex gap-3">
              <button
                onClick={() => setSearchTab("all")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  searchTab === "all"
                    ? "text-white dark:text-black bg-gray-900 dark:bg-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                All
              </button>
              <button
                onClick={() => setSearchTab("tokens")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  searchTab === "tokens"
                    ? "text-white dark:text-black bg-gray-900 dark:bg-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                Tokens
              </button>
              <button
                onClick={() => setSearchTab("pools")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  searchTab === "pools"
                    ? "text-white dark:text-black bg-gray-900 dark:bg-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                Pools
              </button>
            </div>
            <button
              onClick={() => setSearchFocused(false)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center"
              aria-label="Close search"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Dropdown Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {/* Recent Searches */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Recent searches</span>
                </div>
                <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {recentSearches.map((item) => (
                  <button
                    key={item.id}
                    className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                      {item.symbol.slice(0, 2)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
                            {item.badge}
                          </span>
                        )}
                        {item.change && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.change}
                          </span>
                        )}
                      </div>
                      {item.address && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.address}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tokens by 24H Volume */}
            <div className="p-4 pt-0">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Tokens by 24H volume</span>
              </div>
              <div className="space-y-2">
                {trendingTokens.map((token) => (
                  <button
                    key={token.id}
                    className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-xl">
                      {token.logo}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {token.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {token.symbol}
                        </span>
                        {token.address && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {token.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

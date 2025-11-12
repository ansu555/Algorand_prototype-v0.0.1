"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Search, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { PoolInfo } from "@/lib/dex/types"
import { useAssetSearch, useTradeableAssets } from "@/hooks/use-tradeable-assets"
import { useRouter } from "next/navigation"

export function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchTab, setSearchTab] = useState<"all" | "tokens" | "pools">("all")
  const searchRef = useRef<HTMLDivElement>(null)
  const [network] = useState<'testnet' | 'mainnet'>('testnet')
  const router = useRouter()

  // Tokens
  const { assets: tradeableAssets, loading: assetsLoading, error: assetsError } = useTradeableAssets()
  const { results: searchedAssets, loading: searchLoading } = useAssetSearch(searchQuery)

  // Pools
  const [pools, setPools] = useState<PoolInfo[]>([])
  const [poolsLoading, setPoolsLoading] = useState(false)
  const [poolsError, setPoolsError] = useState<string | null>(null)

  // Shared pool fetching logic (extracted for reuse)
  const fetchPoolsRef = useRef<() => Promise<void>>()
  
  useEffect(() => {
    const CACHE_KEY = `pools_cache_${network}`
    const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes, keep in sync with server TTL

    const hydrateFromCache = () => {
      try {
        if (typeof window === 'undefined') return false
        const cached = window.localStorage.getItem(CACHE_KEY)
        if (!cached) return false
        const parsed = JSON.parse(cached) as { timestamp: number; pools: any[] }
        if (!parsed?.timestamp || !Array.isArray(parsed.pools)) return false
        if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return false
        const typed: PoolInfo[] = parsed.pools.map((p: any) => ({
          ...p,
          reserve1: BigInt(p.reserve1),
          reserve2: BigInt(p.reserve2),
          totalLiquidity: BigInt(p.totalLiquidity),
        }))
        setPools(typed)
        return true
      } catch {
        return false
      }
    }

    const fetchPools = async () => {
      if (poolsLoading) return // Prevent duplicate requests
      try {
        setPoolsLoading(true)
        setPoolsError(null)
        const res = await fetch(`/api/pools/all?network=${network}`)
        const json = await res.json()
        if (!json.success) throw new Error(json.error || 'Failed to fetch pools')
        // Convert string reserves back to bigint-compatible numbers for typing
        const parsed: PoolInfo[] = json.pools.map((p: any) => ({
          ...p,
          reserve1: BigInt(p.reserve1),
          reserve2: BigInt(p.reserve2),
          totalLiquidity: BigInt(p.totalLiquidity),
        }))
        setPools(parsed)
        // Store lightweight cache in localStorage (keep server-serialized strings)
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(CACHE_KEY, JSON.stringify({
              timestamp: Date.now(),
              pools: json.pools,
            }))
          }
        } catch {}
      } catch (e: any) {
        setPoolsError(e.message || 'Failed to fetch pools')
      } finally {
        setPoolsLoading(false)
      }
    }

    fetchPoolsRef.current = fetchPools
  }, [network, poolsLoading])

  // Fetch or hydrate pools when search opens the first time (with client-side cache)
  useEffect(() => {
    if (!searchFocused || pools.length > 0 || poolsLoading) return
    let cancelled = false
    const CACHE_KEY = `pools_cache_${network}`
    const CACHE_TTL_MS = 5 * 60 * 1000

    const hydrateFromCache = () => {
      try {
        if (typeof window === 'undefined') return false
        const cached = window.localStorage.getItem(CACHE_KEY)
        if (!cached) return false
        const parsed = JSON.parse(cached) as { timestamp: number; pools: any[] }
        if (!parsed?.timestamp || !Array.isArray(parsed.pools)) return false
        if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return false
        const typed: PoolInfo[] = parsed.pools.map((p: any) => ({
          ...p,
          reserve1: BigInt(p.reserve1),
          reserve2: BigInt(p.reserve2),
          totalLiquidity: BigInt(p.totalLiquidity),
        }))
        if (!cancelled) setPools(typed)
        return true
      } catch {
        return false
      }
    }

    // 1) Try cache first
    const hydrated = hydrateFromCache()
    // 2) Fallback to network if no fresh cache
    if (!hydrated && fetchPoolsRef.current) {
      fetchPoolsRef.current()
    }
    return () => {
      cancelled = true
    }
  }, [searchFocused, pools.length, poolsLoading, network])

  // Smart pool fetching: Detect "/" in search query to trigger pool fetch
  useEffect(() => {
    // If user types "/" and pools not loaded, fetch immediately
    if (searchQuery.includes('/') && pools.length === 0 && !poolsLoading) {
      if (fetchPoolsRef.current) {
        fetchPoolsRef.current()
      }
      // Auto-switch to pools tab for better UX
      if (searchTab === 'all' || searchTab === 'tokens') {
        setSearchTab('pools')
      }
    }
  }, [searchQuery, pools.length, poolsLoading, searchTab])

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

  // Keyboard navigation
  const [activeIndex, setActiveIndex] = useState(0)
  const flatResults = useMemo(() => {
    const tokenList = (searchQuery.length >= 2 ? searchedAssets : tradeableAssets) || []
    // Filter tokens client-side for quick feedback too
    const filteredTokens = tokenList.filter((a) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        a.unitName?.toLowerCase().includes(q) ||
        a.name?.toLowerCase().includes(q) ||
        String(a.id).includes(q)
      )
    })

    const filteredPools = pools.filter((p) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const a1 = p.asset1?.symbol || p.asset1?.unitName || String(p.asset1?.id)
      const a2 = p.asset2?.symbol || p.asset2?.unitName || String(p.asset2?.id)
      return (
        `${a1}/${a2}`.toLowerCase().includes(q) ||
        `${a2}/${a1}`.toLowerCase().includes(q) ||
        String(p.poolId).toLowerCase().includes(q)
      )
    })

    const byTab = (tab: typeof searchTab) => {
      if (tab === "tokens") return filteredTokens.map((t) => ({ type: 'token' as const, item: t }))
      if (tab === "pools") return filteredPools.map((p) => ({ type: 'pool' as const, item: p }))
      // all: tokens first, then pools
      return [
        ...filteredTokens.map((t) => ({ type: 'token' as const, item: t })),
        ...filteredPools.map((p) => ({ type: 'pool' as const, item: p })),
      ]
    }

    return byTab(searchTab)
  }, [searchQuery, searchedAssets, tradeableAssets, pools, searchTab])

  useEffect(() => {
    // Reset highlight when tab/query changes
    setActiveIndex(0)
  }, [searchTab, searchQuery])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchFocused) return
    const max = flatResults.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % Math.max(max, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + Math.max(max, 1)) % Math.max(max, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const sel = flatResults[activeIndex]
      if (sel) handleSelect(sel)
    } else if (e.key === 'Escape') {
      setSearchFocused(false)
    }
  }, [flatResults, activeIndex, searchFocused])

  const handleSelect = (entry: { type: 'token' | 'pool'; item: any }) => {
    if (entry.type === 'token') {
      // Navigate to token details page (route can be implemented later)
      const id = entry.item?.id
      if (id != null) router.push(`/token/${id}`)
    } else {
      // Navigate to pool page which already exists at /pool/[id]
      const pid = entry.item?.poolId || entry.item?.id
      if (pid) router.push(`/pool/${pid}`)
    }
    setSearchFocused(false)
  }

  return (
    <div className="relative max-w-md mx-auto z-auto" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <Input
          type="text"
          placeholder="Search tokens and pools"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onKeyDown={handleKeyDown}
          className="flex w-full rounded-md border-input px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 h-12 text-base bg-white dark:bg-[#171717] border-2 focus-visible:ring-red-600 dark:focus-visible:ring-[#F3C623]"
        />
        {/* <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-gray-200/50 dark:bg-gray-700/50 border border-gray-300/50 dark:border-gray-600/50">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">/</span>
        </div> */}
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
          <div className="max-h-[420px] overflow-y-auto">
            {/* Loading / Error states */}
            {(assetsLoading || poolsLoading || searchLoading) && (
              <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading {searchTab === 'pools' ? 'pools' : 'assets'}...</span>
              </div>
            )}
            {(assetsError || poolsError) && (
              <div className="p-4 text-sm text-red-600 dark:text-red-400">
                {assetsError || poolsError}
              </div>
            )}

            {/* Results */}
            {!assetsLoading && !poolsLoading && flatResults.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No results</div>
            )}

            {/* Tokens */}
            {(searchTab === 'all' || searchTab === 'tokens') && (
              <div className="p-4">
                {searchTab === 'all' && (
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Tokens</div>
                )}
                <div className="space-y-1">
                  {flatResults.filter(r => r.type === 'token').map((entry, idx) => {
                    const a = entry.item
                    const isActive = activeIndex === flatResults.findIndex((fr) => fr === entry)
                    return (
                      <button
                        key={`tok-${a.id}`}
                        onMouseEnter={() => setActiveIndex(flatResults.findIndex((fr) => fr === entry))}
                        onClick={() => handleSelect(entry)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                          isActive ? "bg-gray-100 dark:bg-gray-900/60" : "hover:bg-gray-50 dark:hover:bg-gray-900/50"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden flex items-center justify-center text-white font-bold text-xs">
                          {a.unitName?.slice(0, 2) || 'AS'}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{a.unitName || a.name}</span>
                            {a.verified && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-800 rounded">verified</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{a.name} • {a.id}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Pools */}
            {(searchTab === 'all' || searchTab === 'pools') && (
              <div className="p-4 pt-0">
                {searchTab === 'all' && (
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Pools</div>
                )}
                <div className="space-y-1">
                  {flatResults.filter(r => r.type === 'pool').map((entry) => {
                    const p = entry.item as PoolInfo
                    const a1 = p.asset1
                    const a2 = p.asset2
                    const idx = flatResults.findIndex((fr) => fr === entry)
                    const isActive = activeIndex === idx
                    return (
                      <button
                        key={`pool-${p.poolId}`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleSelect(entry)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                          isActive ? "bg-gray-100 dark:bg-gray-900/60" : "hover:bg-gray-50 dark:hover:bg-gray-900/50"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-xs text-white">
                          {/* Empty circle - clean icon */}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{a1.symbol}/{a2.symbol}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800">{p.dexName}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800">{(p.fee/100).toFixed(2)}%</span>
                          </div>
                          {p.poolAddress && (
                            <span className="text-xs text-muted-foreground font-mono">{p.poolAddress.slice(0,6)}...{p.poolAddress.slice(-4)}</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

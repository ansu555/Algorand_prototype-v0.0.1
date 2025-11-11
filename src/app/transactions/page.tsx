"use client"

import { useState, useEffect, useMemo } from "react"
import BackgroundPaths from "@/components/shared/animated-background"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Search, Loader2, ArrowUpDown, Copy, ExternalLink, Check, Activity, Clock, CalendarClock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"

type Transaction = {
  id: string
  createdAt: string
  status: string
  action: string
  txId: string
  ownerAddress: string
  fromAssetId: number
  toAssetId: number
  fromAssetName: string
  toAssetName: string
  fromAssetUnitName: string
  toAssetUnitName: string
  fromAmount: string
  toAmount: string
  slippage: string
  routePath: any[]
  poolAddress?: string
  confirmedRound?: number
}

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("time_desc")
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [stats, setStats] = useState<{ total: number; last1d: number; last30d: number } | null>(null)

  // Fetch real transactions from all users
  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true)
      try {
        const response = await fetch('/api/transactions/all?limit=100')
        if (!response.ok) throw new Error('Failed to fetch transactions')
        
        const json = await response.json()
        if (!json.success) throw new Error(json.error || 'Failed to load transactions')
        
        setTransactions(json.data || [])
        if (json.stats) {
          setStats(json.stats)
        } else {
          // derive on client if not provided
          const now = Date.now()
          const day = 24 * 60 * 60 * 1000
          const total = (json.data || []).length
          const last1d = (json.data || []).filter((t: any) => now - new Date(t.createdAt).getTime() <= day).length
          const last30d = (json.data || []).filter((t: any) => now - new Date(t.createdAt).getTime() <= 30 * day).length
          setStats({ total, last1d, last30d })
        }
        console.log('✅ Loaded', json.data?.length || 0, 'global transactions')
        console.log('🔍 Sample transaction data:', json.data?.[0])
        console.log('🔍 Pool addresses:', json.data?.map((t: any) => ({
          id: t.id,
          poolAddress: t.poolAddress,
          routePath: t.routePath,
          poolId: t.routePath?.[0]?.poolId
        })))
      } catch (error: any) {
        console.error('❌ Error loading transactions:', error)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  // Copy address to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAddress(text)
      setTimeout(() => setCopiedAddress(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter(tx => 
        tx.fromAssetUnitName?.toLowerCase().includes(q) ||
        tx.toAssetUnitName?.toLowerCase().includes(q) ||
        tx.ownerAddress?.toLowerCase().includes(q) ||
        tx.txId?.toLowerCase().includes(q) ||
        tx.poolAddress?.toLowerCase().includes(q)
      )
    }

    // Sort
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "time_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "time_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        default:
          return 0
      }
    })

    return sorted
  }, [transactions, searchQuery, sortBy])

  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundPaths />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-2">
        <div className="w-full space-y-2">
          {/* Search Bar */}
          <div className="w-full flex justify-center">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search transactions, tokens, wallet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base bg-white dark:bg-[#171717] border-2 focus-visible:ring-red-600 dark:focus-visible:ring-[#F3C623]"
                disabled={loading}
              />
            </div>
          </div>

          {/* Header and Filters */}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
              <p className="text-sm text-muted-foreground">
                View all swap transactions across the platform globally.
              </p>
              {/* {!loading && (
                <p className="text-xs text-muted-foreground">
                  {filteredTransactions.length} transactions
                </p>
              )} */}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy} disabled={loading}>
                <SelectTrigger className="w-[140px] sm:w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_desc">Time: New → Old</SelectItem>
                  <SelectItem value="time_asc">Time: Old → New</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Total Transactions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold font-mono">{stats?.total ?? 0}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">All-time on this site</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base sm:text-lg">1D Transactions</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold font-mono">{stats?.last1d ?? 0}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Last 24 hours</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base sm:text-lg">30D Transactions</CardTitle>
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold font-mono">{stats?.last30d ?? 0}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Last 30 days</div>
              </CardContent>
            </Card>
          </div>

          {/* Top-of-table summary and note */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span className="ml-auto text-muted-foreground">Note: Testnet - USD value not available</span>
          </div>

          {/* Transactions Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-[#F3C623]" />
              <span className="ml-2 text-sm text-muted-foreground">Loading transactions...</span>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-red-600 dark:text-red-400">
                    <TableHead className="text-left">
                      <div className="flex items-center gap-1">
                        Time
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-left">Type</TableHead>
                    <TableHead className="text-right">Token Amount</TableHead>
                    <TableHead className="text-center">Pool Address</TableHead>
                    <TableHead className="text-right">Wallet</TableHead>
                    <TableHead className="text-center">Explorer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const fromSymbol = tx.fromAssetUnitName || tx.fromAssetName || `#${tx.fromAssetId}`
                      const toSymbol = tx.toAssetUnitName || tx.toAssetName || `#${tx.toAssetId}`
                      
                      // Derive pool address with fallbacks
                      const poolAddr = tx.poolAddress || 
                                      (Array.isArray(tx.routePath) && tx.routePath.length > 0 && tx.routePath[0]?.poolId) || 
                                      (Array.isArray(tx.routePath) && tx.routePath.length > 0 && tx.routePath[0]?.poolAddress) ||
                                      null
                      
                      return (
                        <TableRow key={tx.id} className="hover:bg-muted/30">
                          {/* Time */}
                          <TableCell className="text-left text-muted-foreground text-sm">
                            {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                          </TableCell>

                          {/* Type - with spacing */}
                          <TableCell className="text-left">
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground text-sm">{tx.action ? String(tx.action).toUpperCase().replace(/_/g, ' ') : 'EVENT'}</span>
                              <span className="font-medium">{fromSymbol} → {toSymbol}</span>
                            </div>
                          </TableCell>

                          {/* Token Amount - consolidated */}
                          <TableCell className="text-right font-mono text-sm">
                            <span className="font-medium">
                              {tx.fromAmount || '—'} → {tx.toAmount || '—'}
                            </span>
                          </TableCell>

                          {/* Pool Address - copy icon */}
                          <TableCell className="text-center">
                            {poolAddr ? (
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(String(poolAddr))}
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                  title={`Copy: ${String(poolAddr)}`}
                                >
                                  {copiedAddress === poolAddr ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  )}
                                </Button>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {String(poolAddr).slice(0, 6)}...{String(poolAddr).slice(-6)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Wallet */}
                          <TableCell className="text-center">
                            {tx.ownerAddress ? (
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(tx.ownerAddress)}
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                  title={`Copy: ${tx.ownerAddress}`}
                                >
                                  {copiedAddress === tx.ownerAddress ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  )}
                                </Button>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {tx.ownerAddress.slice(0, 6)}...{tx.ownerAddress.slice(-6)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Explorer Link */}
                          <TableCell className="text-center">
                            {tx.txId ? (
                              <a
                                href={`https://testnet.algoexplorer.io/tx/${tx.txId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                                title="View on AlgoExplorer"
                              >
                                <ExternalLink className="h-4 w-4 text-blue-500 hover:text-blue-600" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

"use client"

import { useState, useEffect, useMemo } from "react"
import BackgroundPaths from "@/components/shared/animated-background"
import { SearchBar } from "@/components/shared/search-bar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowUpDown, Clock, CalendarClock, ExternalLink, Copy, Check, TrendingUp, Activity } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

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
  fromAmountBaseUnits?: number | string
  toAmount: string
  toAmountBaseUnits?: number | string
  slippage: string
  routePath: any[]
  poolAddress?: string
  confirmedRound?: number
  decimals?: number
  fromDecimals?: number
  toDecimals?: number
}

export default function TransactionsPage() {
  const [sortBy, setSortBy] = useState("time_desc")
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [stats, setStats] = useState<{ total: number; last1d: number; last30d: number } | null>(null)
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'swap' | 'send' | 'receive' | 'stake' | 'add_liquidity'
  >('all')
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [loadingPrices, setLoadingPrices] = useState(true)

  // Fetch token prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const coinIdMap: Record<string, string> = {
          ALGO: 'algorand',
          USDC: 'usd-coin',
          USDT: 'tether',
        }
        
        const ids = Object.values(coinIdMap).join(',')
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
        )
        
        if (res.ok) {
          const data = await res.json()
          const priceMap: Record<string, number> = {}
          
          Object.entries(coinIdMap).forEach(([symbol, coinId]) => {
            if (data[coinId]?.usd) {
              priceMap[symbol] = data[coinId].usd
            }
          })
          
          setPrices(priceMap)
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error)
      } finally {
        setLoadingPrices(false)
      }
    }
    
    fetchPrices()
    const interval = setInterval(fetchPrices, 60000)
    return () => clearInterval(interval)
  }, [])

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

  // Calculate analytics with token-to-ALGO conversion
  const analytics = useMemo(() => {
    if (!transactions.length || loadingPrices || !prices.ALGO) {
      return {
        totalVolumeALGO: 0,
        totalTransactions: 0,
        volumeChart: [],
        avgTransactionSize: 0
      }
    }

    let totalVolumeALGO = 0
    const volumeByDate: Record<string, number> = {}

    transactions.forEach(tx => {
      // Convert transaction amount to ALGO
      let algoEquivalent = 0
      
      // Get the "from" asset details
      const fromSymbol = (tx.fromAssetUnitName || tx.fromAssetName || '').toUpperCase()
      
      // Calculate amount
      let amount = 0
      if (tx.fromAmountBaseUnits != null && tx.fromDecimals != null) {
        amount = Number(tx.fromAmountBaseUnits) / Math.pow(10, tx.fromDecimals)
      } else if (tx.fromAmount != null) {
        amount = Number(tx.fromAmount)
      }

      // Convert to ALGO equivalent
      if (fromSymbol === 'ALGO') {
        algoEquivalent = amount
      } else if (fromSymbol === 'USDC' || fromSymbol === 'USDT') {
        // Convert stablecoin to ALGO: (USDC amount) / (ALGO price in USD)
        if (prices.ALGO) {
          algoEquivalent = amount / prices.ALGO
        }
      } else {
        // For unknown tokens, try to use ALGO as fallback
        algoEquivalent = amount
      }

      totalVolumeALGO += algoEquivalent

      // Group by date for chart
      const date = new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      volumeByDate[date] = (volumeByDate[date] || 0) + algoEquivalent
    })

    // Convert volume by date to chart data
    const volumeChart = Object.entries(volumeByDate)
      .map(([date, volume]) => ({ date, volume: Number(volume.toFixed(2)) }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14) // Last 14 days

    const avgTransactionSize = transactions.length > 0 ? totalVolumeALGO / transactions.length : 0

    return {
      totalVolumeALGO,
      totalTransactions: transactions.length,
      volumeChart,
      avgTransactionSize
    }
  }, [transactions, prices, loadingPrices])

  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => (tx.action || '').toLowerCase() === typeFilter)
    }

    // Sort transactions
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
  }, [transactions, typeFilter, sortBy])

  return (
    <div className="flex min-h-screen flex-col [&_*:hover]:!bg-transparent [&_*:hover]:!text-current [&_*:hover]:!opacity-100">
      <style jsx global>{`
        .flex.min-h-screen * {
          transition: none !important;
        }
        .flex.min-h-screen *:hover {
          background-color: transparent !important;
          color: inherit !important;
          opacity: inherit !important;
        }
      `}</style>
      <BackgroundPaths />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full space-y-6">
          {/* Transaction History Card with Search */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold tracking-tight">Transaction History</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    View all your transaction history across the platform.
                  </p>
                  {!loading && (
                    <p className="text-xs text-muted-foreground">
                      {filteredTransactions.length} transactions
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Bar */}
                  <div className="w-full sm:w-auto sm:min-w-[300px] lg:min-w-[400px]">
                    <SearchBar />
                  </div>
                  
                  {/* Type Filter */}
                  <Select
                    value={typeFilter}
                    onValueChange={(v) => setTypeFilter(v as 'all' | 'swap' | 'send' | 'receive' | 'stake' | 'add_liquidity')}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-[120px] sm:w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Transactions</SelectItem>
                      <SelectItem value="swap">Swap</SelectItem>
                      <SelectItem value="send">Send</SelectItem>
                      <SelectItem value="receive">Receive</SelectItem>
                      <SelectItem value="stake">Stake</SelectItem>
                      <SelectItem value="add_liquidity">Add Liquidity</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Sort */}
                  <Select value={sortBy} onValueChange={setSortBy} disabled={loading}>
                    <SelectTrigger className="w-[140px] sm:w-[160px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time_desc">Time: New → Old</SelectItem>
                      <SelectItem value="time_asc">Time: Old → New</SelectItem>
                      <SelectItem value="usd_desc">USD: High → Low</SelectItem>
                      <SelectItem value="usd_asc">USD: Low → High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Analytics Overview Card */}
              <Card className="bg-gradient-to-br from-red-500/5 to-amber-500/5 border-red-200/20 dark:border-red-800/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-red-500" />
                    Transaction Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingPrices ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-red-600 dark:text-[#F3C623]" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading analytics...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Total Volume</p>
                          <p className="text-xl font-bold font-mono">{analytics.totalVolumeALGO.toFixed(2)} ALGO</p>
                          <p className="text-[10px] text-muted-foreground">≈ ${(analytics.totalVolumeALGO * (prices.ALGO || 0)).toFixed(2)} USD</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Total Transactions</p>
                          <p className="text-xl font-bold font-mono">{analytics.totalTransactions}</p>
                          <p className="text-[10px] text-muted-foreground">All-time on this site</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">24h Transactions</p>
                          <p className="text-xl font-bold font-mono">{stats?.last1d ?? 0}</p>
                          <p className="text-[10px] text-muted-foreground">Last 24 hours</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Avg Transaction</p>
                          <p className="text-xl font-bold font-mono">{analytics.avgTransactionSize.toFixed(2)} ALGO</p>
                          <p className="text-[10px] text-muted-foreground">Per transaction</p>
                        </div>
                      </div>

                      {/* Volume Chart */}
                      {analytics.volumeChart.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium">Transaction Volume (Last 14 Days)</p>
                            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                          </div>
                          <div className="h-[140px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={analytics.volumeChart}>
                                <defs>
                                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                <XAxis 
                                  dataKey="date" 
                                  stroke="#9ca3af" 
                                  fontSize={10}
                                  tickLine={false}
                                />
                                <YAxis 
                                  stroke="#9ca3af" 
                                  fontSize={10}
                                  tickLine={false}
                                  tickFormatter={(value) => `${value.toFixed(0)}`}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    padding: '6px 8px',
                                    fontSize: '11px'
                                  }}
                                  labelStyle={{ color: '#f3f4f6' }}
                                  itemStyle={{ color: '#ef4444' }}
                                  formatter={(value: any) => [`${Number(value).toFixed(2)} ALGO`, 'Volume']}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="volume"
                                  stroke="#ef4444"
                                  strokeWidth={1.5}
                                  fill="url(#volumeGradient)"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top-of-table summary and note */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="ml-auto text-muted-foreground">Note: Testnet data</span>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card className="relative z-0">
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-[#F3C623]" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading transactions...</span>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-gray-800">
                    <TableHead className="text-left font-semibold text-red-600 dark:text-red-400">
                      Time
                    </TableHead>
                    <TableHead className="text-left font-semibold text-red-600 dark:text-red-400">Type</TableHead>
                    <TableHead className="text-left font-semibold text-red-600 dark:text-red-400">Token Amount</TableHead>
                    <TableHead className="text-left font-semibold text-red-600 dark:text-red-400">Pool Address</TableHead>
                    <TableHead className="text-left font-semibold text-red-600 dark:text-red-400">Wallet</TableHead>
                    <TableHead className="text-center font-semibold text-red-600 dark:text-red-400">Explorer</TableHead>
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
                      const isExecuteRule = tx.action === 'execute_rule'
                      
                      // For EXECUTE_RULE, show only the single token being executed
                      // For SWAP, show the from -> to format
                      const fromSymbol = tx.fromAssetUnitName || tx.fromAssetName || `#${tx.fromAssetId}`
                      const toSymbol = tx.toAssetUnitName || tx.toAssetName || `#${tx.toAssetId}`
                      
                      // Derive pool address with fallbacks
                      const poolAddr = tx.poolAddress || 
                                      (Array.isArray(tx.routePath) && tx.routePath.length > 0 && tx.routePath[0]?.poolId) || 
                                      (Array.isArray(tx.routePath) && tx.routePath.length > 0 && tx.routePath[0]?.poolAddress) ||
                                      null
                      
                      // Calculate display amounts
                      let executeAmountNumber: number | null = null
                      if (isExecuteRule) {
                        if (tx.fromAmountBaseUnits != null && tx.decimals != null) {
                          executeAmountNumber = Number(tx.fromAmountBaseUnits) / Math.pow(10, tx.decimals)
                        } else if (tx.fromAmount != null) {
                          // fromAmount may already be human-readable
                          const n = Number(tx.fromAmount)
                          executeAmountNumber = Number.isFinite(n) ? n : null
                        }
                      }

                      // For swaps, compute both sides where possible
                      const isSwap = tx.action === 'swap'
                      let swapFromNumber: number | null = null
                      let swapToNumber: number | null = null
                      if (isSwap) {
                        if (tx.fromAmountBaseUnits != null && tx.fromDecimals != null) {
                          swapFromNumber = Number(tx.fromAmountBaseUnits) / Math.pow(10, tx.fromDecimals)
                        } else if (tx.fromAmount != null) {
                          const n = Number(tx.fromAmount)
                          swapFromNumber = Number.isFinite(n) ? n : null
                        }

                        if (tx.toAmountBaseUnits != null && tx.toDecimals != null) {
                          swapToNumber = Number(tx.toAmountBaseUnits) / Math.pow(10, tx.toDecimals)
                        } else if (tx.toAmount != null) {
                          const n = Number(tx.toAmount)
                          swapToNumber = Number.isFinite(n) ? n : null
                        }
                      }

                      const executeAmount = executeAmountNumber != null ? executeAmountNumber.toFixed(6) : null
                      const swapFromAmount = swapFromNumber != null ? swapFromNumber.toFixed(6) : null
                      const swapToAmount = swapToNumber != null ? swapToNumber.toFixed(6) : null
                      
                      return (
                        <TableRow key={tx.id} className="border-b border-gray-100 dark:border-gray-800/50">
                          {/* Time */}
                          <TableCell className="text-left text-muted-foreground text-sm py-4">
                            {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                          </TableCell>

                          {/* Type */}
                          <TableCell className="text-left py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                {tx.action ? String(tx.action).toUpperCase().replace(/_/g, ' ') : 'EVENT'}
                              </span>
                              {isExecuteRule ? (
                                <span className="font-medium text-sm">{fromSymbol}</span>
                              ) : (
                                <span className="font-medium text-sm">{fromSymbol} → {toSymbol}</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Token Amount */}
                          <TableCell className="text-left py-4">
                            {isExecuteRule ? (
                              executeAmount ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{executeAmount}</span>
                                  <span className="text-xs text-muted-foreground">{fromSymbol}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{swapFromAmount ?? '—'}</span>
                                <span className="font-medium">→</span>
                                <span className="text-muted-foreground">{swapToAmount ?? '—'}</span>
                              </div>
                            )}
                          </TableCell>

                          {/* Pool Address */}
                          <TableCell className="text-left py-4">
                            {poolAddr ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => copyToClipboard(String(poolAddr))}
                                  className="h-7 w-7 p-0 flex-shrink-0 inline-flex items-center justify-center rounded-md cursor-pointer"
                                  title={`Copy: ${String(poolAddr)}`}
                                >
                                  {copiedAddress === poolAddr ? (
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </button>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {String(poolAddr).slice(0, 6)}...{String(poolAddr).slice(-6)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>

                          {/* Wallet */}
                          <TableCell className="text-left py-4">
                            {tx.ownerAddress ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => copyToClipboard(tx.ownerAddress)}
                                  className="h-7 w-7 p-0 flex-shrink-0 inline-flex items-center justify-center rounded-md cursor-pointer"
                                  title={`Copy: ${tx.ownerAddress}`}
                                >
                                  {copiedAddress === tx.ownerAddress ? (
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </button>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {tx.ownerAddress.slice(0, 6)}...{tx.ownerAddress.slice(-6)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>

                          {/* Explorer Link */}
                          <TableCell className="text-center py-4">
                            {tx.txId ? (
                              <a
                                href={`https://lora.algokit.io/testnet/transaction/${tx.txId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-7 w-7 rounded-md"
                                title="View on AlgoExplorer"
                              >
                                <ExternalLink className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

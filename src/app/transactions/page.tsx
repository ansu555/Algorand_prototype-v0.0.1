"use client"

import { useState, useEffect, useMemo } from "react"
import BackgroundPaths from "@/components/shared/animated-background"
import { SearchBar } from "@/components/shared/search-bar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowUpDown } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type TransactionType = 'swap' | 'send' | 'receive' | 'stake' | 'unstake' | 'add_liquidity' | 'remove_liquidity'

type Transaction = {
  id: string
  time: Date
  type: TransactionType
  fromToken: string
  fromTokenSymbol: string
  fromTokenLogo?: string
  toToken: string
  toTokenSymbol: string
  toTokenLogo?: string
  usdAmount: number
  fromAmount: number
  toAmount: number
  walletAddress: string
  txHash: string
}

export default function TransactionsPage() {
  const [sortBy, setSortBy] = useState("time_desc")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Mock data - replace with actual API call
  useEffect(() => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          time: new Date(Date.now() - 31 * 1000),
          type: 'swap',
          fromToken: 'ETH',
          fromTokenSymbol: 'ETH',
          toToken: 'USDT',
          toTokenSymbol: 'USDT',
          usdAmount: 0.00000602,
          fromAmount: 0.01,
          toAmount: 0.01,
          walletAddress: '0x1e4b...d241',
          txHash: '0x1e4b...d241',
        },
        {
          id: '2',
          time: new Date(Date.now() - 31 * 1000),
          type: 'swap',
          fromToken: 'GONE',
          fromTokenSymbol: 'GONE',
          toToken: 'ETH',
          toTokenSymbol: 'ETH',
          usdAmount: 0.00000606,
          fromAmount: 1.00,
          toAmount: 0.01,
          walletAddress: '0x1e4b...d241',
          txHash: '0x1e4b...d241',
        },
        {
          id: '3',
          time: new Date(Date.now() - 31 * 1000),
          type: 'swap',
          fromToken: 'ETH',
          fromTokenSymbol: 'ETH',
          toToken: 'SKELLY',
          toTokenSymbol: 'SKELLY',
          usdAmount: 440.15,
          fromAmount: 0.12,
          toAmount: 54.7,
          walletAddress: '0x1499...908D',
          txHash: '0x1499...908D',
        },
        {
          id: '4',
          time: new Date(Date.now() - 31 * 1000),
          type: 'swap',
          fromToken: 'ETH',
          fromTokenSymbol: 'ETH',
          toToken: 'SKELLY',
          toTokenSymbol: 'SKELLY',
          usdAmount: 926.67,
          fromAmount: 0.26,
          toAmount: 113.9,
          walletAddress: '0xc820...6619',
          txHash: '0xc820...6619',
        },
        {
          id: '5',
          time: new Date(Date.now() - 31 * 1000),
          type: 'swap',
          fromToken: 'LILPEPE',
          fromTokenSymbol: 'LILPEPE',
          toToken: 'ETH',
          toTokenSymbol: 'ETH',
          usdAmount: 3876.12,
          fromAmount: 516.7,
          toAmount: 1.10,
          walletAddress: '0xFceA...C11b',
          txHash: '0xFceA...C11b',
        },
        {
          id: '6',
          time: new Date(Date.now() - 31 * 1000),
          type: 'swap',
          fromToken: 'QF',
          fromTokenSymbol: 'QF',
          toToken: 'ETH',
          toTokenSymbol: 'ETH',
          usdAmount: 552.07,
          fromAmount: 470.85,
          toAmount: 0.15,
          walletAddress: '0x422a...4abb',
          txHash: '0x422a...4abb',
        },
        {
          id: '7',
          time: new Date(Date.now() - 31 * 1000),
          type: 'swap',
          fromToken: 'MUSE',
          fromTokenSymbol: 'MUSE',
          toToken: 'ETH',
          toTokenSymbol: 'ETH',
          usdAmount: 497.67,
          fromAmount: 81.32,
          toAmount: 0.14,
          walletAddress: '0x5462...9FeB',
          txHash: '0x5462...9FeB',
        },
      ]
      setTransactions(mockTransactions)
      setLoading(false)
    }, 500)
  }, [])

  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter)
    }

    // Sort transactions
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "time_desc":
          return b.time.getTime() - a.time.getTime()
        case "time_asc":
          return a.time.getTime() - b.time.getTime()
        case "usd_desc":
          return b.usdAmount - a.usdAmount
        case "usd_asc":
          return a.usdAmount - b.usdAmount
        default:
          return 0
      }
    })

    return sorted
  }, [transactions, typeFilter, sortBy])

  return (
    <div className="flex min-h-screen flex-col">
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
                  <Select value={typeFilter} onValueChange={setTypeFilter} disabled={loading}>
                    <SelectTrigger className="w-[120px] sm:w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
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
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1D Volume */}
                <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">1D volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold font-mono">$3.15B</div>
                <div className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                  <span>▼</span>
                  <span>27.21% today</span>
                </div>
              </CardContent>
            </Card>

            {/* Total 10xSwap TVL */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Total 10xSwap TVL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold font-mono">$3.93B</div>
                <div className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                  <span>▼</span>
                  <span>1.9% today</span>
                </div>
              </CardContent>
            </Card>

            {/* v2 TVL */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">v2 TVL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold font-mono">$1.59B</div>
                <div className="text-xs sm:text-sm text-green-500 flex items-center gap-1">
                  <span>▲</span>
                  <span>0.74% today</span>
                </div>
              </CardContent>
            </Card>

            {/* v3 TVL */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">v3 TVL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold font-mono">$1.59B</div>
                <div className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                  <span>▼</span>
                  <span>3.77% today</span>
                </div>
              </CardContent>
            </Card>

            {/* v4 TVL */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">v4 TVL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold font-mono">$751.90M</div>
                <div className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                  <span>▼</span>
                  <span>3.24% today</span>
                </div>
              </CardContent>
            </Card>
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
                  <TableRow className="text-red-600 dark:text-red-400">
                    <TableHead className="text-left">
                      <div className="flex items-center gap-1">
                        Time
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-left">Type</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                    <TableHead className="text-right">Token amount</TableHead>
                    <TableHead className="text-right">Token amount</TableHead>
                    <TableHead className="text-right">Wallet</TableHead>
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
                    filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-left text-muted-foreground">
                          {formatDistanceToNow(tx.time, { addSuffix: false })}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Swap</span>
                            <span className="font-medium">{tx.fromTokenSymbol}</span>
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                              {tx.fromTokenSymbol.charAt(0)}
                            </div>
                            <span className="text-muted-foreground">for</span>
                            <span className="font-medium">{tx.toTokenSymbol}</span>
                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                              {tx.toTokenSymbol.charAt(0)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${tx.usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className={tx.fromAmount < 1 ? 'text-muted-foreground' : ''}>
                              {tx.fromAmount < 0.01 ? '<0.01' : tx.fromAmount.toLocaleString()} {tx.fromTokenSymbol}
                            </span>
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                              {tx.fromTokenSymbol.charAt(0)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className={tx.toAmount < 1 ? 'text-muted-foreground' : ''}>
                              {tx.toAmount < 0.01 ? '<0.01' : tx.toAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tx.toTokenSymbol}
                            </span>
                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                              {tx.toTokenSymbol.charAt(0)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {tx.walletAddress}
                        </TableCell>
                      </TableRow>
                    ))
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

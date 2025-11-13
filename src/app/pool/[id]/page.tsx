'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import BackgroundPaths from '@/components/shared/animated-background'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, ExternalLink, Loader2, TrendingUp, BarChart3, Copy, Check, X } from 'lucide-react'
import { SwapCard } from '@/components/features/trading'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PoolDetails {
  poolId: string
  dexName: string
  asset1: {
    id: number
    symbol: string
    name: string
    decimals: number
  }
  asset2: {
    id: number
    symbol: string
    name: string
    decimals: number
  }
  reserve1: string
  reserve2: string
  fee: number
}

export default function PoolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const poolId = params.id as string
  const [pool, setPool] = useState<PoolDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [showSwap, setShowSwap] = useState(false)
  const [timePeriod, setTimePeriod] = useState<'1H' | '1D' | '1W' | '1M' | '1Y'>('1D')

  // Mock chart data - replace with real data
  const generateChartData = (period: string) => {
    const dataPoints = period === '1H' ? 12 : period === '1D' ? 24 : period === '1W' ? 7 : period === '1M' ? 30 : 12
    const baseValue = 19300
    return Array.from({ length: dataPoints }, (_, i) => ({
      time: period === '1H' ? `${i * 5}m` : period === '1D' ? `${i}:00` : period === '1W' ? `Day ${i + 1}` : period === '1M' ? `${i + 1}` : `M${i + 1}`,
      value: baseValue + Math.random() * 5000 - 2500,
      volume: Math.random() * 100000 + 50000
    }))
  }

  const chartData = generateChartData(timePeriod)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedAddress(text)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  useEffect(() => {
    async function fetchPoolDetails() {
      try {
        setLoading(true)
        const response = await fetch('/api/pools/all')
        const data = await response.json()
        
        if (data.success && data.pools) {
          const foundPool = data.pools.find((p: any) => p.poolId === poolId)
          if (foundPool) {
            setPool(foundPool)
          } else {
            setError('Pool not found')
          }
        } else {
          setError('Failed to fetch pool data')
        }
      } catch (err) {
        setError('Error loading pool details')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPoolDetails()
  }, [poolId])

  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundPaths />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          {/* Back Button */}
          <Link href="/pool">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Pools
            </Button>
          </Link>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-[#F3C623]" />
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="py-20">
                <p className="text-center text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          ) : pool ? (
            <>
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <Link href="/" className="hover:text-gray-900 dark:hover:text-gray-100">Explore</Link>
                <span>›</span>
                <Link href="/pool" className="hover:text-gray-900 dark:hover:text-gray-100">Pools</Link>
                <span>›</span>
                <span className="text-gray-900 dark:text-gray-100">{pool.asset1.symbol} / {pool.asset2.symbol}</span>
                <span className="text-xs text-gray-400">0x{poolId.slice(0, 4)}...{poolId.slice(-4)}</span>
              </div>

              {/* Header Section */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center -space-x-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm border-2 border-background">
                    {pool.asset1.symbol.charAt(0)}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm border-2 border-background">
                    {pool.asset2.symbol.charAt(0)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">
                      {pool.asset1.symbol} / {pool.asset2.symbol}
                    </h1>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-500/20 text-blue-400">
                      v2
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400">
                      {pool.fee / 100}%
                    </span>
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Copy link">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Share">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Chart */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Price Display */}
                  <div>
                    <h2 className="text-3xl font-bold mb-1">$19.3K</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Past day</p>
                  </div>

                  {/* Chart Card */}
                  <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-gray-200 dark:border-gray-800 shadow-lg">
                    <CardContent className="pt-6">
                      {/* Chart */}
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                            <XAxis 
                              dataKey="time" 
                              stroke="#9ca3af" 
                              style={{ fontSize: '12px' }}
                              tickLine={false}
                            />
                            <YAxis 
                              stroke="#9ca3af" 
                              style={{ fontSize: '12px' }}
                              tickLine={false}
                              tickFormatter={(value) => `$${(value / 1000).toFixed(1)}K`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                              formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#ec4899" 
                              strokeWidth={2}
                              fill="url(#colorValue)"
                              animationDuration={1000}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Time Period Buttons */}
                      <div className="flex gap-2 mt-6 justify-center">
                        {(['1H', '1D', '1W', '1M', '1Y'] as const).map((period) => (
                          <Button 
                            key={period}
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setTimePeriod(period)}
                            className={`h-8 text-xs px-3 rounded-full transition-all ${
                              timePeriod === period 
                                ? 'bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400' 
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                          >
                            {period}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Stats & Links */}
                <div className="space-y-6 scale-[1.01] origin-left">
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button 
                      variant="outline"
                      className="flex-1 border-pink-600 text-pink-600 hover:bg-pink-50 dark:border-pink-500 dark:text-pink-500 dark:hover:bg-pink-950/30"
                      onClick={() => setShowSwap(!showSwap)}
                    >
                      {showSwap ? 'Close' : 'Swap'}
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 border-pink-600 text-pink-600 hover:bg-pink-50 dark:border-pink-500 dark:text-pink-500 dark:hover:bg-pink-950/30"
                    >
                      Add liquidity
                    </Button>
                  </div>

                  {/* Swap Card - Shown when Swap button is clicked */}
                  {showSwap && (
                    <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Swap Tokens</CardTitle>
                          <button
                            onClick={() => setShowSwap(false)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                            title="Close"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <SwapCard 
                          onSwapSuccess={() => {
                            // Optional: refresh pool data after successful swap
                            console.log('Swap completed successfully!')
                          }}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Total APR Card */}
                  <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 w-[101%]">
                    <CardContent className="pt-6 pb-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total APR</p>
                      <p className="text-4xl font-bold">0.02%</p>
                    </CardContent>
                  </Card>

                  {/* Stats Card */}
                  <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 w-[101%]">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Pool Balances */}
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Pool balances</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-base font-bold">
                              {(Number(pool.reserve1) / Math.pow(10, pool.asset1.decimals)).toLocaleString(undefined, {
                                maximumFractionDigits: 1
                              })}M {pool.asset1.symbol}
                            </p>
                            <p className="text-base font-bold">
                              {(Number(pool.reserve2) / Math.pow(10, pool.asset2.decimals)).toLocaleString(undefined, {
                                maximumFractionDigits: 1
                              })}K {pool.asset2.symbol}
                            </p>
                          </div>
                          <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                            <div className="flex-1 bg-pink-500" />
                            <div className="flex-1 bg-blue-500" />
                          </div>
                        </div>
                      </div>

                      {/* TVL */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">TVL</p>
                        <p className="text-3xl font-bold">$203.9M</p>
                        <p className="text-xs text-green-500 font-medium mt-1">+1.29%</p>
                      </div>

                      {/* 24h Volume */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">24h volume</p>
                        <p className="text-3xl font-bold">$39.5K</p>
                        <p className="text-xs text-red-500 font-medium mt-1">-20.3%</p>
                      </div>

                      {/* 24H Fees */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">24H fees</p>
                        <p className="text-3xl font-bold">$118.55</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Links Card */}
                  <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 w-[101%]">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Pool Link */}
                      <a
                        href={`https://testnet.algoexplorer.io/address/${poolId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{pool.asset1.symbol.charAt(0)}</span>
                          </div>
                          <span className="text-sm font-medium">{pool.asset1.symbol} / {pool.asset2.symbol}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">0x{poolId.slice(-4)}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              copyToClipboard(poolId)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy address"
                          >
                            {copiedAddress === poolId ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </a>

                      {/* Asset 1 Link */}
                      {pool.asset1.id !== 0 && (
                        <a
                          href={`https://testnet.algoexplorer.io/asset/${pool.asset1.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{pool.asset1.symbol.charAt(0)}</span>
                            </div>
                            <span className="text-sm font-medium">{pool.asset1.symbol}</span>
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">#{pool.asset1.id}</span>
                            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </a>
                      )}

                      {/* Asset 2 Link */}
                      {pool.asset2.id !== 0 && (
                        <a
                          href={`https://testnet.algoexplorer.io/asset/${pool.asset2.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{pool.asset2.symbol.charAt(0)}</span>
                            </div>
                            <span className="text-sm font-medium">{pool.asset2.symbol}</span>
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">#{pool.asset2.id}</span>
                            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Transactions Table */}
              <Card className="mt-6 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-xl text-pink-600 dark:text-pink-500">Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-gray-200 dark:border-gray-800">
                          <TableHead className="text-left text-pink-600 dark:text-pink-500 font-semibold">Time</TableHead>
                          <TableHead className="text-left text-pink-600 dark:text-pink-500 font-semibold">Type</TableHead>
                          <TableHead className="text-right text-pink-600 dark:text-pink-500 font-semibold">USD</TableHead>
                          <TableHead className="text-right text-pink-600 dark:text-pink-500 font-semibold">{pool.asset1.symbol}</TableHead>
                          <TableHead className="text-right text-pink-600 dark:text-pink-500 font-semibold">{pool.asset2.symbol}</TableHead>
                          <TableHead className="text-left text-pink-600 dark:text-pink-500 font-semibold">Wallet</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Mock transaction data - Replace with actual data from API */}
                        {[
                          {
                            time: '3h',
                            type: 'buy',
                            usd: '$1,234.56',
                            token1: '125.34',
                            token2: '0.64',
                            wallet: '0x742d...5e2f'
                          },
                          {
                            time: '5h',
                            type: 'sell',
                            usd: '$892.31',
                            token1: '89.23',
                            token2: '0.46',
                            wallet: '0x1a3b...9c4d'
                          },
                          {
                            time: '6h',
                            type: 'buy',
                            usd: '$2,456.78',
                            token1: '245.67',
                            token2: '1.28',
                            wallet: '0x9f8e...3a2b'
                          },
                          {
                            time: '8h',
                            type: 'sell',
                            usd: '$567.89',
                            token1: '56.78',
                            token2: '0.29',
                            wallet: '0x4c5d...7e8f'
                          },
                          {
                            time: '11h',
                            type: 'buy',
                            usd: '$3,789.12',
                            token1: '378.91',
                            token2: '1.97',
                            wallet: '0x2b3c...6d7e'
                          },
                          {
                            time: '14h',
                            type: 'sell',
                            usd: '$1,123.45',
                            token1: '112.34',
                            token2: '0.58',
                            wallet: '0x8a9b...1c2d'
                          },
                          {
                            time: '18h',
                            type: 'buy',
                            usd: '$4,567.89',
                            token1: '456.78',
                            token2: '2.37',
                            wallet: '0x5e6f...9a8b'
                          },
                          {
                            time: '1d',
                            type: 'sell',
                            usd: '$789.12',
                            token1: '78.91',
                            token2: '0.41',
                            wallet: '0x3d4e...7f8a'
                          }
                        ].map((tx, index) => (
                          <TableRow 
                            key={index}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-pink-50/30 dark:hover:bg-pink-950/20 transition-colors"
                          >
                            <TableCell className="text-gray-600 dark:text-gray-400 py-4">
                              {tx.time}
                            </TableCell>
                            <TableCell className="py-4">
                              <span className={`font-medium ${
                                tx.type === 'buy' 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {tx.type === 'buy' ? 'Buy' : 'Sell'} {pool.asset1.symbol}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium py-4">
                              {tx.usd}
                            </TableCell>
                            <TableCell className="text-right text-gray-900 dark:text-gray-100 py-4">
                              {tx.token1}
                            </TableCell>
                            <TableCell className="text-right text-gray-900 dark:text-gray-100 py-4">
                              {tx.token2}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-gray-600 dark:text-gray-400">{tx.wallet}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(tx.wallet)
                                    setCopiedAddress(tx.wallet)
                                    setTimeout(() => setCopiedAddress(null), 2000)
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Copy address"
                                >
                                  {copiedAddress === tx.wallet ? (
                                    <Check className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                                  )}
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}

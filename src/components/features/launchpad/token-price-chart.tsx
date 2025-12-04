"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Bar } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Loader2, RefreshCw, Clock, Activity } from "lucide-react"

interface ChartData {
    timestamp: number
    price: number
    volume: number
    date: string
    formattedTime: string
    cumulativeVolume: number
}

interface TokenPriceChartProps {
    projectId: string
    tokenSymbol: string
    currentPrice?: number
    onPriceUpdate?: (price: number) => void
}

type TimeRange = '1H' | '24H' | '7D' | 'ALL'

export function TokenPriceChart({ projectId, tokenSymbol, currentPrice: externalPrice, onPriceUpdate }: TokenPriceChartProps) {
    const [data, setData] = useState<ChartData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
    const [timeRange, setTimeRange] = useState<TimeRange>('ALL')
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [showVolume, setShowVolume] = useState(false)

    // Format time based on selected range
    const formatTime = (timestamp: number, range: TimeRange): string => {
        const date = new Date(timestamp)
        switch (range) {
            case '1H':
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            case '24H':
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            case '7D':
                return `${date.toLocaleDateString([], { weekday: 'short' })} ${date.toLocaleTimeString([], { hour: '2-digit' })}`
            case 'ALL':
            default:
                return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        }
    }

    const fetchData = useCallback(async (showRefreshIndicator = false) => {
        try {
            if (showRefreshIndicator) setIsRefreshing(true)
            
            const res = await fetch(`/api/launchpad/chart?projectId=${projectId}&range=${timeRange}`)
            const json = await res.json()

            if (json.success) {
                // Process data with cumulative volume
                let cumVol = 0
                const processedData = json.data.map((d: any) => {
                    cumVol += d.volume || 0
                    return {
                        ...d,
                        cumulativeVolume: cumVol,
                        formattedTime: formatTime(d.timestamp, timeRange)
                    }
                })
                
                setData(processedData)
                setLastUpdate(new Date())
                
                // Notify parent of latest price
                if (processedData.length > 0 && onPriceUpdate) {
                    onPriceUpdate(processedData[processedData.length - 1].price)
                }
            } else {
                setError(json.error || "Failed to load chart data")
            }
        } catch (err) {
            console.error(err)
            setError("Failed to load chart data")
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [projectId, timeRange, onPriceUpdate])

    useEffect(() => {
        setLoading(true)
        fetchData()
        
        // Real-time updates - poll every 10 seconds
        const interval = setInterval(() => fetchData(false), 10000)
        return () => clearInterval(interval)
    }, [fetchData])

    // Calculate statistics
    const stats = useMemo(() => {
        if (data.length < 1) return null
        
        const currentPrice = data[data.length - 1]?.price || 0
        const startPrice = data[0]?.price || 0
        const priceChange = startPrice > 0 ? ((currentPrice - startPrice) / startPrice) * 100 : 0
        
        const prices = data.map(d => d.price)
        const highPrice = Math.max(...prices)
        const lowPrice = Math.min(...prices)
        
        const totalVolume = data.reduce((sum, d) => sum + (d.volume || 0), 0)
        
        return {
            currentPrice,
            startPrice,
            priceChange,
            highPrice,
            lowPrice,
            totalVolume,
            isPositive: priceChange >= 0
        }
    }, [data])

    // Filter data based on time range
    const filteredData = useMemo(() => {
        if (timeRange === 'ALL' || data.length === 0) return data
        
        const now = Date.now()
        const ranges: Record<TimeRange, number> = {
            '1H': 60 * 60 * 1000,
            '24H': 24 * 60 * 60 * 1000,
            '7D': 7 * 24 * 60 * 60 * 1000,
            'ALL': Infinity
        }
        
        const cutoff = now - ranges[timeRange]
        return data.filter(d => d.timestamp >= cutoff)
    }, [data, timeRange])

    // Calculate dynamic Y-axis domain with padding
    const yDomain = useMemo(() => {
        if (filteredData.length === 0) return [0, 1]
        
        const prices = filteredData.map(d => d.price)
        const min = Math.min(...prices)
        const max = Math.max(...prices)
        const padding = (max - min) * 0.1 || max * 0.1
        
        return [Math.max(0, min - padding), max + padding]
    }, [filteredData])

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload
            return (
                <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                    <p className="text-xs text-muted-foreground mb-1">{d.date}</p>
                    <p className="text-lg font-bold text-foreground">
                        {d.price.toFixed(6)} <span className="text-sm font-normal text-muted-foreground">ALGO</span>
                    </p>
                    {d.volume > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Vol: {(d.volume / 1_000_000).toLocaleString()} {tokenSymbol}
                        </p>
                    )}
                </div>
            )
        }
        return null
    }

    // Format Y-axis values
    const formatYAxis = (value: number) => {
        if (value >= 1) return value.toFixed(2)
        if (value >= 0.001) return value.toFixed(4)
        return value.toFixed(6)
    }

    if (loading) {
        return (
            <Card className="h-full flex flex-col border-border">
                <CardContent className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading chart data...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="h-full flex flex-col border-border">
                <CardContent className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-muted-foreground">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => fetchData(true)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (filteredData.length === 0) {
        return (
            <Card className="h-full flex flex-col border-border">
                <CardContent className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <Activity className="h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground">No price data available yet</p>
                        <p className="text-xs text-muted-foreground">Make the first purchase to start the chart</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const isPositive = stats?.isPositive ?? true

    return (
        <Card className="h-full flex flex-col border-border">
            <CardHeader className="pb-2">
                {/* Header Row */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-xl font-bold">
                                {tokenSymbol}/ALGO
                            </CardTitle>
                            {stats && (
                                <Badge 
                                    variant="outline" 
                                    className={`${isPositive ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
                                >
                                    {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                    {isPositive ? '+' : ''}{stats.priceChange.toFixed(2)}%
                                </Badge>
                            )}
                            {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>
                        <p className="text-3xl font-bold mt-1">
                            {stats?.currentPrice.toFixed(6) || '0.000000'} <span className="text-lg font-normal text-muted-foreground">ALGO</span>
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>High: <span className="text-green-500 font-mono">{stats?.highPrice.toFixed(6)}</span></span>
                            <span>Low: <span className="text-red-500 font-mono">{stats?.lowPrice.toFixed(6)}</span></span>
                            <span>Vol: <span className="font-mono">{((stats?.totalVolume || 0) / 1_000_000).toFixed(2)}</span></span>
                        </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                            {(['1H', '24H', '7D', 'ALL'] as TimeRange[]).map((range) => (
                                <Button
                                    key={range}
                                    variant={timeRange === range ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => setTimeRange(range)}
                                >
                                    {range}
                                </Button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Updated {lastUpdate.toLocaleTimeString()}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => fetchData(true)}
                                disabled={isRefreshing}
                            >
                                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="flex-1 min-h-0 pb-4">
                <div className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={filteredData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                            
                            <XAxis
                                dataKey="formattedTime"
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={{ stroke: 'hsl(var(--border))' }}
                                minTickGap={50}
                                dy={10}
                            />
                            
                            <YAxis
                                domain={yDomain}
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={formatYAxis}
                                tickLine={false}
                                axisLine={{ stroke: 'hsl(var(--border))' }}
                                width={70}
                                tickCount={8}
                            />
                            
                            {/* Reference line for start price */}
                            {stats && (
                                <ReferenceLine
                                    y={stats.startPrice}
                                    stroke="hsl(var(--muted-foreground))"
                                    strokeDasharray="5 5"
                                    opacity={0.5}
                                    label={{
                                        value: `Start: ${stats.startPrice.toFixed(6)}`,
                                        fill: 'hsl(var(--muted-foreground))',
                                        fontSize: 10,
                                        position: 'right'
                                    }}
                                />
                            )}
                            
                            <Tooltip content={<CustomTooltip />} />
                            
                            {/* Volume bars (optional) */}
                            {showVolume && (
                                <Bar
                                    dataKey="volume"
                                    fill="hsl(var(--muted-foreground))"
                                    opacity={0.3}
                                    yAxisId="volume"
                                />
                            )}
                            
                            {/* Price area */}
                            <Area
                                type="monotone"
                                dataKey="price"
                                stroke={isPositive ? "#22c55e" : "#ef4444"}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorPrice)"
                                dot={false}
                                activeDot={{ r: 6, stroke: isPositive ? "#22c55e" : "#ef4444", strokeWidth: 2, fill: 'hsl(var(--background))' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

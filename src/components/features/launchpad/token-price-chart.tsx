"use client"

import { useEffect, useState } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Loader2 } from "lucide-react"

interface ChartData {
    timestamp: number
    price: number
    volume: number
    date: string
}

interface TokenPriceChartProps {
    projectId: string
    tokenSymbol: string
}

export function TokenPriceChart({ projectId, tokenSymbol }: TokenPriceChartProps) {
    const [data, setData] = useState<ChartData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/launchpad/chart?projectId=${projectId}`)
                const json = await res.json()

                if (json.success) {
                    setData(json.data)
                } else {
                    setError(json.error || "Failed to load chart data")
                }
            } catch (err) {
                console.error(err)
                setError("Failed to load chart data")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
        // Refresh every 30 seconds
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [projectId])

    if (loading) {
        return (
            <div className="h-[500px] w-full flex items-center justify-center bg-card border border-border rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-[500px] w-full flex items-center justify-center bg-card border border-border rounded-lg">
                <p className="text-muted-foreground">{error}</p>
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="h-[500px] w-full flex items-center justify-center bg-card border border-border rounded-lg">
                <p className="text-muted-foreground">No price data available yet</p>
            </div>
        )
    }

    const currentPrice = data[data.length - 1]?.price || 0
    const startPrice = data[0]?.price || 0
    const priceChange = ((currentPrice - startPrice) / startPrice) * 100
    const isPositive = priceChange >= 0

    return (
        <Card className="h-[600px] flex flex-col border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        {tokenSymbol}/ALGO
                        <span className={`text-sm font-normal px-2 py-0.5 rounded ${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                        </span>
                    </CardTitle>
                    <p className="text-2xl font-bold mt-1">{currentPrice.toFixed(6)} ALGO</p>
                </div>
                <TrendingUp className={`h-8 w-8 ${isPositive ? 'text-green-500' : 'text-red-500'} opacity-50`} />
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pb-4">
                <div className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={(value) => value.toFixed(6)}
                                tickLine={false}
                                axisLine={false}
                                width={80}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '8px',
                                    color: 'hsl(var(--foreground))'
                                }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                                formatter={(value: number) => [value.toFixed(6) + ' ALGO', 'Price']}
                                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="price"
                                stroke={isPositive ? "#22c55e" : "#ef4444"}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorPrice)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

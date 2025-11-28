"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Heart, ExternalLink, Send, Copy } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface TokenLaunchCardProps {
    id: string
    name: string
    symbol: string
    description?: string
    logoUrl?: string
    status: string
    progress: number
    marketCap: string
    createdAt: string
    creator?: string
}

export function TokenLaunchCard({
    id,
    name,
    symbol,
    description,
    logoUrl,
    status,
    progress,
    marketCap,
    createdAt,
    creator
}: TokenLaunchCardProps) {
    return (
        <Link href={`/launchpad/${id}`}>
            <Card className="bg-card dark:bg-[#111111] border-border/40 hover:border-border/80 transition-all duration-300 group overflow-hidden h-full">
                <CardContent className="p-3 flex gap-4 h-full">
                    {/* Left: Large Image */}
                    <div className="w-[160px] h-[160px] flex-shrink-0 relative rounded-md overflow-hidden bg-muted/20 border border-border/20">
                        {logoUrl ? (
                            <img src={logoUrl} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                                <span className="text-4xl font-bold text-foreground/40">{symbol.charAt(0)}</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Content */}
                    <div className="flex flex-col flex-1 min-w-0 justify-between py-0.5">
                        <div>
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <h3 className="font-bold text-base text-foreground leading-tight group-hover:text-[#F3C623] transition-colors truncate pr-2">
                                        {name}
                                    </h3>
                                    <p className="text-xs font-medium text-muted-foreground mt-0.5 uppercase tracking-wide">
                                        {symbol}
                                    </p>
                                </div>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                                    {(() => {
                                        try {
                                            // Ensure date is treated as UTC if it comes from SQLite (no timezone info)
                                            const dateStr = createdAt.includes('Z') || createdAt.includes('+')
                                                ? createdAt
                                                : `${createdAt.replace(' ', 'T')}Z`
                                            return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
                                        } catch (e) {
                                            return 'recently'
                                        }
                                    })()}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-[8px] text-white font-bold">
                                        {creator ? creator.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                        {creator ? `${creator.slice(0, 4)}...${creator.slice(-4)}` : 'Unknown'}
                                    </span>
                                    {creator && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                navigator.clipboard.writeText(creator)
                                            }}
                                            className="ml-0.5 p-0.5 hover:bg-muted/50 rounded transition-colors"
                                            title="Copy address"
                                        >
                                            <Copy className="w-2.5 h-2.5 text-muted-foreground hover:text-foreground" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Description under address */}
                            {description && (
                                <p className="text-[10px] text-muted-foreground/70 line-clamp-2 mt-1.5">
                                    {description}
                                </p>
                            )}
                        </div>

                        {/* Stats & Progress */}
                        <div className="mt-3 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground">MC</span>
                                    <span className="font-bold text-foreground">{marketCap}</span>
                                </div>
                                <div className="flex items-center gap-1 text-green-500 font-medium">
                                    <span>↑ {progress.toFixed(1)}%</span>
                                </div>
                            </div>

                            <div className="relative h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                                <div
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#F3C623] to-amber-500 rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, Star, Clock, Plus, ExternalLink } from "lucide-react"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { useToast } from "@/hooks/use-toast"
import type { LaunchpadToken } from "@/lib/db"

type FilterType = 'all' | 'cooldown' | 'watchlist'

export default function LaunchpadPage() {
  const { activeAccount } = useWalletConnection()
  const { toast } = useToast()
  
  const [tokens, setTokens] = useState<LaunchpadToken[]>([])
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'marketCap'>('newest')

  // Fetch tokens
  useEffect(() => {
    async function fetchTokens() {
      try {
        setLoading(true)
        const response = await fetch(`/api/launchpad/tokens?sortBy=${sortBy}`)
        const data = await response.json()
        
        if (data.success) {
          setTokens(data.tokens)
        } else {
          throw new Error(data.error)
        }
      } catch (error: any) {
        console.error('Error fetching tokens:', error)
        toast({
          title: "Error",
          description: "Failed to fetch tokens",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTokens()
  }, [sortBy, toast])

  // Fetch watchlist
  useEffect(() => {
    async function fetchWatchlist() {
      if (!activeAccount) return

      try {
        const response = await fetch(`/api/launchpad/watchlist?userAddress=${activeAccount.address}`)
        const data = await response.json()
        
        if (data.success) {
          setWatchlist(data.tokenIds)
        }
      } catch (error) {
        console.error('Error fetching watchlist:', error)
      }
    }

    fetchWatchlist()
  }, [activeAccount])

  // Filter tokens
  const filteredTokens = useMemo(() => {
    let filtered = tokens

    if (filter === 'cooldown') {
      // Show tokens that have passed cooldown or are active
      const now = new Date().toISOString()
      filtered = tokens.filter(t => 
        t.status === 'active' || 
        (t.status === 'cooldown' && t.cooldownEndTime && t.cooldownEndTime <= now)
      )
    } else if (filter === 'watchlist') {
      filtered = tokens.filter(t => watchlist.includes(t.id))
    }

    return filtered
  }, [tokens, filter, watchlist])

  // Toggle watchlist
  const toggleWatchlist = async (tokenId: string) => {
    if (!activeAccount) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to use watchlist",
        variant: "destructive"
      })
      return
    }

    try {
      const isWatched = watchlist.includes(tokenId)
      
      if (isWatched) {
        // Remove from watchlist
        const response = await fetch(
          `/api/launchpad/watchlist?userAddress=${activeAccount.address}&tokenId=${tokenId}`,
          { method: 'DELETE' }
        )
        const data = await response.json()
        
        if (data.success) {
          setWatchlist(prev => prev.filter(id => id !== tokenId))
          toast({
            title: "Removed from Watchlist",
            description: "Token has been removed from your watchlist"
          })
        }
      } else {
        // Add to watchlist
        const response = await fetch('/api/launchpad/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: activeAccount.address,
            tokenId
          })
        })
        const data = await response.json()
        
        if (data.success) {
          setWatchlist(prev => [...prev, tokenId])
          toast({
            title: "Added to Watchlist",
            description: "Token has been added to your watchlist"
          })
        }
      }
    } catch (error: any) {
      console.error('Error toggling watchlist:', error)
      toast({
        title: "Error",
        description: "Failed to update watchlist",
        variant: "destructive"
      })
    }
  }

  // Get status badge
  const getStatusBadge = (token: LaunchpadToken) => {
    if (token.status === 'draft') {
      return <Badge variant="outline">Draft</Badge>
    } else if (token.status === 'deployed') {
      return <Badge variant="outline">Deployed</Badge>
    } else if (token.status === 'cooldown') {
      const now = new Date()
      const endTime = token.cooldownEndTime ? new Date(token.cooldownEndTime) : now
      const isPassed = endTime <= now
      
      if (isPassed) {
        return <Badge className="bg-green-500">Cooldown Passed</Badge>
      } else {
        const hoursLeft = Math.ceil((endTime.getTime() - now.getTime()) / (1000 * 60 * 60))
        return <Badge variant="secondary">Cooldown: {hoursLeft}h left</Badge>
      }
    } else if (token.status === 'active') {
      return <Badge className="bg-green-500">Active</Badge>
    }
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Token Launchpad</h1>
          <p className="text-muted-foreground mt-2">
            Launch your token on 10xSwap DEX
          </p>
        </div>
        <Link href="/launchpad/create">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Launch Token
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Tokens</TabsTrigger>
            <TabsTrigger value="cooldown">
              <Clock className="h-4 w-4 mr-2" />
              Passed Cooldown
            </TabsTrigger>
            <TabsTrigger value="watchlist">
              <Star className="h-4 w-4 mr-2" />
              My Watchlist
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'newest' | 'marketCap')}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="marketCap">Market Cap</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Token List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTokens.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <p className="text-muted-foreground">No tokens found</p>
            {filter === 'watchlist' && !activeAccount && (
              <p className="text-sm text-muted-foreground mt-2">
                Connect your wallet to see your watchlist
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTokens.map((token) => (
            <Card key={token.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {token.logoPath ? (
                      <Image
                        src={token.logoPath}
                        alt={token.name}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {token.symbol.substring(0, 2)}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{token.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{token.symbol}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleWatchlist(token.id)}
                    className={watchlist.includes(token.id) ? "text-yellow-500" : ""}
                  >
                    <Star className={`h-5 w-5 ${watchlist.includes(token.id) ? "fill-current" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {token.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {token.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(token)}
                  {token.assetId && (
                    <Badge variant="outline">ASA: {token.assetId}</Badge>
                  )}
                </div>

                {token.marketCap !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-medium">
                      ${token.marketCap.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">Market Cap</span>
                  </div>
                )}

                <div className="flex gap-2">
                  {token.website && (
                    <Link href={token.website} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Website
                      </Button>
                    </Link>
                  )}
                  {token.twitter && (
                    <Link href={token.twitter} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        Twitter
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(token.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

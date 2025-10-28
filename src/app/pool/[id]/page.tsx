'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'

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
  const poolId = params.id as string
  const [pool, setPool] = useState<PoolDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/pool">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pools
          </Button>
        </Link>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : pool ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {pool.asset1.symbol} / {pool.asset2.symbol}
                <span className="text-sm font-normal text-muted-foreground capitalize">
                  ({pool.dexName})
                </span>
              </CardTitle>
              <CardDescription>Liquidity pool details and token information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pool Address */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Pool Address</h3>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-xs font-mono break-all flex-1">
                    {poolId}
                  </code>
                  <a
                    href={`https://testnet.algoexplorer.io/address/${poolId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>

              {/* Token 1 Details */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Token 1: {pool.asset1.symbol}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Asset ID:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="px-2 py-1 bg-muted rounded font-mono">
                        {pool.asset1.id}
                      </code>
                      {pool.asset1.id !== 0 && (
                        <a
                          href={`https://testnet.algoexplorer.io/asset/${pool.asset1.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium mt-1">{pool.asset1.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Decimals:</span>
                    <p className="font-medium mt-1">{pool.asset1.decimals}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reserve:</span>
                    <p className="font-medium mt-1">
                      {(Number(pool.reserve1) / Math.pow(10, pool.asset1.decimals)).toLocaleString(undefined, {
                        maximumFractionDigits: 2
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Token 2 Details */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Token 2: {pool.asset2.symbol}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Asset ID:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="px-2 py-1 bg-muted rounded font-mono">
                        {pool.asset2.id}
                      </code>
                      {pool.asset2.id !== 0 && (
                        <a
                          href={`https://testnet.algoexplorer.io/asset/${pool.asset2.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium mt-1">{pool.asset2.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Decimals:</span>
                    <p className="font-medium mt-1">{pool.asset2.decimals}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reserve:</span>
                    <p className="font-medium mt-1">
                      {(Number(pool.reserve2) / Math.pow(10, pool.asset2.decimals)).toLocaleString(undefined, {
                        maximumFractionDigits: 2
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pool Info */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Pool Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">DEX:</span>
                    <p className="font-medium mt-1 capitalize">{pool.dexName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fee:</span>
                    <p className="font-medium mt-1">{pool.fee / 100}%</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Link href={`/trade?from=${pool.asset1.id}&to=${pool.asset2.id}`} className="flex-1">
                  <Button className="w-full">
                    Trade {pool.asset1.symbol} → {pool.asset2.symbol}
                  </Button>
                </Link>
                <Link href="/pool" className="flex-1">
                  <Button variant="outline" className="w-full">
                    View All Pools
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

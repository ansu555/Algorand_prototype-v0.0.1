'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Zap, Shield, Leaf, Clock } from 'lucide-react'

interface AlgorandData {
  network: {
    network: string
    chainId: string
    nativeSymbol: string
    blockTime: number
    finality: string
  }
  address: string
  supportedAssets: string[]
}

export function AlgorandInfo() {
  const [data, setData] = useState<AlgorandData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAlgorandInfo = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/algorand')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch Algorand info')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlgorandInfo()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading Algorand info...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error: {error}</p>
            <Button onClick={fetchAlgorandInfo} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No Algorand data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔷 Algorand Network
            <Badge variant={data.network.network === 'mainnet' ? 'default' : 'secondary'}>
              {data.network.network}
            </Badge>
          </CardTitle>
          <CardDescription>
            Pure Proof of Stake blockchain with instant finality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">{data.network.blockTime}s</p>
                <p className="text-xs text-muted-foreground">Block Time</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">46,000+</p>
                <p className="text-xs text-muted-foreground">TPS Capable</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Instant</p>
                <p className="text-xs text-muted-foreground">Finality</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Carbon-</p>
                <p className="text-xs text-muted-foreground">Negative</p>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Wallet Address:</p>
            <code className="text-xs bg-muted p-2 rounded block break-all">
              {data.address}
            </code>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2">Supported Assets:</p>
            <div className="flex flex-wrap gap-2">
              {data.supportedAssets.map((asset) => (
                <Badge key={asset} variant="outline">
                  {asset}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Algorand Advantages</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span><strong>Pure Proof of Stake:</strong> Every token holder participates in consensus</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span><strong>Instant Finality:</strong> No forks, immediate transaction confirmation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span><strong>Atomic Transfers:</strong> Multi-asset, multi-party transactions in single block</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span><strong>Low Fees:</strong> Minimal transaction costs (~0.001 ALGO)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span><strong>ASA Standard:</strong> Native token creation without smart contracts</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { walletManager } from '@/lib/algorand-wallet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function WalletInfo() {
  const [connection, setConnection] = useState(walletManager.getConnection())
  const [balance, setBalance] = useState<string | null>(null)

  useEffect(() => {
    // Check connection status periodically
    const interval = setInterval(() => {
      setConnection(walletManager.getConnection())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const getBalance = async () => {
    if (!connection) return
    
    try {
      // This would integrate with your Algorand agent
      const agent = await import('@/lib/algorand').then(m => m.buildAlgorandAgent())
      // Add balance fetching logic here
      setBalance('Loading...')
    } catch (error) {
      console.error('Failed to get balance:', error)
    }
  }

  if (!connection) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No wallet connected</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">Wallet Type:</p>
          <p className="text-sm text-muted-foreground">{connection.walletType}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium">Address:</p>
          <p className="text-xs font-mono break-all">{connection.selectedAccount}</p>
        </div>

        <div>
          <p className="text-sm font-medium">Balance:</p>
          <p className="text-sm text-muted-foreground">{balance || 'Not loaded'}</p>
        </div>

        <Button onClick={getBalance} className="w-full">
          Get Balance
        </Button>
      </CardContent>
    </Card>
  )
}

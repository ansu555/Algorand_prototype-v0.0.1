'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { walletManager, type WalletType } from '@/lib/algorand-wallet'

const SUPPORTED_WALLETS = [
  {
    id: 'pera' as WalletType,
    name: 'Pera Wallet',
    description: 'Most popular Algorand wallet',
    icon: '🔷',
    mobile: true,
    desktop: true
  },
  {
    id: 'lute' as WalletType,
    name: 'Lute Wallet',
    description: 'Browser extension wallet',
    icon: '🎵',
    mobile: false,
    desktop: true
  },
  {
    id: 'defly' as WalletType,
    name: 'Defly Wallet',
    description: 'DeFi-focused wallet',
    icon: '🦋',
    mobile: true,
    desktop: true
  },
  {
    id: 'myalgo' as WalletType,
    name: 'MyAlgo Wallet',
    description: 'Web-based wallet',
    icon: '🌐',
    mobile: false,
    desktop: true
  },
  {
    id: 'exodus' as WalletType,
    name: 'Exodus Wallet',
    description: 'Multi-chain wallet',
    icon: '🚀',
    mobile: true,
    desktop: true
  }
]

export function AlgorandWalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null)
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if already connected
    const connection = walletManager.getConnection()
    if (connection) {
      setConnectedWallet(connection.walletType)
      setConnectedAccount(connection.selectedAccount)
    }
  }, [])

  const handleConnect = async (walletType: WalletType) => {
    setIsConnecting(true)
    setError(null)

    try {
      const accounts = await walletManager.connectWallet(walletType)
      setConnectedWallet(walletType)
      setConnectedAccount(accounts[0])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    walletManager.disconnect()
    setConnectedWallet(null)
    setConnectedAccount(null)
    setError(null)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  if (connectedWallet && connectedAccount) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔷 Wallet Connected
          </CardTitle>
          <CardDescription>
            {SUPPORTED_WALLETS.find(w => w.id === connectedWallet)?.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Address:</p>
            <p className="text-xs font-mono">{formatAddress(connectedAccount)}</p>
          </div>
          <Button 
            onClick={handleDisconnect}
            variant="outline"
            className="w-full"
          >
            Disconnect
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>🔗 Connect Algorand Wallet</CardTitle>
        <CardDescription>
          Choose your preferred Algorand wallet to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {SUPPORTED_WALLETS.map((wallet) => (
          <Button
            key={wallet.id}
            onClick={() => handleConnect(wallet.id)}
            disabled={isConnecting}
            variant="outline"
            className="w-full justify-start h-auto p-4"
          >
            <div className="flex items-center gap-3 w-full">
              <span className="text-2xl">{wallet.icon}</span>
              <div className="flex-1 text-left">
                <p className="font-medium">{wallet.name}</p>
                <p className="text-xs text-muted-foreground">{wallet.description}</p>
              </div>
              <div className="flex gap-1">
                {wallet.mobile && <Badge variant="secondary" className="text-xs">Mobile</Badge>}
                {wallet.desktop && <Badge variant="secondary" className="text-xs">Desktop</Badge>}
              </div>
            </div>
          </Button>
        ))}
        
        {isConnecting && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Connecting...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

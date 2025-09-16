'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Copy, AlertCircle, Smartphone, Monitor } from 'lucide-react'
import { 
  useTxnLabWallet, 
  useWalletConnection, 
  useWalletActions 
} from '@/components/providers/txnlab-wallet-provider'
import { getSupportedWallets, WalletId } from '@/lib/txnlab-wallet-config'

export function TxnLabAlgorandWalletConnect() {
  const { isConnected, activeAccount, activeWallet, accounts } = useWalletConnection()
  const { connect, disconnect, setActiveAccount } = useWalletActions()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supportedWallets = getSupportedWallets()

  const handleConnect = async (walletId: WalletId) => {
    setIsConnecting(true)
    setError(null)

    try {
      await connect(walletId)
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect wallet')
    }
  }

  const handleAccountSwitch = (accountAddress: string) => {
    const account = accounts.find(acc => acc.address === accountAddress)
    if (account) {
      setActiveAccount(account)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  if (isConnected && activeAccount) {
    const connectedWallet = supportedWallets.find(w => w.id === activeWallet)
    
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{connectedWallet?.icon || '🔷'}</span>
            Wallet Connected
          </CardTitle>
          <CardDescription>
            {connectedWallet?.name || activeWallet}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Address:</p>
                <p className="text-xs font-mono">{formatAddress(activeAccount.address)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(activeAccount.address)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {accounts.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Switch Account:</p>
              <Select value={activeAccount.address} onValueChange={handleAccountSwitch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.address} value={account.address}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{formatAddress(account.address)}</span>
                        {account.address === activeAccount.address && (
                          <Badge variant="secondary">Current</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {supportedWallets.map((wallet) => (
          <Button
            key={wallet.id}
            onClick={() => handleConnect(wallet.id)}
            disabled={isConnecting}
            variant="outline"
            className="w-full justify-start h-auto p-4"
          >
            <div className="flex items-center gap-3 w-full">
              {isConnecting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <span className="text-2xl">{wallet.icon}</span>
              )}
              <div className="flex-1 text-left">
                <p className="font-medium">{wallet.name}</p>
                <p className="text-xs text-muted-foreground">{wallet.description}</p>
              </div>
              <div className="flex gap-1">
                {wallet.mobile && (
                  <Badge variant="secondary" className="text-xs">
                    <Smartphone className="h-3 w-3" />
                  </Badge>
                )}
                {wallet.desktop && (
                  <Badge variant="secondary" className="text-xs">
                    <Monitor className="h-3 w-3" />
                  </Badge>
                )}
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
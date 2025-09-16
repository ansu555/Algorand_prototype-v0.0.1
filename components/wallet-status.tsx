'use client'

import React from 'react'
import { useWalletConnection } from '@/components/providers/txnlab-wallet-provider'
import { getSupportedWallets } from '@/lib/txnlab-wallet-config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Copy, ExternalLink, Wallet, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface WalletStatusProps {
  className?: string
  showDetails?: boolean
}

export function WalletStatus({ className = '', showDetails = true }: WalletStatusProps) {
  const { isConnected, activeAccount, activeWallet, accounts, hasMultipleAccounts } = useWalletConnection()

  const supportedWallets = getSupportedWallets()
  const walletInfo = activeWallet ? supportedWallets.find(w => w.id === activeWallet) : null

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const copyAddress = () => {
    if (activeAccount?.address) {
      navigator.clipboard.writeText(activeAccount.address)
      toast.success('Address copied to clipboard')
    }
  }

  const formatBalance = (balance: number) => {
    return (balance / 1000000).toFixed(4) // Convert microAlgos to Algos
  }

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Wallet className="w-5 h-5" />
            <span>Wallet Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">No wallet connected</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <span className="text-lg">{walletInfo?.icon}</span>
          <span>Wallet Status</span>
          <Badge variant="secondary" className="ml-auto">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        </CardTitle>
        <CardDescription>
          {walletInfo?.name} • {formatAddress(activeAccount?.address || '')}
        </CardDescription>
      </CardHeader>
      
      {showDetails && (
        <CardContent className="space-y-4">
          {/* Account Information */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Account:</span>
              <div className="flex items-center space-x-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">
                    {activeAccount?.address.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {formatAddress(activeAccount?.address || '')}
                </code>
                <Button size="sm" variant="ghost" onClick={copyAddress}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Account Balance - Note: Balance needs to be fetched separately */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Balance:</span>
              <span className="text-sm font-mono text-muted-foreground">
                Fetch balance separately
              </span>
            </div>

            {/* Multiple Accounts Indicator */}
            {hasMultipleAccounts && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Accounts:</span>
                <Badge variant="outline">{accounts.length}</Badge>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-1"
            >
              <a
                href={`https://testnet.algoexplorer.io/address/${activeAccount?.address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Explorer
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAddress}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Address
            </Button>
          </div>

          {/* Network Information */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Network:</span>
              <Badge variant="outline">Testnet</Badge>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default WalletStatus

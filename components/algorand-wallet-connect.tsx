'use client'

import React, { useState } from 'react'
import { useTxnLabWallet, useWalletConnection, useWalletActions } from '@/components/providers/txnlab-wallet-provider'
import { getSupportedWallets, WalletId } from '@/lib/txnlab-wallet-config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Copy, ExternalLink, LogOut, Wallet, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface WalletConnectProps {
  variant?: 'button' | 'card' | 'dropdown'
  className?: string
}

export function AlgorandWalletConnect({ variant = 'button', className = '' }: WalletConnectProps) {
  const { isConnected, activeAccount, activeWallet, accounts, hasMultipleAccounts } = useWalletConnection()
  const { connect, disconnect, setActiveAccount } = useWalletActions()
  const [isConnecting, setIsConnecting] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<WalletId | null>(null)

  const supportedWallets = getSupportedWallets()

  const handleConnect = async (walletId: WalletId) => {
    try {
      setIsConnecting(true)
      setSelectedWallet(walletId)
      await connect(walletId)
      toast.success(`Connected to ${supportedWallets.find(w => w.id === walletId)?.name}`)
    } catch (error: any) {
      console.error('Connection failed:', error)
      toast.error(`Failed to connect: ${error.message}`)
    } finally {
      setIsConnecting(false)
      setSelectedWallet(null)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
      toast.success('Wallet disconnected')
    } catch (error: any) {
      console.error('Disconnect failed:', error)
      toast.error(`Failed to disconnect: ${error.message}`)
    }
  }

  const handleAccountSwitch = (account: any) => {
    setActiveAccount(account)
    toast.success('Account switched')
  }

  const copyAddress = () => {
    if (activeAccount?.address) {
      navigator.clipboard.writeText(activeAccount.address)
      toast.success('Address copied to clipboard')
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getWalletInfo = (walletId: WalletId) => {
    return supportedWallets.find(w => w.id === walletId)
  }

  if (variant === 'dropdown') {
    if (!isConnected) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={className}>
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Choose Wallet</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {supportedWallets.map((wallet) => (
              <DropdownMenuItem
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={isConnecting}
                className="flex items-center space-x-3"
              >
                <span className="text-lg">{wallet.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{wallet.name}</div>
                  <div className="text-xs text-muted-foreground">{wallet.description}</div>
                </div>
                {isConnecting && selectedWallet === wallet.id && (
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={className}>
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getWalletInfo(activeWallet!)?.icon}</span>
              <div className="text-left">
                <div className="text-sm font-medium">{getWalletInfo(activeWallet!)?.name}</div>
                <div className="text-xs text-muted-foreground">{formatAddress(activeAccount?.address || '')}</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Wallet Connected</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={copyAddress} className="flex items-center space-x-2">
            <Copy className="w-4 h-4" />
            <span>Copy Address</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <a
              href={`https://testnet.algoexplorer.io/address/${activeAccount?.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View on Explorer</span>
            </a>
          </DropdownMenuItem>

          {hasMultipleAccounts && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Switch Account</DropdownMenuLabel>
              {accounts.map((account) => (
                <DropdownMenuItem
                  key={account.address}
                  onClick={() => handleAccountSwitch(account)}
                  className="flex items-center space-x-2"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      {account.address.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{formatAddress(account.address)}</span>
                  {account.address === activeAccount?.address && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect} className="flex items-center space-x-2 text-red-600">
            <LogOut className="w-4 h-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (variant === 'card') {
    if (!isConnected) {
      return (
        <Card className={className}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="w-5 h-5" />
              <span>Connect Your Wallet</span>
            </CardTitle>
            <CardDescription>
              Connect your Algorand wallet to start trading and managing your assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {supportedWallets.map((wallet) => (
                <Button
                  key={wallet.id}
                  variant="outline"
                  onClick={() => handleConnect(wallet.id)}
                  disabled={isConnecting}
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                  <span className="text-2xl">{wallet.icon}</span>
                  <div className="text-center">
                    <div className="font-medium">{wallet.name}</div>
                    <div className="text-xs text-muted-foreground">{wallet.description}</div>
                  </div>
                  {isConnecting && selectedWallet === wallet.id && (
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="text-lg">{getWalletInfo(activeWallet!)?.icon}</span>
            <span>Wallet Connected</span>
            <Badge variant="secondary" className="ml-auto">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          </CardTitle>
          <CardDescription>
            {getWalletInfo(activeWallet!)?.name} • {formatAddress(activeAccount?.address || '')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Address:</span>
            <div className="flex items-center space-x-2">
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {formatAddress(activeAccount?.address || '')}
              </code>
              <Button size="sm" variant="ghost" onClick={copyAddress}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {hasMultipleAccounts && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Switch Account:</span>
              <div className="space-y-1">
                {accounts.map((account) => (
                  <Button
                    key={account.address}
                    variant={account.address === activeAccount?.address ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleAccountSwitch(account)}
                    className="w-full justify-start"
                  >
                    <Avatar className="w-6 h-6 mr-2">
                      <AvatarFallback className="text-xs">
                        {account.address.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {formatAddress(account.address)}
                    {account.address === activeAccount?.address && (
                      <CheckCircle className="w-4 h-4 ml-auto" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

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
                View on Explorer
              </a>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              className="flex-1"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default button variant
  if (!isConnected) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button className={className}>
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Wallet</DialogTitle>
            <DialogDescription>
              Choose your preferred Algorand wallet to connect
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 mt-4">
            {supportedWallets.map((wallet) => (
              <Button
                key={wallet.id}
                variant="outline"
                onClick={() => handleConnect(wallet.id)}
                disabled={isConnecting}
                className="h-auto p-4 flex items-center space-x-3"
              >
                <span className="text-2xl">{wallet.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{wallet.name}</div>
                  <div className="text-xs text-muted-foreground">{wallet.description}</div>
                </div>
                {isConnecting && selectedWallet === wallet.id && (
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="secondary" className="flex items-center space-x-1">
        <span className="text-sm">{getWalletInfo(activeWallet!)?.icon}</span>
        <span>{getWalletInfo(activeWallet!)?.name}</span>
        <CheckCircle className="w-3 h-3 text-green-500" />
      </Badge>
      <Button variant="outline" size="sm" onClick={copyAddress}>
        {formatAddress(activeAccount?.address || '')}
      </Button>
      <Button variant="ghost" size="sm" onClick={handleDisconnect}>
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  )
}

export default AlgorandWalletConnect



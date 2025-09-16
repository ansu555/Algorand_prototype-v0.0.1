'use client'

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { 
  WalletManager, 
  WalletId, 
  NetworkId,
  type WalletAccount, 
  type WalletState 
} from '@txnlab/use-wallet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Copy, AlertCircle, Smartphone, Monitor } from 'lucide-react'

// =========================
// Unified Config (networks, wallets, manager)
// =========================

const ALGORAND_NETWORK = (process.env.NEXT_PUBLIC_ALGORAND_NETWORK || 'testnet') as NetworkId

export const walletManagerConfig = {
  wallets: [
    WalletId.PERA,
    WalletId.DEFLY,
    WalletId.EXODUS,
    ...(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? [WalletId.WALLETCONNECT] : [])
  ],
  networks: {
    [NetworkId.TESTNET]: {
      algod: {
        token: '',
        baseServer: 'https://testnet-api.algonode.cloud',
        port: 443
      }
    },
    [NetworkId.MAINNET]: {
      algod: {
        token: '',
        baseServer: 'https://mainnet-api.algonode.cloud',
        port: 443
      }
    }
  },
  defaultNetwork: ALGORAND_NETWORK
} as const

export const walletConnectConfig = {
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  metadata: {
    name: '10x Swap',
    description: 'Advanced cryptocurrency trading platform with AI-powered insights',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://10xswap.com',
    icons: ['https://10xswap.com/logo.png']
  }
}

export const walletManager = new WalletManager(walletManagerConfig as any)

export const getSupportedWallets = () => [
  {
    id: WalletId.PERA,
    name: 'Pera Wallet',
    description: 'Most popular Algorand wallet',
    icon: '🔷',
    mobile: true,
    desktop: true
  },
  {
    id: WalletId.DEFLY,
    name: 'Defly Wallet', 
    description: 'DeFi-focused wallet',
    icon: '🦋',
    mobile: true,
    desktop: true
  },
  {
    id: WalletId.EXODUS,
    name: 'Exodus Wallet',
    description: 'Multi-chain wallet',
    icon: '🚀',
    mobile: true,
    desktop: true
  },
  {
    // Lute requires '@agoralabs-sh/avm-web-provider'. Add back if installed.
  },
  ...(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? [{
    id: WalletId.WALLETCONNECT,
    name: 'WalletConnect',
    description: 'Connect any mobile wallet',
    icon: '🔗',
    mobile: true,
    desktop: true
  }] : [])
]

export { WalletId, NetworkId }

// =========================
// Provider + Hooks
// =========================

interface TxnLabWalletContextType {
  manager: WalletManager
  isConnected: boolean
  activeAccount: WalletAccount | null
  activeWallet: WalletId | null
  accounts: WalletAccount[]
  connect: (walletId: WalletId) => Promise<WalletAccount[]>
  disconnect: () => Promise<void>
  setActiveAccount: (account: WalletAccount) => void
  signTransactions: (txns: any[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>
  walletState: WalletState
}

const TxnLabWalletContext = createContext<TxnLabWalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [activeAccount, setActiveAccount] = useState<WalletAccount | null>(null)
  const [activeWallet, setActiveWallet] = useState<WalletId | null>(null)
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [walletState, setWalletState] = useState<WalletState>({} as WalletState)

  useEffect(() => {
    const unsubscribe = walletManager.subscribe((state: WalletState) => {
      setWalletState(state)
      setIsConnected(!!state.activeWallet)
      setActiveAccount(state.activeAccount || null)
      setActiveWallet(state.activeWallet || null)
      setAccounts(state.accounts || [])
    })

    const currentState = walletManager.store.state
    setWalletState(currentState)
    setIsConnected(!!currentState.activeWallet)
    setActiveAccount(currentState.activeAccount || null)
    setActiveWallet(currentState.activeWallet || null)
    setAccounts(currentState.accounts || [])

    return unsubscribe
  }, [])

  const connect = async (walletId: WalletId): Promise<WalletAccount[]> => {
    try {
      const accounts = await walletManager.connect(walletId)
      return accounts
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    }
  }

  const disconnect = async (): Promise<void> => {
    try {
      await walletManager.disconnect()
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
      throw error
    }
  }

  const setActiveAccountHandler = (account: WalletAccount) => {
    walletManager.setActiveAccount(account)
  }

  const signTransactions = async (
    txns: any[],
    indexesToSign?: number[]
  ): Promise<(Uint8Array | null)[]> => {
    try {
      if (!activeWallet) {
        throw new Error('No wallet connected')
      }
      const wallet = walletManager.getWallet(activeWallet)
      if (!wallet) {
        throw new Error('Active wallet not found')
      }
      return await wallet.signTransactions(txns, indexesToSign)
    } catch (error) {
      console.error('Failed to sign transactions:', error)
      throw error
    }
  }

  const contextValue: TxnLabWalletContextType = {
    manager: walletManager,
    isConnected,
    activeAccount,
    activeWallet,
    accounts,
    connect,
    disconnect,
    setActiveAccount: setActiveAccountHandler,
    signTransactions,
    walletState
  }

  return (
    <TxnLabWalletContext.Provider value={contextValue}>
      {children}
    </TxnLabWalletContext.Provider>
  )
}

export function useTxnLabWallet(): TxnLabWalletContextType {
  const context = useContext(TxnLabWalletContext)
  if (context === undefined) {
    throw new Error('useTxnLabWallet must be used within a WalletProvider')
  }
  return context
}

export function useWalletConnection() {
  const { isConnected, activeAccount, activeWallet, accounts } = useTxnLabWallet()
  return {
    isConnected,
    activeAccount,
    activeWallet,
    accounts,
    hasMultipleAccounts: accounts.length > 1
  }
}

export function useWalletActions() {
  const { connect, disconnect, setActiveAccount, signTransactions } = useTxnLabWallet()
  return { connect, disconnect, setActiveAccount, signTransactions }
}

// =========================
// UI Components
// =========================

export function WalletConnect() {
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
        {getSupportedWallets().map((wallet) => (
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

export function WalletInfo() {
  const { isConnected, activeAccount, activeWallet } = useWalletConnection()
  const [balance, setBalance] = useState<string | null>(null)
  const address = useMemo(() => activeAccount?.address ?? null, [activeAccount])

  const getBalance = async () => {
    if (!address) return
    try {
      const agent = await import('@/lib/algorand').then(m => m.buildAlgorandAgent())
      setBalance('Loading...')
    } catch (error) {
      console.error('Failed to get balance:', error)
    }
  }

  if (!isConnected || !address) {
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
          <p className="text-sm font-medium">Wallet:</p>
          <p className="text-sm text-muted-foreground">{activeWallet}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Address:</p>
          <p className="text-xs font-mono break-all">{address}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Balance:</p>
          <p className="text-sm text-muted-foreground">{balance || 'Not loaded'}</p>
        </div>
        <Button onClick={getBalance} className="w-full">Get Balance</Button>
      </CardContent>
    </Card>
  )
}



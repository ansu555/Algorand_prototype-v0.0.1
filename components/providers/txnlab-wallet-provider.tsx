'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { 
  WalletId, 
  type WalletAccount, 
  type WalletState 
} from '@txnlab/use-wallet'
import { 
  useWallet, 
  WalletProvider 
} from '@txnlab/use-wallet-react'
import { WalletManager } from '@txnlab/use-wallet'
import { walletManagerConfig } from '@/lib/txnlab-wallet-config'

interface TxnLabWalletContextType {
  // Connection state
  isConnected: boolean
  activeAccount: WalletAccount | null
  activeWallet: any // Wallet object from useWallet hook
  accounts: WalletAccount[]
  
  // Connection methods
  connect: (walletId: WalletId) => Promise<WalletAccount[]>
  disconnect: () => Promise<void>
  setActiveAccount: (account: WalletAccount) => void
  
  // Transaction signing
  signTransactions: (txns: any[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>
  
  // Additional properties from useWallet
  wallets: any[]
  isReady: boolean
  algodClient: any
  activeWalletAccounts: WalletAccount[] | null
  activeWalletAddresses: string[] | null
  activeAddress: string | null
}

const TxnLabWalletContext = createContext<TxnLabWalletContextType | undefined>(undefined)

interface TxnLabWalletProviderProps {
  children: ReactNode
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Internal provider that uses the React hooks
function TxnLabWalletProviderInternal({ children }: TxnLabWalletProviderProps) {
  // Return a minimal provider if not in browser
  if (!isBrowser) {
    const emptyContext: TxnLabWalletContextType = {
      isConnected: false,
      activeAccount: null,
      activeWallet: null,
      accounts: [],
      connect: async () => [],
      disconnect: async () => {},
      setActiveAccount: () => {},
      signTransactions: async () => [],
      wallets: [],
      isReady: false,
      algodClient: null,
      activeWalletAccounts: null,
      activeWalletAddresses: null,
      activeAddress: null
    }
    return (
      <TxnLabWalletContext.Provider value={emptyContext}>
        {children}
      </TxnLabWalletContext.Provider>
    )
  }

  const { 
    wallets,
    isReady,
    algodClient,
    activeWallet,
    activeWalletAccounts,
    activeWalletAddresses,
    activeAccount,
    activeAddress,
    signTransactions
  } = useWallet()

  // Helper functions to maintain compatibility
  const connect = async (walletId: WalletId): Promise<WalletAccount[]> => {
    const wallet = wallets.find(w => w.id === walletId)
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`)
    }
    return await wallet.connect()
  }

  const disconnect = async (): Promise<void> => {
    if (activeWallet) {
      await activeWallet.disconnect()
    }
  }

  const setActiveAccountHandler = (account: WalletAccount) => {
    if (activeWallet) {
      activeWallet.setActiveAccount(account.address)
    }
  }

  const contextValue: TxnLabWalletContextType = {
    isConnected: !!activeWallet?.isConnected,
    activeAccount,
    activeWallet,
    accounts: activeWalletAccounts || [],
    connect,
    disconnect,
    setActiveAccount: setActiveAccountHandler,
    signTransactions,
    wallets,
    isReady,
    algodClient,
    activeWalletAccounts,
    activeWalletAddresses,
    activeAddress
  }

  return (
    <TxnLabWalletContext.Provider value={contextValue}>
      {children}
    </TxnLabWalletContext.Provider>
  )
}

// Main provider that wraps with TxnLab's WalletProvider
export function TxnLabWalletProvider({ children }: TxnLabWalletProviderProps) {
  // Create wallet manager instance
  const walletManager = new WalletManager(walletManagerConfig)
  
  return (
    <WalletProvider manager={walletManager}>
      <TxnLabWalletProviderInternal>
        {children}
      </TxnLabWalletProviderInternal>
    </WalletProvider>
  )
}

export function useTxnLabWallet(): TxnLabWalletContextType {
  const context = useContext(TxnLabWalletContext)
  if (context === undefined) {
    throw new Error('useTxnLabWallet must be used within a TxnLabWalletProvider')
  }
  return context
}

// Convenience hooks
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
  
  return {
    connect,
    disconnect,
    setActiveAccount,
    signTransactions
  }
}
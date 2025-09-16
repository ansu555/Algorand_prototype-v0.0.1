'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  WalletManager, 
  WalletId, 
  type WalletAccount, 
  type WalletState 
} from '@txnlab/use-wallet'
import { walletManager } from '@/lib/txnlab-wallet-config'

interface TxnLabWalletContextType {
  // Wallet Manager instance
  manager: WalletManager
  
  // Connection state
  isConnected: boolean
  activeAccount: WalletAccount | null
  activeWallet: WalletId | null
  accounts: WalletAccount[]
  
  // Connection methods
  connect: (walletId: WalletId) => Promise<WalletAccount[]>
  disconnect: () => Promise<void>
  setActiveAccount: (account: WalletAccount) => void
  
  // Transaction signing
  signTransactions: (txns: any[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>
  
  // State
  walletState: WalletState
}

const TxnLabWalletContext = createContext<TxnLabWalletContextType | undefined>(undefined)

interface TxnLabWalletProviderProps {
  children: ReactNode
}

export function TxnLabWalletProvider({ children }: TxnLabWalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [activeAccount, setActiveAccount] = useState<WalletAccount | null>(null)
  const [activeWallet, setActiveWallet] = useState<WalletId | null>(null)
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [walletState, setWalletState] = useState<WalletState>({} as WalletState)

  useEffect(() => {
    // Subscribe to wallet manager state changes
    const unsubscribe = walletManager.subscribe((state: WalletState) => {
      setWalletState(state)
      setIsConnected(!!state.activeWallet)
      setActiveAccount(state.activeAccount || null)
      setActiveWallet(state.activeWallet || null)
      setAccounts(state.accounts || [])
    })

    // Initialize with current state
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
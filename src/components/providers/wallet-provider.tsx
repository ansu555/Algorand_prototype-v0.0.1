'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { enhancedWalletManager, WalletConnection, WalletType } from '@/lib/enhanced-algorand-wallet'

interface WalletContextType {
  // Connection state
  isConnected: boolean
  connection: WalletConnection | null
  isConnecting: boolean
  error: string | null
  
  // Connection methods
  connectWallet: (walletType: WalletType) => Promise<string[]>
  disconnect: () => void
  switchAccount: (accountAddress: string) => Promise<void>
  
  // Wallet info
  selectedAccount: string | null
  accounts: string[]
  walletType: WalletType | null
  
  // WalletConnect specific
  walletConnectURI: string | null
  mobileWalletLinks: Record<string, string>
  isWalletConnectAvailable: boolean
  
  // Transaction signing
  signTransaction: (txn: any) => Promise<Uint8Array>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connection, setConnection] = useState<WalletConnection | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [walletConnectURI, setWalletConnectURI] = useState<string | null>(null)
  const [mobileWalletLinks, setMobileWalletLinks] = useState<Record<string, string>>({})

  useEffect(() => {
    // Set up wallet manager event listeners
    const handleConnecting = (data: { walletType: WalletType }) => {
      setIsConnecting(true)
      setError(null)
      setWalletConnectURI(null)
      setMobileWalletLinks({})
    }

    const handleConnected = (connectionData: WalletConnection) => {
      setConnection(connectionData)
      setIsConnected(true)
      setIsConnecting(false)
      setError(null)
      setWalletConnectURI(null)
      setMobileWalletLinks({})
    }

    const handleDisconnected = () => {
      setConnection(null)
      setIsConnected(false)
      setIsConnecting(false)
      setError(null)
      setWalletConnectURI(null)
      setMobileWalletLinks({})
    }

    const handleError = (errorData: Error) => {
      setError(errorData.message)
      setIsConnecting(false)
      setWalletConnectURI(null)
      setMobileWalletLinks({})
    }

    const handleAccountChanged = (data: { account: string }) => {
      if (connection) {
        setConnection({
          ...connection,
          selectedAccount: data.account
        })
      }
    }

    const handleConnectionRestored = (connectionData: WalletConnection) => {
      setConnection(connectionData)
      setIsConnected(true)
    }

    const handleWalletConnectURI = (data: { uri: string; walletType: WalletType }) => {
      setWalletConnectURI(data.uri)
    }

    const handleMobileWalletLink = (data: { walletId: string; uri: string }) => {
      setMobileWalletLinks(prev => ({
        ...prev,
        [data.walletId]: data.uri
      }))
    }

    // Register event listeners
    enhancedWalletManager.on('connecting', handleConnecting)
    enhancedWalletManager.on('connected', handleConnected)
    enhancedWalletManager.on('disconnected', handleDisconnected)
    enhancedWalletManager.on('error', handleError)
    enhancedWalletManager.on('accountChanged', handleAccountChanged)
    enhancedWalletManager.on('connectionRestored', handleConnectionRestored)
    enhancedWalletManager.on('walletConnectURI', handleWalletConnectURI)
    enhancedWalletManager.on('mobileWalletLink', handleMobileWalletLink)

    // Check for existing connection
    const existingConnection = enhancedWalletManager.getConnection()
    if (existingConnection) {
      setConnection(existingConnection)
      setIsConnected(true)
    }

    // Cleanup listeners on unmount
    return () => {
      enhancedWalletManager.off('connecting', handleConnecting)
      enhancedWalletManager.off('connected', handleConnected)
      enhancedWalletManager.off('disconnected', handleDisconnected)
      enhancedWalletManager.off('error', handleError)
      enhancedWalletManager.off('accountChanged', handleAccountChanged)
      enhancedWalletManager.off('connectionRestored', handleConnectionRestored)
      enhancedWalletManager.off('walletConnectURI', handleWalletConnectURI)
      enhancedWalletManager.off('mobileWalletLink', handleMobileWalletLink)
    }
  }, [connection])

  const connectWallet = async (walletType: WalletType): Promise<string[]> => {
    try {
      return await enhancedWalletManager.connectWallet(walletType)
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const disconnect = () => {
    enhancedWalletManager.disconnect()
  }

  const switchAccount = async (accountAddress: string): Promise<void> => {
    try {
      await enhancedWalletManager.switchAccount(accountAddress)
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const signTransaction = async (txn: any): Promise<Uint8Array> => {
    try {
      return await enhancedWalletManager.signTransaction(txn)
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const contextValue: WalletContextType = {
    // Connection state
    isConnected,
    connection,
    isConnecting,
    error,
    
    // Connection methods
    connectWallet,
    disconnect,
    switchAccount,
    
    // Wallet info
    selectedAccount: connection?.selectedAccount || null,
    accounts: connection?.accounts || [],
    walletType: connection?.walletType || null,
    
    // WalletConnect specific
    walletConnectURI,
    mobileWalletLinks,
    isWalletConnectAvailable: enhancedWalletManager.isWalletConnectAvailable(),
    
    // Transaction signing
    signTransaction
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

// Hook for wallet connection status
export function useWalletConnection() {
  const { isConnected, connection, selectedAccount, accounts, walletType } = useWallet()
  
  return {
    isConnected,
    connection,
    selectedAccount,
    accounts,
    walletType,
    hasMultipleAccounts: accounts.length > 1
  }
}

// Hook for wallet actions
export function useWalletActions() {
  const { connectWallet, disconnect, switchAccount, signTransaction } = useWallet()
  
  return {
    connectWallet,
    disconnect,
    switchAccount,
    signTransaction
  }
}

// Hook for WalletConnect specific features
export function useWalletConnect() {
  const { 
    walletConnectURI, 
    mobileWalletLinks, 
    isWalletConnectAvailable,
    isConnecting,
    walletType 
  } = useWallet()
  
  return {
    walletConnectURI,
    mobileWalletLinks,
    isWalletConnectAvailable,
    isConnecting,
    isWalletConnectActive: walletType === 'walletconnect'
  }
}
'use client'

import React, { createContext, useContext, ReactNode, useMemo } from 'react'
import algosdk from 'algosdk'
import { 
  WalletId, 
  type WalletAccount
} from '@txnlab/use-wallet'
import { 
  useWallet, 
  WalletProvider 
} from '@txnlab/use-wallet-react'
import { WalletManager } from '@txnlab/use-wallet'
import { walletManagerConfig } from '@/lib/txnlab-wallet-config'
import type { WalletSigner } from '@/lib/dex/types'
import type { SignerTransaction } from '@tinymanorg/tinyman-js-sdk'

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
  signTransactions: (
    txns: algosdk.Transaction[] | Uint8Array[],
    indexesToSign?: number[]
  ) => Promise<(Uint8Array | null)[]>
  transactionSigner?: (
    txnGroup: algosdk.Transaction[],
    indexesToSign: number[]
  ) => Promise<Uint8Array[]>
  
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
  transactionSigner: undefined,
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
    signTransactions,
    transactionSigner
  } = useWallet()

  // Helper functions to maintain compatibility
  const connect = async (walletId: WalletId): Promise<WalletAccount[]> => {
    const wallet = wallets.find(w => w.id === walletId)
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`)
    }
    
    // Log wallet info for debugging
    console.log(`Attempting to connect to ${walletId}:`, {
      id: wallet.id,
      isActive: wallet.isActive,
      isConnected: wallet.isConnected,
      metadata: wallet.metadata
    })
    
    try {
      return await wallet.connect()
    } catch (error: any) {
      console.error(`Connection error for ${walletId}:`, error)
      throw error
    }
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
  transactionSigner,
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

export function useWalletSigner(): WalletSigner | null {
  const { activeAccount, signTransactions, transactionSigner } = useTxnLabWallet()
  const address = activeAccount?.address

  return useMemo(() => {
    if (!address) {
      return null
    }

    const signWithWallet = async (
      transactions: algosdk.Transaction[],
      indexesToSign?: number[]
    ): Promise<Uint8Array[]> => {
      if (transactions.length === 0) {
        return []
      }

      const indexes = indexesToSign ?? transactions.map((_, idx) => idx)

      if (indexes.length === 0) {
        return []
      }

      if (transactionSigner) {
        return transactionSigner(transactions, indexes)
      }

      const encodedGroup = transactions.map((txn) => algosdk.encodeUnsignedTransaction(txn))
      const signed = await signTransactions(encodedGroup, indexes)

      if (signed.length !== indexes.length) {
        throw new Error(
          `Wallet returned ${signed.length} signatures, expected ${indexes.length}`
        )
      }

      return signed.map((payload, idx) => {
        if (!payload) {
          throw new Error(`Wallet declined to sign transaction at index ${indexes[idx]}`)
        }
        return payload
      })
    }

    const walletSigner: WalletSigner = {
      address,
      signTransactions: (transactions) => signWithWallet(transactions),
      signTinymanTransactions: async (txGroupList: SignerTransaction[][]) => {
        const allSigned: Uint8Array[] = []

        for (const group of txGroupList) {
          const txns = group.map((item) => item.txn)
          const indexesToSign: number[] = []

          group.forEach((item, idx) => {
            const signers = item.signers
            const requiresSignature =
              !signers ||
              signers.length === 0 ||
              signers.includes(address)

            if (requiresSignature) {
              indexesToSign.push(idx)
            }
          })

          const signedSubset = await signWithWallet(txns, indexesToSign)
          const signatureMap = new Map<number, Uint8Array>()

          indexesToSign.forEach((index, subsetIdx) => {
            signatureMap.set(index, signedSubset[subsetIdx])
          })

          group.forEach((item, idx) => {
            const signedPayload = signatureMap.get(idx)
            if (signedPayload) {
              allSigned.push(signedPayload)
            } else {
              allSigned.push(algosdk.encodeUnsignedTransaction(item.txn))
            }
          })
        }

        return allSigned
      }
    }

    return walletSigner
  }, [address, signTransactions, transactionSigner])
}

// Convenience hooks
export function useWalletConnection() {
  const { isConnected, activeAccount, activeWallet, accounts, wallets } = useTxnLabWallet()
  
  return {
    isConnected,
    activeAccount,
    activeWallet,
    accounts,
    wallets,
    hasMultipleAccounts: accounts.length > 1
  }
}

export function useWalletActions() {
  const { connect, disconnect, setActiveAccount, signTransactions } = useTxnLabWallet()
  const walletSigner = useWalletSigner()
  
  return {
    connect,
    disconnect,
    setActiveAccount,
    signTransactions,
    walletSigner
  }
}
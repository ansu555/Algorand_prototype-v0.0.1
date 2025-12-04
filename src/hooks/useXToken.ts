import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/xtoken'

interface XTokenState {
  balance: number
  formattedBalance: string
  isOptedIn: boolean
  isLoading: boolean
  error: string | null
  asaId: number | null
  isDeployed: boolean
}

interface XTokenActions {
  refreshBalance: () => Promise<void>
  optIn: () => Promise<boolean>
  checkOptIn: () => Promise<boolean>
}

/**
 * React hook for X Token operations
 * 
 * @example
 * ```tsx
 * const { balance, isOptedIn, optIn, isLoading } = useXToken()
 * 
 * if (!isOptedIn) {
 *   return <button onClick={optIn}>Opt-in to X Token</button>
 * }
 * 
 * return <span>Balance: {balance} X</span>
 * ```
 */
export function useXToken(): XTokenState & XTokenActions {
  const { activeAddress, signTransactions } = useWallet()
  
  const [state, setState] = useState<XTokenState>({
    balance: 0,
    formattedBalance: '0 X',
    isOptedIn: false,
    isLoading: true,
    error: null,
    asaId: null,
    isDeployed: false,
  })
  
  // Fetch balance and opt-in status
  const refreshBalance = useCallback(async () => {
    if (!activeAddress) {
      setState(prev => ({
        ...prev,
        balance: 0,
        formattedBalance: '0 X',
        isOptedIn: false,
        isLoading: false,
        error: null,
      }))
      return
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`/api/xtoken?address=${activeAddress}`)
      const data = await response.json()
      
      if (data.success) {
        setState(prev => ({
          ...prev,
          balance: data.balance || 0,
          formattedBalance: data.formattedBalance || '0 X',
          isOptedIn: data.isOptedIn || false,
          asaId: data.asaId || null,
          isDeployed: data.deployed || false,
          isLoading: false,
          error: null,
        }))
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Failed to fetch balance',
        }))
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [activeAddress])
  
  // Check opt-in status
  const checkOptIn = useCallback(async (): Promise<boolean> => {
    if (!activeAddress) return false
    
    try {
      const response = await fetch('/api/xtoken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check-opt-in',
          address: activeAddress,
        }),
      })
      const data = await response.json()
      
      if (data.success) {
        setState(prev => ({ ...prev, isOptedIn: data.isOptedIn }))
        return data.isOptedIn
      }
      return false
    } catch {
      return false
    }
  }, [activeAddress])
  
  // Opt-in to X Token
  const optIn = useCallback(async (): Promise<boolean> => {
    if (!activeAddress || !signTransactions) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }))
      return false
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // Get opt-in transaction from API
      const response = await fetch('/api/xtoken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'build-opt-in',
          address: activeAddress,
        }),
      })
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to build opt-in transaction')
      }
      
      // Decode transaction
      const txnBytes = Buffer.from(data.transaction, 'base64')
      
      // Sign transaction
      const signedTxns = await signTransactions([txnBytes])
      
      if (!signedTxns || signedTxns.length === 0 || !signedTxns[0]) {
        throw new Error('Transaction signing failed')
      }
      
      // Submit transaction to Algorand network
      const algodClient = getAlgodClient()
      const sendResult = await algodClient.sendRawTransaction(signedTxns[0]).do()
      const txId = sendResult.txid
      
      // Wait for confirmation
      await algosdk.waitForConfirmation(algodClient, txId, 4)
      
      // Refresh balance after opt-in
      await refreshBalance()
      
      return true
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Opt-in failed',
      }))
      return false
    }
  }, [activeAddress, signTransactions, refreshBalance])
  
  // Initial load and when address changes
  useEffect(() => {
    refreshBalance()
  }, [refreshBalance])
  
  return {
    ...state,
    refreshBalance,
    optIn,
    checkOptIn,
  }
}

/**
 * Hook to get X Token info (doesn't require wallet connection)
 */
export function useXTokenInfo() {
  const [info, setInfo] = useState<{
    isLoading: boolean
    isDeployed: boolean
    asaId: number | null
    name: string
    symbol: string
    decimals: number
    totalSupply: number
    circulatingSupply: number
    treasuryBalance: number
    url: string
    explorerUrl: string | null
    error: string | null
  }>({
    isLoading: true,
    isDeployed: false,
    asaId: null,
    name: 'X Token',
    symbol: 'X',
    decimals: 6,
    totalSupply: 0,
    circulatingSupply: 0,
    treasuryBalance: 0,
    url: '',
    explorerUrl: null,
    error: null,
  })
  
  useEffect(() => {
    async function fetchInfo() {
      try {
        const response = await fetch('/api/xtoken?info=true')
        const data = await response.json()
        
        if (data.success) {
          setInfo({
            isLoading: false,
            isDeployed: data.deployed,
            asaId: data.asaId || null,
            name: data.info?.name || 'X Token',
            symbol: data.info?.symbol || 'X',
            decimals: data.info?.decimals || 6,
            totalSupply: data.info?.totalSupply || 0,
            circulatingSupply: data.info?.circulatingSupply || 0,
            treasuryBalance: data.info?.treasuryBalance || 0,
            url: data.info?.url || '',
            explorerUrl: data.explorer || null,
            error: null,
          })
        } else {
          setInfo(prev => ({
            ...prev,
            isLoading: false,
            error: data.error || 'Failed to fetch token info',
          }))
        }
      } catch (err) {
        setInfo(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }))
      }
    }
    
    fetchInfo()
  }, [])
  
  return info
}

'use client'

import React, { useState } from 'react'
import { useWalletActions, useWalletConnection } from '@/components/providers/txnlab-wallet-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface TransactionSignerProps {
  transactions: any[]
  onSigned?: (signedTransactions: (Uint8Array | null)[]) => void
  onError?: (error: Error) => void
  className?: string
}

export function TransactionSigner({ 
  transactions, 
  onSigned, 
  onError, 
  className = '' 
}: TransactionSignerProps) {
  const { isConnected, activeAccount } = useWalletConnection()
  const { signTransactions } = useWalletActions()
  const [isSigning, setIsSigning] = useState(false)
  const [signingStatus, setSigningStatus] = useState<'idle' | 'signing' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSignTransactions = async () => {
    if (!isConnected || !activeAccount) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!transactions || transactions.length === 0) {
      toast.error('No transactions to sign')
      return
    }

    try {
      setIsSigning(true)
      setSigningStatus('signing')
      setError(null)

      const signedTransactions = await signTransactions(transactions)
      
      setSigningStatus('success')
      toast.success(`Successfully signed ${transactions.length} transaction(s)`)
      
      if (onSigned) {
        onSigned(signedTransactions)
      }
    } catch (error: any) {
      console.error('Transaction signing failed:', error)
      setSigningStatus('error')
      setError(error.message)
      toast.error(`Failed to sign transactions: ${error.message}`)
      
      if (onError) {
        onError(error)
      }
    } finally {
      setIsSigning(false)
    }
  }

  const getStatusIcon = () => {
    switch (signingStatus) {
      case 'signing':
        return <Loader2 className="w-4 h-4 animate-spin" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = () => {
    switch (signingStatus) {
      case 'signing':
        return <Badge variant="secondary">Signing...</Badge>
      case 'success':
        return <Badge variant="default" className="bg-green-500">Signed</Badge>
      case 'error':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Ready</Badge>
    }
  }

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span>Transaction Signer</span>
          </CardTitle>
          <CardDescription>
            Connect your wallet to sign transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please connect your Algorand wallet to sign transactions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Transaction Signer</span>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Sign {transactions.length} transaction(s) with your connected wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transaction Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Transactions:</span>
            <Badge variant="outline">{transactions.length}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Account:</span>
            <code className="text-sm bg-muted px-2 py-1 rounded">
              {activeAccount.address.slice(0, 6)}...{activeAccount.address.slice(-4)}
            </code>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sign Button */}
        <Button
          onClick={handleSignTransactions}
          disabled={isSigning || !transactions.length}
          className="w-full"
        >
          {isSigning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing Transactions...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Sign Transactions
            </>
          )}
        </Button>

        {/* Transaction Details */}
        {transactions.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Transaction Details:</span>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {transactions.map((txn, index) => (
                <div key={index} className="text-xs bg-muted p-2 rounded">
                  <div className="font-medium">Transaction {index + 1}</div>
                  <div className="text-muted-foreground">
                    Type: {txn.type || 'Unknown'} • 
                    From: {txn.from?.slice(0, 6)}...{txn.from?.slice(-4)} • 
                    Amount: {txn.amount ? (txn.amount / 1000000).toFixed(4) : 'N/A'} ALGO
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TransactionSigner

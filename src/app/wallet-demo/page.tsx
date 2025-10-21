'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AlgorandWalletConnect from '@/components/algorand-wallet-connect'
import WalletStatus from '@/components/wallet-status'
import TransactionSigner from '@/components/transaction-signer'
import { useWalletConnection, useWalletActions } from '@/components/providers/txnlab-wallet-provider'
import { getSupportedWallets } from '@/lib/txnlab-wallet-config'
import algosdk from 'algosdk'
import { toast } from 'sonner'

export default function WalletDemoPage() {
  const { isConnected, activeAccount, activeWallet } = useWalletConnection()
  const { signTransactions } = useWalletActions()
  const [demoTransactions, setDemoTransactions] = useState<any[]>([])

  const supportedWallets = getSupportedWallets()

  const createDemoTransaction = () => {
    if (!activeAccount) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      // Create a simple payment transaction
      const suggestedParams = {
        fee: 1000,
        firstRound: 1,
        lastRound: 1000,
        genesisID: 'testnet-v1.0',
        genesisHash: 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
        flatFee: true
      }

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: activeAccount.address,
        to: activeAccount.address, // Send to self for demo
        amount: 1000000, // 1 ALGO in microAlgos
        suggestedParams
      })

      setDemoTransactions([txn])
      toast.success('Demo transaction created')
    } catch (error: any) {
      console.error('Failed to create demo transaction:', error)
      toast.error(`Failed to create transaction: ${error.message}`)
    }
  }

  const handleTransactionSigned = (signedTransactions: (Uint8Array | null)[]) => {
    console.log('Transactions signed:', signedTransactions)
    toast.success('Transactions signed successfully!')
  }

  const handleTransactionError = (error: Error) => {
    console.error('Transaction signing error:', error)
    toast.error(`Transaction signing failed: ${error.message}`)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Algorand Wallet Integration Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience seamless wallet connectivity with multiple Algorand wallet providers.
            Connect, manage accounts, and sign transactions with ease.
          </p>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WalletStatus showDetails={true} />
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>
                Current wallet connection information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              {isConnected && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Wallet:</span>
                    <span className="text-sm">
                      {supportedWallets.find(w => w.id === activeWallet)?.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Account:</span>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {activeAccount?.address.slice(0, 8)}...{activeAccount?.address.slice(-6)}
                    </code>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Wallet Components Demo */}
        <Tabs defaultValue="connect" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connect">Connect</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="info">Wallet Info</TabsTrigger>
          </TabsList>

          <TabsContent value="connect" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Button Variant</CardTitle>
                  <CardDescription>
                    Simple button-style wallet connection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlgorandWalletConnect variant="button" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dropdown Variant</CardTitle>
                  <CardDescription>
                    Dropdown menu with wallet options
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlgorandWalletConnect variant="dropdown" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Card Variant</CardTitle>
                  <CardDescription>
                    Full card interface with details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlgorandWalletConnect variant="card" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WalletStatus showDetails={true} />
              <Card>
                <CardHeader>
                  <CardTitle>Supported Wallets</CardTitle>
                  <CardDescription>
                    Available wallet providers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {supportedWallets.map((wallet) => (
                      <div key={wallet.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <span className="text-2xl">{wallet.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium">{wallet.name}</div>
                          <div className="text-sm text-muted-foreground">{wallet.description}</div>
                        </div>
                        <div className="flex space-x-1">
                          {wallet.mobile && (
                            <Badge variant="outline" className="text-xs">Mobile</Badge>
                          )}
                          {wallet.desktop && (
                            <Badge variant="outline" className="text-xs">Desktop</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Demo</CardTitle>
                  <CardDescription>
                    Create and sign demo transactions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={createDemoTransaction}
                    disabled={!isConnected}
                    className="w-full"
                  >
                    Create Demo Transaction
                  </Button>
                  {demoTransactions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Demo Transactions:</span>
                      <div className="text-sm bg-muted p-3 rounded">
                        {demoTransactions.length} transaction(s) ready to sign
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <TransactionSigner
                transactions={demoTransactions}
                onSigned={handleTransactionSigned}
                onError={handleTransactionError}
              />
            </div>
          </TabsContent>

          <TabsContent value="info" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Integration Features</CardTitle>
                  <CardDescription>
                    What this wallet integration provides
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">✓</Badge>
                      <span className="text-sm">Multiple wallet support</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">✓</Badge>
                      <span className="text-sm">Account management</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">✓</Badge>
                      <span className="text-sm">Transaction signing</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">✓</Badge>
                      <span className="text-sm">Mobile & desktop support</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">✓</Badge>
                      <span className="text-sm">WalletConnect integration</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">✓</Badge>
                      <span className="text-sm">Network switching</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usage Instructions</CardTitle>
                  <CardDescription>
                    How to use the wallet integration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="space-y-1">
                      <span className="font-medium">1. Connect Wallet:</span>
                      <p className="text-muted-foreground">
                        Click any connect button and choose your preferred wallet
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-medium">2. Manage Accounts:</span>
                      <p className="text-muted-foreground">
                        Switch between multiple accounts if available
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-medium">3. Sign Transactions:</span>
                      <p className="text-muted-foreground">
                        Use the transaction signer to approve transactions
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-medium">4. View Status:</span>
                      <p className="text-muted-foreground">
                        Monitor connection status and account information
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

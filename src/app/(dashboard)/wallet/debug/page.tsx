'use client'

import { useWalletConnection } from '@/components/providers/txnlab-wallet-provider'
import { getSupportedWallets } from '@/lib/txnlab-wallet-config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export default function WalletDebugPage() {
  const { wallets } = useWalletConnection()
  const supportedWallets = getSupportedWallets()

  // Check window properties
  const windowChecks = typeof window !== 'undefined' ? {
    'window.algorand': !!(window as any).algorand,
    'window.lute': !!(window as any).lute,
    'window.exodus': !!(window as any).exodus,
    'window.DeflyWallet': !!(window as any).DeflyWallet,
    'window.PeraWallet': !!(window as any).PeraWallet,
  } : {}

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Wallet Detection Debug</h1>
      
      <div className="grid gap-6">
        {/* Window Properties Check */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Window Properties</CardTitle>
            <CardDescription>Checking which wallet objects are available in window</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(windowChecks).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 border rounded">
                  <code className="text-sm">{key}</code>
                  <Badge variant={value ? 'default' : 'secondary'}>
                    {value ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Detected
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Not Found
                      </>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Wallet Manager Status */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet Manager Status</CardTitle>
            <CardDescription>Status of wallets registered with @txnlab/use-wallet</CardDescription>
          </CardHeader>
          <CardContent>
            {wallets && wallets.length > 0 ? (
              <div className="space-y-3">
                {wallets.map((wallet: any) => {
                  const supportedInfo = supportedWallets.find(sw => sw.id === wallet.id)
                  return (
                    <div key={wallet.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{supportedInfo?.icon || '❓'}</span>
                          <div>
                            <h3 className="font-semibold">{supportedInfo?.name || wallet.id}</h3>
                            <code className="text-xs text-muted-foreground">{wallet.id}</code>
                          </div>
                        </div>
                        <Badge variant={wallet.isActive ? 'default' : 'secondary'}>
                          {wallet.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Connected:</span>{' '}
                          <span className="font-medium">{wallet.isConnected ? 'Yes' : 'No'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Accounts:</span>{' '}
                          <span className="font-medium">{wallet.accounts?.length || 0}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Metadata:</span>{' '}
                          <span className="font-medium text-xs">{JSON.stringify(wallet.metadata?.name || 'N/A')}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                <p>No wallets registered yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supported Wallets */}
        <Card>
          <CardHeader>
            <CardTitle>Configured Wallets</CardTitle>
            <CardDescription>Wallets configured in your application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {supportedWallets.map((wallet) => {
                const registeredWallet = wallets?.find((w: any) => w.id === wallet.id)
                return (
                  <div key={wallet.id} className="flex items-center gap-2 p-3 border rounded">
                    <span className="text-xl">{wallet.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{wallet.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {registeredWallet ? (
                          registeredWallet.isActive ? (
                            <span className="text-green-600">✓ Available</span>
                          ) : (
                            <span className="text-red-600">✗ Not Available</span>
                          )
                        ) : (
                          <span className="text-yellow-600">⚠ Not Registered</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Lute Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">If Lute wallet shows as "Not Available":</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Make sure the Lute wallet browser extension is installed</li>
                <li>Check if the extension is enabled (not disabled)</li>
                <li>Refresh this page after installing/enabling the extension</li>
                <li>Check the browser console (F12) for any error messages</li>
                <li>Make sure you're allowing the extension to run on this site</li>
                <li>Try clicking on the extension icon to ensure it's unlocked</li>
              </ol>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">
                <strong>Note:</strong> The detection happens when the page loads. 
                If you just installed the extension, you need to refresh the page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

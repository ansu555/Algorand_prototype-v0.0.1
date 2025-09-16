'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Copy, ExternalLink, Smartphone, Monitor, QrCode, AlertCircle } from 'lucide-react'
import { useWallet, useWalletConnection, useWalletActions, useWalletConnect } from '@/components/providers/wallet-provider'
import { WalletType } from '@/lib/enhanced-algorand-wallet'
import { MOBILE_WALLET_REGISTRY } from '@/lib/walletconnect-config'

const SUPPORTED_WALLETS = [
  {
    id: 'pera' as WalletType,
    name: 'Pera Wallet',
    description: 'Most popular Algorand wallet',
    icon: '🔷',
    mobile: true,
    desktop: true,
    type: 'native'
  },
  {
    id: 'lute' as WalletType,
    name: 'Lute Wallet',
    description: 'Browser extension wallet',
    icon: '🎵',
    mobile: false,
    desktop: true,
    type: 'extension'
  },
  {
    id: 'defly' as WalletType,
    name: 'Defly Wallet',
    description: 'DeFi-focused wallet',
    icon: '🦋',
    mobile: true,
    desktop: true,
    type: 'native'
  },
  {
    id: 'myalgo' as WalletType,
    name: 'MyAlgo Wallet',
    description: 'Web-based wallet',
    icon: '🌐',
    mobile: false,
    desktop: true,
    type: 'web'
  },
  {
    id: 'exodus' as WalletType,
    name: 'Exodus Wallet',
    description: 'Multi-chain wallet',
    icon: '🚀',
    mobile: true,
    desktop: true,
    type: 'native'
  },
  {
    id: 'walletconnect' as WalletType,
    name: 'WalletConnect',
    description: 'Connect any mobile wallet',
    icon: '🔗',
    mobile: true,
    desktop: true,
    type: 'protocol'
  }
]

// QR Code component (you might want to use a proper QR code library)
function QRCodeDisplay({ value }: { value: string }) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  useEffect(() => {
    // Using QR Server API for demo - in production, use a proper QR code library
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}`
    setQrCodeUrl(qrUrl)
  }, [value])

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="p-4 bg-white rounded-lg">
        {qrCodeUrl && (
          <img 
            src={qrCodeUrl} 
            alt="WalletConnect QR Code" 
            className="w-48 h-48"
          />
        )}
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Scan with your mobile wallet to connect
      </p>
    </div>
  )
}

// Mobile wallet links component
function MobileWalletLinks({ links }: { links: Record<string, string> }) {
  const handleWalletLink = (walletId: string, uri: string) => {
    window.open(uri, '_blank')
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Or connect with:</p>
      <div className="grid grid-cols-1 gap-2">
        {Object.entries(links).map(([walletId, uri]) => {
          const wallet = MOBILE_WALLET_REGISTRY[walletId as keyof typeof MOBILE_WALLET_REGISTRY]
          if (!wallet) return null

          return (
            <Button
              key={walletId}
              variant="outline"
              onClick={() => handleWalletLink(walletId, uri)}
              className="justify-start h-auto p-3"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg">
                  {wallet.name.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{wallet.name}</p>
                  <p className="text-xs text-muted-foreground">Tap to open</p>
                </div>
                <ExternalLink className="h-4 w-4" />
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

// Account switcher component
function AccountSwitcher() {
  const { accounts, selectedAccount } = useWalletConnection()
  const { switchAccount } = useWalletActions()
  const [isLoading, setIsLoading] = useState(false)

  if (accounts.length <= 1) return null

  const handleAccountSwitch = async (accountAddress: string) => {
    if (accountAddress === selectedAccount) return
    
    setIsLoading(true)
    try {
      await switchAccount(accountAddress)
    } catch (error) {
      console.error('Failed to switch account:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Switch Account:</p>
      <Select value={selectedAccount || ''} onValueChange={handleAccountSwitch} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue placeholder="Select account" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account} value={account}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{formatAddress(account)}</span>
                {account === selectedAccount && <Badge variant="secondary">Current</Badge>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function EnhancedAlgorandWalletConnect() {
  const { isConnected, connection, isConnecting, error } = useWallet()
  const { connectWallet, disconnect } = useWalletActions()
  const { walletConnectURI, mobileWalletLinks, isWalletConnectAvailable } = useWalletConnect()
  const [showWalletConnectModal, setShowWalletConnectModal] = useState(false)
  const [selectedWalletType, setSelectedWalletType] = useState<WalletType | null>(null)

  const handleConnect = async (walletType: WalletType) => {
    try {
      setSelectedWalletType(walletType)
      
      if (walletType === 'walletconnect') {
        setShowWalletConnectModal(true)
      }
      
      await connectWallet(walletType)
      
      if (walletType !== 'walletconnect') {
        setSelectedWalletType(null)
      }
    } catch (err: any) {
      console.error('Connection failed:', err)
      setSelectedWalletType(null)
      setShowWalletConnectModal(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setShowWalletConnectModal(false)
    setSelectedWalletType(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  // Close modal when connection is successful
  useEffect(() => {
    if (isConnected && showWalletConnectModal) {
      setShowWalletConnectModal(false)
      setSelectedWalletType(null)
    }
  }, [isConnected, showWalletConnectModal])

  if (isConnected && connection) {
    const connectedWallet = SUPPORTED_WALLETS.find(w => w.id === connection.walletType)
    
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{connectedWallet?.icon || '🔷'}</span>
            Wallet Connected
          </CardTitle>
          <CardDescription>
            {connectedWallet?.name || connection.walletType}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Address:</p>
                <p className="text-xs font-mono">{formatAddress(connection.selectedAccount)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(connection.selectedAccount)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <AccountSwitcher />

          {connection.walletType === 'walletconnect' && connection.session && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">WalletConnect Session</p>
              <p className="text-xs text-blue-700">
                Connected via WalletConnect protocol
              </p>
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
    <>
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
          
          {SUPPORTED_WALLETS.map((wallet) => {
            const isCurrentlyConnecting = isConnecting && selectedWalletType === wallet.id
            const isWalletConnectDisabled = wallet.id === 'walletconnect' && !isWalletConnectAvailable
            
            return (
              <Button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={isConnecting || isWalletConnectDisabled}
                variant="outline"
                className="w-full justify-start h-auto p-4"
              >
                <div className="flex items-center gap-3 w-full">
                  {isCurrentlyConnecting ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <span className="text-2xl">{wallet.icon}</span>
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium">{wallet.name}</p>
                    <p className="text-xs text-muted-foreground">{wallet.description}</p>
                    {isWalletConnectDisabled && (
                      <p className="text-xs text-red-500">Not available</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {wallet.mobile && <Badge variant="secondary" className="text-xs"><Smartphone className="h-3 w-3" /></Badge>}
                    {wallet.desktop && <Badge variant="secondary" className="text-xs"><Monitor className="h-3 w-3" /></Badge>}
                  </div>
                </div>
              </Button>
            )
          })}
        </CardContent>
      </Card>

      {/* WalletConnect Modal */}
      <Dialog open={showWalletConnectModal} onOpenChange={setShowWalletConnectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Connect with WalletConnect
            </DialogTitle>
            <DialogDescription>
              Scan the QR code or use a mobile wallet link to connect
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {isConnecting && (
              <div className="text-center py-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Waiting for wallet connection...
                </p>
              </div>
            )}

            {walletConnectURI && (
              <Tabs defaultValue="qr" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="qr">QR Code</TabsTrigger>
                  <TabsTrigger value="mobile">Mobile Wallets</TabsTrigger>
                </TabsList>
                
                <TabsContent value="qr" className="space-y-4">
                  <QRCodeDisplay value={walletConnectURI} />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(walletConnectURI)}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URI
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="mobile" className="space-y-4">
                  {Object.keys(mobileWalletLinks).length > 0 ? (
                    <MobileWalletLinks links={mobileWalletLinks} />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        Mobile wallet links will appear here
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
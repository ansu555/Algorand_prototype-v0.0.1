'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wallet, Copy, ExternalLink, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import { toast } from 'sonner'

type AgentAccountInfo = {
  address: string
  algoBalance: number
  minBalance: number
  availableBalance: number
  assets: Array<{
    assetId: number
    symbol: string
    balance: string
    decimals: number
  }>
  totalAssets: number
}

type AgentWalletData = {
  agentAddress: string
  isNew: boolean
  accountInfo: AgentAccountInfo
  network: string
}

export function AgentWalletCard() {
  const { activeAccount } = useWallet()
  const [agentData, setAgentData] = useState<AgentWalletData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optingIn, setOptingIn] = useState(false)
  const [assetIdInput, setAssetIdInput] = useState<string>('')
  const [optingSingle, setOptingSingle] = useState(false)

  const loadAgentWallet = async () => {
    if (!activeAccount?.address) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/agent/wallet?userAddress=${activeAccount.address}`)
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load agent wallet')
      }

      setAgentData(data)

      if (data.isNew) {
        toast.success('Agent wallet created successfully!', {
          description: 'Your personal agent wallet is ready to use.'
        })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load agent wallet')
      toast.error('Failed to load agent wallet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeAccount?.address) {
      loadAgentWallet()
    }
  }, [activeAccount?.address])

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.success('Address copied to clipboard')
  }

  const openExplorer = (address: string, network: string) => {
    const baseUrl = network === 'mainnet' 
      ? 'https://algoexplorer.io' 
      : 'https://testnet.algoexplorer.io'
    window.open(`${baseUrl}/address/${address}`, '_blank')
  }

  const optInToAllAssets = async () => {
    if (!activeAccount?.address) return

    setOptingIn(true)
    try {
      const res = await fetch('/api/agent/wallet/opt-in-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: activeAccount.address })
      })
      
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to opt in to assets')
      }

      toast.success('Assets opt-in complete!', {
        description: `Successfully opted into ${data.summary.successful} new assets. ${data.summary.alreadyOptedIn} were already opted in.`
      })

      // Refresh wallet data
      await loadAgentWallet()
    } catch (err: any) {
      toast.error('Failed to opt in to assets', {
        description: err.message
      })
    } finally {
      setOptingIn(false)
    }
  }

  if (!activeAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Agent Wallet
          </CardTitle>
          <CardDescription>
            Connect your wallet to view your agent wallet
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading && !agentData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Agent Wallet
          </CardTitle>
          <CardDescription>Loading your agent wallet...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error && !agentData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Agent Wallet Error
          </CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadAgentWallet} disabled={loading}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!agentData) return null

  const { agentAddress, accountInfo, network } = agentData

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Agent Wallet
            <Badge variant="outline" className="ml-2">
              {network}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAgentWallet}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Your personal trading agent wallet - deposits here enable autopilot features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent Address */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Agent Address
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">
              {agentAddress}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyAddress(agentAddress)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openExplorer(agentAddress, network)}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Balance Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              ALGO Balance
            </label>
            <p className="text-2xl font-bold">
              {accountInfo.algoBalance.toFixed(6)} ALGO
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              Available
            </label>
            <p className="text-2xl font-bold text-green-600">
              {accountInfo.availableBalance.toFixed(6)} ALGO
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Minimum balance reserved: {accountInfo.minBalance.toFixed(6)} ALGO
        </div>

        {/* Low Balance Warning */}
        {accountInfo.algoBalance < 0.3 && (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  Low ALGO Balance
                </p>
                <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                  {accountInfo.algoBalance === 0 
                    ? "Your agent wallet needs ALGO to opt-in to assets and pay transaction fees. Please send at least 0.5 ALGO to get started."
                    : "Your agent wallet is low on ALGO. Send more to ensure smooth trading and asset opt-ins."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Asset Holdings */}
        {accountInfo.assets.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Asset Holdings ({accountInfo.totalAssets})
            </label>
            <div className="space-y-2">
              {accountInfo.assets.map((asset) => (
                <div
                  key={asset.assetId}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{asset.symbol}</Badge>
                    <span className="text-sm text-muted-foreground">
                      ID: {asset.assetId}
                    </span>
                  </div>
                  <span className="font-medium">
                    {parseFloat(asset.balance).toFixed(asset.decimals)} {asset.symbol}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How to Fund */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">How to Fund Agent Wallet</span>
          </div>
          <ol className="text-sm text-muted-foreground space-y-1 ml-6 list-decimal">
            <li>Copy the agent address above</li>
            <li>Send ALGO or other assets from your main wallet</li>
            <li>Agent wallet will auto opt-in to required assets when needed</li>
            <li>Autopilot rules will use this wallet for execution</li>
          </ol>
        </div>

        {/* Opt-in Button */}
        <div className="pt-2">
          <div className="space-y-2">
            <Button 
              onClick={optInToAllAssets} 
              disabled={optingIn || loading || accountInfo.algoBalance < 0.3}
              className="w-full"
              variant="outline"
            >
              {optingIn ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Opting into assets...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Opt-in to All Trading Assets
                </>
              )}
            </Button>

            {/* Single asset opt-in */}
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Asset ID (e.g. 31566704)"
                value={assetIdInput}
                onChange={(e) => setAssetIdInput(e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 bg-background text-sm"
              />
              <Button
                onClick={async () => {
                  if (!activeAccount?.address) return
                  const id = Number(assetIdInput)
                  if (!id || id <= 0) {
                    toast.error('Enter a valid numeric asset ID')
                    return
                  }
                  setOptingSingle(true)
                  try {
                    const res = await fetch('/api/agent/wallet/opt-in', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userAddress: activeAccount.address, assetId: id })
                    })
                    const data = await res.json()
                    if (!data.success) throw new Error(data.error || 'Opt-in failed')
                    toast.success(data.message || 'Opted in successfully')
                    setAssetIdInput('')
                    await loadAgentWallet()
                  } catch (err: any) {
                    toast.error('Opt-in failed', { description: err.message })
                  } finally {
                    setOptingSingle(false)
                  }
                }}
                disabled={optingSingle || loading || accountInfo.algoBalance < 0.101}
                variant="ghost"
              >
                {optingSingle ? 'Opting...' : 'Opt-in'}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {accountInfo.algoBalance < 0.3 
              ? "Fund agent wallet with at least 0.5 ALGO first"
              : "Required before receiving USDC, USDT, and other assets"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

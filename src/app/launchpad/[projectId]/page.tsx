"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchBar } from "@/components/shared/search-bar"
import {
  Rocket, TrendingUp, Users, Shield, Clock, Target,
  Flame, AlertTriangle, CheckCircle2, ArrowLeft, ExternalLink,
  Zap, Gift, Lock
} from "lucide-react"
import Link from "next/link"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { useWallet } from "@txnlab/use-wallet-react"
import * as blockchain from "@/lib/launchpad/blockchain"
import algosdk from "algosdk"

interface Project {
  id: string
  tokenName: string
  tokenSymbol: string
  description?: string
  logoUrl?: string
  websiteUrl?: string
  twitterUrl?: string
  telegramUrl?: string
  status: string
  tokensSold: string
  tokensForSale: string
  algoRaised: string
  bondingTarget: string
  participantCount: number
  basePrice: string
  maxPrice: string
  curveType: string
  createdAt: string
  launchRound?: number
  appId?: string
  asaId?: string
  maxBuyPerTx?: string
  maxBuyPerUser?: string
  cooldownBlocks?: string
}

interface PriceQuote {
  tokenAmount: string
  algoAmount: string
  currentPrice: string
  avgPrice: string
  priceImpact: number
  earlyBonus: number
  pointsEarned: number
}

interface UserPoints {
  totalPoints: string
  claimablePoints: string
  claimedPoints: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const { activeAccount } = useWalletConnection()
  const { signTransactions } = useWallet()
  const [project, setProject] = useState<Project | null>(null)

  // Wallet transaction signer wrapper to filter out nulls
  const walletSigner = async (
    txnGroup: algosdk.Transaction[],
    indexesToSign?: number[]
  ): Promise<Uint8Array[]> => {
    const signed = await signTransactions(txnGroup, indexesToSign)
    // Filter out nulls - wallet always signs all requested transactions
    return signed.filter((s): s is Uint8Array => s !== null)
  }
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)

  // Purchase state
  const [buyAmount, setBuyAmount] = useState("")
  const [priceQuote, setPriceQuote] = useState<PriceQuote | null>(null)
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null)

  useEffect(() => {
    loadProject()
    if (activeAccount?.address) {
      loadUserPoints()
    }
  }, [params.projectId, activeAccount?.address])

  useEffect(() => {
    if (buyAmount && Number(buyAmount) > 0) {
      getPriceQuote()
    } else {
      setPriceQuote(null)
    }
  }, [buyAmount])

  const loadProject = async () => {
    try {
      // Skip loading if this is the create page
      if (params.projectId === 'create') {
        setLoading(false)
        return
      }

      const res = await fetch(`/api/launchpad/projects?projectId=${params.projectId}`)
      const data = await res.json()

      if (data.success) {
        setProject(data.data)
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserPoints = async () => {
    try {
      // Skip loading if this is the create page
      if (params.projectId === 'create') {
        return
      }

      const res = await fetch(`/api/launchpad/user?action=points&projectId=${params.projectId}&userAddress=${activeAccount?.address}`)
      const data = await res.json()

      if (data.success) {
        setUserPoints(data.data)
      }
    } catch (error) {
      console.error('Failed to load user points:', error)
    }
  }

  const getPriceQuote = async () => {
    if (!project) return

    try {
      const res = await fetch('/api/launchpad/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quote',
          projectId: project.id,
          tokenAmount: buyAmount,
        })
      })

      const data = await res.json()

      if (data.success) {
        setPriceQuote(data.data)
      }
    } catch (error) {
      console.error('Failed to get price quote:', error)
    }
  }

  const handlePurchase = async () => {
    if (!activeAccount?.address || !project || !priceQuote) return

    setPurchasing(true)
    try {
      // Step 1: Validate purchase
      const validateRes = await fetch('/api/launchpad/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          projectId: project.id,
          userAddress: activeAccount.address,
          tokenAmount: buyAmount,
          algoAmount: priceQuote.algoAmount,
          currentRound: await blockchain.getCurrentRound()
        })
      })

      const validateData = await validateRes.json()

      if (!validateData.success) {
        alert(validateData.error || 'Purchase validation failed')
        return
      }

      if (!validateData.data.valid) {
        alert(validateData.data.reason || 'Purchase validation failed')
        return
      }

      // Step 2: Check if project has app_id
      if (!project.appId || !project.asaId) {
        alert('This project is not properly configured on-chain.')
        return
      }

      // Step 3: Execute real TestNet transaction
      console.log('🔗 Connecting to TestNet for purchase...')

      const appId = BigInt(project.appId)
      const asaId = BigInt(project.asaId)
      const tokensToBuy = BigInt(Number(buyAmount) * 1_000_000) // 6 decimals
      const maxAlgoCost = BigInt(Math.ceil(Number(priceQuote.algoAmount) * 1_000_000)) // microALGO

      // Execute purchase transaction on TestNet
      const txId = await blockchain.buyTokens(
        {
          userAddress: activeAccount.address,
          appId: appId,
          asaId: asaId,
          tokensToBuy: tokensToBuy,
          maxAlgoCost: maxAlgoCost,
        },
        walletSigner
      )

      console.log('✅ Transaction confirmed:', txId)

      // Step 4: Record purchase in database
      const recordRes = await fetch('/api/launchpad/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record',
          projectId: project.id,
          userAddress: activeAccount.address,
          tokenAmount: buyAmount,
          algoAmount: priceQuote.algoAmount,
          transactionId: txId,
          blockRound: await blockchain.getCurrentRound(),
        })
      })

      const recordData = await recordRes.json()

      if (recordData.success) {
        alert(`🎉 Purchase successful!\n\n✅ Earned ${priceQuote.pointsEarned} points!\n🔗 View on TestNet: https://testnet.algoexplorer.io/tx/${txId}`)
        setBuyAmount("")
        loadProject()
        loadUserPoints()
      } else {
        // Transaction succeeded on chain but failed to record in DB
        alert(`⚠️ Purchase confirmed on blockchain (Tx: ${txId}) but failed to update database. Please contact support.`)
      }
    } catch (error: any) {
      console.error('Purchase failed:', error)

      let errorMessage = 'Purchase failed. '
      if (error.message?.includes('rejected')) {
        errorMessage += 'Transaction was rejected.'
      } else if (error.message?.includes('overspend')) {
        errorMessage += 'Insufficient funds.'
      } else if (error.message?.includes('slippage')) {
        errorMessage += 'Price slippage too high. Try again.'
      } else {
        errorMessage += error.message || 'Unknown error'
      }

      alert(errorMessage)
    } finally {
      setPurchasing(false)
    }
  }

  const calculateProgress = () => {
    if (!project) return 0
    const sold = Number(project.tokensSold)
    const total = Number(project.tokensForSale)
    return total > 0 ? (sold / total) * 100 : 0
  }

  const formatAlgo = (microAlgo: string) => {
    return (Number(microAlgo) / 1_000_000).toFixed(2)
  }

  const formatTokens = (amount: string) => {
    return Number(amount).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <SearchBar />
        <div className="max-w-7xl mx-auto mt-6">
          <p className="text-center text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen p-6">
        <SearchBar />
        <div className="max-w-7xl mx-auto mt-6">
          <Card>
            <CardContent className="py-16 text-center">
              <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
              <p className="text-muted-foreground mb-6">This project does not exist or has been removed.</p>
              <Link href="/launchpad">
                <Button>Back to Launchpad</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const progress = calculateProgress()
  const raised = formatAlgo(project.algoRaised)
  const target = formatAlgo(project.bondingTarget)

  return (
    <div className="min-h-screen p-6" >
      <SearchBar />

      <div className="max-w-7xl mx-auto mt-6 space-y-6">
        {/* Back Button */}
        <Link href="/launchpad">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Launchpad
          </Button>
        </Link>

        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                {project.logoUrl ? (
                  <img src={project.logoUrl} alt={project.tokenName} className="h-16 w-16 rounded-full" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-white font-bold text-2xl">
                    {project.tokenSymbol?.charAt(0) || '?'}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-3xl font-bold">{project.tokenName}</h1>
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'}
                      className={project.status === 'active' ? 'bg-green-600' : ''}>
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-xl text-muted-foreground mb-2">${project.tokenSymbol}</p>

                  {project.description && (
                    <p className="text-muted-foreground max-w-2xl">{project.description}</p>
                  )}

                  {/* Social Links */}
                  <div className="flex gap-2 mt-3">
                    {project.websiteUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Website
                        </a>
                      </Button>
                    )}
                    {project.twitterUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={project.twitterUrl} target="_blank" rel="noopener noreferrer">
                          Twitter
                        </a>
                      </Button>
                    )}
                    {project.telegramUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={project.telegramUrl} target="_blank" rel="noopener noreferrer">
                          Telegram
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats & Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle>Sale Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Bonding Curve Progress</span>
                    <span className="text-sm font-bold">{progress.toFixed(2)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tokens Sold</p>
                    <p className="text-lg font-bold">{formatTokens(project.tokensSold)}</p>
                    <p className="text-xs text-muted-foreground">/ {formatTokens(project.tokensForSale)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ALGO Raised</p>
                    <p className="text-lg font-bold">{raised}</p>
                    <p className="text-xs text-muted-foreground">/ {target} target</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Participants</p>
                    <p className="text-lg font-bold">{project.participantCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Platform Fee (1%)</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatAlgo((BigInt(project.algoRaised) / 100n).toString())}
                    </p>
                    <p className="text-xs text-muted-foreground">ALGO</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bonding Curve Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Bonding Curve - {project.curveType?.toUpperCase() || 'SIGMOID'}</CardTitle>
                <CardDescription>Price increases as more tokens are sold</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-950/20 dark:to-amber-950/20 rounded-lg flex items-center justify-center border-2 border-dashed">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Chart visualization coming soon</p>
                    <p className="text-xs text-muted-foreground mt-1">Base: {formatAlgo(project.basePrice)} → Max: {formatAlgo(project.maxPrice)} ALGO</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Security & Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">Anti-Bot Protection</p>
                      <p className="text-xs text-muted-foreground">
                        {project.cooldownBlocks || '10'} block cooldown, {project.maxBuyPerTx && project.tokensForSale ? ((Number(project.maxBuyPerTx) / Number(project.tokensForSale)) * 100).toFixed(1) : '1'}% max per tx
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">Fair Launch</p>
                      <p className="text-xs text-muted-foreground">No pre-sale, equal opportunity</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">LP Locked</p>
                      <p className="text-xs text-muted-foreground">30-day lock after graduation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">Points Rewards</p>
                      <p className="text-xs text-muted-foreground">Early buyers get 3x multiplier</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Purchase Interface */}
          <div className="space-y-6">
            {/* User Points Card */}
            {activeAccount?.address && userPoints && (
              <Card className="border-2 border-amber-200 dark:border-amber-800/30">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Your Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Total Earned</span>
                      <span className="font-bold">{Number(userPoints.totalPoints).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Claimable</span>
                      <span className="font-bold text-green-600">{Number(userPoints.claimablePoints).toLocaleString()}</span>
                    </div>
                    <Button className="w-full mt-2" size="sm" disabled={Number(userPoints.claimablePoints) === 0}>
                      <Zap className="h-4 w-4 mr-1" />
                      Claim Points
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Purchase Card */}
            <Card className="border-2 border-red-200 dark:border-red-800/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-red-500" />
                  Buy ${project.tokenSymbol}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.status !== 'active' ? (
                  <div className="text-center py-6">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                    <p className="font-semibold">Sale Not Active</p>
                    <p className="text-xs text-muted-foreground">
                      {project.status === 'graduated' ? 'This project has graduated to DEX' : 'This sale is not currently active'}
                    </p>
                  </div>
                ) : !activeAccount?.address ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">Connect wallet to purchase</p>
                    <Button className="w-full">Connect Wallet</Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="buyAmount">Token Amount</Label>
                      <Input
                        id="buyAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={buyAmount}
                        onChange={(e) => setBuyAmount(e.target.value)}
                        min="0"
                      />
                    </div>

                    {priceQuote && (
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">You Pay</span>
                          <span className="font-bold">{formatAlgo(priceQuote.algoAmount)} ALGO</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Avg Price</span>
                          <span>{formatAlgo(priceQuote.avgPrice)} ALGO</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current Price</span>
                          <span>{formatAlgo(priceQuote.currentPrice)} ALGO</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Price Impact</span>
                          <span className={priceQuote.priceImpact > 5 ? 'text-amber-600' : ''}>
                            {priceQuote.priceImpact.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Gift className="h-3 w-3" />
                            Points Earned
                          </span>
                          <span className="font-bold text-amber-600">
                            {priceQuote.pointsEarned} pts (x{priceQuote.earlyBonus.toFixed(1)})
                          </span>
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700"
                      disabled={!buyAmount || Number(buyAmount) <= 0 || purchasing}
                      onClick={handlePurchase}
                    >
                      {purchasing ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Buy Now
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Max {project.maxBuyPerTx && project.tokensForSale ? ((Number(project.maxBuyPerTx) / Number(project.tokensForSale)) * 100).toFixed(1) : '1'}% of supply per transaction
                      </p>
                      <p className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {project.cooldownBlocks || '10'} block cooldown between purchases
                      </p>
                      <p className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Max {project.maxBuyPerUser && project.tokensForSale ? ((Number(project.maxBuyPerUser) / Number(project.tokensForSale)) * 100).toFixed(1) : '5'}% of supply per address
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div >
  )
}

"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchBar } from "@/components/shared/search-bar"
import {
  Rocket, TrendingUp, Users, Shield, Clock, Target,
  Flame, AlertTriangle, CheckCircle2, ArrowLeft, ExternalLink,
  Zap, Gift, Lock, Copy, Globe, Twitter, Send
} from "lucide-react"
import Link from "next/link"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { useWallet } from "@txnlab/use-wallet-react"
import * as blockchain from "@/lib/launchpad/blockchain"
import algosdk from "algosdk"
import { TokenPriceChart } from "@/components/features/launchpad/token-price-chart"

interface Project {
  id: string
  tokenName: string
  tokenSymbol: string
  description?: string
  totalSupply: string
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
  const [activeTab, setActiveTab] = useState("buy")

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
          estimatedCost: maxAlgoCost,
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
    return (Number(microAlgo) / 1_000_000).toFixed(6)
  }

  const formatTokens = (amount: string) => {
    return Number(amount).toLocaleString()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Could add toast here
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-[1600px] mx-auto mt-6">
          <p className="text-center text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-[1600px] mx-auto mt-6">
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation / Header */}
      <div className="border-b border-border">
        <div className="max-w-[1920px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/launchpad" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              {project.logoUrl ? (
                <img src={project.logoUrl} alt={project.tokenName} className="h-10 w-10 rounded-full" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-white font-bold">
                  {project.tokenSymbol?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg">{project.tokenName}</h1>
                  <span className="text-muted-foreground text-sm">${project.tokenSymbol}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Anti-bot: Active
                  </span>
                  {project.websiteUrl && (
                    <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                      <Globe className="h-3 w-3" />
                    </a>
                  )}
                  {project.twitterUrl && (
                    <a href={project.twitterUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                      <Twitter className="h-3 w-3" />
                    </a>
                  )}
                  {project.telegramUrl && (
                    <a href={project.telegramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                      <Send className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Current Price</p>
              <p className="font-mono font-bold text-green-500">${formatAlgo(project.basePrice)} ALGO</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Market Cap</p>
              <p className="font-mono font-bold">${formatAlgo((BigInt(project.basePrice) * BigInt(project.totalSupply) / 1000000n).toString())}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Created</p>
              <p className="font-mono">{new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Chart & Info (9 cols) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Chart Area */}
          <div className="h-[600px] w-full bg-card border border-border rounded-lg overflow-hidden">
            <TokenPriceChart projectId={project.id} tokenSymbol={project.tokenSymbol} />
          </div>

          {/* Bottom Tabs: Details, Transactions, Holders */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto rounded-none">
              <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">
                Token Details
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">
                Transactions
              </TabsTrigger>
              <TabsTrigger value="holders" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">
                Holders
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="p-6 bg-card border border-border border-t-0 rounded-b-lg mt-0">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">About {project.tokenName}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {project.description || "No description provided."}
                  </p>

                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Contract Address</span>
                      <div className="flex items-center gap-2 font-mono text-sm">
                        {project.appId}
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => copyToClipboard(project.appId || '')}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Creator Wallet</span>
                      <div className="flex items-center gap-2 font-mono text-sm">
                        {project.id.substring(0, 8)}...
                        <Button variant="ghost" size="icon" className="h-4 w-4">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Initial Price</span>
                      <span className="font-mono">{formatAlgo(project.basePrice)} ALGO</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Graduation Target</span>
                      <span className="font-mono">{formatAlgo(project.bondingTarget)} ALGO</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Bonding Curve</h3>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Progress to Graduation</span>
                      <span className="text-sm font-bold">{progress.toFixed(2)}%</span>
                    </div>
                    <Progress value={progress} className="h-3 mb-4" />
                    <p className="text-xs text-muted-foreground">
                      When the market cap reaches {formatAlgo(project.bondingTarget)} ALGO, all liquidity will be deposited into Tinyman and burned.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="p-6 bg-card border border-border border-t-0 rounded-b-lg mt-0">
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No transactions yet</p>
              </div>
            </TabsContent>

            <TabsContent value="holders" className="p-6 bg-card border border-border border-t-0 rounded-b-lg mt-0">
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Holder list is empty</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Trading Interface (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Trading Panel */}
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4 bg-muted/50 p-1 rounded-lg">
                <Button
                  variant={activeTab === 'buy' ? 'default' : 'ghost'}
                  className={`flex-1 ${activeTab === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => setActiveTab('buy')}
                >
                  Buy
                </Button>
                <Button
                  variant={activeTab === 'sell' ? 'default' : 'ghost'}
                  className={`flex-1 ${activeTab === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={() => setActiveTab('sell')}
                >
                  Sell
                </Button>
              </div>

              {activeTab === 'buy' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <Label>Amount (ALGO)</Label>
                      <span>Balance: {activeAccount ? 'Loading...' : '0'}</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.0"
                        className="pr-16 text-right font-mono text-lg"
                        value={buyAmount}
                        onChange={(e) => setBuyAmount(e.target.value)}
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1">
                        <Button variant="outline" size="xs" className="h-6 text-[10px]" onClick={() => setBuyAmount("10")}>10</Button>
                        <Button variant="outline" size="xs" className="h-6 text-[10px]" onClick={() => setBuyAmount("50")}>50</Button>
                        <Button variant="outline" size="xs" className="h-6 text-[10px]" onClick={() => setBuyAmount("100")}>100</Button>
                      </div>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">ALGO</span>
                    </div>
                  </div>

                  {priceQuote && (
                    <div className="space-y-2 text-sm border border-border rounded p-3 bg-muted/30">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Receive</span>
                        <span className="font-bold">{formatTokens(priceQuote.tokenAmount)} {project.tokenSymbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price Impact</span>
                        <span className={priceQuote.priceImpact > 5 ? 'text-red-500' : 'text-green-500'}>
                          {priceQuote.priceImpact.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Points</span>
                        <span className="text-amber-500 font-bold">+{priceQuote.pointsEarned}</span>
                      </div>
                    </div>
                  )}

                  {!activeAccount ? (
                    <Button className="w-full" size="lg">Connect Wallet</Button>
                  ) : (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                      onClick={handlePurchase}
                      disabled={purchasing || !buyAmount}
                    >
                      {purchasing ? 'Processing...' : `Buy ${project.tokenSymbol}`}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Selling is currently disabled during the bonding curve phase.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bonding Curve Info */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Bonding Curve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progress</span>
                    <span>{progress.toFixed(2)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Market Cap</span>
                  <span className="font-mono">${formatAlgo((BigInt(project.basePrice) * BigInt(project.totalSupply) / 1000000n).toString())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-mono">{formatAlgo((BigInt(project.bondingTarget) - BigInt(project.algoRaised)).toString())} ALGO</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Points */}
          {activeAccount && userPoints && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Gift className="h-4 w-4 text-amber-500" /> Your Rewards
                  </span>
                  <Badge variant="outline" className="border-amber-500 text-amber-500">
                    {userPoints.totalPoints} pts
                  </Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full border-amber-500/50 hover:bg-amber-500/10">
                  Claim Rewards
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

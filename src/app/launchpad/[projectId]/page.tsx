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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SearchBar } from "@/components/shared/search-bar"
import {
  Rocket, TrendingUp, Users, Shield, Clock, Target,
  Flame, AlertTriangle, CheckCircle2, ArrowLeft, ExternalLink,
  Zap, Gift, Lock, Copy, Globe, Twitter, Send, Loader2
} from "lucide-react"
import Link from "next/link"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { useWallet } from "@txnlab/use-wallet-react"
import * as blockchain from "@/lib/launchpad/blockchain"
import algosdk from "algosdk"
import { TokenPriceChart } from "@/components/features/launchpad/token-price-chart"

interface Project {
  id: string
  creatorAddress: string
  tokenName: string
  tokenSymbol: string
  tokenDecimals: number
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

interface ProjectTransactionEntry {
  id: string
  buyerAddress: string
  tokensAmount: string
  algoPaid: string
  transactionId: string
  timestamp: string
}

interface ProjectHolderEntry {
  buyerAddress: string
  totalTokens: string
  totalAlgo: string
  purchaseCount: number
  lastPurchaseAt: string | null
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
  const [activityLoading, setActivityLoading] = useState(false)
  const [projectTransactions, setProjectTransactions] = useState<ProjectTransactionEntry[]>([])
  const [projectHolders, setProjectHolders] = useState<ProjectHolderEntry[]>([])
  const [activityStats, setActivityStats] = useState<{ totalTransactions: number; uniqueHolders: number; totalAlgo: string; totalTokens: string } | null>(null)

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

  useEffect(() => {
    if (!project) {
      setProjectTransactions([])
      setProjectHolders([])
      setActivityStats(null)
      return
    }

    let cancelled = false
    setActivityLoading(true)

    ;(async () => {
      try {
        const res = await fetch(`/api/launchpad/projects/${project.id}/activity`)
        const data = await res.json()

        if (!cancelled && data.success) {
          setProjectTransactions(data.data.transactions || [])
          setProjectHolders(data.data.holders || [])
          setActivityStats(data.data.stats || null)
        }
      } catch (error) {
        console.error('Failed to load project activity:', error)
        if (!cancelled) {
          setProjectTransactions([])
          setProjectHolders([])
          setActivityStats(null)
        }
      } finally {
        if (!cancelled) {
          setActivityLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [project])

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
    if (!project || !buyAmount) return

    try {
      // Convert ALGO amount to microALGO (1 ALGO = 1,000,000 microALGO)
      const algoInMicro = BigInt(Math.floor(Number(buyAmount) * 1_000_000))
      
      const res = await fetch('/api/launchpad/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quoteForAlgo',  // Use ALGO-based quote
          projectId: project.id,
          buyerAddress: activeAccount?.address || 'PLACEHOLDER',
          algoAmount: algoInMicro.toString(),
        })
      })

      const data = await res.json()

      if (data.success) {
        setPriceQuote({
          tokenAmount: data.data.tokensAmount,
          algoAmount: data.data.totalCost,
          currentPrice: data.data.averagePrice,
          avgPrice: data.data.averagePrice,
          priceImpact: data.data.priceImpact,
          earlyBonus: 1,
          pointsEarned: Number(data.data.pointsToEarn),
        })
      }
    } catch (error) {
      console.error('Failed to get price quote:', error)
    }
  }

  const handlePurchase = async () => {
    if (!activeAccount?.address || !project || !priceQuote) return

    setPurchasing(true)
    try {
      // Get the token amount from the quote (calculated from ALGO input)
      const tokensToBuy = BigInt(priceQuote.tokenAmount)
      
      // Step 1: Validate purchase
      const validateRes = await fetch('/api/launchpad/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          projectId: project.id,
          buyerAddress: activeAccount.address,
          tokensAmount: tokensToBuy.toString(),
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

      // Use the CALCULATED cost from quote with 10% buffer for price slippage
      const quotedCost = BigInt(priceQuote.algoAmount) // Already in microALGO
      const algoCostWithBuffer = (quotedCost * BigInt(110)) / BigInt(100) // 10% buffer

      console.log('📊 Purchase details:')
      console.log('  - ALGO input:', buyAmount, 'ALGO')
      console.log('  - Tokens to receive:', tokensToBuy.toString())
      console.log('  - Quoted cost:', quotedCost.toString(), 'microALGO')
      console.log('  - Cost with buffer:', algoCostWithBuffer.toString(), 'microALGO')

      // Execute purchase transaction on TestNet
      const txId = await blockchain.buyTokens(
        {
          userAddress: activeAccount.address,
          appId: appId,
          asaId: asaId,
          tokensToBuy: tokensToBuy,
          estimatedCost: algoCostWithBuffer,
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
          buyerAddress: activeAccount.address,
          tokensAmount: tokensToBuy.toString(),
          algoPaid: priceQuote.algoAmount,
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
        alert(`⚠ Purchase confirmed on blockchain (Tx: ${txId}) but failed to update database. Please contact support.`)
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
    // Format token amount with proper decimals (assuming 6 decimals like ALGO)
    const tokenDecimals = project?.tokenDecimals || 6
    const formatted = Number(amount) / Math.pow(10, tokenDecimals)
    return formatted.toLocaleString(undefined, { 
      minimumFractionDigits: 0,
      maximumFractionDigits: tokenDecimals 
    })
  }

  const truncateAddress = (address: string) => {
    if (!address) return ''
    if (address.length <= 12) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
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
                      <span className="text-muted-foreground">Token ID (ASA)</span>
                      <div className="flex items-center gap-2 font-mono text-sm">
                        {project.asaId || 'Not deployed'}
                        {project.asaId && (
                          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => copyToClipboard(project.asaId?.toString() || '')}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Creator Wallet</span>
                      <div className="flex items-center gap-2 font-mono text-sm">
                        {project.creatorAddress ? `${project.creatorAddress.substring(0, 8)}...${project.creatorAddress.substring(project.creatorAddress.length - 6)}` : 'Unknown'}
                        {project.creatorAddress && (
                          <a href={`https://testnet.algoexplorer.io/address/${project.creatorAddress}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-4 w-4">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </a>
                        )}
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
              {activityLoading && projectTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p>Loading transactions…</p>
                </div>
              ) : projectTransactions.length > 0 ? (
                <div className="space-y-4">
                  {activityStats && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <Card className="bg-muted/30 border-border/60">
                        <CardContent className="py-3">
                          <p className="text-xs text-muted-foreground">Total Purchases</p>
                          <p className="text-lg font-semibold">{activityStats.totalTransactions}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/30 border-border/60">
                        <CardContent className="py-3">
                          <p className="text-xs text-muted-foreground">Unique Buyers</p>
                          <p className="text-lg font-semibold">{activityStats.uniqueHolders}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/30 border-border/60">
                        <CardContent className="py-3">
                          <p className="text-xs text-muted-foreground">Volume (ALGO)</p>
                          <p className="text-lg font-semibold">{formatAlgo(activityStats.totalAlgo)}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/30 border-border/60">
                        <CardContent className="py-3">
                          <p className="text-xs text-muted-foreground">Tokens Sold</p>
                          <p className="text-lg font-semibold">{formatTokens(activityStats.totalTokens)}</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <div className="border border-border/60 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[160px]">Timestamp</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead className="text-right">Tokens</TableHead>
                          <TableHead className="text-right">Paid (ALGO)</TableHead>
                          <TableHead className="text-right">Tx</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(tx.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {truncateAddress(tx.buyerAddress)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatTokens(tx.tokensAmount)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatAlgo(tx.algoPaid)}
                            </TableCell>
                            <TableCell className="text-right">
                              <a
                                href={`https://testnet.algoexplorer.io/tx/${tx.transactionId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary text-xs hover:underline"
                              >
                                View
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No transactions yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="holders" className="p-6 bg-card border border-border border-t-0 rounded-b-lg mt-0">
              {activityLoading && projectHolders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p>Loading holders…</p>
                </div>
              ) : projectHolders.length > 0 ? (
                <div className="space-y-4">
                  <div className="border border-border/60 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Address</TableHead>
                          <TableHead className="text-right">Tokens Held</TableHead>
                          <TableHead className="text-right">ALGO Spent</TableHead>
                          <TableHead className="text-right">Buys</TableHead>
                          <TableHead className="text-right">Last Activity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectHolders.map((holder) => (
                          <TableRow key={holder.buyerAddress}>
                            <TableCell className="font-mono text-xs">
                              {truncateAddress(holder.buyerAddress)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatTokens(holder.totalTokens)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatAlgo(holder.totalAlgo)}
                            </TableCell>
                            <TableCell className="text-right text-sm">{holder.purchaseCount}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {holder.lastPurchaseAt ? new Date(holder.lastPurchaseAt).toLocaleString() : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Holder list is empty</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Trading Interface (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Trading Panel */}
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardContent className="p-4 space-y-4">
              {/* Anti-bot Badge */}
              <div className="flex items-center justify-start">
                <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">
                  <Shield className="h-3 w-3 mr-1" />
                  Anti-bot: Active
                </Badge>
              </div>

              {/* Buy/Sell Tabs with Slippage */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                  <Button
                    variant={activeTab === 'buy' ? 'default' : 'ghost'}
                    className={`flex-1 ${activeTab === 'buy' ? 'bg-card shadow-sm' : ''}`}
                    onClick={() => setActiveTab('buy')}
                  >
                    Buy
                  </Button>
                  <Button
                    variant={activeTab === 'sell' ? 'default' : 'ghost'}
                    className={`flex-1 ${activeTab === 'sell' ? 'bg-card shadow-sm' : ''}`}
                    onClick={() => setActiveTab('sell')}
                    disabled
                  >
                    Sell
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="px-3">
                  <Zap className="h-4 w-4 mr-1" />
                  20%
                </Button>
              </div>

              {activeTab === 'buy' ? (
                <div className="space-y-4">
                  {/* Large Input Field */}
                  <div className="space-y-2">
                    <div className="bg-muted/30 rounded-lg p-4 border border-border">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0"
                        className="w-full bg-transparent text-5xl font-light outline-none text-foreground placeholder:text-muted-foreground"
                        value={buyAmount}
                        onChange={(e) => setBuyAmount(e.target.value)}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">$0.00</span>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                          <span className="font-semibold">ALGO</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-right text-muted-foreground flex items-center justify-end gap-1">
                      <span className="h-4 w-4 rounded bg-muted flex items-center justify-center">💰</span>
                      <span>0</span>
                    </div>
                  </div>

                  {/* Quick Selection Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setBuyAmount("")}>
                      Reset
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setBuyAmount("0.1")}>
                      0.1 ALGO
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setBuyAmount("0.5")}>
                      0.5 ALGO
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setBuyAmount("1")}>
                      1 ALGO
                    </Button>
                    <Button variant="outline" size="sm" className="col-span-4" onClick={() => setBuyAmount("100")}>
                      Max
                    </Button>
                  </div>

                  {/* Estimated Receive & Rewards */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Estimated to Receive</span>
                      <span className="font-mono font-bold">
                        {priceQuote ? `${formatTokens(priceQuote.tokenAmount)} ${project.tokenSymbol}` : `0 ${project.tokenSymbol}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Rewards to Earn</span>
                      <span className="font-mono font-bold text-amber-500">
                        {priceQuote ? `${priceQuote.pointsEarned} Points` : '0 Points'}
                      </span>
                    </div>
                  </div>

                  {/* Buy Button */}
                  {!activeAccount ? (
                    <Button className="w-full h-12 text-base font-semibold" size="lg">
                      Connect Wallet
                    </Button>
                  ) : (
                    <Button
                      className="w-full h-12 text-base font-semibold bg-amber-600 hover:bg-amber-700 text-black"
                      size="lg"
                      onClick={handlePurchase}
                      disabled={purchasing || !buyAmount}
                    >
                      {purchasing ? 'Processing...' : `Buy ${project.tokenSymbol}`}
                    </Button>
                  )}

                  {/* Disclaimer */}
                  <p className="text-[10px] text-muted-foreground text-center leading-tight">
                    By clicking Buy above, you hereby acknowledge that: (i) the token you're buying is a "meme coin" as defined by the U.S. Securities and Exchange Commission; and (ii) this site is protected by reCAPTCHA.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <Lock className="h-8 w-8 mx-auto opacity-50" />
                  <p className="text-sm">Selling is currently disabled</p>
                  <p className="text-xs">Available after bonding curve graduation</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bonding Curve Info */}
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-semibold">Bonding</span>
                </div>
                <span className="text-sm font-mono font-bold">{progress.toFixed(2)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Current</span>
                  <div className="h-3 w-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                </div>
                <span className="font-mono font-bold">{formatAlgo(project.algoRaised)} ALGO</span>
              </div>
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Remaining</span>
                  <div className="h-3 w-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                </div>
                <span className="font-mono font-bold">{formatAlgo((BigInt(project.bondingTarget) - BigInt(project.algoRaised)).toString())} ALGO</span>
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
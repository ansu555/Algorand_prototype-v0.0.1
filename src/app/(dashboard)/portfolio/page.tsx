"use client"

import { useEffect, useState } from "react"
import { SearchBar } from "@/components/shared/search-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { formatTrigger, type Rule, describeRule } from "@/lib/shared/rules"
import { forceRunPoller, useAgentData } from "@/features/agent/hooks/useAgentData"
import { deleteRule as apiDeleteRule, createRule } from "@/features/agent/api/client"
import { ChevronDown, ChevronUp, Play, Trash2, Eye, RefreshCw, Zap, Activity, Clock, Target, TrendingUp, AlertCircle, CheckCircle2, XCircle, Pause, DollarSign, TrendingDown, BarChart3, Lock, Wallet, Plus } from "lucide-react"
import { useWalletConnection, useWalletActions } from '@/components/providers/txnlab-wallet-provider'
import algosdk from 'algosdk'
import RuleBuilderModal from "@/components/features/rules/rule-builder-modal"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PortfolioPage() {
  const { activeAccount } = useWalletConnection()
  const { signTransactions } = useWalletActions()
  const address = activeAccount?.address
  const { toast } = useToast()
  const { rules, logs, loading, refresh, setRuleStatus, lastRunByRule, seenLogIds, setSeenLogIds } = useAgentData(address)
  // Cache resolved coin symbols for target IDs
  const [symbolById, setSymbolById] = useState<Record<string, string>>({})
  // Agent wallet state - full data structure
  const [agentWalletData, setAgentWalletData] = useState<{
    agentAddress: string
    isNew: boolean
    accountInfo: {
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
    network: string
  } | null>(null)
  const [agentWalletLoading, setAgentWalletLoading] = useState(false)
  const [agentWalletStats, setAgentWalletStats] = useState<{
    totalSpendUSD: number
    totalTrades: number
    successfulTrades: number
    failedTrades: number
    successRate: number
    lastTradeAt: string | null
  } | null>(null)
  const [rechargeAmount, setRechargeAmount] = useState<string>("")
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false)
  const [rechargingWallet, setRechargingWallet] = useState(false)

  useEffect(() => {
    if (!rules.length) return
    const ids = new Set<string>()
    for (const r of rules) for (const id of r.targets) ids.add(id)

    const missing: string[] = []
    ids.forEach((id) => {
      const known = symbolById[id]
      if (!known) missing.push(id)
    })
    if (missing.length === 0) return

    let alive = true
      ; (async () => {
        const found: Array<[string, string]> = []
        await Promise.all(
          missing.map(async (id) => {
            try {
              const res = await fetch(`/api/price?coin=${encodeURIComponent(id)}`, { cache: 'no-store' })
              if (!res.ok) return
              const data = await res.json()
              const sym = data?.symbol || data?.data?.symbol
              if (sym) found.push([id, String(sym)])
            } catch { }
          })
        )
        if (!alive || found.length === 0) return
        setSymbolById((prev) => {
          let changed = false
          const next = { ...prev }
          for (const [id, sym] of found) {
            if (!next[id]) {
              next[id] = sym
              changed = true

            }
          }
          return changed ? next : prev
        })
      })()
    return () => {
      alive = false
    }
  }, [rules, symbolById])

  useEffect(() => {
    if (!address) return
    // Find logs we haven't handled yet
    const unseen = logs.filter((l) => !seenLogIds.has(l.id))
    if (unseen.length === 0) return

    for (const log of unseen) {
      if (log.action === "execute_rule") {
        const tx = (log.details?.txHash as string | undefined) || (log.details?.result?.txHash as string | undefined)
        if (log.status === "failed") {
          const err = String(log.details?.error || 'Swap failed')
          toast({ title: 'Swap failed', description: err, variant: 'destructive' })
        } else {
          toast({ title: 'Trade executed', description: tx ? `Tx: ${tx.slice(0, 10)}…${tx.slice(-6)}` : undefined })
        }
      } else if (log.action === "preview_trade") {
        toast({ title: "Rule triggered (preview)", description: `Rule ${log.ruleId?.slice(-8)}` })
      }
    }

    // Mark only the newly seen logs; return previous state if no changes to avoid extra renders
    setSeenLogIds((prev) => {
      const next = new Set(prev)
      for (const l of unseen) next.add(l.id)
      return next
    })
  }, [address, logs, seenLogIds, toast, setSeenLogIds])

  // Fetch complete agent wallet data
  useEffect(() => {
    if (!address) return

    async function fetchAgentWallet() {
      setAgentWalletLoading(true)
      try {
        const res = await fetch(`/api/agent/wallet?userAddress=${address}`)
        const data = await res.json()
        if (data.success) {
          setAgentWalletData({
            agentAddress: data.agentAddress,
            isNew: data.isNew,
            accountInfo: data.accountInfo,
            network: data.network
          })
        }
      } catch (error) {
        console.error('Failed to fetch agent wallet:', error)
      } finally {
        setAgentWalletLoading(false)
      }
    }

    fetchAgentWallet()
  }, [address])

  // Fetch agent wallet stats
  useEffect(() => {
    if (!address) return

    async function fetchAgentStats() {
      try {
        const res = await fetch(`/api/agent/wallet/stats?userAddress=${address}`)
        const data = await res.json()
        if (data.success && data.stats) {
          setAgentWalletStats(data.stats)
        }
      } catch (error) {
        console.error('Failed to fetch agent wallet stats:', error)
      }
    }

    fetchAgentStats()
  }, [address])

  // Helper to refresh agent wallet stats
  async function refreshAgentStats() {
    if (!address) return
    try {
      const res = await fetch(`/api/agent/wallet/stats?userAddress=${address}`)
      const data = await res.json()
      if (data.success && data.stats) {
        setAgentWalletStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to refresh agent wallet stats:', error)
    }
  }

  function nextCheck(rule: Rule) {
    const last = lastRunByRule.get(rule.id)
    if (!rule.cooldownMinutes) return "any moment"
    const since = last ? new Date(last.createdAt).getTime() : 0
    return new Date(since + rule.cooldownMinutes * 60_000).toLocaleTimeString()
  }

  async function pauseResume(rule: Rule, to: "active" | "paused") {
    await setRuleStatus(rule, to)
    toast({ title: `Rule ${to === "active" ? "resumed" : "paused"}` })
  }

  async function forceRun() {
    const { triggered } = await forceRunPoller()
    toast({ title: "Poller ran", description: `${(triggered || []).length} triggered` })
    refresh()
  }

  // Save rule function for Auto-Pilot
  async function saveRule(rule: any) {
    try {
      const type = rule.strategy === 'DCA' ? 'dca' : rule.strategy === 'REBALANCE' ? 'rebalance' : 'rotate'
      const payload = {
        ownerAddress: address || "0x0000000000000000000000000000000000000000",
        type,
        targets: rule.coins || [],
        rotateTopN: rule.rotateTopN,
        maxSpendUSD: rule.maxSpendUsd,
        maxSlippage: rule.maxSlippagePercent,
        cooldownMinutes: rule.cooldownMinutes,
        triggerType: rule.triggerType,
        dropPercent: rule.dropPercent,
        trendWindow: rule.trendWindow,
        trendThreshold: rule.trendThreshold,
        momentumLookback: rule.momentumLookback,
        momentumThreshold: rule.momentumThreshold,
        status: 'active',
      }
      await createRule(payload)
      refresh()
    } catch (e) {
      console.error(e)
      toast({
        title: "Failed to save rule",
        description: "Please try again.",
        variant: "destructive"
      })
    }
  }

  async function executeNow(rule: Rule) {
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId: rule.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      const hash = json?.logEntry?.details?.txHash
      toast({ title: 'Swap submitted', description: hash ? `Tx: ${String(hash).slice(0, 10)}…${String(hash).slice(-6)}` : 'Submitted' })
      refresh()
      // Refresh stats after successful trade
      await refreshAgentStats()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Execution failed'
      toast({ title: 'Swap failed', description: msg, variant: 'destructive' })
    }
  }

  async function onDelete(rule: Rule) {
    if (!address) {
      toast({ title: 'No wallet connected', variant: 'destructive' })
      return
    }

    try {
      const ok = await apiDeleteRule(rule.id, address)
      if (ok) {
        toast({ title: 'Rule deleted' })
        refresh()
      } else {
        toast({ title: 'Delete failed', variant: 'destructive' })
      }
    } catch (error: any) {
      console.error('Delete error:', error)
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
    }
  }

  function renderTargets(ids: string[]) {
    const labels = ids.map((id) => symbolById[id] || id)
    const first = labels.slice(0, 3).join(", ")
    return (
      <>
        {first}
        {labels.length > 3 && ` +${labels.length - 3}`}
      </>
    )
  }

  // Activity list: collapsed shows 3 recent; expand to see all
  const [activityExpanded, setActivityExpanded] = useState(false)
  const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const visibleLogs = activityExpanded ? sortedLogs : sortedLogs.slice(0, 3)

  // Calculate stats
  const activeRules = rules.filter(r => r.status === 'active').length
  const pausedRules = rules.filter(r => r.status === 'paused').length
  const successfulExecutions = logs.filter(l => l.status === 'success' && l.action === 'execute_rule').length
  const failedExecutions = logs.filter(l => l.status === 'failed').length

  // Calculate profit metrics from successful swaps
  const profitData = logs
    .filter(l => l.status === 'success' && l.action === 'execute_rule' && l.details?.result)
    .map(l => {
      const details = l.details.result
      const fromAmount = parseFloat(details.fromAmount || details.fromAmountBaseUnits || '0')
      const toAmount = parseFloat(details.toAmount || details.toAmountBaseUnits || '0')
      // Simple profit calculation (this is a mock - in production you'd need real USD values)
      const estimatedProfit = (toAmount - fromAmount) * 0.1 // Placeholder calculation
      return {
        timestamp: new Date(l.createdAt).getTime(),
        date: new Date(l.createdAt).toLocaleDateString(),
        profit: estimatedProfit,
        fromAsset: details.fromAsset || details.fromAssetName,
        toAsset: details.toAsset || details.toAssetName,
      }
    })

  // Aggregate profit over time for graph
  const profitOverTime = profitData.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.date === curr.date)
    if (existing) {
      existing.profit += curr.profit
      existing.cumulativeProfit = (acc[acc.indexOf(existing) - 1]?.cumulativeProfit || 0) + curr.profit
    } else {
      const prevCumulative = acc.length > 0 ? acc[acc.length - 1].cumulativeProfit : 0
      acc.push({
        date: curr.date,
        profit: curr.profit,
        cumulativeProfit: prevCumulative + curr.profit,
        trades: 1
      })
    }
    return acc
  }, [])

  const totalProfit = profitData.reduce((sum, item) => sum + item.profit, 0)
  const avgProfitPerTrade = profitData.length > 0 ? totalProfit / profitData.length : 0

  return (
    <div className="min-h-screen bg-background/50 pb-20">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Top Navigation / Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
              <p className="text-sm text-muted-foreground">Manage your assets & agent</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
             <SearchBar />
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Net Worth & Agent Wallet (Span 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Net Worth Card */}
            <Card className="overflow-hidden border-border/50 shadow-xl bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tighter">${totalProfit.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">USD</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <Badge variant={totalProfit >= 0 ? "default" : "destructive"} className="rounded-sm px-1.5">
                    {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)}%
                  </Badge>
                  <span className="text-muted-foreground">vs last month</span>
                </div>
              </CardContent>
            </Card>

            {/* Agent Wallet Card */}
            <Card className="border-border/50 shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Agent Wallet
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {agentWalletData?.network || 'TESTNET'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {address ? (
                  <>
                    <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-1">
                      <div className="text-xs text-muted-foreground">Balance</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold">
                          {agentWalletData?.accountInfo?.algoBalance?.toFixed(4) || '0.0000'} 
                          <span className="text-sm font-normal text-muted-foreground ml-1">ALGO</span>
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex justify-between pt-1">
                        <span>Min: {agentWalletData?.accountInfo?.minBalance.toFixed(3)}</span>
                        <span>Avail: {agentWalletData?.accountInfo?.availableBalance?.toFixed(3)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted/50 rounded-md px-3 py-2 flex items-center justify-between border border-border/50">
                        <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                          {agentWalletData?.agentAddress || "Loading..."}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-background"
                          onClick={() => {
                            if (agentWalletData?.agentAddress) {
                              navigator.clipboard.writeText(agentWalletData.agentAddress)
                              toast({ title: "Address copied" })
                            }
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                       <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shadow-none">
                            <Plus className="h-4 w-4 mr-2" />
                            Recharge
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Wallet className="h-5 w-5 text-primary" />
                              Recharge Agent Wallet
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="recharge-amount">Amount (ALGO)</Label>
                              <Input
                                id="recharge-amount"
                                type="number"
                                placeholder="Enter amount"
                                value={rechargeAmount}
                                onChange={(e) => setRechargeAmount(e.target.value)}
                                min="0"
                                step="0.1"
                              />
                            </div>
                            <div className="rounded-lg bg-muted p-3 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Current Balance:</span>
                                <span className="font-semibold">{agentWalletData?.accountInfo?.algoBalance?.toFixed(2) || '0.00'} ALGO</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">After Recharge:</span>
                                <span className="font-semibold text-primary">
                                  {((agentWalletData?.accountInfo?.algoBalance || 0) + (parseFloat(rechargeAmount) || 0)).toFixed(2)} ALGO
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setRechargeDialogOpen(false)}
                                disabled={rechargingWallet}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="flex-1"
                                onClick={async () => {
                                  if (!address) {
                                    toast({
                                      title: "Wallet Not Connected",
                                      description: "Please connect your wallet first",
                                      variant: "destructive"
                                    })
                                    return
                                  }

                                  const amount = parseFloat(rechargeAmount)
                                  if (!amount || amount <= 0) {
                                    toast({
                                      title: "Invalid Amount",
                                      description: "Please enter a valid amount",
                                      variant: "destructive"
                                    })
                                    return
                                  }

                                  setRechargingWallet(true)
                                  try {
                                    // Get agent wallet address from backend
                                    const res = await fetch('/api/agent/wallet/recharge', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ userAddress: address, amount })
                                    })
                                    const data = await res.json()

                                    if (!data.success || !data.data?.agentAddress) {
                                      throw new Error(data.message || 'Failed to get agent wallet address')
                                    }

                                    const agentAddress = data.data.agentAddress || agentWalletData?.agentAddress
                                    const microAlgos = Math.floor(amount * 1_000_000)

                                    // Get suggested params from algod
                                    const algodClient = new algosdk.Algodv2(
                                      '',
                                      'https://testnet-api.algonode.cloud',
                                      ''
                                    )
                                    const suggestedParams = await algodClient.getTransactionParams().do()

                                    // Build payment transaction
                                    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                                      sender: address,
                                      receiver: agentAddress,
                                      amount: microAlgos,
                                      note: new Uint8Array(Buffer.from('Agent Wallet Recharge')),
                                      suggestedParams
                                    })

                                    // Sign transaction with connected wallet
                                    const signedTxns = await signTransactions([txn])

                                    if (!signedTxns || signedTxns.length === 0) {
                                      throw new Error('Transaction signing cancelled')
                                    }

                                    // Submit to network
                                    const result = await algodClient.sendRawTransaction(signedTxns[0] as Uint8Array).do()
                                    const txId = result.txid

                                    // Wait for confirmation
                                    await algosdk.waitForConfirmation(algodClient, txId, 4)

                                    // Refresh complete agent wallet data
                                    const balanceRes = await fetch(`/api/agent/wallet?userAddress=${address}`)
                                    const balanceData = await balanceRes.json()
                                    if (balanceData.success) {
                                      setAgentWalletData({
                                        agentAddress: balanceData.agentAddress,
                                        isNew: balanceData.isNew,
                                        accountInfo: balanceData.accountInfo,
                                        network: balanceData.network
                                      })
                                    }

                                    setRechargeDialogOpen(false)
                                    setRechargeAmount("")
                                    toast({
                                      title: "Wallet Recharged Successfully",
                                      description: `Added ${amount} ALGO to your agent wallet. Tx: ${txId.substring(0, 10)}...`,
                                    })
                                  } catch (error) {
                                    console.error('Recharge failed:', error)
                                    toast({
                                      title: "Recharge Failed",
                                      description: error instanceof Error ? error.message : 'Failed to recharge wallet',
                                      variant: "destructive"
                                    })
                                  } finally {
                                    setRechargingWallet(false)
                                  }
                                }}
                                disabled={!rechargeAmount || parseFloat(rechargeAmount) <= 0 || rechargingWallet}
                              >
                                {rechargingWallet ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Recharging...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Confirm
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button variant="outline" className="w-full" onClick={() => refreshAgentStats()}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Connect wallet to view agent details
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
               <RuleBuilderModal
                  trigger={
                    <Button className="w-full h-auto py-4 flex flex-col gap-2 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20">
                      <Zap className="h-6 w-6" />
                      <span className="text-xs font-semibold">New Auto-Pilot</span>
                    </Button>
                  }
                  availableCoins={[
                    { id: 'ALGO', symbol: 'ALGO', name: 'Algorand' },
                    { id: 'USDC', symbol: 'USDC', name: 'USDC (Testnet)' },
                  ]}
                  onPreview={(rule) => {
                    toast({ title: "Preview", description: describeRule(rule) })
                  }}
                  onSave={(rule) => {
                    saveRule(rule)
                    toast({ title: "Rule saved", description: describeRule(rule) })
                  }}
                />
                <Button 
                  variant="outline" 
                  className="w-full h-auto py-4 flex flex-col gap-2 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5"
                  onClick={forceRun}
                  disabled={!address}
                >
                  <Play className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">Force Run</span>
                </Button>
            </div>

          </div>

          {/* Right Column: Chart & Tabs (Span 8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Chart Section */}
            <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Performance</CardTitle>
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                  {['1D', '1W', '1M', 'ALL'].map((period) => (
                    <Button 
                      key={period} 
                      variant="ghost" 
                      size="sm" 
                      className={`h-7 px-3 text-xs ${period === 'ALL' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="h-[300px] w-full">
                 {address && profitOverTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={profitOverTime}>
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#6b7280"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke="#6b7280"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `$${value.toFixed(0)}`}
                          dx={-10}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            padding: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          formatter={(value: any) => [`$${value.toFixed(2)}`, 'Value']}
                        />
                        <Area
                          type="monotone"
                          dataKey="cumulativeProfit"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fill="url(#chartGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                       <BarChart3 className="h-10 w-10 opacity-20" />
                       <p className="text-sm">No performance data available</p>
                    </div>
                 )}
              </CardContent>
            </Card>

            {/* Tabs Section */}
            <Tabs defaultValue="rules" className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 space-x-6">
                <TabsTrigger 
                  value="rules" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
                >
                  Active Rules ({rules.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="assets" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
                >
                  Assets ({agentWalletData?.accountInfo?.assets?.length || 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="activity" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
                >
                  Activity Log
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="rules" className="space-y-4">
                   {/* Rules List */}
                   {rules.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed rounded-xl">
                        <p className="text-muted-foreground">No active trading rules</p>
                        <Button variant="link" className="mt-2">Create your first rule</Button>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {rules.map((rule) => (
                          <Card key={rule.id} className="group hover:border-primary/50 transition-colors">
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${rule.status === 'paused' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                                  {rule.type === 'dca' ? <Clock className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-sm">{rule.type.toUpperCase()} Strategy</h4>
                                    <Badge variant={rule.status === 'paused' ? 'secondary' : 'default'} className="text-[10px] h-5">
                                      {rule.status}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {renderTargets(rule.targets)} • {formatTrigger(rule.trigger)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" onClick={() => executeNow(rule)}>
                                  <Play className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => pauseResume(rule, rule.status === 'active' ? 'paused' : 'active')}>
                                  {rule.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(rule)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                   )}
                </TabsContent>

                <TabsContent value="assets">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Asset</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agentWalletData?.accountInfo?.assets?.map((asset) => (
                            <TableRow key={asset.assetId}>
                              <TableCell className="font-medium">{asset.symbol}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{asset.assetId}</TableCell>
                              <TableCell className="text-right">
                                {parseFloat(asset.balance).toFixed(asset.decimals)}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!agentWalletData?.accountInfo?.assets || agentWalletData.accountInfo.assets.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                No assets found in agent wallet
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity">
                   <div className="space-y-2">
                      {visibleLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50 text-sm">
                           <div className="flex items-center gap-3">
                              <div className={`h-2 w-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : log.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`} />
                              <span className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</span>
                           </div>
                           <span className="text-muted-foreground text-xs">
                              {new Date(log.createdAt).toLocaleString()}
                           </span>
                        </div>
                      ))}
                      {visibleLogs.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">No recent activity</div>
                      )}
                   </div>
                </TabsContent>
              </div>
            </Tabs>

          </div>
        </div>
      </div>
    </div>
  )
}
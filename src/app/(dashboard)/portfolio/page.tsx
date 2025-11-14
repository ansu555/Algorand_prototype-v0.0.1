"use client"

import { useEffect, useState } from "react"
import { SearchBar } from "@/components/shared/search-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { formatTrigger, type Rule, describeRule } from "@/lib/shared/rules"
import { forceRunPoller, useAgentData } from "@/features/agent/hooks/useAgentData"
import { deleteRule as apiDeleteRule, createRule } from "@/features/agent/api/client"
import { ChevronDown, ChevronUp, Play, Trash2, Eye, RefreshCw, Zap, Activity, Clock, Target, TrendingUp, AlertCircle, CheckCircle2, XCircle, Pause, DollarSign, TrendingDown, BarChart3 } from "lucide-react"
import { useWalletConnection } from '@/components/providers/txnlab-wallet-provider'
import RuleBuilderModal from "@/components/features/rules/rule-builder-modal"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function PortfolioPage() {
  const { activeAccount } = useWalletConnection()
  const address = activeAccount?.address
  const { toast } = useToast()
  const { rules, logs, loading, refresh, setRuleStatus, lastRunByRule, seenLogIds, setSeenLogIds } = useAgentData(address)
  // Cache resolved coin symbols for target IDs
  const [symbolById, setSymbolById] = useState<Record<string, string>>({})

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
    ;(async () => {
      const found: Array<[string, string]> = []
      await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await fetch(`/api/price?coin=${encodeURIComponent(id)}`, { cache: 'no-store' })
            if (!res.ok) return
            const data = await res.json()
            const sym = data?.symbol || data?.data?.symbol
            if (sym) found.push([id, String(sym)])
          } catch {}
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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Search Bar */}
        <SearchBar />
        
        {/* Header Section */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Portfolio & Agent Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your automated trading rules and monitor activity
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <RuleBuilderModal
                trigger={
                  <Button 
                    size="lg"
                    className="group relative overflow-hidden transition-all duration-300 hover:scale-105 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    <span className="relative z-10">Create Auto-Pilot Rule</span>
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
                size="lg"
                onClick={() => address && refresh()} 
                disabled={loading || !address}
                className="transition-all duration-200 hover:scale-105"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                size="lg"
                onClick={forceRun} 
                disabled={!address}
                className="transition-all duration-200 hover:scale-105"
              >
                <Play className="h-4 w-4 mr-2" />
                Force Run
              </Button>
            </div>
          </div>

          {/* Stats Overview - Only show when wallet is connected and has data */}
          {address && rules.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
                      <p className={`text-3xl font-bold mt-2 ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${totalProfit.toFixed(2)}
                      </p>
                    </div>
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${totalProfit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {totalProfit >= 0 ? (
                        <TrendingUp className="h-6 w-6 text-green-500" />
                      ) : (
                        <TrendingDown className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Rules</p>
                      <p className="text-3xl font-bold mt-2">{activeRules}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Activity className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Successful Trades</p>
                      <p className="text-3xl font-bold mt-2">{successfulExecutions}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Profit/Trade</p>
                      <p className={`text-3xl font-bold mt-2 ${avgProfitPerTrade >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${avgProfitPerTrade.toFixed(2)}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Profit Chart - Only show when there's trading data */}
          {address && profitOverTime.length > 0 && (
            <Card className="shadow-xl border-primary/20">
              <CardHeader className="border-b bg-gradient-to-r from-muted/50 to-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Trading Performance</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cumulative profit over time from automated trades
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Cumulative Profit Chart */}
                  <div>
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Cumulative Profit
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={profitOverTime}>
                        <defs>
                          <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          className="text-xs"
                          tick={{ fill: 'currentColor' }}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'currentColor' }}
                          tickFormatter={(value) => `$${value.toFixed(0)}`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            padding: '8px'
                          }}
                          formatter={(value: any) => [`$${value.toFixed(2)}`, 'Cumulative Profit']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="cumulativeProfit" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          fill="url(#profitGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Daily Profit Bar Chart */}
                  <div>
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      Daily Profit/Loss
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={profitOverTime}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          className="text-xs"
                          tick={{ fill: 'currentColor' }}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'currentColor' }}
                          tickFormatter={(value) => `$${value.toFixed(0)}`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            padding: '8px'
                          }}
                          formatter={(value: any) => [`$${value.toFixed(2)}`, 'Daily Profit']}
                        />
                        <Bar 
                          dataKey="profit" 
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Trading Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Total Trades</span>
                      <span className="text-2xl font-bold">{profitData.length}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Trading Days</span>
                      <span className="text-2xl font-bold">{profitOverTime.length}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Win Rate</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {profitData.length > 0 ? ((profitData.filter(p => p.profit > 0).length / profitData.length) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* No Wallet Connected State */}
        {!address && (
          <Card className="border-2 border-dashed border-primary/20 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16 px-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <AlertCircle className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Connect your wallet to view and manage your automated trading rules and monitor activity.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Rules Table */}
        {address && (
          <Card className="shadow-xl border-primary/20">
            <CardHeader className="border-b bg-gradient-to-r from-muted/50 to-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Your Trading Rules</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {rules.length === 0 ? 'No rules created yet' : `Managing ${rules.length} rule${rules.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium mb-2">No trading rules yet</p>
                  <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                    Create your first Auto-Pilot rule to start automated trading based on your strategy
                  </p>
                  <RuleBuilderModal
                    trigger={
                      <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25">
                        <Zap className="h-4 w-4 mr-2" />
                        Create Your First Rule
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
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-2">
                        <TableHead className="font-semibold w-[100px]">Type</TableHead>
                        <TableHead className="font-semibold w-[140px]">Targets</TableHead>
                        <TableHead className="font-semibold w-[200px]">Trigger</TableHead>
                        <TableHead className="font-semibold w-[100px]">Cooldown</TableHead>
                        <TableHead className="font-semibold w-[140px]">Next Check</TableHead>
                        <TableHead className="font-semibold w-[100px]">Status</TableHead>
                        <TableHead className="text-center font-semibold w-[340px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule) => {
                        const isPaused = rule.status === "paused"
                        return (
                          <TableRow 
                            key={rule.id}
                            className="group hover:bg-muted/50 transition-colors duration-150"
                          >
                            <TableCell className="font-medium align-middle">
                              <Badge variant="outline" className="font-semibold">
                                {rule.type.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm align-middle">
                              <div className="flex flex-wrap gap-1">
                                {rule.targets.slice(0, 2).map((id, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {symbolById[id] || id}
                                  </Badge>
                                ))}
                                {rule.targets.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{rule.targets.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm align-middle">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium whitespace-nowrap">{formatTrigger(rule.trigger)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm font-medium align-middle">{rule.cooldownMinutes}m</TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap align-middle">
                              {nextCheck(rule)}
                            </TableCell>
                            <TableCell className="align-middle">
                              <Badge 
                                variant={isPaused ? "secondary" : "default"}
                                className={isPaused ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" : "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"}
                              >
                                {isPaused ? "Paused" : "Active"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center align-middle">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button 
                                  size="sm" 
                                  onClick={() => executeNow(rule)}
                                  className="h-9 px-3 bg-primary hover:bg-primary/90"
                                >
                                  <Play className="h-3 w-3 mr-1.5" />
                                  Execute
                                </Button>
                                {isPaused ? (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => pauseResume(rule, "active")} 
                                    className="h-9 px-3 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/20"
                                  >
                                    <Play className="h-3 w-3 mr-1.5" />
                                    Resume
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => pauseResume(rule, "paused")} 
                                    className="h-9 px-3 hover:bg-yellow-500/10 hover:text-yellow-600 hover:border-yellow-500/20"
                                  >
                                    <Pause className="h-3 w-3 mr-1.5" />
                                    Pause
                                  </Button>
                                )}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-9 px-3 hover:bg-primary/10"
                                    >
                                      <Eye className="h-3 w-3 mr-1.5" />
                                      <span className="hidden sm:inline">Details</span>
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle className="text-2xl flex items-center gap-2">
                                        <Target className="h-6 w-6 text-primary" />
                                        Rule Details
                                      </DialogTitle>
                                    </DialogHeader>
                                    
                                    {/* Compact 2-column layout */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                      {/* Left Column */}
                                      <div className="space-y-3">
                                        {/* Type & Status */}
                                        <div className="flex gap-2">
                                          <div className="flex-1 p-4 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg border">
                                            <div className="text-xs font-semibold text-muted-foreground mb-2">Type</div>
                                            <Badge variant="outline" className="font-semibold">{rule.type.toUpperCase()}</Badge>
                                          </div>
                                          <div className="flex-1 p-4 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg border">
                                            <div className="text-xs font-semibold text-muted-foreground mb-2">Status</div>
                                            <Badge variant={rule.status === "paused" ? "secondary" : "default"}>
                                              {rule.status.toUpperCase()}
                                            </Badge>
                                          </div>
                                        </div>

                                        {/* Targets */}
                                        <div className="p-4 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg border">
                                          <div className="text-xs font-semibold text-muted-foreground mb-2">Target Assets</div>
                                          <div className="flex flex-wrap gap-1.5">
                                            {rule.targets.map((target, idx) => (
                                              <Badge key={idx} variant="default" className="text-xs font-medium">
                                                {symbolById[target] || target}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Trigger */}
                                        <div className="p-4 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg border">
                                          <div className="text-xs font-semibold text-muted-foreground mb-2">Trigger Condition</div>
                                          <div className="text-sm font-medium">{formatTrigger(rule.trigger)}</div>
                                          {rule.trigger?.value && (
                                            <div className="text-xs text-muted-foreground mt-2">
                                              Threshold: <span className="font-semibold">{rule.trigger.value}%</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Trading Params */}
                                        <div className="p-4 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg border">
                                          <div className="text-xs font-semibold text-muted-foreground mb-3">Trading Parameters</div>
                                          <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="flex flex-col gap-1">
                                              <span className="text-muted-foreground">Max Spend</span>
                                              <span className="text-base font-bold">${rule.maxSpendUSD}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                              <span className="text-muted-foreground">Max Slippage</span>
                                              <span className="text-base font-bold">{rule.maxSlippage}%</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right Column */}
                                      <div className="space-y-3">
                                        {/* Timing */}
                                        <div className="p-4 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg border">
                                          <div className="text-xs font-semibold text-muted-foreground mb-3">Timing</div>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between items-center">
                                              <span className="text-muted-foreground">Cooldown Period</span>
                                              <span className="font-semibold">{rule.cooldownMinutes}m</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-muted-foreground">Next Check</span>
                                              <span className="font-semibold">{nextCheck(rule)}</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Created */}
                                        <div className="p-4 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg border">
                                          <div className="text-xs font-semibold text-muted-foreground mb-2">Created At</div>
                                          <div className="text-sm font-mono">
                                            {new Date(rule.createdAt).toLocaleString()}
                                          </div>
                                        </div>

                                        {/* Rule ID */}
                                        <div className="p-4 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg border">
                                          <div className="text-xs font-semibold text-muted-foreground mb-2">Rule ID</div>
                                          <div className="text-xs font-mono break-all bg-background/50 p-2 rounded">
                                            {rule.id}
                                          </div>
                                        </div>

                                        {/* Owner */}
                                        <div className="p-4 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg border">
                                          <div className="text-xs font-semibold text-muted-foreground mb-2">Owner Address</div>
                                          <div className="text-xs font-mono break-all bg-background/50 p-2 rounded">
                                            {rule.ownerAddress.slice(0, 12)}...{rule.ownerAddress.slice(-8)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-6 border-t mt-4">
                                      <Button 
                                        size="default" 
                                        onClick={() => executeNow(rule)} 
                                        className="flex-1 bg-primary hover:bg-primary/90"
                                      >
                                        <Play className="h-4 w-4 mr-2" />
                                        Execute Now
                                      </Button>
                                      <Button 
                                        size="default" 
                                        variant="destructive" 
                                        onClick={() => onDelete(rule)} 
                                        className="flex-1"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Rule
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => onDelete(rule)}
                                  className="h-9 px-2 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity Log */}
        {address && (
          <Card className="shadow-xl border-primary/20">
            <CardHeader className="border-b bg-gradient-to-r from-muted/50 to-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Recent Activity</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {sortedLogs.length === 0 ? 'No activity yet' : `${sortedLogs.length} event${sortedLogs.length !== 1 ? 's' : ''} recorded`}
                    </p>
                  </div>
                </div>
                {sortedLogs.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivityExpanded(!activityExpanded)}
                    className="text-sm hover:bg-primary/10"
                  >
                    {activityExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show all ({sortedLogs.length})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {visibleLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium mb-2">No activity yet</p>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Your trading activity and rule executions will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleLogs.map((log) => {
                    const isSuccess = log.status === "success"
                    const isFailed = log.status === "failed"
                    return (
                      <div 
                        key={log.id} 
                        className="group relative overflow-hidden rounded-lg border bg-gradient-to-r from-card to-card/50 p-4 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start gap-4">
                          {/* Status Icon */}
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isSuccess ? 'bg-green-500/10' : isFailed ? 'bg-red-500/10' : 'bg-blue-500/10'
                          }`}>
                            {isSuccess ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : isFailed ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-blue-500" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold capitalize">
                                {log.action.replace(/_/g, ' ')}
                              </span>
                              <Badge 
                                variant={isFailed ? "destructive" : "default"} 
                                className={`text-xs ${
                                  isSuccess ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' :
                                  isFailed ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' :
                                  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                }`}
                              >
                                {log.status}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                              <Clock className="h-3 w-3" />
                              {new Date(log.createdAt).toLocaleString()}
                            </div>

                            {/* Details - Collapsible */}
                            {log.details && (
                              <details className="group/details mt-2">
                                <summary className="cursor-pointer text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 select-none">
                                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/details:rotate-180" />
                                  View Technical Details
                                </summary>
                                <div className="mt-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                                  {/* Parse and display key information */}
                                  {(() => {
                                    const details = log.details
                                    
                                    // If it's a rule deletion log
                                    if (log.action === 'rule_deleted' && details.id) {
                                      return (
                                        <div className="space-y-3">
                                          <div className="flex flex-col gap-1">
                                            <span className="text-xs font-semibold text-muted-foreground">Deleted Rule ID</span>
                                            <code className="text-xs bg-background px-2 py-1 rounded border font-mono break-all">
                                              {details.id}
                                            </code>
                                          </div>
                                        </div>
                                      )
                                    }
                                    
                                    // If it's a rule update log
                                    if ((log.action === 'rule_updated' || log.action === 'rule_paused' || log.action === 'rule_resumed') && details.before) {
                                      return (
                                        <div className="space-y-3">
                                          <div className="flex flex-col gap-1">
                                            <span className="text-xs font-semibold text-muted-foreground">Rule ID</span>
                                            <code className="text-xs bg-background px-2 py-1 rounded border font-mono break-all">
                                              {details.before?.id || details.after?.id || details.id}
                                            </code>
                                          </div>
                                          
                                          {/* Show what changed */}
                                          {details.before && details.after && (
                                            <div className="space-y-2">
                                              <span className="text-xs font-semibold text-muted-foreground block">Changes</span>
                                              
                                              {/* Status change */}
                                              {details.before.status !== details.after.status && (
                                                <div className="flex items-center gap-2 text-xs bg-background px-3 py-2 rounded border">
                                                  <span className="text-muted-foreground">Status:</span>
                                                  <Badge variant="secondary" className="text-xs">
                                                    {details.before.status}
                                                  </Badge>
                                                  <span className="text-muted-foreground">→</span>
                                                  <Badge variant="default" className="text-xs">
                                                    {details.after.status}
                                                  </Badge>
                                                </div>
                                              )}
                                              
                                              {/* Other changes */}
                                              {Object.keys(details.after || {}).map((key) => {
                                                if (key === 'status' || key === 'id' || key === 'createdAt' || key === 'ownerAddress') return null
                                                if (JSON.stringify(details.before?.[key]) !== JSON.stringify(details.after?.[key])) {
                                                  return (
                                                    <div key={key} className="flex items-start gap-2 text-xs bg-background px-3 py-2 rounded border">
                                                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                                      <span className="line-through text-muted-foreground">
                                                        {JSON.stringify(details.before?.[key])}
                                                      </span>
                                                      <span className="text-muted-foreground">→</span>
                                                      <span className="font-medium">
                                                        {JSON.stringify(details.after?.[key])}
                                                      </span>
                                                    </div>
                                                  )
                                                }
                                                return null
                                              })}
                                            </div>
                                          )}
                                          
                                          {/* Show raw JSON in collapsed state */}
                                          <details className="mt-3">
                                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground font-medium">
                                              Show Raw Data
                                            </summary>
                                            <pre className="mt-2 text-xs whitespace-pre-wrap break-all overflow-x-auto max-h-48 overflow-y-auto scrollbar-hide bg-background/50 p-3 rounded border">
                                              {JSON.stringify(details, null, 2)}
                                            </pre>
                                          </details>
                                        </div>
                                      )
                                    }
                                    
                                    // If it's a rule creation log
                                    if (log.action === 'rule_created' && details.id) {
                                      return (
                                        <div className="space-y-3">
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                              <span className="text-xs font-semibold text-muted-foreground">Rule Type</span>
                                              <Badge variant="outline" className="w-fit text-xs">
                                                {details.type?.toUpperCase() || 'N/A'}
                                              </Badge>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                              <span className="text-xs font-semibold text-muted-foreground">Status</span>
                                              <Badge variant="default" className="w-fit text-xs">
                                                {details.status?.toUpperCase() || 'ACTIVE'}
                                              </Badge>
                                            </div>
                                          </div>
                                          
                                          {details.targets && details.targets.length > 0 && (
                                            <div className="flex flex-col gap-1">
                                              <span className="text-xs font-semibold text-muted-foreground">Target Assets</span>
                                              <div className="flex flex-wrap gap-1.5">
                                                {details.targets.map((target: string, idx: number) => (
                                                  <Badge key={idx} variant="secondary" className="text-xs">
                                                    {target}
                                                  </Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {details.trigger && (
                                            <div className="flex flex-col gap-1">
                                              <span className="text-xs font-semibold text-muted-foreground">Trigger Condition</span>
                                              <div className="text-xs bg-background px-3 py-2 rounded border">
                                                {formatTrigger(details.trigger)}
                                              </div>
                                            </div>
                                          )}
                                          
                                          <div className="grid grid-cols-3 gap-3">
                                            {details.maxSpendUSD && (
                                              <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-muted-foreground">Max Spend</span>
                                                <div className="text-xs bg-background px-2 py-1 rounded border font-medium">
                                                  ${details.maxSpendUSD}
                                                </div>
                                              </div>
                                            )}
                                            {details.maxSlippage !== undefined && (
                                              <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-muted-foreground">Max Slippage</span>
                                                <div className="text-xs bg-background px-2 py-1 rounded border font-medium">
                                                  {details.maxSlippage}%
                                                </div>
                                              </div>
                                            )}
                                            {details.cooldownMinutes && (
                                              <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-muted-foreground">Cooldown</span>
                                                <div className="text-xs bg-background px-2 py-1 rounded border font-medium">
                                                  {details.cooldownMinutes}m
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {details.id && (
                                            <div className="flex flex-col gap-1">
                                              <span className="text-xs font-semibold text-muted-foreground">Rule ID</span>
                                              <code className="text-xs bg-background px-2 py-1 rounded border font-mono break-all">
                                                {details.id}
                                              </code>
                                            </div>
                                          )}
                                          
                                          {/* Show raw JSON in collapsed state */}
                                          <details className="mt-3">
                                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground font-medium">
                                              Show Raw Data
                                            </summary>
                                            <pre className="mt-2 text-xs whitespace-pre-wrap break-all overflow-x-auto max-h-48 overflow-y-auto scrollbar-hide bg-background/50 p-3 rounded border">
                                              {JSON.stringify(details, null, 2)}
                                            </pre>
                                          </details>
                                        </div>
                                      )
                                    }
                                    
                                    // If it's a rule execution/preview log
                                    if ((log.action === 'execute_rule' || log.action === 'preview_trade') && details.result) {
                                      return (
                                        <div className="space-y-3">
                                          {details.ruleId && (
                                            <div className="flex flex-col gap-1">
                                              <span className="text-xs font-semibold text-muted-foreground">Rule ID</span>
                                              <code className="text-xs bg-background px-2 py-1 rounded border font-mono break-all">
                                                {details.ruleId}
                                              </code>
                                            </div>
                                          )}
                                          
                                          {details.result?.txHash && (
                                            <div className="flex flex-col gap-1">
                                              <span className="text-xs font-semibold text-muted-foreground">Transaction Hash</span>
                                              <div className="flex items-center gap-2">
                                                <code className="text-xs bg-background px-2 py-1 rounded border font-mono break-all">
                                                  {details.result.txHash}
                                                </code>
                                                <a
                                                  href={`https://lora.algokit.io/testnet/transaction/${details.result.txHash}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-primary hover:text-primary/80 font-medium whitespace-nowrap"
                                                >
                                                  View on Explorer →
                                                </a>
                                              </div>
                                            </div>
                                          )}
                                          
                                          {details.result?.fromAsset && details.result?.toAsset && (
                                            <div className="grid grid-cols-2 gap-3">
                                              <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-muted-foreground">From</span>
                                                <div className="text-xs bg-background px-2 py-1 rounded border">
                                                  {details.result.fromAmount || details.result.fromAmountBaseUnits} {details.result.fromAsset}
                                                </div>
                                              </div>
                                              <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-muted-foreground">To</span>
                                                <div className="text-xs bg-background px-2 py-1 rounded border">
                                                  {details.result.toAmount || details.result.toAmountBaseUnits} {details.result.toAsset}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                          
                                          {/* Show raw JSON in collapsed state */}
                                          <details className="mt-3">
                                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground font-medium">
                                              Show Raw Data
                                            </summary>
                                            <pre className="mt-2 text-xs whitespace-pre-wrap break-all overflow-x-auto max-h-48 overflow-y-auto scrollbar-hide bg-background/50 p-3 rounded border">
                                              {JSON.stringify(details, null, 2)}
                                            </pre>
                                          </details>
                                        </div>
                                      )
                                    }
                                    
                                    // If it's a swap/transaction with structured data
                                    if (details.txId || details.txHash) {
                                      return (
                                        <div className="space-y-3">
                                          {details.txId && (
                                            <div className="flex flex-col gap-1">
                                              <span className="text-xs font-semibold text-muted-foreground">Transaction ID</span>
                                              <div className="flex items-center gap-2">
                                                <code className="text-xs bg-background px-2 py-1 rounded border font-mono break-all">
                                                  {details.txId}
                                                </code>
                                                <a
                                                  href={`https://lora.algokit.io/testnet/transaction/${details.txId}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-primary hover:text-primary/80 font-medium whitespace-nowrap"
                                                >
                                                  View on Explorer →
                                                </a>
                                              </div>
                                            </div>
                                          )}
                                          
                                          {details.fromAssetName && details.toAssetName && (
                                            <div className="grid grid-cols-2 gap-3">
                                              <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-muted-foreground">From</span>
                                                <div className="text-xs bg-background px-2 py-1 rounded border">
                                                  {details.fromAmount || details.fromAmountBaseUnits} {details.fromAssetName}
                                                </div>
                                              </div>
                                              <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-muted-foreground">To</span>
                                                <div className="text-xs bg-background px-2 py-1 rounded border">
                                                  {details.toAmount || details.toAmountBaseUnits} {details.toAssetName}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                          
                                          {details.confirmedRound && (
                                            <div className="flex flex-col gap-1">
                                              <span className="text-xs font-semibold text-muted-foreground">Confirmed Round</span>
                                              <div className="text-xs bg-background px-2 py-1 rounded border font-mono">
                                                {details.confirmedRound}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {/* Show raw JSON in collapsed state */}
                                          <details className="mt-3">
                                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground font-medium">
                                              Show Raw Data
                                            </summary>
                                            <pre className="mt-2 text-xs whitespace-pre-wrap break-all overflow-x-auto max-h-48 overflow-y-auto scrollbar-hide bg-background/50 p-3 rounded border">
                                              {JSON.stringify(details, null, 2)}
                                            </pre>
                                          </details>
                                        </div>
                                      )
                                    }
                                    
                                    // If it's an error
                                    if (details.error) {
                                      return (
                                        <div className="space-y-2">
                                          <div className="flex flex-col gap-1">
                                            <span className="text-xs font-semibold text-red-600 dark:text-red-400">Error Message</span>
                                            <div className="text-xs bg-red-500/5 text-red-700 dark:text-red-300 px-3 py-2 rounded border border-red-500/20">
                                              {details.error}
                                            </div>
                                          </div>
                                          
                                          {/* Show full details if available */}
                                          {Object.keys(details).length > 1 && (
                                            <details className="mt-3">
                                              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground font-medium">
                                                Show Full Details
                                              </summary>
                                              <pre className="mt-2 text-xs whitespace-pre-wrap break-all overflow-x-auto max-h-48 overflow-y-auto scrollbar-hide bg-background/50 p-3 rounded border">
                                                {JSON.stringify(details, null, 2)}
                                              </pre>
                                            </details>
                                          )}
                                        </div>
                                      )
                                    }
                                    
                                    // Default: show formatted JSON
                                    return (
                                      <pre className="text-xs whitespace-pre-wrap break-all overflow-x-auto max-h-48 overflow-y-auto scrollbar-hide">
                                        {JSON.stringify(details, null, 2)}
                                      </pre>
                                    )
                                  })()}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
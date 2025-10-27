"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { formatTrigger, type Rule } from "@/lib/shared/rules"
import { forceRunPoller, useAgentData } from "@/features/agent/hooks/useAgentData"
import { deleteRule as apiDeleteRule } from "@/features/agent/api/client"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useWalletConnection } from '@/components/providers/txnlab-wallet-provider'

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

  // Activity list: collapsed shows 2 recent; expand to see all
  const [activityExpanded, setActivityExpanded] = useState(false)
  const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const visibleLogs = activityExpanded ? sortedLogs : sortedLogs.slice(0, 2)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portfolio & Agent Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => address && refresh()} disabled={loading || !address}>
            Refresh
          </Button>
          <Button onClick={forceRun} disabled={!address}>
            Force run
          </Button>
        </div>
      </div>

      {!address && (
        <Card>
          <CardHeader>
            <CardTitle>Your rules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect your wallet to view and manage your agent rules.
            </p>
          </CardContent>
        </Card>
      )}

      {address && (
        <Card>
          <CardHeader>
            <CardTitle>Your rules</CardTitle>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rules yet. Create one to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Targets</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Cooldown</TableHead>
                      <TableHead>Next</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => {
                      const isPaused = rule.status === "paused"
                      return (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">{rule.type.toUpperCase()}</TableCell>
                          <TableCell className="text-sm">
                            {renderTargets(rule.targets)}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatTrigger(rule)}
                          </TableCell>
                          <TableCell className="text-sm">{rule.cooldownMinutes}m</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{nextCheck(rule)}</TableCell>
                          <TableCell>
                            <Badge variant={isPaused ? "secondary" : "default"}>
                              {isPaused ? "Paused" : "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isPaused ? (
                                <Button size="sm" variant="outline" onClick={() => pauseResume(rule, "active")}>
                                  Resume
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => pauseResume(rule, "paused")}>
                                  Pause
                                </Button>
                              )}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Rule Details</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="text-sm font-medium text-muted-foreground">ID</div>
                                      <div className="text-sm font-mono break-all">{rule.id}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-muted-foreground">Type</div>
                                      <div className="text-sm">{rule.type.toUpperCase()}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-muted-foreground">Targets</div>
                                      <div className="text-sm">{renderTargets(rule.targets)}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-muted-foreground">Trigger</div>
                                      <div className="text-sm">{formatTrigger(rule)}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-muted-foreground">Max Spend (USD)</div>
                                      <div className="text-sm">${rule.maxSpendUSD}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-muted-foreground">Max Slippage</div>
                                      <div className="text-sm">{rule.maxSlippage}%</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-muted-foreground">Cooldown</div>
                                      <div className="text-sm">{rule.cooldownMinutes} minutes</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-muted-foreground">Created</div>
                                      <div className="text-sm">{new Date(rule.createdAt).toLocaleString()}</div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-4">
                                    <Button size="sm" onClick={() => executeNow(rule)} className="flex-1">
                                      Execute Now
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => onDelete(rule)} className="flex-1">
                                      Delete
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
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

      {address && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Activity</span>
              {sortedLogs.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActivityExpanded(!activityExpanded)}
                  className="text-xs"
                >
                  {activityExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show all ({sortedLogs.length})
                    </>
                  )}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visibleLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {visibleLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{log.action}</span>
                        <Badge variant={log.status === "failed" ? "destructive" : "default"} className="text-xs">
                          {log.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                      {log.details && (
                        <div className="mt-2 text-xs">
                          <pre className="whitespace-pre-wrap break-all">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

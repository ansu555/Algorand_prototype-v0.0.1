"use client"

import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { formatTrigger, type Rule } from "@/lib/shared/rules"
import { forceRunPoller, useAgentData } from "@/features/agent/hooks/useAgentData"
import { deleteRule as apiDeleteRule } from "@/features/agent/api/client"
// resolveTokenByCoinrankingId removed (returns null); using symbol mapping only
import { ChevronDown, ChevronUp } from "lucide-react"

export default function AgentDashboardPage() {
  const { address } = useAccount()
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
        <h1 className="text-2xl font-semibold">Agent Dashboard</h1>
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
            <CardTitle>Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Targets</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead>Next check</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(r => {
                  const last = lastRunByRule.get(r.id)
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id.slice(-8)}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "active" ? "default" : "secondary"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="uppercase">{r.type}</TableCell>
                      <TableCell>{renderTargets(r.targets)}</TableCell>
                      <TableCell>{formatTrigger(r.trigger)}</TableCell>
                      <TableCell className="text-sm">
                        ${r.maxSpendUSD} • slip {r.maxSlippage}%
                      </TableCell>
                      <TableCell className="text-xs">
                        {last ? (
                          new Date(last.createdAt).toLocaleString()
                        ) : (
                          <span title="No executions yet">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{nextCheck(r)}</TableCell>
                      <TableCell className="flex gap-2">
                        {r.status === "active" ? (
                          <Button size="sm" variant="outline" onClick={() => pauseResume(r, "paused")}>Pause</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => pauseResume(r, "active")}>Resume</Button>
                        )}
                        <Button size="sm" onClick={() => executeNow(r)}>Execute</Button>
                        <Button size="sm" variant="destructive" onClick={() => onDelete(r)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {address && (
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {visibleLogs.map(l => (
                <div key={l.id} className="flex items-start justify-between gap-3 border rounded-md p-2">
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">{l.action}</span> • <span className="text-xs opacity-70">{new Date(l.createdAt).toLocaleString()}</span>
                    </div>
                    {l.ruleId && (
                      <div className="text-xs text-muted-foreground">
                        Rule: {l.ruleId.slice(-8)}
                      </div>
                    )}
                    {l.details && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary">Preview</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Log Preview</DialogTitle>
                          </DialogHeader>
                          <pre className="text-xs whitespace-pre-wrap break-words max-h-[60vh] overflow-auto">
                            {JSON.stringify(l.details, null, 2)}
                          </pre>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <Badge variant={l.status === "failed" ? "destructive" : l.status === "success" ? "default" : "secondary"}>
                    {l.status}
                  </Badge>
                </div>
              ))}
              {sortedLogs.length > 2 && (
                <div className="flex justify-center pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setActivityExpanded(v => !v)} className="gap-1 text-xs">
                    {activityExpanded ? (<><ChevronUp className="h-4 w-4" /> Show less</>) : (<><ChevronDown className="h-4 w-4" /> Show more</>)}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// features/agent/hooks/useAgentData.ts
'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchLogs, fetchRules, runPoller, updateRule } from '../api/client'
import type { Log, Rule } from '@/lib/shared/rules'

export function useAgentData(owner?: string) {
  const [rules, setRules] = useState<Rule[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(false)
  const [seenLogIds, setSeenLogIds] = useState<Set<string>>(new Set())

  async function refresh() {
    if (!owner) return
    setLoading(true)
    try {
      const [r, l] = await Promise.all([fetchRules(owner), fetchLogs(owner)])
      setRules(r)
      setLogs(l)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!owner) {
      setRules([])
      setLogs([])
      setSeenLogIds(new Set())
      return
    }
    refresh()
    const t = setInterval(refresh, 10000)
    return () => clearInterval(t)
  }, [owner])

  async function setRuleStatus(rule: Rule, status: 'active' | 'paused') {
    const updated = await updateRule(rule.id, { status })
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  const lastRunByRule = useMemo(() => {
    // Build arrays per ruleId
    const buckets = new Map<string, Log[]>()
    for (const log of logs) {
      if (!log.ruleId) continue
      let arr = buckets.get(log.ruleId)
      if (!arr) { arr = []; buckets.set(log.ruleId, arr) }
      arr.push(log)
    }
    const map = new Map<string, Log>()
    for (const [ruleId, arr] of buckets) {
      // Prefer execute_rule logs (success or failed)
      const execs = arr.filter(l => l.action === 'execute_rule')
      const chosen = (execs.length ? execs : arr)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      if (chosen) map.set(ruleId, chosen)
    }
    return map
  }, [logs])

  return { rules, logs, loading, refresh, setRuleStatus, lastRunByRule, seenLogIds, setSeenLogIds }
}

export async function forceRunPoller() {
  const res = await runPoller()
  return res
}

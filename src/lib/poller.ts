import { getRules, getLogs, createLog, type Rule, type LogEntry } from './db'

type PriceResponse = { coinId: string; price: number; prevPrice?: number; window?: string; source?: string }

function baseApi(): string {
  return process.env.PRICE_API || 'http://localhost:3000' 
}

async function fetchPrice(coinId: string, window?: string): Promise<PriceResponse | null> {
  const url = new URL(`${baseApi()}/api/price`)
  url.searchParams.set('coin', coinId)
  if (window) url.searchParams.set('window', window)
  try {
    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return json as PriceResponse
  } catch {
    return null
  }
}

function pctChange(from: number, to: number): number {
  if (!from || from <= 0) return 0
  return ((to - from) / from) * 100
}

function minutesAgo(dateIso: string): number {
  return (Date.now() - new Date(dateIso).getTime()) / 60000
}

function canTrigger(rule: Rule, lastExecIso?: string | null): boolean {
  const cd = Number(rule.cooldownMinutes ?? 0)
  if (!cd) return true
  if (!lastExecIso) return true
  return minutesAgo(lastExecIso) >= cd
}

async function lastExecutionAt(ruleId: string): Promise<string | undefined> {
  const logs = await getLogs()
  const latest = logs
    .filter((l) => l.ruleId === ruleId && (l.action === 'execute_rule'))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  return latest?.createdAt
}

export async function runPollerOnce(): Promise<{ checked: number; triggered: string[]; errors: { ruleId: string; error: string }[] }> {
  const all = await getRules()
  const active = all.filter((r) => (r.status === 'active'))
  const triggered: string[] = []
  const errors: { ruleId: string; error: string }[] = []

  for (const rule of active) {
    try {
      const targets = Array.isArray(rule.targets) ? rule.targets : []
      if (targets.length === 0) continue

      // Determine window for trend triggers (default 24h)
      const t: any = rule.trigger || {}
      const window = (t.window as string) || '24h'

      // Get latest and window prices per target
      const prices = await Promise.all(targets.map((c) => fetchPrice(c)))
      const windowPrices = await Promise.all(targets.map((c) => fetchPrice(c, window)))

      const latestById = new Map<string, number>()
      const prevById = new Map<string, number>()
      targets.forEach((c, i) => {
        const p = prices[i]?.price
        if (typeof p === 'number') latestById.set(c, p)
        const prev = windowPrices[i]?.prevPrice
        // if API returns prevPrice for the window, use it, otherwise fall back to price (no change)
        prevById.set(c, typeof prev === 'number' ? prev : (typeof p === 'number' ? p : 0))
      })

      // Evaluate trigger: any target satisfying condition triggers
      let matched = false
      for (const c of targets) {
        const latest = latestById.get(c) || 0
        const prev = prevById.get(c) || latest
        const change = pctChange(prev, latest)
        if (t.type === 'price_drop_pct') {
          if (change <= -Math.abs(Number(t.value ?? 0))) { matched = true; break }
        } else if (t.type === 'trend_pct') {
          if (change >= Number(t.value ?? 0)) { matched = true; break }
        } else if (t.type === 'momentum') {
          // Basic: reuse trend logic
          if (change >= Number(t.value ?? 0)) { matched = true; break }
        }
      }

      // Log the check
      const now = new Date().toISOString()
  await createLog({
        id: gen('log'),
        ownerAddress: rule.ownerAddress,
        ruleId: rule.id,
        action: 'poller_checked',
        details: { trigger: rule.trigger, matched, targets },
        status: 'success',
        createdAt: now,
      })

      if (!matched) continue

      // Cooldown check
      const last = await lastExecutionAt(rule.id)
      if (!canTrigger(rule, last)) continue

      // Trigger execute
      const execUrl = new URL(`${baseApi()}/api/agent/execute`)
      const res = await fetch(execUrl.toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ruleId: rule.id }) })
      if (res.ok) {
        triggered.push(rule.id)
        await createLog({
          id: gen('log'),
          ownerAddress: rule.ownerAddress,
          ruleId: rule.id,
          action: 'poller_triggered',
          details: { httpStatus: res.status },
          status: 'success',
          createdAt: new Date().toISOString(),
        })
      } else {
        const errText = await res.text().catch(() => String(res.status))
        errors.push({ ruleId: rule.id, error: errText })
        await createLog({
          id: gen('log'),
          ownerAddress: rule.ownerAddress,
          ruleId: rule.id,
          action: 'poller_trigger_failed',
          details: { httpStatus: res.status, error: errText },
          status: 'error',
          createdAt: new Date().toISOString(),
        })
      }
    } catch (e: any) {
      errors.push({ ruleId: rule.id, error: e?.message || 'unknown' })
      await createLog({
        id: gen('log'),
        ownerAddress: rule.ownerAddress,
        ruleId: rule.id,
        action: 'poller_error',
        details: { error: e?.message || String(e) },
        status: 'error',
        createdAt: new Date().toISOString(),
      })
    }
  }

  return { checked: active.length, triggered, errors }
}

function gen(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

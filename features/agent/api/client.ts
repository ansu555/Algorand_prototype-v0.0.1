// features/agent/api/client.ts
import type { Log, Rule } from '@/lib/shared/rules'

export async function fetchRules(owner: string): Promise<Rule[]> {
  const res = await fetch(`/api/rules?owner=${owner.toLowerCase()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return json.rules ?? []
}

export async function fetchLogs(owner: string): Promise<Log[]> {
  const res = await fetch(`/api/logs?owner=${owner.toLowerCase()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return json.logs ?? []
}

export async function createRule(payload: any): Promise<{ id: string; rule: Rule }> {
  const res = await fetch('/api/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function updateRule(id: string, changes: Partial<Rule>): Promise<Rule> {
  const res = await fetch('/api/rules', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...changes }) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return json.rule
}

export async function runPoller(): Promise<{ triggered: any[] }> {
  const res = await fetch('/api/poller', { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function deleteRule(id: string, owner: string): Promise<boolean> {
  const lowerOwner = owner.toLowerCase()
  const url = `/api/rules?id=${encodeURIComponent(id)}&owner=${encodeURIComponent(lowerOwner)}`
  const res = await fetch(url, { method: 'DELETE' })

  if (res.status === 404) {
    // Treat missing as already deleted (idempotent)
    return true
  }

  if (res.status === 403) {
    const body = await res.text().catch(() => '')
    throw new Error(`Not owner of rule (403). Rule id=${id} owner=${lowerOwner}. Server: ${body}`)
  }

  if (!res.ok) {
    const responseText = await res.text().catch(() => 'Unknown error')
    throw new Error(`Delete failed HTTP ${res.status}: ${responseText}`)
  }

  const json = await res.json()
  return json.success === true
}

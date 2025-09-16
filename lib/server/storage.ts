import { promises as fs } from "fs"
import path from "path"

const dataDir = path.join(process.cwd(), "data")
const rulesPath = path.join(dataDir, "rules.json")
const logsPath = path.join(dataDir, "logs.json")

async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true })
  try { await fs.access(rulesPath) } catch { await fs.writeFile(rulesPath, JSON.stringify([])) }
  try { await fs.access(logsPath) } catch { await fs.writeFile(logsPath, JSON.stringify([])) }
}

export type RuleTrigger =
  | { type: "price_drop_pct"; value: number }
  | { type: "trend_pct"; value: number; window: "24h" | "7d" | "30d" }
  | { type: "momentum"; value: number; lookbackDays: number }

export type StoredRule = {
  id: string
  ownerAddress: string
  type: "dca" | "rebalance" | "rotate"
  targets: string[]
  rotateTopN?: number
  maxSpendUSD: number
  maxSlippage: number
  trigger: RuleTrigger
  cooldownMinutes: number
  status: "active" | "paused"
  createdAt: string
}

export type LogEntry = {
  id: string
  ownerAddress: string
  ruleId?: string
  action: string
  details?: any
  status: "simulated" | "success" | "failed"
  createdAt: string
}

export async function getAllRules(): Promise<StoredRule[]> {
  await ensureDataFiles()
  const buf = await fs.readFile(rulesPath, "utf8")
  return JSON.parse(buf || "[]")
}

export async function saveRule(rule: StoredRule): Promise<StoredRule> {
  const list = await getAllRules()
  list.push(rule)
  await fs.writeFile(rulesPath, JSON.stringify(list, null, 2))
  return rule
}

export async function getRulesByOwner(owner: string): Promise<StoredRule[]> {
  const list = await getAllRules()
  return list.filter((r) => r.ownerAddress.toLowerCase() === owner.toLowerCase())
}

export async function updateRule(id: string, changes: Partial<StoredRule>): Promise<StoredRule | null> {
  const list = await getAllRules()
  let updated: StoredRule | null = null
  const next = list.map((r) => {
    if (r.id === id) {
      updated = { ...r, ...changes, id: r.id }
      return updated
    }
    return r
  })
  if (!updated) return null
  await fs.writeFile(rulesPath, JSON.stringify(next, null, 2))
  return updated
}

export async function getAllLogs(): Promise<LogEntry[]> {
  await ensureDataFiles()
  const buf = await fs.readFile(logsPath, "utf8")
  return JSON.parse(buf || "[]")
}

export async function appendLog(entry: LogEntry): Promise<LogEntry> {
  const list = await getAllLogs()
  list.unshift(entry)
  await fs.writeFile(logsPath, JSON.stringify(list, null, 2))
  return entry
}

export function generateId(prefix: string) {
  const rnd = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now()}_${rnd}`
}

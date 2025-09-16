// Lazy-load libsql client to avoid compile-time resolution issues when not installed/used
let clientPromise: Promise<any> | null = null
async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DB_URL
      const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_DB_AUTH_TOKEN
      if (!url) throw new Error('TURSO_DATABASE_URL is not set')
      const mod: any = await import('@libsql/client')
      return mod.createClient({ url, authToken })
    })()
  }
  return clientPromise
}

export type Rule = {
  id: string
  ownerAddress: string
  type: string
  targets: string[]
  rotateTopN?: number
  maxSpendUSD?: number
  maxSlippage?: number
  trigger?: Record<string, any>
  cooldownMinutes?: number
  status: string
  createdAt: string
}

export type LogEntry = {
  id: string
  ownerAddress: string
  ruleId?: string
  action: string
  details?: Record<string, any>
  status: string
  createdAt: string
}

function str(v: any) { return v == null ? null : JSON.stringify(v) }
function parseArr(v: any): string[] { if (!v) return []; try { const x = JSON.parse(String(v)); return Array.isArray(x) ? x : [] } catch { return [] } }
function parseObj(v: any): Record<string, any> | undefined { if (!v) return undefined; try { const x = JSON.parse(String(v)); return (x && typeof x === 'object') ? x : undefined } catch { return undefined } }

export const tursoDriver = {
  async migrate(): Promise<void> {
    const client = await getClient()
    await client.execute(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT)`)
    await client.execute(`CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      ownerAddress TEXT NOT NULL,
      type TEXT NOT NULL,
      targets TEXT NOT NULL,
      rotateTopN INTEGER,
      maxSpendUSD REAL,
      maxSlippage REAL,
      trigger TEXT,
      cooldownMinutes INTEGER,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )`)
    await client.execute(`CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      ownerAddress TEXT NOT NULL,
      ruleId TEXT,
      action TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )`)
  },
  async createRule(rule: Rule): Promise<Rule> {
    const client = await getClient()
    // Ensure ownerAddress stored lowercase for consistent lookups
    const normalized: Rule = { ...rule, ownerAddress: rule.ownerAddress.toLowerCase() }
    await client.execute({
      sql: `INSERT INTO rules (id, ownerAddress, type, targets, rotateTopN, maxSpendUSD, maxSlippage, trigger, cooldownMinutes, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      args: [normalized.id, normalized.ownerAddress, normalized.type, str(normalized.targets ?? []), normalized.rotateTopN ?? null, normalized.maxSpendUSD ?? null, normalized.maxSlippage ?? null, str(normalized.trigger ?? null), normalized.cooldownMinutes ?? null, normalized.status, normalized.createdAt]
    })
    return normalized
  },
  async getRules(ownerAddress?: string): Promise<Rule[]> {
  const client = await getClient()
    let sql = `SELECT * FROM rules`
    const args: any[] = []
    if (ownerAddress) { sql += ` WHERE ownerAddress = ?`; args.push(ownerAddress) }
    sql += ` ORDER BY datetime(createdAt) DESC`
    const { rows } = await client.execute({ sql, args })
    return rows.map((r: any) => ({
      id: r.id, ownerAddress: r.ownerAddress, type: r.type,
      targets: parseArr(r.targets), rotateTopN: r.rotateTopN ?? undefined, maxSpendUSD: r.maxSpendUSD ?? undefined,
      maxSlippage: r.maxSlippage ?? undefined, trigger: parseObj(r.trigger), cooldownMinutes: r.cooldownMinutes ?? undefined,
      status: r.status, createdAt: r.createdAt,
    }))
  },
  async getRuleById(id: string): Promise<Rule | null> {
  const client = await getClient()
    const { rows } = await client.execute({ sql: `SELECT * FROM rules WHERE id = ?`, args: [id] })
    const r: any = rows[0]
    if (!r) return null
    return { id: r.id, ownerAddress: r.ownerAddress, type: r.type, targets: parseArr(r.targets), rotateTopN: r.rotateTopN ?? undefined, maxSpendUSD: r.maxSpendUSD ?? undefined, maxSlippage: r.maxSlippage ?? undefined, trigger: parseObj(r.trigger), cooldownMinutes: r.cooldownMinutes ?? undefined, status: r.status, createdAt: r.createdAt }
  },
  async createLog(log: LogEntry): Promise<LogEntry> {
  const client = await getClient()
  await client.execute({
      sql: `INSERT INTO logs (id, ownerAddress, ruleId, action, details, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [log.id, log.ownerAddress, log.ruleId ?? null, log.action, str(log.details ?? null), log.status, log.createdAt]
    })
    return log
  },
  async getLogs(ownerAddress?: string): Promise<LogEntry[]> {
  const client = await getClient()
    let sql = `SELECT * FROM logs`
    const args: any[] = []
    if (ownerAddress) { sql += ` WHERE ownerAddress = ?`; args.push(ownerAddress) }
    sql += ` ORDER BY datetime(createdAt) DESC`
    const { rows } = await client.execute({ sql, args })
    return rows.map((r: any) => ({ id: r.id, ownerAddress: r.ownerAddress, ruleId: r.ruleId ?? undefined, action: r.action, details: parseObj(r.details), status: r.status, createdAt: r.createdAt }))
  },
  async updateRule(id: string, changes: Partial<Rule>): Promise<Rule | null> {
    const existing = await tursoDriver.getRuleById(id)
    if (!existing) return null
    const merged: Rule = { ...existing, ...changes, targets: (changes.targets ?? existing.targets) as string[], trigger: changes.trigger ?? existing.trigger, createdAt: existing.createdAt, id: existing.id }
  const client = await getClient()
  await client.execute({
      sql: `UPDATE rules SET ownerAddress=?, type=?, targets=?, rotateTopN=?, maxSpendUSD=?, maxSlippage=?, trigger=?, cooldownMinutes=?, status=? WHERE id=?`,
      args: [merged.ownerAddress, merged.type, str(merged.targets ?? []), merged.rotateTopN ?? null, merged.maxSpendUSD ?? null, merged.maxSlippage ?? null, str(merged.trigger ?? null), merged.cooldownMinutes ?? null, merged.status, merged.id]
    })
    return merged
  },
  async deleteRule(id: string, ownerAddress: string): Promise<boolean> {
    const client = await getClient()
    try {
      const res = await client.execute({
        sql: `DELETE FROM rules WHERE id = ? AND ownerAddress = ?`,
        args: [id, ownerAddress]
      })

      let affected = res.rowsAffected || res.changes || res.affectedRows || 0
      if (affected > 0) return true

      // Fallback: legacy records might have mixed-case ownerAddress; attempt case-insensitive match
      const sel = await client.execute({ sql: `SELECT ownerAddress FROM rules WHERE id = ?`, args: [id] })
      const row: any = sel.rows[0]
      if (row && typeof row.ownerAddress === 'string' && row.ownerAddress.toLowerCase() === ownerAddress.toLowerCase() && row.ownerAddress !== ownerAddress) {
        const res2 = await client.execute({ sql: `DELETE FROM rules WHERE id = ? AND ownerAddress = ?`, args: [id, row.ownerAddress] })
        affected = res2.rowsAffected || res2.changes || res2.affectedRows || 0
        return affected > 0
      }
      return false
    } catch (error) {
      console.error('Turso delete error:', error)
      return false
    }
  },
}

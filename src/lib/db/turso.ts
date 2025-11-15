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

export type AgentWallet = {
  id: string
  userAddress: string // The user's main wallet address
  agentAddress: string // The generated agent wallet address
  encryptedMnemonic: string // Encrypted agent wallet mnemonic
  createdAt: string
  lastUsedAt?: string
}

export type LaunchpadToken = {
  id: string
  assetId?: number // Algorand ASA ID (populated after deployment)
  name: string
  symbol: string
  decimals: number
  totalSupply: string
  creatorAddress: string
  description?: string
  logoPath?: string // Path to uploaded logo file
  website?: string
  twitter?: string
  telegram?: string
  status: 'draft' | 'deployed' | 'cooldown' | 'active' // Token lifecycle status
  cooldownEndTime?: string // When cooldown period ends
  marketCap?: number // Calculated market cap in USD
  initialPrice?: number // Initial price in USD
  createdAt: string
  deployedAt?: string
}

export type TokenWatchlist = {
  id: string
  userAddress: string
  tokenId: string // Reference to LaunchpadToken.id
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
    await client.execute(`CREATE TABLE IF NOT EXISTS agent_wallets (
      id TEXT PRIMARY KEY,
      userAddress TEXT NOT NULL UNIQUE,
      agentAddress TEXT NOT NULL UNIQUE,
      encryptedMnemonic TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      lastUsedAt TEXT
    )`)
    await client.execute(`CREATE TABLE IF NOT EXISTS launchpad_tokens (
      id TEXT PRIMARY KEY,
      assetId INTEGER,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      decimals INTEGER NOT NULL,
      totalSupply TEXT NOT NULL,
      creatorAddress TEXT NOT NULL,
      description TEXT,
      logoPath TEXT,
      website TEXT,
      twitter TEXT,
      telegram TEXT,
      status TEXT NOT NULL,
      cooldownEndTime TEXT,
      marketCap REAL,
      initialPrice REAL,
      createdAt TEXT NOT NULL,
      deployedAt TEXT
    )`)
    await client.execute(`CREATE TABLE IF NOT EXISTS token_watchlists (
      id TEXT PRIMARY KEY,
      userAddress TEXT NOT NULL,
      tokenId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(userAddress, tokenId)
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
  async deleteBadExecuteLogs(): Promise<number> {
    const client = await getClient()
    try {
      const res = await client.execute({
        // Remove execute_rule logs with undefined or missing linkage/details
        sql: `DELETE FROM logs 
              WHERE UPPER(action) = 'EXECUTE_RULE' 
                AND (
                  ruleId IS NULL OR TRIM(COALESCE(ruleId, '')) = ''
                  OR details IS NULL OR details = 'null'
                  OR (
                    json_extract(details, '$.plan') IS NULL 
                    AND json_extract(details, '$.swap') IS NULL 
                    AND json_extract(details, '$.txHash') IS NULL
                  )
                  OR (
                    json_extract(details, '$.plan') IS NOT NULL AND (
                      json_extract(details, '$.plan.assetId') IS NULL OR 
                      json_extract(details, '$.plan.totalSpendAmount') IS NULL
                    )
                  )
                  OR details LIKE '%undefined%'
                )`,
        args: []
      })
      const affected = (res as any).rowsAffected || (res as any).changes || (res as any).affectedRows || 0
      return affected
    } catch (e) {
      console.error('Turso cleanup deleteBadExecuteLogs error:', e)
      return 0
    }
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

  // Agent Wallet Operations
  async createAgentWallet(wallet: AgentWallet): Promise<AgentWallet> {
    const client = await getClient()
    await client.execute({
      sql: `INSERT INTO agent_wallets (id, userAddress, agentAddress, encryptedMnemonic, createdAt, lastUsedAt)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [wallet.id, wallet.userAddress, wallet.agentAddress, wallet.encryptedMnemonic, wallet.createdAt, wallet.lastUsedAt ?? null]
    })
    return wallet
  },

  async getAgentWallet(userAddress: string): Promise<AgentWallet | null> {
    const client = await getClient()
    const { rows } = await client.execute({
      sql: `SELECT * FROM agent_wallets WHERE userAddress = ?`,
      args: [userAddress]
    })
    const r: any = rows[0]
    if (!r) return null
    return {
      id: r.id,
      userAddress: r.userAddress,
      agentAddress: r.agentAddress,
      encryptedMnemonic: r.encryptedMnemonic,
      createdAt: r.createdAt,
      lastUsedAt: r.lastUsedAt ?? undefined
    }
  },

  async updateAgentWalletLastUsed(userAddress: string): Promise<void> {
    const client = await getClient()
    await client.execute({
      sql: `UPDATE agent_wallets SET lastUsedAt = ? WHERE userAddress = ?`,
      args: [new Date().toISOString(), userAddress]
    })
  },

  async deleteAgentWallet(userAddress: string): Promise<void> {
    const client = await getClient()
    await client.execute({
      sql: `DELETE FROM agent_wallets WHERE userAddress = ?`,
      args: [userAddress]
    })
  },

  async deleteAllAgentWallets(): Promise<void> {
    const client = await getClient()
    await client.execute(`DELETE FROM agent_wallets`)
  },

  // Launchpad Token Operations
  async createLaunchpadToken(token: LaunchpadToken): Promise<LaunchpadToken> {
    const client = await getClient()
    await client.execute({
      sql: `INSERT INTO launchpad_tokens (id, assetId, name, symbol, decimals, totalSupply, creatorAddress, description, logoPath, website, twitter, telegram, status, cooldownEndTime, marketCap, initialPrice, createdAt, deployedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        token.id,
        token.assetId ?? null,
        token.name,
        token.symbol,
        token.decimals,
        token.totalSupply,
        token.creatorAddress.toLowerCase(),
        token.description ?? null,
        token.logoPath ?? null,
        token.website ?? null,
        token.twitter ?? null,
        token.telegram ?? null,
        token.status,
        token.cooldownEndTime ?? null,
        token.marketCap ?? null,
        token.initialPrice ?? null,
        token.createdAt,
        token.deployedAt ?? null
      ]
    })
    return token
  },

  async getLaunchpadTokens(filters?: {
    status?: string
    creatorAddress?: string
    sortBy?: 'newest' | 'marketCap' | 'cooldown'
    limit?: number
    offset?: number
  }): Promise<LaunchpadToken[]> {
    const client = await getClient()
    let sql = `SELECT * FROM launchpad_tokens WHERE 1=1`
    const args: any[] = []

    if (filters?.status) {
      sql += ` AND status = ?`
      args.push(filters.status)
    }

    if (filters?.creatorAddress) {
      sql += ` AND creatorAddress = ?`
      args.push(filters.creatorAddress.toLowerCase())
    }

    // Sorting
    if (filters?.sortBy === 'newest') {
      sql += ` ORDER BY datetime(createdAt) DESC`
    } else if (filters?.sortBy === 'marketCap') {
      sql += ` ORDER BY marketCap DESC NULLS LAST`
    } else if (filters?.sortBy === 'cooldown') {
      sql += ` ORDER BY datetime(cooldownEndTime) ASC`
    } else {
      sql += ` ORDER BY datetime(createdAt) DESC`
    }

    if (filters?.limit) {
      sql += ` LIMIT ?`
      args.push(filters.limit)
    }

    if (filters?.offset) {
      sql += ` OFFSET ?`
      args.push(filters.offset)
    }

    const { rows } = await client.execute({ sql, args })
    return rows.map((r: any) => ({
      id: r.id,
      assetId: r.assetId ?? undefined,
      name: r.name,
      symbol: r.symbol,
      decimals: r.decimals,
      totalSupply: r.totalSupply,
      creatorAddress: r.creatorAddress,
      description: r.description ?? undefined,
      logoPath: r.logoPath ?? undefined,
      website: r.website ?? undefined,
      twitter: r.twitter ?? undefined,
      telegram: r.telegram ?? undefined,
      status: r.status,
      cooldownEndTime: r.cooldownEndTime ?? undefined,
      marketCap: r.marketCap ?? undefined,
      initialPrice: r.initialPrice ?? undefined,
      createdAt: r.createdAt,
      deployedAt: r.deployedAt ?? undefined
    }))
  },

  async getLaunchpadTokenById(id: string): Promise<LaunchpadToken | null> {
    const client = await getClient()
    const { rows } = await client.execute({
      sql: `SELECT * FROM launchpad_tokens WHERE id = ?`,
      args: [id]
    })
    const r: any = rows[0]
    if (!r) return null
    return {
      id: r.id,
      assetId: r.assetId ?? undefined,
      name: r.name,
      symbol: r.symbol,
      decimals: r.decimals,
      totalSupply: r.totalSupply,
      creatorAddress: r.creatorAddress,
      description: r.description ?? undefined,
      logoPath: r.logoPath ?? undefined,
      website: r.website ?? undefined,
      twitter: r.twitter ?? undefined,
      telegram: r.telegram ?? undefined,
      status: r.status,
      cooldownEndTime: r.cooldownEndTime ?? undefined,
      marketCap: r.marketCap ?? undefined,
      initialPrice: r.initialPrice ?? undefined,
      createdAt: r.createdAt,
      deployedAt: r.deployedAt ?? undefined
    }
  },

  async updateLaunchpadToken(id: string, changes: Partial<LaunchpadToken>): Promise<LaunchpadToken | null> {
    const existing = await tursoDriver.getLaunchpadTokenById(id)
    if (!existing) return null
    
    const merged: LaunchpadToken = { ...existing, ...changes, id: existing.id, createdAt: existing.createdAt }
    const client = await getClient()
    await client.execute({
      sql: `UPDATE launchpad_tokens SET assetId=?, name=?, symbol=?, decimals=?, totalSupply=?, creatorAddress=?, description=?, logoPath=?, website=?, twitter=?, telegram=?, status=?, cooldownEndTime=?, marketCap=?, initialPrice=?, deployedAt=? WHERE id=?`,
      args: [
        merged.assetId ?? null,
        merged.name,
        merged.symbol,
        merged.decimals,
        merged.totalSupply,
        merged.creatorAddress,
        merged.description ?? null,
        merged.logoPath ?? null,
        merged.website ?? null,
        merged.twitter ?? null,
        merged.telegram ?? null,
        merged.status,
        merged.cooldownEndTime ?? null,
        merged.marketCap ?? null,
        merged.initialPrice ?? null,
        merged.deployedAt ?? null,
        merged.id
      ]
    })
    return merged
  },

  async deleteLaunchpadToken(id: string, creatorAddress: string): Promise<boolean> {
    const client = await getClient()
    try {
      const res = await client.execute({
        sql: `DELETE FROM launchpad_tokens WHERE id = ? AND creatorAddress = ?`,
        args: [id, creatorAddress.toLowerCase()]
      })
      const affected = res.rowsAffected || res.changes || res.affectedRows || 0
      return affected > 0
    } catch (error) {
      console.error('Turso delete launchpad token error:', error)
      return false
    }
  },

  // Token Watchlist Operations
  async addToWatchlist(watchlistItem: TokenWatchlist): Promise<TokenWatchlist> {
    const client = await getClient()
    await client.execute({
      sql: `INSERT INTO token_watchlists (id, userAddress, tokenId, createdAt)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(userAddress, tokenId) DO NOTHING`,
      args: [watchlistItem.id, watchlistItem.userAddress.toLowerCase(), watchlistItem.tokenId, watchlistItem.createdAt]
    })
    return watchlistItem
  },

  async removeFromWatchlist(userAddress: string, tokenId: string): Promise<boolean> {
    const client = await getClient()
    try {
      const res = await client.execute({
        sql: `DELETE FROM token_watchlists WHERE userAddress = ? AND tokenId = ?`,
        args: [userAddress.toLowerCase(), tokenId]
      })
      const affected = res.rowsAffected || res.changes || res.affectedRows || 0
      return affected > 0
    } catch (error) {
      console.error('Turso remove from watchlist error:', error)
      return false
    }
  },

  async getWatchlist(userAddress: string): Promise<string[]> {
    const client = await getClient()
    const { rows } = await client.execute({
      sql: `SELECT tokenId FROM token_watchlists WHERE userAddress = ? ORDER BY datetime(createdAt) DESC`,
      args: [userAddress.toLowerCase()]
    })
    return rows.map((r: any) => r.tokenId)
  },

  async isInWatchlist(userAddress: string, tokenId: string): Promise<boolean> {
    const client = await getClient()
    const { rows } = await client.execute({
      sql: `SELECT 1 FROM token_watchlists WHERE userAddress = ? AND tokenId = ? LIMIT 1`,
      args: [userAddress.toLowerCase(), tokenId]
    })
    return rows.length > 0
  },
}

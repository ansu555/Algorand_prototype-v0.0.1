import { tursoDriver, type Rule, type LogEntry, type AgentWallet, type LaunchpadToken, type TokenWatchlist, type AgentWalletStats } from './turso'

export type { Rule, LogEntry, AgentWallet, LaunchpadToken, TokenWatchlist, AgentWalletStats }

// Initialize Turso database
let initPromise: Promise<void> | null = null
async function ensureInit() {
  if (initPromise) return initPromise
  if (tursoDriver?.migrate) {
    initPromise = tursoDriver.migrate().catch((e: any) => {
      // If migration fails due to permissions or existing tables, continue
      console.warn('DB migrate warning:', e?.message || e)
    }).then(() => {})
  } else {
    initPromise = Promise.resolve()
  }
  return initPromise
}

export async function createRule(rule: Rule): Promise<Rule> { 
  await ensureInit(); 
  return tursoDriver.createRule(rule) 
}

export async function getRules(ownerAddress?: string): Promise<Rule[]> { 
  await ensureInit(); 
  return tursoDriver.getRules(ownerAddress) 
}

export async function getRuleById(id: string): Promise<Rule | null> { 
  await ensureInit(); 
  return tursoDriver.getRuleById(id) 
}

export async function createLog(log: LogEntry): Promise<LogEntry> { 
  await ensureInit(); 
  return tursoDriver.createLog(log) 
}

export async function getLogs(ownerAddress?: string): Promise<LogEntry[]> { 
  await ensureInit(); 
  return tursoDriver.getLogs(ownerAddress) 
}

export async function updateRule(id: string, changes: Partial<Rule>): Promise<Rule | null> { 
  await ensureInit(); 
  return tursoDriver.updateRule(id, changes) 
}

export async function deleteRule(id: string, ownerAddress: string): Promise<boolean> { 
  await ensureInit(); 
  return tursoDriver.deleteRule(id, ownerAddress) 
}

export async function createAgentWallet(wallet: AgentWallet): Promise<AgentWallet> {
  await ensureInit()
  return tursoDriver.createAgentWallet(wallet)
}

export async function getAgentWallet(userAddress: string): Promise<AgentWallet | null> {
  await ensureInit()
  return tursoDriver.getAgentWallet(userAddress)
}

export async function updateAgentWalletLastUsed(userAddress: string): Promise<void> {
  await ensureInit()
  return tursoDriver.updateAgentWalletLastUsed(userAddress)
}

export async function deleteAgentWallet(userAddress: string): Promise<void> {
  await ensureInit()
  return tursoDriver.deleteAgentWallet(userAddress)
}

export async function deleteAllAgentWallets(): Promise<void> {
  await ensureInit()
  return tursoDriver.deleteAllAgentWallets()
}

// Launchpad Token Operations
export async function createLaunchpadToken(token: LaunchpadToken): Promise<LaunchpadToken> {
  await ensureInit()
  return tursoDriver.createLaunchpadToken(token)
}

export async function getLaunchpadTokens(filters?: {
  status?: string
  creatorAddress?: string
  sortBy?: 'newest' | 'marketCap' | 'cooldown'
  limit?: number
  offset?: number
}): Promise<LaunchpadToken[]> {
  await ensureInit()
  return tursoDriver.getLaunchpadTokens(filters)
}

export async function getLaunchpadTokenById(id: string): Promise<LaunchpadToken | null> {
  await ensureInit()
  return tursoDriver.getLaunchpadTokenById(id)
}

export async function updateLaunchpadToken(id: string, changes: Partial<LaunchpadToken>): Promise<LaunchpadToken | null> {
  await ensureInit()
  return tursoDriver.updateLaunchpadToken(id, changes)
}

export async function deleteLaunchpadToken(id: string, creatorAddress: string): Promise<boolean> {
  await ensureInit()
  return tursoDriver.deleteLaunchpadToken(id, creatorAddress)
}

// Token Watchlist Operations
export async function addToWatchlist(watchlistItem: TokenWatchlist): Promise<TokenWatchlist> {
  await ensureInit()
  return tursoDriver.addToWatchlist(watchlistItem)
}

export async function removeFromWatchlist(userAddress: string, tokenId: string): Promise<boolean> {
  await ensureInit()
  return tursoDriver.removeFromWatchlist(userAddress, tokenId)
}

export async function getWatchlist(userAddress: string): Promise<string[]> {
  await ensureInit()
  return tursoDriver.getWatchlist(userAddress)
}

export async function isInWatchlist(userAddress: string, tokenId: string): Promise<boolean> {
  await ensureInit()
  return tursoDriver.isInWatchlist(userAddress, tokenId)
}

// Agent Wallet Stats Operations
export async function getAgentWalletStats(userAddress: string): Promise<AgentWalletStats | null> {
  await ensureInit()
  return tursoDriver.getAgentWalletStats(userAddress)
}

export async function createAgentWalletStats(stats: AgentWalletStats): Promise<AgentWalletStats> {
  await ensureInit()
  return tursoDriver.createAgentWalletStats(stats)
}

export async function updateAgentWalletStats(userAddress: string, changes: Partial<AgentWalletStats>): Promise<AgentWalletStats | null> {
  await ensureInit()
  return tursoDriver.updateAgentWalletStats(userAddress, changes)
}

export async function incrementAgentTrade(userAddress: string, spendUSD: number, success: boolean): Promise<void> {
  await ensureInit()
  return tursoDriver.incrementAgentTrade(userAddress, spendUSD, success)
}

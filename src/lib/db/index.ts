import { tursoDriver, type Rule, type LogEntry, type AgentWallet } from './turso'

export type { Rule, LogEntry, AgentWallet }

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

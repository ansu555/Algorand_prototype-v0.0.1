// lib/shared/rules.ts
export type RuleTrigger =
  | { type: 'price_drop_pct'; value: number }
  | { type: 'trend_pct'; value: number; window: '24h' | '7d' | '30d' }
  | { type: 'momentum'; value: number; lookbackDays: number }

export type Rule = {
  id: string
  ownerAddress: string
  type: 'dca' | 'rebalance' | 'rotate'
  targets: string[]
  rotateTopN?: number
  maxSpendUSD: number
  maxSlippage: number
  trigger: RuleTrigger
  cooldownMinutes: number
  status: 'active' | 'paused'
  createdAt: string
}

export type Log = {
  id: string
  ownerAddress: string
  ruleId?: string
  action: string
  details?: any
  status: 'simulated' | 'success' | 'failed'
  createdAt: string
}

export function formatTrigger(t: RuleTrigger | any) {
  if (!t) return '—'
  if (t.type === 'price_drop_pct') return `Price drop ≥ ${t.value}%`
  if (t.type === 'trend_pct') return `Trend ≥ ${t.value}% (${t.window || '24h'})`
  if (t.type === 'momentum') return `Momentum ≥ ${t.value}% (${t.lookbackDays}d)`
  return typeof t === 'string' ? t : JSON.stringify(t)
}

export function describeRule(input: Partial<Rule> & { strategy?: string; coins?: string[]; triggerType?: string; maxSpendUsd?: number; maxSlippagePercent?: number }) {
  const strategy = input.strategy || input.type || 'rebalance'
  const coins = input.coins || input.targets || []
  const coinList = coins.join(', ') || (input.rotateTopN ? `Top ${input.rotateTopN}` : 'coins')
  let triggerText = ''
  if (input.triggerType === 'priceDrop' || input.trigger?.type === 'price_drop_pct') triggerText = `on a ${(input as any).dropPercent ?? input.trigger?.value ?? 0}% drop`
  if (input.triggerType === 'trend' || input.trigger?.type === 'trend_pct') {
    const trig = input.trigger?.type === 'trend_pct' ? (input.trigger as Extract<RuleTrigger, { type: 'trend_pct' }>) : undefined
    const window = (input as any).trendWindow ?? trig?.window ?? '24h'
    const value = (input as any).trendThreshold ?? trig?.value ?? 0
    triggerText = `when ${window} trend ≥ ${value}%`
  }
  if (input.triggerType === 'momentum' || input.trigger?.type === 'momentum') {
    const trig = input.trigger?.type === 'momentum' ? (input.trigger as Extract<RuleTrigger, { type: 'momentum' }>) : undefined
    const lookback = (input as any).momentumLookback ?? trig?.lookbackDays ?? 0
    const value = (input as any).momentumThreshold ?? trig?.value ?? 0
    triggerText = `when momentum(${lookback}d) ≥ ${value}%`
  }
  const action = strategy === 'DCA' || strategy === 'dca' ? 'DCA buy' : strategy === 'REBALANCE' || strategy === 'rebalance' ? 'rebalance' : 'rotate'
  const spend = input.maxSpendUSD ?? (input as any).maxSpendUsd
  const slip = input.maxSlippage ?? (input as any).maxSlippagePercent
  const cooldown = input.cooldownMinutes ?? 0
  return `${action} ${coinList} ${triggerText}. Limits: $${spend}, slippage ${slip}%, cooldown ${cooldown}m.`
}

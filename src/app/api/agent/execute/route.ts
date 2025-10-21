import { NextResponse } from "next/server"
import { getRuleById, createLog, type LogEntry } from "@/lib/db"
import { getAgent } from "@/lib/agent"
import { resolveTokenByCoinrankingId } from "@/lib/tokens"

export const runtime = "nodejs"

async function fetchPrice(baseUrl: string, coinId: string): Promise<number | null> {
  try {
    const res = await fetch(`${baseUrl}/api/price?coin=${encodeURIComponent(coinId)}`, { cache: 'no-store' })
    if (!res.ok) return null
  const data = (await res.json().catch(() => null)) as unknown
  const p = (typeof data === 'object' && data !== null && 'price' in data)
    ? (data as { price?: unknown }).price
    : (typeof data === 'object' && data !== null && 'data' in data && typeof (data as any).data === 'object' && (data as any).data !== null && 'price' in (data as any).data)
      ? (data as { data?: { price?: unknown } }).data?.price
      : undefined
    const n = Number(p)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function getBaseUrl(req: Request) {
  const host = req.headers.get('host') || 'localhost:3000'
  const isLocal = host.includes('localhost') || host.startsWith('127.0.0.1')
  const protocol = isLocal ? 'http' : 'https'
  return `${protocol}://${host}`
}

function generateId(prefix: string) {
  const rnd = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now()}_${rnd}`
}


export async function POST(req: Request) {
  let loadedRule: any = null
  try {
    const body = (await req.json().catch(() => ({}))) as unknown
    const ruleId = (typeof body === 'object' && body && 'ruleId' in body) ? (body as { ruleId?: string }).ruleId : undefined
    if (!ruleId || typeof ruleId !== 'string') {
      console.debug('[POST /api/agent/execute] abort: missing ruleId', { body })
      return NextResponse.json({ success: false, error: 'Missing ruleId', code: 'MISSING_RULE_ID' }, { status: 400 })
    }

    const rule = await getRuleById(ruleId)
    loadedRule = rule
    if (!rule) {
      console.debug('[POST /api/agent/execute] abort: rule not found', { ruleId })
      return NextResponse.json({ success: false, error: 'Rule not found', code: 'RULE_NOT_FOUND' }, { status: 404 })
    }

    const baseUrl = getBaseUrl(req)
    const targets: string[] = Array.isArray(rule.targets) ? rule.targets : []
    if (!targets.length) {
      console.debug('[POST /api/agent/execute] abort: no targets', { ruleId })
      return NextResponse.json({ success: false, error: 'No targets in rule', code: 'NO_TARGETS' }, { status: 400 })
    }
    const spendTotal = Number(rule.maxSpendUSD ?? 0)
    if (!(spendTotal > 0)) {
      console.debug('[POST /api/agent/execute] abort: invalid maxSpendUSD', { ruleId, spendTotal })
      return NextResponse.json({ success: false, error: 'maxSpendUSD must be > 0', code: 'INVALID_MAX_SPEND' }, { status: 400 })
    }
    const perLegSpend = spendTotal / targets.length

    const prices: Record<string, number | null> = {}
    await Promise.all(targets.map(async (coinId) => { prices[coinId] = await fetchPrice(baseUrl, coinId) }))

    const legs = targets.map((coinId) => {
      const token = null // Token resolution by Coinranking ID disabled; mapping required for real execution
      const price = prices[coinId]
      const qty = price && price > 0 ? perLegSpend / price : 0
      return { coinId, symbol: (token as any)?.symbol ?? null, side: 'buy' as const, price: price ?? 0, qty, spendUSD: perLegSpend }
    })
    const plan = { totalSpendUSD: spendTotal, legs }

    // Validate first leg and token mapping
    const first = legs[0]
    if (!first) return NextResponse.json({ success: false, error: 'No execution legs computed' }, { status: 400 })
    const outSymbol = first.symbol || first.coinId
  if (!first.symbol) throw new Error(`Unsupported target ${first.coinId}. Provide symbol mapping before execution.`)
    if (!(first.spendUSD > 0)) throw new Error('Per-leg spend must be > 0')

    // Compute ETH sell amount from USD budget using ETH price (Coinranking ETH uuid)
    const ETH_UUID = 'razxDUgYGNAdQ'
    const ethPrice = await fetchPrice(baseUrl, ETH_UUID)
  if (!ethPrice || ethPrice <= 0) throw new Error('ETH price unavailable')
    const ethAmount = first.spendUSD / ethPrice
    if (!(ethAmount > 0)) throw new Error('Computed ETH amount is zero')
    const amountStr = String(ethAmount)

    // Execute swap
    const agent = await getAgent()
    const result = await agent.smartSwap({ tokenInSymbol: 'ETH', tokenOutSymbol: outSymbol, amount: amountStr, slippage: rule.maxSlippage ?? 0.5 })
    const txHash = result.hash

    const now = new Date().toISOString()
    const log: LogEntry = {
      id: generateId('log'),
      ownerAddress: rule.ownerAddress,
      ruleId: rule.id,
      action: 'execute_rule',
      details: { rule, prices, plan, txHash },
      status: 'success',
      createdAt: now,
    }
    await createLog(log)

    return NextResponse.json({ success: true, logEntry: log }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Execution failed'
    // Best-effort failure log
    if (loadedRule?.ownerAddress) {
      const now = new Date().toISOString()
      const failLog: LogEntry = {
        id: generateId('log'),
        ownerAddress: loadedRule.ownerAddress,
        ruleId: loadedRule.id,
        action: 'execute_rule',
        details: { error: msg },
        status: 'failed',
        createdAt: now,
      }
      try { await createLog(failLog) } catch {}
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

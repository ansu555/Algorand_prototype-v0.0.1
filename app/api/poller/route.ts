import { NextResponse } from "next/server"
import { appendLog, getAllRules, generateId, type StoredRule } from "@/lib/server/storage"
import { fetchManyCoinDetails } from "@/lib/server/prices"

function ruleTargets(rule: StoredRule) {
  return rule.targets && rule.targets.length ? rule.targets : []
}

function checkTrigger(rule: StoredRule, price: { change24hPct: number }) {
  const t = rule.trigger
  if (t.type === "price_drop_pct") {
    return price.change24hPct <= -Math.abs(t.value)
  }
  if (t.type === "trend_pct") {
    // For MVP, approximate trend with 24h change
    return price.change24hPct >= t.value
  }
  if (t.type === "momentum") {
    // MVP: reuse 24h pct as a proxy
    return price.change24hPct >= t.value
  }
  return false
}

function buildTradePlan(rule: StoredRule, priceMap: Map<string, { price: number }>) {
  const perCoinSpend = rule.maxSpendUSD && rule.targets.length ? rule.maxSpendUSD / rule.targets.length : 0
  const legs = ruleTargets(rule).map((coinId) => {
    const p = priceMap.get(coinId)?.price || 0
    const qty = p > 0 ? perCoinSpend / p : 0
    return { coinId, side: rule.type === "rebalance" || rule.type === "dca" ? "buy" : "buy", price: p, qty, spendUSD: perCoinSpend }
  })
  return { totalSpendUSD: perCoinSpend * legs.length, legs }
}

export async function POST() {
  // This endpoint can be called by a CRON, background job, or manual trigger for MVP
  const rules = (await getAllRules()).filter((r) => r.status === "active")
  const ids = Array.from(new Set(rules.flatMap((r) => ruleTargets(r))))
  const priceMap = await fetchManyCoinDetails(ids)

  const triggered: unknown[] = []

  for (const rule of rules) {
    let anyMatch = false
    for (const coinId of ruleTargets(rule)) {
      const pd = priceMap.get(coinId)
      if (!pd) continue
      const match = checkTrigger(rule, { change24hPct: pd.change24hPct })
      if (match) { anyMatch = true; break }
    }
    if (!anyMatch) continue

    // Build trade plan preview
    const plan = buildTradePlan(rule, priceMap)
    const now = new Date().toISOString()
    await appendLog({
      id: generateId("log"),
      ownerAddress: rule.ownerAddress,
      ruleId: rule.id,
      action: "preview_trade",
      details: { rule, plan },
      status: "simulated",
      createdAt: now,
    })

    // For MVP, simulate agent trigger via internal call replacement
    triggered.push({ ruleId: rule.id, ownerAddress: rule.ownerAddress, plan })
  }

  // Return summary
  return NextResponse.json({ ok: true, triggered }, { status: 200 })
}

export async function GET() {
  // Convenience for testing from browser
  return POST()
}

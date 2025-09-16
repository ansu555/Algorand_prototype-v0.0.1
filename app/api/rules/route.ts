import { NextResponse } from "next/server"
import { createRule, getRules as dbGetRules, createLog, type Rule, updateRule as dbUpdateRule, getRuleById as dbGetRuleById, deleteRule as dbDeleteRule } from "@/lib/db"

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Basic validation and normalization
  // Normalize owner address to lowercase for consistency
  const ownerAddress = (body.ownerAddress || "0x0000000000000000000000000000000000000000").toString().toLowerCase()
    const type = (body.type || "rebalance").toString()
    const targets = Array.isArray(body.targets) ? body.targets.map(String) : []
    const trigger = body.trigger && typeof body.trigger === "object" ? body.trigger : mapTrigger(body)
  // Accept both camel variants from frontend
  const maxSpendUSD = Number(body.maxSpendUSD ?? body.maxSpendUsd ?? 0)
    const maxSlippage = Number(body.maxSlippage ?? 0)
    const cooldownMinutes = Number(body.cooldownMinutes ?? 0)
    if (!ownerAddress || !type) {
      return NextResponse.json({ error: "ownerAddress and type are required" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const rule: Rule = {
      id: generateId("rule"),
      ownerAddress,
      type,
      targets,
      rotateTopN: body.rotateTopN != null ? Number(body.rotateTopN) : undefined,
      maxSpendUSD,
      maxSlippage,
      trigger,
      cooldownMinutes,
      status: (body.status || "active").toString(),
      createdAt: now,
    }

    if (!(typeof rule.maxSpendUSD === 'number' && rule.maxSpendUSD > 0)) {
      return NextResponse.json({ error: 'maxSpendUSD must be > 0', code: 'INVALID_MAX_SPEND' }, { status: 400 })
    }

    console.debug('[POST /api/rules] create normalized', { id: rule.id, owner: rule.ownerAddress, maxSpendUSD: rule.maxSpendUSD, type: rule.type })

  await createRule(rule)
  await createLog({
      id: generateId("log"),
      ownerAddress: rule.ownerAddress,
      ruleId: rule.id,
      action: "rule_created",
      details: rule,
      status: "success",
      createdAt: now,
    })

    return NextResponse.json({ id: rule.id, rule }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerRaw = searchParams.get('owner')
    const owner = ownerRaw ? ownerRaw.toLowerCase() : undefined
    const rules = await dbGetRules(owner || undefined)
    return NextResponse.json({ rules })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    console.error('GET rules error:', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const id = String(body.id || "")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const allowed: Partial<Rule> = {}
    if (body.status && (body.status === 'active' || body.status === 'paused')) allowed.status = body.status
    if (Array.isArray(body.targets)) allowed.targets = body.targets.map(String)
    if (body.type) allowed.type = String(body.type)
    if (body.rotateTopN != null) allowed.rotateTopN = Number(body.rotateTopN)
    if (body.maxSpendUSD != null) allowed.maxSpendUSD = Number(body.maxSpendUSD)
    if (body.maxSlippage != null) allowed.maxSlippage = Number(body.maxSlippage)
    if (body.cooldownMinutes != null) allowed.cooldownMinutes = Number(body.cooldownMinutes)
    if (body.trigger && typeof body.trigger === 'object') allowed.trigger = body.trigger

  const before = await dbGetRuleById(id)
  const updated = await dbUpdateRule(id, allowed)
    if (!updated) return NextResponse.json({ error: "Rule not found" }, { status: 404 })

    const now = new Date().toISOString()
  await createLog({
      id: generateId('log'),
      ownerAddress: updated.ownerAddress,
      ruleId: id,
      action: 'rule_updated',
      details: { before, after: updated, changes: allowed },
      status: 'success',
      createdAt: now,
    })

    return NextResponse.json({ rule: updated }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const ownerRaw = searchParams.get('owner')
    if (!id || !ownerRaw) {
      return NextResponse.json({ error: 'Missing id or owner' }, { status: 400 })
    }
    const owner = ownerRaw.toLowerCase()

    // Fetch rule first to differentiate not found vs unauthorized
    const existing = await dbGetRuleById(id)
    console.debug('[DELETE /api/rules] incoming', { id, owner, exists: !!existing, existingOwner: existing?.ownerAddress })
    if (!existing) {
      return NextResponse.json({ error: 'Rule not found', code: 'RULE_NOT_FOUND' }, { status: 404 })
    }

    if (existing.ownerAddress.toLowerCase() !== owner) {
      console.debug('[DELETE /api/rules] ownership mismatch', { id, owner, existingOwner: existing.ownerAddress })
      return NextResponse.json({ error: 'Not owner of rule', code: 'RULE_OWNERSHIP_MISMATCH' }, { status: 403 })
    }

    const success = await dbDeleteRule(id, owner)
    console.debug('[DELETE /api/rules] delete attempt', { id, owner, success })
    if (success) {
      try {
        await createLog({
          id: generateId('log'),
          ownerAddress: existing.ownerAddress,
          ruleId: existing.id,
          action: 'rule_deleted',
          details: { id: existing.id },
          status: 'success',
          createdAt: new Date().toISOString(),
        })
      } catch (e) {
        console.warn('Failed to log rule_deleted', e)
      }
      return NextResponse.json({ success: true, id })
    }
    // If we get here something odd happened (race condition)
    return NextResponse.json({ error: 'Delete failed', code: 'RULE_DELETE_FAILED' }, { status: 500 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    console.error('DELETE rule error:', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

type TriggerBody = {
  triggerType?: 'priceDrop' | 'trend' | 'momentum' | string
  dropPercent?: number | string
  trendThreshold?: number | string
  trendWindow?: string
  momentumThreshold?: number | string
  momentumLookback?: number | string
}

function mapTrigger(body: TriggerBody) {
  const t = String(body.triggerType || '')
  if (t === "priceDrop") return { type: "price_drop_pct", value: Number(body.dropPercent ?? 0) }
  if (t === "trend") return { type: "trend_pct", value: Number(body.trendThreshold ?? 0), window: body.trendWindow || "24h" }
  if (t === "momentum") return { type: "momentum", value: Number(body.momentumThreshold ?? 0), lookbackDays: Number(body.momentumLookback ?? 0) }
  return { type: "price_drop_pct", value: 0 }
}

function generateId(prefix: string) {
  const rnd = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now()}_${rnd}`
}

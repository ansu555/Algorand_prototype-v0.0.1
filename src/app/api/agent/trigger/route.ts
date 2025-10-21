import { NextResponse } from "next/server"
import { appendLog, generateId } from "@/lib/server/storage"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const now = new Date().toISOString()
    const { ownerAddress = "0x0", ruleId, action = "trade_execute", simulate = true, details } = body || {}

    // Here we would call AgentKit / 0xGasless to execute
    const result = { txHash: simulate ? undefined : `0x${Math.random().toString(16).slice(2)}`, simulated: !!simulate }

    await appendLog({
      id: generateId("log"),
      ownerAddress,
      ruleId,
      action,
      details: { ...details, result },
      status: simulate ? "simulated" : "success",
      createdAt: now,
    })

    return NextResponse.json({ ok: true, result }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

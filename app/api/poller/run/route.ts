import { NextResponse } from 'next/server'
import { runPollerOnce } from '@/lib/poller'

export const runtime = 'nodejs'

function originFrom(req: Request) {
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim()
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000').split(',')[0].trim()
  return `${proto}://${host}`
}

export async function GET(req: Request) {
  try {
    // Optional auth for cron
    const url = new URL(req.url)
    const token = url.searchParams.get('token') || undefined
    const required = process.env.CRON_SECRET || undefined
    if (required && token !== required) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure poller points to this deployment when fetching /api endpoints
    const base = originFrom(req)
    process.env.PRICE_API = base

    const result = await runPollerOnce()
    return NextResponse.json({ ok: true, ...result }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Poller failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

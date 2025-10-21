import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token') || undefined
    const cronSecret = process.env.CRON_SECRET
    const migrateSecret = process.env.MIGRATE_SECRET
    const protectionEnabled = Boolean(cronSecret || migrateSecret)
    if (protectionEnabled) {
      const valid = (token && (token === cronSecret || token === migrateSecret))
      if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const driver = (process.env.DB_DRIVER || '').toLowerCase()
    if (driver !== 'turso' && driver !== 'libsql') {
      return NextResponse.json({ ok: true, message: 'SQLite driver selected. No remote migration required.' })
    }
    const { tursoDriver } = await import('@/lib/db/turso')
    await tursoDriver.migrate()
    return NextResponse.json({ ok: true, message: 'Migration completed' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Migration failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function GET(req: Request) {
  return POST(req)
}

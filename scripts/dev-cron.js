#!/usr/bin/env node
/* eslint-disable no-console */
// Local-only cron loop: runs poller every 60s.
// Does NOT affect production (vercel.json remains daily).

const { runPollerOnce } = require('../dist/lib/poller.js')

async function loop() {
  // Optional: base URL for price API when running locally
  if (!process.env.PRICE_API) {
    process.env.PRICE_API = 'http://localhost:3000'
  }
  while (true) {
    const started = new Date()
    try {
      const res = await runPollerOnce()
      console.log(`[dev-cron] ${started.toISOString()} →`, JSON.stringify(res))
    } catch (e) {
      console.error('[dev-cron] error:', e && e.stack || e)
    }
    await new Promise(r => setTimeout(r, 60_000))
  }
}

loop().catch(err => {
  console.error('[dev-cron] fatal:', err && err.stack || err)
  process.exit(1)
})

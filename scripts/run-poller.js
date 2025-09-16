#!/usr/bin/env node
/* eslint-disable no-console */
const { runPollerOnce } = require('../dist/lib/poller.js')

async function main() {
  try {
    const result = await runPollerOnce()
    console.log(JSON.stringify(result, null, 2))
    process.exit(0)
  } catch (e) {
    console.error('Poller failed:', e && e.stack || e)
    process.exit(1)
  }
}

main()

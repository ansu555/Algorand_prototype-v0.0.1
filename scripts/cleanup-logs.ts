#!/usr/bin/env tsx
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { tursoDriver } from '../src/lib/db/turso'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function main() {
  try {
    const removed = await tursoDriver.deleteBadExecuteLogs()
    console.log(`✅ Deleted ${removed} invalid execute_rule logs`)
    process.exit(0)
  } catch (e: any) {
    console.error('❌ Cleanup failed:', e?.message || e)
    process.exit(1)
  }
}

main()

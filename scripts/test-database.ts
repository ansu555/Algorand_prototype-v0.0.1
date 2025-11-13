/**
 * Test script to verify database connectivity and check swap logs
 * Usage: npx tsx scripts/test-database.ts
 */

// Load environment variables from .env file
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from project root
config({ path: resolve(__dirname, '../.env') })

import { getLogs } from '../src/lib/db'

async function testDatabase() {
  console.log('🔍 Testing database connection...\n')
  console.log('Environment check:')
  console.log('  TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? '✅ Set' : '❌ Not set')
  console.log('  TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? '✅ Set' : '❌ Not set')
  console.log()
  
  try {
    // Fetch all logs (without filtering by owner)
    console.log('📖 Fetching all logs from database...')
    const allLogs = await getLogs()
    
    console.log(`✅ Total logs in database: ${allLogs.length}\n`)
    
    // Filter swap logs
    const swapLogs = allLogs.filter(log => log.action === 'swap')
    console.log(`🔄 Total swap logs: ${swapLogs.length}\n`)
    
    if (swapLogs.length > 0) {
      console.log('📊 Recent swap logs:')
      swapLogs.slice(0, 5).forEach((log, idx) => {
        console.log(`\n--- Swap ${idx + 1} ---`)
        console.log(`ID: ${log.id}`)
        console.log(`Owner: ${log.ownerAddress}`)
        console.log(`Status: ${log.status}`)
        console.log(`Created: ${log.createdAt}`)
        console.log(`Details:`, JSON.stringify(log.details, null, 2))
      })
    } else {
      console.log('⚠️  No swap logs found in database')
      console.log('\nAll logs:')
      allLogs.forEach(log => {
        console.log(`- ${log.action} | ${log.ownerAddress} | ${log.createdAt}`)
      })
    }
    
    // Group by owner
    const ownerGroups = swapLogs.reduce((acc, log) => {
      acc[log.ownerAddress] = (acc[log.ownerAddress] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('\n📈 Swaps per wallet:')
    Object.entries(ownerGroups).forEach(([owner, count]) => {
      console.log(`  ${owner}: ${count} swaps`)
    })
    
  } catch (error) {
    console.error('❌ Database error:', error)
    process.exit(1)
  }
}

testDatabase()
  .then(() => {
    console.log('\n✅ Database test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })

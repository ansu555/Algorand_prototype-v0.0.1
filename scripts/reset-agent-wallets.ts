/**
 * Reset Agent Wallets
 * 
 * Deletes all agent wallets from the database.
 * Use this when you change the AGENT_WALLET_ENCRYPTION_KEY.
 * 
 * Usage: npx tsx scripts/reset-agent-wallets.ts
 */

// Load environment variables from .env and .env.local files
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env first, then .env.local (latter can override)
config({ path: resolve(__dirname, '../.env') })
config({ path: resolve(__dirname, '../.env.local') })

import { deleteAllAgentWallets } from '../src/lib/db'

async function main() {
  try {
    console.log('🗑️  Deleting all agent wallets from database...')
    console.log('⚠️  This will require users to recreate their agent wallets')
    console.log()
    
    // Delete all agent wallets
    await deleteAllAgentWallets()
    
    console.log('✅ All agent wallets deleted successfully!')
    console.log('💡 New agent wallets will be created automatically when users connect')
    console.log('💡 They will be encrypted with the new AGENT_WALLET_ENCRYPTION_KEY')
    
  } catch (error: any) {
    console.error('❌ Error resetting agent wallets:', error.message)
    process.exit(1)
  }
}

main()

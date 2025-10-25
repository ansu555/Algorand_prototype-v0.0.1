#!/usr/bin/env node

/**
 * Opt into a Tinyman V2 pool application
 * Usage: node scripts/opt-into-pool.mjs <pool-app-id>
 */

import algosdk from 'algosdk'

const ALGOD_SERVER = 'https://testnet-api.algonode.cloud'

async function main() {
  const poolAppId = process.argv[2]
  
  if (!poolAppId) {
    console.log('❌ Please provide pool app ID:')
    console.log('   node scripts/opt-into-pool.mjs 148607000')
    process.exit(1)
  }
  
  console.log(`\n📋 To opt into Tinyman V2 pool app ${poolAppId}:\n`)
  console.log('Option 1: Use AlgoExplorer (Easiest)')
  console.log('─'.repeat(50))
  console.log(`1. Visit: https://testnet.algoexplorer.io/application/${poolAppId}`)
  console.log('2. Click "Opt In" button')
  console.log('3. Sign with your Lute wallet')
  
  console.log('\nOption 2: Use Lute Wallet Directly')
  console.log('─'.repeat(50))
  console.log('1. Open your Lute wallet')
  console.log('2. Go to "Apps" or "Applications"')
  console.log(`3. Search for app ID: ${poolAppId}`)
  console.log('4. Click "Opt In"')
  
  console.log('\nOption 3: Use AlgoKit (Command Line)')
  console.log('─'.repeat(50))
  console.log(`algokit task opt-in \\`)
  console.log(`  --app-id ${poolAppId} \\`)
  console.log(`  --network testnet`)
  
  console.log('\n💡 Note: You need to opt into each Tinyman pool you want to use.')
  console.log('   This is a one-time action per pool.\n')
}

main()

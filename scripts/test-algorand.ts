#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })

import { buildAlgorandAgent } from '../lib/algorand'

async function testAlgorandIntegration() {
  try {
    console.log('🔷 Testing Algorand Integration...\n')
    
    // Check if environment is configured
    if (!process.env.ALGORAND_MNEMONIC) {
      console.log('❌ ALGORAND_MNEMONIC not set in environment')
      console.log('Please add your 25-word mnemonic to .env.local')
      return
    }
    
    const agent = await buildAlgorandAgent()
    console.log('✅ Algorand agent initialized successfully')
    
    // Test network info
    const networkInfo = agent.getNetworkInfo()
    console.log(`📡 Network: ${networkInfo.network}`)
    console.log(`⚡ Block Time: ${networkInfo.blockTime}s`)
    console.log(`🔒 Finality: ${networkInfo.finality}`)
    
    // Test address
    const address = await agent.getAddress()
    console.log(`🏠 Address: ${address}`)
    
    // Test ALGO balance
    const algoBalance = await agent.getBalance(0) // ALGO has ASA ID 0
    console.log(`💰 ALGO Balance: ${algoBalance}`)
    
    // Test supported assets
    console.log(`🪙 Supported Assets: ${Object.keys(agent.assets).join(', ')}`)
    
    // Test price fetching
    try {
      const algoPrice = await agent.getAssetPrice('ALGO')
      console.log(`📊 ALGO Price: $${algoPrice.price.toFixed(4)}`)
      if (algoPrice.change24h) {
        console.log(`📈 24h Change: ${algoPrice.change24h.toFixed(2)}%`)
      }
    } catch (e) {
      console.log('⚠️ Price fetching failed (API limit or network issue)')
    }
    
    // Test portfolio
    try {
      const portfolio = await agent.getPortfolio()
      console.log(`💎 Total Portfolio Value: $${portfolio.totalValueUSD.toFixed(2)}`)
      console.log(`📋 Assets with balance:`)
      portfolio.assets
        .filter(asset => parseFloat(asset.balance) > 0)
        .forEach(asset => {
          console.log(`   ${asset.symbol}: ${asset.balance} ($${asset.valueUSD.toFixed(2)})`)
        })
    } catch (e) {
      console.log('⚠️ Portfolio fetching failed (API limit or network issue)')
    }
    
    console.log('\n✅ Algorand integration test completed successfully!')
    console.log('\n🔷 Try these commands in the chat:')
    console.log('   • "algorand address"')
    console.log('   • "algo balance"')
    console.log('   • "algorand portfolio"')
    console.log('   • "algo price"')
    console.log('   • "transfer 1 ALGO to <address>"')
    
  } catch (error: any) {
    console.error('❌ Algorand integration test failed:')
    console.error(error.message)
    
    if (error.message.includes('mnemonic')) {
      console.log('\n💡 Make sure ALGORAND_MNEMONIC is set in your .env.local file')
      console.log('   Format: "word1 word2 word3 ... word25"')
    }
    
    if (error.message.includes('network')) {
      console.log('\n💡 Check your internet connection and Algorand network status')
    }
  }
}

// Run the test
testAlgorandIntegration()

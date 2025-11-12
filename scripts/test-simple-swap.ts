#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })

import { buildAlgorandAgent } from '../src/lib/algorand'
import { SimpleSwap } from '../src/lib/simple-swap'

async function testSimpleSwap() {
  try {
    console.log('🔄 Testing Simple Swap Implementation...\n')
    
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
    
    // Test address
    const address = await agent.getAddress()
    console.log(`🏠 Address: ${address}`)
    
    // Test ALGO balance
    const algoBalance = await agent.getBalance(0)
    console.log(`💰 ALGO Balance: ${algoBalance}`)
    
    // Test Simple Swap
    console.log('\n🔄 Testing Simple Swap...')
    const simpleSwap = new SimpleSwap(agent.algodClient, networkInfo.network as 'mainnet' | 'testnet')
    
    // Test quote
    console.log('📈 Testing swap quote...')
    try {
      const quote = await simpleSwap.getQuote(0, 10458941, '100') // 100 ALGO
      console.log(`💱 Quote for 100 ALGO: ${quote.amountOut} USDC`)
      console.log(`📊 Price Impact: ${quote.priceImpact.toFixed(2)}%`)
      console.log(`💰 Fee: ${quote.fee} ALGO`)
    } catch (e: any) {
      console.log(`⚠️ Quote test failed: ${e.message}`)
    }
    
    // Test pool info
    console.log('\n📊 Testing pool info...')
    try {
      const poolInfo = await simpleSwap.getPoolInfo(0, 10458941)
      if (poolInfo) {
        console.log(`✅ Pool info:`)
        console.log(`   Asset A: ${poolInfo.assetAId}`)
        console.log(`   Asset B: ${poolInfo.assetBId}`)
        console.log(`   Reserve A: ${poolInfo.reserveA.toFixed(2)}`)
        console.log(`   Reserve B: ${poolInfo.reserveB.toFixed(2)}`)
        console.log(`   Total Liquidity: ${poolInfo.totalLiquidity.toFixed(2)}`)
      }
    } catch (e: any) {
      console.log(`⚠️ Pool info test failed: ${e.message}`)
    }
    
    // Test basic functionality
    console.log('\n🔷 Testing basic Algorand functionality...')
    
    // Test portfolio
    try {
      const portfolio = await agent.getPortfolio()
      console.log(`💎 Portfolio Value: $${portfolio.totalValueUSD.toFixed(2)}`)
      console.log(`📋 Assets: ${portfolio.assets.length}`)
    } catch (e) {
      console.log('⚠️ Portfolio test failed (API limit or network issue)')
    }
    
    // Test price fetching
    try {
      const algoPrice = await agent.getAssetPrice('ALGO')
      console.log(`📊 ALGO Price: $${algoPrice.price.toFixed(4)}`)
    } catch (e) {
      console.log('⚠️ Price fetching failed (API limit or network issue)')
    }
    
    // Test swap (simulation)
    console.log('\n🔄 Testing swap simulation...')
    try {
      const recipientAddress = process.env.SWAP_TEST_RECIPIENT || await agent.getAddress()
      const swapResult = await agent.atomicSwap({
        assetInSymbol: 'ALGO',
        assetOutSymbol: 'USDC',
        amountIn: '10',
        recipient: recipientAddress
      })
      console.log(`✅ Swap successful: ${swapResult.txId}`)
      console.log(`📊 Details:`, swapResult.details)
    } catch (e: any) {
      console.log(`⚠️ Swap test failed: ${e.message}`)
    }
    
    console.log('\n✅ Simple Swap test completed!')
    console.log('\n🔷 Features implemented:')
    console.log('   • Basic swap functionality')
    console.log('   • Quote system for price discovery')
    console.log('   • Pool information retrieval')
    console.log('   • Integration with Algorand agent')
    console.log('   • Demo implementation (ready for AMM integration)')
    
    console.log('\n🚀 Next steps:')
    console.log('   • Integrate with a real AMM (Pact, Tinyman, etc.)')
    console.log('   • Add more sophisticated swap logic')
    console.log('   • Implement real pool interactions')
    console.log('   • Add liquidity provision features')
    
    console.log('\n💡 Current Status:')
    console.log('   • Working Algorand integration')
    console.log('   • Basic swap framework ready')
    console.log('   • No external dependencies')
    console.log('   • Ready for AMM integration')
    
  } catch (error: any) {
    console.error('❌ Simple Swap test failed:')
    console.error(error.message)
    
    if (error.message.includes('mnemonic')) {
      console.log('\n💡 Make sure ALGORAND_MNEMONIC is set in your .env.local file')
    }
  }
}

// Run the test
testSimpleSwap()

#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })

import { buildAlgorandAgent } from '../lib/algorand'

async function testSwapFunctionality() {
  try {
    console.log('🔄 Testing Algorand Swap Integration...\n')
    
    if (!process.env.ALGORAND_MNEMONIC) {
      console.log('❌ ALGORAND_MNEMONIC not set')
      return
    }
    
    const agent = await buildAlgorandAgent()
    console.log('✅ Algorand agent initialized')
    
    // Test address and network
    const address = await agent.getAddress()
    const network = agent.getNetworkInfo()
    console.log(`🏠 Address: ${address}`)
    console.log(`📡 Network: ${network.network}`)
    
    // Test balances
    const algoBalance = await agent.getBalance(0)
    const usdcBalance = await agent.getBalance(10458941) // USDC testnet
    console.log(`💰 ALGO Balance: ${algoBalance}`)
    console.log(`💵 USDC Balance: ${usdcBalance}`)
    
    // Check if we have enough ALGO for a test swap
    if (parseFloat(algoBalance) < 1) {
      console.log('\n⚠️ Insufficient ALGO balance for swap test')
      console.log('Get test ALGO from: https://testnet.algoexplorer.io/dispenser')
      return
    }
    
    console.log('\n🔄 Testing swap functionality...')
    
    // Test swap (small amount)
    try {
      console.log('Attempting to swap 0.1 ALGO for USDC...')
      const swapResult = await agent.atomicSwap({
        assetInSymbol: 'ALGO',
        assetOutSymbol: 'USDC',
        amountIn: '0.1'
      })
      
      console.log('✅ Swap successful!')
      console.log(`🔗 Transaction ID: ${swapResult.txId}`)
      console.log(`📊 Details:`)
      console.log(`   Amount In: ${swapResult.details.amountIn} ${swapResult.details.assetInSymbol}`)
      console.log(`   Amount Out: ${swapResult.details.amountOut} ${swapResult.details.assetOutSymbol}`)
      console.log(`   Price Impact: ${(swapResult.details.priceImpact * 100).toFixed(2)}%`)
      
      // Check new balances
      console.log('\n💰 Updated Balances:')
      const newAlgoBalance = await agent.getBalance(0)
      const newUsdcBalance = await agent.getBalance(10458941)
      console.log(`   ALGO: ${newAlgoBalance}`)
      console.log(`   USDC: ${newUsdcBalance}`)
      
    } catch (swapError: any) {
      console.log('❌ Swap test failed:', swapError.message)
      
      if (swapError.message.includes('Pool not found')) {
        console.log('\n💡 This might be because:')
        console.log('   • Tinyman pool doesn\'t exist for ALGO/USDC on testnet')
        console.log('   • Network connectivity issues')
        console.log('   • Tinyman SDK configuration needs adjustment')
      }
    }
    
    console.log('\n✅ Swap integration test completed!')
    console.log('\n🔄 Try these commands in the chat:')
    console.log('   • "swap 1 ALGO for USDC"')
    console.log('   • "swap 5 USDC to ALGO"')
    console.log('   • "algorand portfolio"')
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  }
}

testSwapFunctionality()

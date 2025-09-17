#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })

import { getAgent } from '../lib/agent'

async function testAgentAddress() {
  try {
    console.log('🤖 Testing AI Agent GetAddress...\n')
    
    // Check if environment is configured
    if (!process.env.ALGORAND_MNEMONIC) {
      console.log('❌ ALGORAND_MNEMONIC not set in environment')
      console.log('Please add your 25-word mnemonic to .env.local')
      return
    }
    
    console.log('🔧 Initializing AI Agent...')
    const agent = await getAgent()
    console.log('✅ AI Agent initialized successfully')
    
    console.log('\n📍 Testing GetAddress...')
    const address = await agent.getAddress()
    console.log(`✅ Address retrieved: ${address}`)
    
    console.log('\n💰 Testing GetBalance...')
    const balance = await agent.getBalance(0) // ALGO balance
    console.log(`✅ ALGO Balance: ${balance}`)
    
    console.log('\n📊 Testing Portfolio...')
    try {
      const portfolio = await agent.getPortfolio()
      console.log(`✅ Portfolio Value: $${portfolio.totalValueUSD.toFixed(2)}`)
      console.log(`📋 Assets: ${portfolio.assets.length}`)
    } catch (e) {
      console.log('⚠️ Portfolio test failed (API limit or network issue)')
    }
    
    console.log('\n🎯 Testing Agent Actions API...')
    try {
      const response = await fetch('http://localhost:3000/api/agent/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'GetAddress'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Agent Actions API working:', data)
      } else {
        const errorText = await response.text()
        console.log('❌ Agent Actions API failed:', response.status, errorText)
      }
    } catch (e: any) {
      console.log('⚠️ Agent Actions API test failed (server not running?):', e.message)
    }
    
    console.log('\n✅ AI Agent test completed successfully!')
    console.log('\n🔷 Available Agent Functions:')
    console.log('   • getAddress() - Get wallet address')
    console.log('   • getBalance() - Check token balances')
    console.log('   • transfer() - Send ALGO/ASA transfers')
    console.log('   • atomicSwap() - Execute token swaps')
    console.log('   • getPortfolio() - Get portfolio overview')
    console.log('   • getAssetPrice() - Get token prices')
    
  } catch (error: any) {
    console.error('❌ AI Agent test failed:')
    console.error(error.message)
    
    if (error.message.includes('mnemonic')) {
      console.log('\n💡 Make sure ALGORAND_MNEMONIC is set in your .env.local file')
    }
    
    if (error.message.includes('JSON')) {
      console.log('\n💡 JSON parsing error - check your environment configuration')
    }
  }
}

// Run the test
testAgentAddress()

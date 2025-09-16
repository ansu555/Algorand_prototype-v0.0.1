// Simple test script to check on-chain pool fetching
require('dotenv').config({ path: './.env.local' })

async function testOnChainPools() {
  try {
    // Import our on-chain functions
    const { refreshAllPools, fetchOnChainPool, getStandardTokens } = require('./lib/routing/onchain.ts')
    const { resolveTokenBySymbol } = require('./lib/tokens.ts')
    
    console.log('🔍 Testing on-chain pool fetching...')
    
    // Get standard tokens
    const tokens = getStandardTokens()
    console.log(`📊 Found ${tokens.length} standard tokens:`, tokens.map(t => t.symbol))
    
    // Try to fetch WAVAX-USDC pool specifically
    const wavax = resolveTokenBySymbol('WAVAX')
    const usdc = resolveTokenBySymbol('USDC')
    
    if (!wavax || !usdc) {
      console.log('❌ Could not resolve WAVAX or USDC tokens')
      return
    }
    
    console.log('🔗 Trying to fetch WAVAX-USDC pool...')
    const pool = await fetchOnChainPool(wavax, usdc)
    
    if (pool) {
      console.log('✅ Found on-chain pool:', {
        id: pool.id,
        pairAddress: pool.pairAddress,
        reserve0: pool.reserve0.toString(),
        reserve1: pool.reserve1.toString(),
        token0: pool.token0.symbol,
        token1: pool.token1.symbol
      })
    } else {
      console.log('❌ No on-chain pool found for WAVAX-USDC')
      console.log('💡 This is likely because no liquidity has been added to the pair yet')
    }
    
    console.log('\n🔄 Testing full pool discovery...')
    const allPools = await refreshAllPools()
    console.log(`📈 Discovered ${allPools.length} pools with liquidity`)
    
  } catch (error) {
    console.error('❌ Error testing on-chain pools:', error.message)
  }
}

testOnChainPools()
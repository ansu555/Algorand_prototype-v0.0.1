/**
 * Test script for pools API endpoint
 */

async function testPoolsAPI() {
  try {
    console.log('🧪 Testing /api/pools/all endpoint...\n');
    
    const response = await fetch('http://localhost:3001/api/pools/all');
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ API Success!');
      console.log(`\n📊 Stats:`);
      console.log(`   Total Pools: ${data.stats.total}`);
      console.log(`   Tinyman: ${data.stats.tinyman}`);
      console.log(`   Pact: ${data.stats.pact}`);
      console.log(`   Cached: ${data.cached ? 'Yes' : 'No'}`);
      
      console.log(`\n🏊 Sample Pools (first 5):`);
      data.pools.slice(0, 5).forEach((pool: any, i: number) => {
        console.log(`\n   ${i + 1}. ${pool.asset1.symbol}/${pool.asset2.symbol}`);
        console.log(`      DEX: ${pool.dexName}`);
        console.log(`      Fee: ${pool.fee} bps (${(pool.fee / 100).toFixed(2)}%)`);
        console.log(`      Pool ID: ${pool.poolId.slice(0, 10)}...`);
        if (pool.reserve1 && pool.reserve2) {
          const r1 = Number(pool.reserve1) / (10 ** pool.asset1.decimals);
          const r2 = Number(pool.reserve2) / (10 ** pool.asset2.decimals);
          console.log(`      Reserves: ${r1.toFixed(2)} ${pool.asset1.symbol} / ${r2.toFixed(2)} ${pool.asset2.symbol}`);
        }
      });
    } else {
      console.log('❌ API Error:', data.error);
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testPoolsAPI();

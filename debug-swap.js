// Debug USDC to USDT swap issue
const https = require('https');
const http = require('http');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function debugSwap() {
  console.log('🔍 Debugging USDC to USDT swap...\n');

  // Step 1: Check available assets
  console.log('1. Checking available USDC/USDT assets...');
  const assetsRes = await fetch('http://localhost:3000/api/assets/tradeable');
  const assetsData = await assetsRes.json();
  
  const usdcAssets = assetsData.assets.filter(a => a.unitName === 'USDC');
  const usdtAssets = assetsData.assets.filter(a => a.unitName === 'USDt' || a.unitName === 'USDT');
  
  console.log('USDC assets:', usdcAssets.map(a => ({ id: a.id, name: a.name, unitName: a.unitName })));
  console.log('USDT assets:', usdtAssets.map(a => ({ id: a.id, name: a.name, unitName: a.unitName })));

  // Step 2: Check pools
  console.log('\n2. Checking available pools...');
  const poolsRes = await fetch('http://localhost:3000/api/pools/all');
  const poolsData = await poolsRes.json();
  
  const relevantPools = poolsData.pools.filter(p => 
    (usdcAssets.some(u => u.id === p.asset1.id) || usdtAssets.some(u => u.id === p.asset1.id)) &&
    (usdcAssets.some(u => u.id === p.asset2.id) || usdtAssets.some(u => u.id === p.asset2.id))
  );
  
  console.log('Relevant pools:', relevantPools.map(p => ({
    poolId: p.poolId.slice(0, 10) + '...',
    asset1: `${p.asset1.unitName} (${p.asset1.id})`,
    asset2: `${p.asset2.unitName} (${p.asset2.id})`,
    dex: p.dexName
  })));

  // Step 3: Test quote for each combination
  console.log('\n3. Testing quotes...');
  for (const usdc of usdcAssets) {
    for (const usdt of usdtAssets) {
      if (usdc.id === usdt.id) continue;
      
      console.log(`\nTesting ${usdc.unitName} (${usdc.id}) -> ${usdt.unitName} (${usdt.id}):`);
      
      try {
        const quoteRes = await fetch('http://localhost:3000/api/router/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromAssetId: usdc.id,
            toAssetId: usdt.id,
            amount: 1000000, // 1 USDC
            slippage: 0.5
          })
        });
        
        const quoteData = await quoteRes.json();
        
        if (quoteData.success) {
          console.log(`  ✅ Quote found: ${quoteData.outputAmount / 1000000} ${usdt.unitName}`);
          console.log(`  Route: ${quoteData.route.dex}, Impact: ${quoteData.priceImpact?.toFixed(2)}%`);
        } else {
          console.log(`  ❌ Quote failed: ${quoteData.error}`);
        }
      } catch (error) {
        console.log(`  ❌ Request failed: ${error.message}`);
      }
    }
  }
}

debugSwap().catch(console.error);

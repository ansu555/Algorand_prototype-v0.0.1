/**
 * Test Multi-Source Price Oracle
 * Tests price fetching from multiple sources and Indexer integration
 */

import { MultiSourcePriceFeed } from '../src/lib/oracle/multi-source-price-feed';

async function main() {
  console.log('🚀 Testing Multi-Source Price Oracle\n');

  // Initialize price feed
  const priceFeed = new MultiSourcePriceFeed('testnet');
  console.log('✅ Price feed initialized for testnet\n');

  // Test 1: Get ALGO price
  console.log('═══════════════════════════════════════════');
  console.log('Test 1: ALGO Price (Asset ID: 0)');
  console.log('═══════════════════════════════════════════');
  
  const algoPrice = await priceFeed.getAssetPrice(0);
  console.log(`Simple Price: $${algoPrice.toFixed(6)}\n`);

  const algoDetails = await priceFeed.getPriceDetails(0);
  if (algoDetails) {
    console.log('Detailed Price Information:');
    console.log(`  Symbol: ${algoDetails.symbol}`);
    console.log(`  Average Price: $${algoDetails.averagePrice.toFixed(6)}`);
    console.log(`  Weighted Price: $${algoDetails.weightedPrice.toFixed(6)}`);
    console.log(`  Price Deviation: ${algoDetails.priceDeviation.toFixed(2)}%`);
    console.log(`  Sources: ${algoDetails.prices.length}`);
    
    console.log('\n  Source Breakdown:');
    algoDetails.prices.forEach(source => {
      console.log(`    - ${source.source.padEnd(15)} $${source.price.toFixed(6)} (confidence: ${(source.confidence * 100).toFixed(0)}%)`);
    });
  }

  // Test 2: Get USDC price
  console.log('\n═══════════════════════════════════════════');
  console.log('Test 2: USDC Price (Asset ID: 10458941)');
  console.log('═══════════════════════════════════════════');
  
  try {
    const usdcPrice = await priceFeed.getAssetPrice(10458941);
    console.log(`Simple Price: $${usdcPrice.toFixed(6)}\n`);

    const usdcDetails = await priceFeed.getPriceDetails(10458941);
    if (usdcDetails) {
      console.log('Detailed Price Information:');
      console.log(`  Symbol: ${usdcDetails.symbol}`);
      console.log(`  Average Price: $${usdcDetails.averagePrice.toFixed(6)}`);
      console.log(`  Weighted Price: $${usdcDetails.weightedPrice.toFixed(6)}`);
      console.log(`  Price Deviation: ${usdcDetails.priceDeviation.toFixed(2)}%`);
      console.log(`  Sources: ${usdcDetails.prices.length}`);
      
      console.log('\n  Source Breakdown:');
      usdcDetails.prices.forEach(source => {
        console.log(`    - ${source.source.padEnd(15)} $${source.price.toFixed(6)} (confidence: ${(source.confidence * 100).toFixed(0)}%)`);
      });
    }
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  // Test 3: Bulk price fetching
  console.log('\n═══════════════════════════════════════════');
  console.log('Test 3: Bulk Price Fetching');
  console.log('═══════════════════════════════════════════');
  
  const assetIds = [0, 10458941]; // ALGO and USDC
  console.log(`Fetching prices for assets: ${assetIds.join(', ')}\n`);

  const bulkPrices = await priceFeed.getBulkPrices(assetIds);
  
  console.log('Results:');
  bulkPrices.forEach((price, assetId) => {
    console.log(`  Asset ${assetId}: $${price.toFixed(6)}`);
  });

  // Test 4: Cache statistics
  console.log('\n═══════════════════════════════════════════');
  console.log('Test 4: Cache Statistics');
  console.log('═══════════════════════════════════════════');
  
  const stats = priceFeed.getCacheStats();
  console.log(`Cached Assets: ${stats.size}`);
  console.log(`Asset IDs: ${stats.assets.join(', ')}`);
  console.log(`Oldest Update: ${new Date(stats.oldestUpdate * 1000).toISOString()}`);

  // Test 5: Test pool reserves from Indexer
  console.log('\n═══════════════════════════════════════════');
  console.log('Test 5: Pool Reserves from Indexer');
  console.log('═══════════════════════════════════════════');
  
  // Example Tinyman pool address (replace with actual testnet pool)
  const poolAddress = 'YOUR_POOL_ADDRESS_HERE';
  console.log(`Attempting to fetch reserves for pool: ${poolAddress}`);
  
  try {
    const reserves = await priceFeed.getPoolReservesFromIndexer(poolAddress);
    
    if (reserves) {
      console.log('\n✅ Pool Reserves Retrieved:');
      console.log(`  Asset 1 ID: ${reserves.asset1Id}`);
      console.log(`  Asset 1 Reserve: ${reserves.reserve1.toString()}`);
      console.log(`  Asset 2 ID: ${reserves.asset2Id}`);
      console.log(`  Asset 2 Reserve: ${reserves.reserve2.toString()}`);
      console.log(`  Pool Liquidity (ALGO): ${reserves.liquidity.toString()}`);
    } else {
      console.log('  ℹ️  No reserves found (may need valid pool address)');
    }
  } catch (error: any) {
    console.log(`  ℹ️  Indexer test skipped: ${error.message}`);
  }

  // Test 6: API Usage Examples
  console.log('\n═══════════════════════════════════════════');
  console.log('Test 6: API Usage Examples');
  console.log('═══════════════════════════════════════════');
  
  console.log('\n📡 Available API Endpoints:\n');
  
  console.log('1. Get Simple Price:');
  console.log('   GET /api/price/0');
  console.log('   Example: http://localhost:3000/api/price/0\n');
  
  console.log('2. Get Detailed Price:');
  console.log('   GET /api/price/0?detailed=true');
  console.log('   Example: http://localhost:3000/api/price/0?detailed=true\n');
  
  console.log('3. Refresh Price:');
  console.log('   POST /api/price/0');
  console.log('   Example: curl -X POST http://localhost:3000/api/price/0\n');
  
  console.log('4. Bulk Prices:');
  console.log('   POST /api/price/bulk');
  console.log('   Body: { "assetIds": [0, 10458941] }');
  console.log('   Example: curl -X POST http://localhost:3000/api/price/bulk \\');
  console.log('            -H "Content-Type: application/json" \\');
  console.log('            -d \'{"assetIds": [0, 10458941]}\'');
  
  console.log('\n5. Cache Statistics:');
  console.log('   GET /api/price/bulk');
  console.log('   Example: http://localhost:3000/api/price/bulk\n');

  console.log('\n✅ All tests completed!\n');
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

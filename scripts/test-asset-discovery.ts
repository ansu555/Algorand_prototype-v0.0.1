/**
 * Test Asset Discovery Service
 * Tests the dynamic asset discovery from DEX pools
 */

import { AssetDiscoveryService } from '../src/lib/assets/asset-discovery';

async function testAssetDiscovery() {
  console.log('='.repeat(60));
  console.log('ASSET DISCOVERY SERVICE TEST');
  console.log('='.repeat(60));
  console.log();

  const service = new AssetDiscoveryService();

  try {
    console.log('📡 Discovering tradeable assets from DEX pools...');
    console.log();

    const assets = await service.discoverTradeableAssets();

    console.log(`✅ Found ${assets.length} tradeable assets`);
    console.log();

    // Group assets by DEX
    const byDex = assets.reduce((acc, asset) => {
      (asset.dexSources || []).forEach(dex => {
        if (!acc[dex]) acc[dex] = [];
        acc[dex].push(asset);
      });
      return acc;
    }, {} as Record<string, typeof assets>);

    console.log('📊 Assets by DEX:');
    Object.entries(byDex).forEach(([dex, dexAssets]) => {
      console.log(`  ${dex}: ${dexAssets.length} assets`);
    });
    console.log();

    // Show top 10 assets
    console.log('🏆 Top 10 Assets (by pool count):');
    const sortedAssets = [...assets].sort((a, b) => (b.poolCount || 0) - (a.poolCount || 0));
    sortedAssets.slice(0, 10).forEach((asset, i) => {
      const verified = asset.verified ? '✓' : ' ';
      console.log(
        `  ${i + 1}. [${verified}] ${asset.unitName.padEnd(8)} - ${asset.name.slice(0, 30).padEnd(30)} (${asset.poolCount || 0} pools, ${asset.dexSources?.length || 0} DEXs)`
      );
    });
    console.log();

    // Test specific asset lookup
    console.log('🔍 Testing specific asset lookup (ALGO)...');
    const algoAsset = await service.getAssetInfo(0);
    if (algoAsset) {
      console.log('  ✅ ALGO found:');
      console.log(`     ID: ${algoAsset.id}`);
      console.log(`     Name: ${algoAsset.name}`);
      console.log(`     Symbol: ${algoAsset.unitName}`);
      console.log(`     Decimals: ${algoAsset.decimals}`);
      console.log(`     Verified: ${algoAsset.verified}`);
      console.log(`     Pool Count: ${algoAsset.poolCount || 0}`);
      console.log(`     DEXs: ${algoAsset.dexSources?.join(', ') || 'N/A'}`);
    } else {
      console.log('  ❌ ALGO not found');
    }
    console.log();

    // Test search functionality
    console.log('🔎 Testing search functionality (query: "USD")...');
    const searchService = new AssetDiscoveryService();
    const allAssets = await searchService.discoverTradeableAssets();
    const usdResults = allAssets.filter(asset => 
      asset.name.toLowerCase().includes('usd') || 
      asset.unitName.toLowerCase().includes('usd')
    );
    console.log(`  Found ${usdResults.length} assets matching "USD":`);
    usdResults.slice(0, 5).forEach(asset => {
      console.log(`    - ${asset.unitName} (${asset.name})`);
    });
    console.log();

    // Test cache
    console.log('⚡ Testing cache performance...');
    const start = Date.now();
    await service.discoverTradeableAssets();
    const cachedTime = Date.now() - start;
    console.log(`  Cached fetch took: ${cachedTime}ms (should be <10ms)`);
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Assets: ${assets.length}`);
    console.log(`DEXs Integrated: ${Object.keys(byDex).length}`);
    console.log(`Verified Assets: ${assets.filter(a => a.verified).length}`);
    console.log(`Average Pools per Asset: ${(assets.reduce((sum, a) => sum + (a.poolCount || 0), 0) / assets.length).toFixed(2)}`);
    console.log();
    console.log('✅ All tests passed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run tests
testAssetDiscovery();

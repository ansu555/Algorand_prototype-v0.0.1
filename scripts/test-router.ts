/**
 * Test Multi-DEX Router
 * Example script showing how to find best routes across multiple DEXs
 */

import { getAlgodClient } from '../src/lib/algorand';
import { TinymanV2Client } from '../src/lib/dex/tinyman-client';
import { PactClient } from '../src/lib/dex/pact-client';
import { SwapRouter } from '../src/lib/routing/swap-router';
import { formatAssetAmount, parseAssetAmount } from '../src/lib/dex/utils';
import type { SwapQuote, Asset } from '../src/lib/dex/types';

async function main() {
  console.log('🚀 Testing Multi-DEX Swap Router\n');

  // Initialize Algod client
  const algodClient = getAlgodClient();
  console.log('✅ Algod client initialized');

  // Initialize DEX clients
  const tinymanClient = new TinymanV2Client(algodClient, 'testnet');
  console.log('✅ Tinyman V2 client initialized');
  
  const pactClient = new PactClient(algodClient, 'testnet');
  console.log('✅ Pact client initialized\n');

  // Create router with multiple DEXs
  const router = new SwapRouter([tinymanClient, pactClient]);
  
  // Initialize router (fetches pools)
  console.log('📡 Fetching pools from all DEXs...');
  await router.initialize();
  console.log('');

  // Example 1: Direct swap ALGO -> USDC
  console.log('═══════════════════════════════════════════');
  console.log('Example 1: Direct Swap (ALGO → USDC)');
  console.log('═══════════════════════════════════════════');
  
  try {
    const quote1 = await router.findBestRoute({
      assetIn: 0, // ALGO
      assetOut: 10458941, // USDC on testnet
      amountIn: parseAssetAmount('10', 6), // 10 ALGO
      slippageTolerance: 50, // 0.5%
      maxHops: 3,
    });

    console.log('\n📊 Best Quote Found:');
    console.log(`   Input:  ${formatAssetAmount(quote1.amountIn, 6)} ${quote1.route.path[0].symbol}`);
    console.log(`   Output: ${formatAssetAmount(quote1.amountOut, 6)} ${quote1.route.path[quote1.route.path.length - 1].symbol}`);
    console.log(`   Price:  1 ${quote1.route.path[0].symbol} = ${quote1.executionPrice.toFixed(6)} ${quote1.route.path[quote1.route.path.length - 1].symbol}`);
    console.log(`   Impact: ${quote1.priceImpact.toFixed(4)}%`);
    console.log(`   Fee:    ${formatAssetAmount(quote1.fee, 6)} (${quote1.feeBps / 100}%)`);
    console.log(`   Route:  ${quote1.route.path.map((a: Asset) => a.symbol).join(' → ')}`);
    console.log(`   DEXs:   ${quote1.route.dexes.join(' → ')}`);
    console.log(`   Hops:   ${quote1.route.hops}`);
    console.log(`   Min Out: ${formatAssetAmount(quote1.minimumAmountOut, 6)} (with slippage)`);
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Example 2: Compare all routes
  console.log('\n═══════════════════════════════════════════');
  console.log('Example 2: Compare All Available Routes');
  console.log('═══════════════════════════════════════════');
  
  try {
    const aggregated = await router.getAllQuotes({
      assetIn: 0,
      assetOut: 10458941,
      amountIn: parseAssetAmount('100', 6), // 100 ALGO
      maxHops: 3,
    });

    console.log(`\n📊 Found ${aggregated.allQuotes.length} routes:`);
    
    aggregated.allQuotes.forEach((quote: SwapQuote, index: number) => {
      const isBest = quote === aggregated.bestQuote;
      console.log(`\n   ${isBest ? '🏆' : '  '} Route ${index + 1}:`);
      console.log(`      Path:   ${quote.route.path.map((a: Asset) => a.symbol).join(' → ')}`);
      console.log(`      DEXs:   ${quote.route.dexes.join(' → ')}`);
      console.log(`      Output: ${formatAssetAmount(quote.amountOut, 6)} USDC`);
      console.log(`      Impact: ${quote.priceImpact.toFixed(4)}%`);
    });

    console.log(`\n   💰 Best route saves: ${formatAssetAmount(aggregated.savings, 6)} USDC`);
    console.log(`   📈 Savings: ${aggregated.savingsPercentage.toFixed(4)}%`);
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Example 3: Test API endpoint format
  console.log('\n═══════════════════════════════════════════');
  console.log('Example 3: API Usage');
  console.log('═══════════════════════════════════════════');
  console.log('\n📡 API Endpoint:');
  console.log('   GET /api/router/quote');
  console.log('\n   Query Parameters:');
  console.log('   - assetIn:   0 (ALGO)');
  console.log('   - assetOut:  10458941 (USDC)');
  console.log('   - amount:    10000000 (10 ALGO in microAlgos)');
  console.log('   - slippage:  50 (0.5% in basis points)');
  console.log('   - maxHops:   3');
  console.log('\n   Example URL:');
  console.log('   http://localhost:3000/api/router/quote?assetIn=0&assetOut=10458941&amount=10000000&slippage=50&maxHops=3');

  console.log('\n✅ Test completed!\n');
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

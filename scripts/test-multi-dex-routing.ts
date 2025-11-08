#!/usr/bin/env ts-node
/**
 * Multi-DEX Routing Test Script
 * 
 * Tests the multi-DEX aggregator with detailed logging of adapter selection
 * Compares Tinyman vs Pact and shows why each DEX is chosen
 */

import algosdk from 'algosdk';
import { createMultiDexAggregator } from '../src/lib/dex/aggregator';
import { QuoteRequest } from '../src/lib/dex/types';

// Algorand testnet configuration
const ALGOD_TOKEN = '';
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = '';

// Test asset IDs (testnet)
const ALGO_ID = 0;
const USDC_ID = 10458941;

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🧪 MULTI-DEX ROUTING TEST');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Initialize Algorand client
  const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
  
  console.log('📡 Connecting to Algorand testnet...');
  const status = await algodClient.status().do();
  console.log(`✅ Connected! Last round: ${status.lastRound}\n`);
  
  // Test 1: Compare DEXs without preference
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: No DEX preference - Best output wins');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const aggregator1 = createMultiDexAggregator(algodClient, 'testnet', {
    enableLogging: true,
    maxPriceImpact: 0.05, // 5%
    prioritizeLiquidity: true,
  });
  
  const request1: QuoteRequest = {
    assetIn: USDC_ID,
    assetOut: ALGO_ID,
    amountIn: 2_000_000n, // 2 USDC
    slippageTolerance: 50, // 50 bps = 0.5%
  };
  
  try {
    const quote1 = await aggregator1.getBestQuote(request1);
    
    console.log('\n📋 FINAL SELECTION SUMMARY:');
    console.log(`   Selected DEX: ${quote1.dexName.toUpperCase()}`);
    console.log(`   Reason: ${quote1.reason}`);
    console.log(`   Amount Out: ${quote1.amountOut.toString()} microALGO`);
    console.log(`   = ${Number(quote1.amountOut) / 1_000_000} ALGO`);
    console.log(`   Price Impact: ${(quote1.priceImpact * 100).toFixed(4)}%`);
    console.log(`   Fee: ${quote1.feeBps} basis points`);
    
    if (quote1.alternatives.length > 0) {
      console.log('\n   Alternatives considered:');
      for (const alt of quote1.alternatives) {
        console.log(`     - ${alt.dexName}: ${alt.reason}`);
      }
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }
  
  // Test 2: With Tinyman preference
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Tinyman preferred (if within 0.5% of best)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const aggregator2 = createMultiDexAggregator(algodClient, 'testnet', {
    preferredDex: 'tinyman',
    enableLogging: true,
    maxPriceImpact: 0.05,
  });
  
  try {
    const quote2 = await aggregator2.getBestQuote(request1);
    
    console.log('\n📋 FINAL SELECTION SUMMARY:');
    console.log(`   Selected DEX: ${quote2.dexName.toUpperCase()}`);
    console.log(`   Reason: ${quote2.reason}`);
    console.log(`   Amount Out: ${Number(quote2.amountOut) / 1_000_000} ALGO`);
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }
  
  // Test 3: With Pact preference
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Pact preferred (if within 0.5% of best)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const aggregator3 = createMultiDexAggregator(algodClient, 'testnet', {
    preferredDex: 'pact',
    enableLogging: true,
    maxPriceImpact: 0.05,
  });
  
  try {
    const quote3 = await aggregator3.getBestQuote(request1);
    
    console.log('\n📋 FINAL SELECTION SUMMARY:');
    console.log(`   Selected DEX: ${quote3.dexName.toUpperCase()}`);
    console.log(`   Reason: ${quote3.reason}`);
    console.log(`   Amount Out: ${Number(quote3.amountOut) / 1_000_000} ALGO`);
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }
  
  // Test 4: Check pool availability
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Pool availability check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const aggregator4 = createMultiDexAggregator(algodClient, 'testnet', {
    enableLogging: false,
  });
  
  console.log('Checking ALGO/USDC pools across DEXs...\n');
  
  const pools = await aggregator4.findPools(ALGO_ID, USDC_ID);
  
  console.log('TINYMAN:');
  if (pools.tinyman) {
    console.log(`  ✅ Pool found`);
    console.log(`     Pool ID: ${pools.tinyman.poolId}`);
    console.log(`     Reserve ALGO: ${Number(pools.tinyman.reserve1) / 1_000_000} ALGO`);
    console.log(`     Reserve USDC: ${Number(pools.tinyman.reserve2) / 1_000_000} USDC`);
    console.log(`     Fee: ${pools.tinyman.fee} bps`);
  } else {
    console.log('  ❌ No pool found');
  }
  
  console.log('\nPACT:');
  if (pools.pact) {
    console.log(`  ✅ Pool found`);
    console.log(`     Pool ID: ${pools.pact.poolId}`);
    console.log(`     Reserve ALGO: ${Number(pools.pact.reserve1) / 1_000_000} ALGO`);
    console.log(`     Reserve USDC: ${Number(pools.pact.reserve2) / 1_000_000} USDC`);
    console.log(`     Fee: ${pools.pact.fee} bps`);
  } else {
    console.log('  ❌ No pool found');
  }
  
  // Test 5: Large swap (high price impact test)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Large swap - Price impact comparison');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const aggregator5 = createMultiDexAggregator(algodClient, 'testnet', {
    enableLogging: true,
    maxPriceImpact: 0.10, // Allow up to 10% for this test
    prioritizeLiquidity: true,
  });
  
  const largeRequest: QuoteRequest = {
    assetIn: USDC_ID,
    assetOut: ALGO_ID,
    amountIn: 100_000_000n, // 100 USDC - large swap
    slippageTolerance: 100, // 100 bps = 1%
  };
  
  try {
    const quote5 = await aggregator5.getBestQuote(largeRequest);
    
    console.log('\n📋 LARGE SWAP SELECTION:');
    console.log(`   Selected DEX: ${quote5.dexName.toUpperCase()}`);
    console.log(`   Reason: ${quote5.reason}`);
    console.log(`   Amount Out: ${Number(quote5.amountOut) / 1_000_000} ALGO`);
    console.log(`   Price Impact: ${(quote5.priceImpact * 100).toFixed(4)}%`);
    
    // Show which DEX handles large swaps better
    console.log('\n   Analysis:');
    if (quote5.priceImpact < 0.05) {
      console.log(`   ✅ Low price impact - ${quote5.dexName} has deep liquidity`);
    } else if (quote5.priceImpact < 0.10) {
      console.log(`   ⚠️  Moderate price impact - consider splitting swap`);
    } else {
      console.log(`   ❌ High price impact - strongly consider splitting swap`);
    }
  } catch (error) {
    console.error('❌ Test 5 failed:', error);
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ MULTI-DEX TESTING COMPLETE');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📊 KEY INSIGHTS:');
  console.log('   • The aggregator automatically selects the best DEX');
  console.log('   • Selection criteria: output amount, price impact, liquidity');
  console.log('   • Detailed logs show WHY each DEX was chosen or rejected');
  console.log('   • Preferences can override if output is within tolerance');
  console.log('   • Both Tinyman and Pact are now supported for swaps\n');
  
  console.log('🔧 NEXT STEPS:');
  console.log('   1. Deploy PactPoolAdapter contract to testnet');
  console.log('   2. Register adapter with MultihopSwapRouter');
  console.log('   3. Test actual swap execution (not just quotes)');
  console.log('   4. Monitor adapter selection in production\n');
}

// Run tests
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

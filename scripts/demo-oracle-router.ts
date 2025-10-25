/**
 * Example: Price Oracle + Router Integration
 * Demonstrates how to use both systems together for optimal trading
 */

import { MultiSourcePriceFeed } from '../src/lib/oracle/multi-source-price-feed';
import { SwapRouter } from '../src/lib/routing/swap-router';
import { TinymanV2Client } from '../src/lib/dex/tinyman-client';
import { PactClient } from '../src/lib/dex/pact-client';
import { getAlgodClient } from '../src/lib/algorand';
import { formatAssetAmount, parseAssetAmount } from '../src/lib/dex/utils';

async function main() {
  console.log('🔄 Initializing Price Oracle + Router Demo\n');

  // Initialize components
  const algodClient = getAlgodClient();
  const priceFeed = new MultiSourcePriceFeed('testnet');
  
  const tinymanClient = new TinymanV2Client(algodClient, 'testnet');
  const pactClient = new PactClient(algodClient, 'testnet');
  
  const router = new SwapRouter([tinymanClient, pactClient]);
  await router.initialize();

  console.log('✅ All systems initialized\n');

  // Example: ALGO -> USDC swap with price verification
  console.log('═══════════════════════════════════════════');
  console.log('Demo: Swap with Multi-Source Price Verification');
  console.log('═══════════════════════════════════════════\n');

  const assetInId = 0; // ALGO
  const assetOutId = 10458941; // USDC
  const amountIn = parseAssetAmount('100', 6); // 100 ALGO

  // Step 1: Get market prices from oracle
  console.log('📊 Step 1: Fetch Market Prices\n');
  
  const [algoPrice, usdcPrice] = await Promise.all([
    priceFeed.getPriceDetails(assetInId),
    priceFeed.getPriceDetails(assetOutId),
  ]);

  if (algoPrice && usdcPrice) {
    console.log(`ALGO Market Price: $${algoPrice.weightedPrice.toFixed(6)}`);
    console.log(`  Sources: ${algoPrice.prices.length}`);
    console.log(`  Deviation: ${algoPrice.priceDeviation.toFixed(2)}%\n`);

    console.log(`USDC Market Price: $${usdcPrice.weightedPrice.toFixed(6)}`);
    console.log(`  Sources: ${usdcPrice.prices.length}`);
    console.log(`  Deviation: ${usdcPrice.priceDeviation.toFixed(2)}%\n`);

    // Expected output based on market prices
    const expectedOutputUsd = 100 * algoPrice.weightedPrice;
    const expectedOutputUsdc = expectedOutputUsd / usdcPrice.weightedPrice;
    
    console.log(`Expected Output (based on market prices):`);
    console.log(`  ${expectedOutputUsdc.toFixed(6)} USDC\n`);
  }

  // Step 2: Get best route from router
  console.log('🔄 Step 2: Find Best Swap Route\n');
  
  const quote = await router.findBestRoute({
    assetIn: assetInId,
    assetOut: assetOutId,
    amountIn,
    slippageTolerance: 50,
    maxHops: 3,
  });

  const amountOutFormatted = formatAssetAmount(quote.amountOut, 6);
  
  console.log(`Best Route Found:`);
  console.log(`  Path: ${quote.route.path.map(a => a.symbol).join(' → ')}`);
  console.log(`  DEXs: ${quote.route.dexes.join(' → ')}`);
  console.log(`  Hops: ${quote.route.hops}\n`);

  console.log(`Swap Details:`);
  console.log(`  Input: ${formatAssetAmount(amountIn, 6)} ALGO`);
  console.log(`  Output: ${amountOutFormatted} USDC`);
  console.log(`  Price: 1 ALGO = ${quote.executionPrice.toFixed(6)} USDC`);
  console.log(`  Impact: ${quote.priceImpact.toFixed(4)}%`);
  console.log(`  Fee: ${formatAssetAmount(quote.fee, 6)} (${quote.feeBps / 100}%)\n`);

  // Step 3: Compare swap price vs market price
  console.log('🔍 Step 3: Price Analysis\n');

  if (algoPrice && usdcPrice) {
    const marketRate = algoPrice.weightedPrice / usdcPrice.weightedPrice;
    const swapRate = quote.executionPrice;
    const rateDiff = ((swapRate - marketRate) / marketRate) * 100;

    console.log(`Market Rate: 1 ALGO = ${marketRate.toFixed(6)} USDC`);
    console.log(`Swap Rate:   1 ALGO = ${swapRate.toFixed(6)} USDC`);
    console.log(`Difference:  ${rateDiff >= 0 ? '+' : ''}${rateDiff.toFixed(4)}%\n`);

    if (Math.abs(rateDiff) > 2) {
      console.log('⚠️  Warning: Swap rate differs significantly from market!');
      console.log(`   This could indicate:`);
      console.log(`   - Low liquidity in DEX pools`);
      console.log(`   - Price impact from large swap`);
      console.log(`   - Potential arbitrage opportunity\n`);
    } else {
      console.log('✅ Swap rate is close to market rate\n');
    }

    // Step 4: Check for arbitrage opportunities
    console.log('💰 Step 4: Arbitrage Detection\n');

    if (algoPrice.priceDeviation > 5 || usdcPrice.priceDeviation > 5) {
      console.log('🚨 High price deviation detected!\n');
      
      if (algoPrice.priceDeviation > 5) {
        console.log(`ALGO Price Variance:`);
        algoPrice.prices.forEach(source => {
          const diff = ((source.price - algoPrice.averagePrice) / algoPrice.averagePrice) * 100;
          console.log(`  ${source.source.padEnd(15)}: $${source.price.toFixed(6)} (${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%)`);
        });
        console.log();
      }

      if (usdcPrice.priceDeviation > 5) {
        console.log(`USDC Price Variance:`);
        usdcPrice.prices.forEach(source => {
          const diff = ((source.price - usdcPrice.averagePrice) / usdcPrice.averagePrice) * 100;
          console.log(`  ${source.source.padEnd(15)}: $${source.price.toFixed(6)} (${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%)`);
        });
        console.log();
      }

      console.log('💡 Potential arbitrage strategies:');
      console.log('   1. Buy on DEX with lower price');
      console.log('   2. Sell on DEX with higher price');
      console.log('   3. Account for fees and slippage\n');
    } else {
      console.log('ℹ️  No significant arbitrage opportunities detected\n');
    }
  }

  // Step 5: Risk Assessment
  console.log('⚖️  Step 5: Risk Assessment\n');

  const risks = [];

  if (quote.priceImpact > 1) {
    risks.push(`High price impact: ${quote.priceImpact.toFixed(2)}%`);
  }

  if (algoPrice && algoPrice.priceDeviation > 2) {
    risks.push(`ALGO price uncertainty: ${algoPrice.priceDeviation.toFixed(2)}% deviation`);
  }

  if (usdcPrice && usdcPrice.priceDeviation > 2) {
    risks.push(`USDC price uncertainty: ${usdcPrice.priceDeviation.toFixed(2)}% deviation`);
  }

  if (quote.route.hops > 1) {
    risks.push(`Multi-hop route increases complexity and fees`);
  }

  if (risks.length > 0) {
    console.log('⚠️  Risk Factors:');
    risks.forEach((risk, i) => {
      console.log(`   ${i + 1}. ${risk}`);
    });
    console.log();
  } else {
    console.log('✅ Low risk trade - conditions are favorable\n');
  }

  // Step 6: Trading Recommendation
  console.log('📝 Step 6: Trading Recommendation\n');

  let recommendation = '';
  let rating = 0;

  // Rate the trade (0-10)
  if (quote.priceImpact < 0.5) rating += 3;
  else if (quote.priceImpact < 1) rating += 2;
  else rating += 1;

  if (algoPrice && algoPrice.priceDeviation < 1) rating += 2;
  else if (algoPrice && algoPrice.priceDeviation < 2) rating += 1;

  if (usdcPrice && usdcPrice.priceDeviation < 1) rating += 2;
  else if (usdcPrice && usdcPrice.priceDeviation < 2) rating += 1;

  if (quote.route.hops === 1) rating += 2;
  else rating += 1;

  if (algoPrice && usdcPrice) {
    const marketRate = algoPrice.weightedPrice / usdcPrice.weightedPrice;
    const swapRate = quote.executionPrice;
    const rateDiff = Math.abs((swapRate - marketRate) / marketRate) * 100;
    
    if (rateDiff < 1) rating += 1;
  }

  if (rating >= 8) {
    recommendation = '🟢 RECOMMENDED - Favorable conditions';
  } else if (rating >= 5) {
    recommendation = '🟡 MODERATE - Acceptable but not optimal';
  } else {
    recommendation = '🔴 CAUTION - Consider waiting for better conditions';
  }

  console.log(`Trade Rating: ${rating}/10`);
  console.log(`${recommendation}\n`);

  console.log('Trade Summary:');
  console.log(`  • Swap 100 ALGO for ~${amountOutFormatted} USDC`);
  console.log(`  • Route: ${quote.route.dexes.join(' → ')}`);
  console.log(`  • Price Impact: ${quote.priceImpact.toFixed(2)}%`);
  console.log(`  • Minimum Output: ${formatAssetAmount(quote.minimumAmountOut, 6)} USDC`);

  console.log('\n✅ Demo completed!\n');
}

main().catch((error) => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});

/**
 * Multi-DEX Swap Router
 * Finds optimal routes across multiple DEXs and executes swaps
 */

import {
  IDexClient,
  QuoteRequest,
  SwapQuote,
  SwapRoute,
  PoolInfo,
  Asset,
  AggregatedQuote,
} from '../dex/types';
import { 
  getPoolKey,
  calculateAmountOut,
  calculatePriceImpact,
  applySlippage,
  calculateFee
} from '../dex/utils';

export class SwapRouter {
  private dexClients: Map<string, IDexClient> = new Map();
  private poolGraph: Map<string, PoolInfo[]> = new Map(); // Asset pair -> pools
  private assetGraph: Map<number, Set<number>> = new Map(); // Asset -> connected assets

  constructor(dexClients: IDexClient[]) {
    for (const client of dexClients) {
      this.dexClients.set(client.name, client);
    }
  }

  /**
   * Initialize router by fetching pools from all DEXs
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing swap router...');
    
    const promises = Array.from(this.dexClients.values()).map(async (client) => {
      try {
        const pools = await client.fetchPools();
        console.log(`  ✅ ${client.name}: ${pools.length} pools`);
        this.buildGraph(pools);
      } catch (error) {
        console.error(`  ❌ ${client.name} failed:`, error);
      }
    });

    await Promise.all(promises);
    console.log('✅ Router initialized with', this.poolGraph.size, 'asset pairs');
  }

  /**
   * Build liquidity graph from pools
   */
  private buildGraph(pools: PoolInfo[]): void {
    for (const pool of pools) {
      const key = getPoolKey(pool.asset1.id, pool.asset2.id);
      
      if (!this.poolGraph.has(key)) {
        this.poolGraph.set(key, []);
      }
      this.poolGraph.get(key)!.push(pool);

      // Build asset connectivity graph
      if (!this.assetGraph.has(pool.asset1.id)) {
        this.assetGraph.set(pool.asset1.id, new Set());
      }
      if (!this.assetGraph.has(pool.asset2.id)) {
        this.assetGraph.set(pool.asset2.id, new Set());
      }
      this.assetGraph.get(pool.asset1.id)!.add(pool.asset2.id);
      this.assetGraph.get(pool.asset2.id)!.add(pool.asset1.id);
    }
  }

  /**
   * Find best route across all DEXs
   */
  async findBestRoute(request: QuoteRequest): Promise<SwapQuote> {
    const assetInId =
      typeof request.assetIn === 'number' ? request.assetIn : request.assetIn.id;
    const assetOutId =
      typeof request.assetOut === 'number' ? request.assetOut : request.assetOut.id;

    console.log(`Finding best route: ${assetInId} -> ${assetOutId}`);

    // Try direct swaps first (1-hop)
    const directQuotes = await this.getDirectSwapQuotes(request);

    if (directQuotes.length > 0) {
      const best = this.selectBestQuote(directQuotes);
      console.log(
        `  Best direct route via ${best.route.dexes[0]}: ${best.amountOut} (${best.priceImpact.toFixed(2)}% impact)`
      );
      return best;
    }

    // Try 2-hop routes
    const maxHops = request.maxHops || 3;
    if (maxHops >= 2) {
      const twoHopQuotes = await this.getTwoHopQuotes(request);
      if (twoHopQuotes.length > 0) {
        const best = this.selectBestQuote(twoHopQuotes);
        console.log(
          `  Best 2-hop route: ${best.route.path.map((a) => a.symbol).join(' -> ')} (${best.priceImpact.toFixed(2)}% impact)`
        );
        return best;
      }
    }

    // Try 3-hop routes if needed
    if (maxHops >= 3) {
      const threeHopQuotes = await this.getThreeHopQuotes(request);
      if (threeHopQuotes.length > 0) {
        const best = this.selectBestQuote(threeHopQuotes);
        console.log(
          `  Best 3-hop route: ${best.route.path.map((a) => a.symbol).join(' -> ')} (${best.priceImpact.toFixed(2)}% impact)`
        );
        return best;
      }
    }

    throw new Error(
      `No route found between assets ${assetInId} and ${assetOutId}`
    );
  }

  /**
   * Get quotes from all DEXs for direct swap
   */
  private async getDirectSwapQuotes(
    request: QuoteRequest
  ): Promise<SwapQuote[]> {
    const promises = Array.from(this.dexClients.values()).map(
      async (client) => {
        try {
          return await client.getQuote(request);
        } catch (error) {
          // DEX doesn't have this pool, that's OK
          return null;
        }
      }
    );

    const results = await Promise.all(promises);
    return results.filter((q) => q !== null) as SwapQuote[];
  }

  /**
   * Find 2-hop routes
   */
  private async getTwoHopQuotes(request: QuoteRequest): Promise<SwapQuote[]> {
    const assetInId =
      typeof request.assetIn === 'number' ? request.assetIn : request.assetIn.id;
    const assetOutId =
      typeof request.assetOut === 'number' ? request.assetOut : request.assetOut.id;

    const quotes: SwapQuote[] = [];

    // Find intermediate assets that connect assetIn and assetOut
    const intermediateAssets = this.findIntermediateAssets(assetInId, assetOutId);

    for (const intermediateId of intermediateAssets) {
      try {
        // Get pools for first hop
        const key1 = getPoolKey(assetInId, intermediateId);
        const pools1 = this.poolGraph.get(key1) || [];

        // Get pools for second hop
        const key2 = getPoolKey(intermediateId, assetOutId);
        const pools2 = this.poolGraph.get(key2) || [];

        if (pools1.length === 0 || pools2.length === 0) continue;

        // Try each combination of pools
        for (const pool1 of pools1) {
          for (const pool2 of pools2) {
            try {
              const quote = await this.calculate2HopQuote(
                request.amountIn,
                pool1,
                pool2,
                assetInId,
                intermediateId,
                assetOutId,
                request.slippageTolerance
              );
              quotes.push(quote);
            } catch (error) {
              // Skip invalid combinations
            }
          }
        }
      } catch (error) {
        // Skip this intermediate asset
      }
    }

    return quotes;
  }

  /**
   * Find 3-hop routes (simplified - can be optimized)
   */
  private async getThreeHopQuotes(request: QuoteRequest): Promise<SwapQuote[]> {
    // For MVP, we'll skip 3-hop to keep it simple
    // Can be implemented similar to 2-hop but with another layer
    return [];
  }

  // Common bridge tokens for routing (TestNet IDs - update for MainNet)
  private readonly COMMON_BRIDGE_TOKENS = [
    0,        // ALGO - most common intermediate
    10458941, // USDC (TestNet)
    10459082, // USDT (TestNet) 
    21582668, // goBTC (TestNet)
    21583027, // goETH (TestNet)
  ];

  /**
   * Find intermediate assets that connect two assets
   */
  private findIntermediateAssets(
    assetInId: number,
    assetOutId: number
  ): number[] {
    const connectedToIn = this.assetGraph.get(assetInId) || new Set();
    const connectedToOut = this.assetGraph.get(assetOutId) || new Set();

    // Find intersection - assets connected to both
    const intermediates: number[] = [];
    for (const asset of connectedToIn) {
      if (connectedToOut.has(asset)) {
        intermediates.push(asset);
      }
    }

    // If no direct intermediates found, try common bridge tokens
    if (intermediates.length === 0) {
      for (const bridgeToken of this.COMMON_BRIDGE_TOKENS) {
        // Skip if bridge token is same as input/output
        if (bridgeToken === assetInId || bridgeToken === assetOutId) continue;
        
        // Check if bridge token connects to both assets
        if (connectedToIn.has(bridgeToken) && connectedToOut.has(bridgeToken)) {
          intermediates.push(bridgeToken);
        }
      }
    }

    // Also prioritize ALGO (id 0) as intermediate if it's in the graph
    if (!intermediates.includes(0) && assetInId !== 0 && assetOutId !== 0) {
      if (connectedToIn.has(0) && connectedToOut.has(0)) {
        intermediates.unshift(0); // Add ALGO as first choice
      }
    }

    return intermediates;
  }

  /**
   * Calculate quote for 2-hop route
   */
  private async calculate2HopQuote(
    amountIn: bigint,
    pool1: PoolInfo,
    pool2: PoolInfo,
    assetInId: number,
    intermediateId: number,
    assetOutId: number,
    slippageTolerance: number = 50
  ): Promise<SwapQuote> {
    // First hop
    const isAsset1ToAsset2_hop1 = pool1.asset1.id === assetInId;
    const reserveIn1 = isAsset1ToAsset2_hop1 ? pool1.reserve1 : pool1.reserve2;
    const reserveOut1 = isAsset1ToAsset2_hop1 ? pool1.reserve2 : pool1.reserve1;

    const intermediateAmount = calculateAmountOut(
      amountIn,
      reserveIn1,
      reserveOut1,
      pool1.fee
    );

    // Second hop
    const isAsset1ToAsset2_hop2 = pool2.asset1.id === intermediateId;
    const reserveIn2 = isAsset1ToAsset2_hop2 ? pool2.reserve1 : pool2.reserve2;
    const reserveOut2 = isAsset1ToAsset2_hop2 ? pool2.reserve2 : pool2.reserve1;

    const finalAmount = calculateAmountOut(
      intermediateAmount,
      reserveIn2,
      reserveOut2,
      pool2.fee
    );

    // Calculate combined price impact
    const impact1 = calculatePriceImpact(
      amountIn,
      intermediateAmount,
      reserveIn1,
      reserveOut1
    );
    const impact2 = calculatePriceImpact(
      intermediateAmount,
      finalAmount,
      reserveIn2,
      reserveOut2
    );
    const totalImpact = impact1 + impact2;

    // Calculate total fees
    const fee1 = calculateFee(amountIn, pool1.fee);
    const fee2 = calculateFee(intermediateAmount, pool2.fee);
    const totalFee = fee1 + fee2;

    const minimumAmountOut = applySlippage(finalAmount, slippageTolerance);

    // Build route
    const assetIn = isAsset1ToAsset2_hop1 ? pool1.asset1 : pool1.asset2;
    const assetIntermediate = isAsset1ToAsset2_hop1 ? pool1.asset2 : pool1.asset1;
    const assetOut = isAsset1ToAsset2_hop2 ? pool2.asset2 : pool2.asset1;

    const route: SwapRoute = {
      path: [assetIn, assetIntermediate, assetOut],
      pools: [pool1, pool2],
      dexes: [pool1.dexName, pool2.dexName],
      hops: 2,
    };

    return {
      amountIn,
      amountOut: finalAmount,
      priceImpact: totalImpact,
      fee: totalFee,
      feeBps: (pool1.fee + pool2.fee) / 2, // Average fee
      minimumAmountOut,
      route,
      executionPrice: Number(finalAmount) / Number(amountIn),
      inversePrice: Number(amountIn) / Number(finalAmount),
    };
  }

  /**
   * Select best quote from array
   */
  private selectBestQuote(quotes: SwapQuote[]): SwapQuote {
    return quotes.reduce((best, current) =>
      current.amountOut > best.amountOut ? current : best
    );
  }

  /**
   * Get all quotes and compare
   */
  async getAllQuotes(request: QuoteRequest): Promise<AggregatedQuote> {
    const directQuotes = await this.getDirectSwapQuotes(request);
    const twoHopQuotes =
      (request.maxHops || 3) >= 2 ? await this.getTwoHopQuotes(request) : [];

    const allQuotes = [...directQuotes, ...twoHopQuotes];

    if (allQuotes.length === 0) {
      throw new Error('No routes available');
    }

    const bestQuote = this.selectBestQuote(allQuotes);
    const worstQuote = allQuotes.reduce((worst, current) =>
      current.amountOut < worst.amountOut ? current : worst
    );

    const savings = bestQuote.amountOut - worstQuote.amountOut;
    const savingsPercentage =
      (Number(savings) / Number(worstQuote.amountOut)) * 100;

    return {
      bestQuote,
      allQuotes,
      savings,
      savingsPercentage,
    };
  }

  /**
   * Refresh pool data
   */
  async refresh(): Promise<void> {
    this.poolGraph.clear();
    this.assetGraph.clear();
    await this.initialize();
  }
}

/**
 * Multi-DEX Aggregator
 * 
 * Compares quotes across multiple DEXs (Tinyman, Pact, etc.) and 
 * selects the best route for token swaps with detailed logging.
 */

import algosdk from 'algosdk';
import { TinymanV2Client } from './tinyman-client';
import { PactClient } from './pact-client';
import {
  IDexClient,
  QuoteRequest,
  SwapQuote,
  SwapResult,
  Asset,
  PoolInfo,
  SwapRoute,
  WalletSigner,
} from './types';

export interface AggregatorQuote extends SwapQuote {
  dexName: string;
  reason: string; // Why this DEX was chosen
  alternatives: Array<{
    dexName: string;
    amountOut: bigint;
    priceImpact: number;
    reason: string; // Why NOT chosen
  }>;
}

export interface MultiDexConfig {
  preferredDex?: 'tinyman' | 'pact';
  maxPriceImpact?: number; // Maximum acceptable price impact (e.g., 0.05 = 5%)
  prioritizeLiquidity?: boolean; // Prefer DEX with deeper liquidity
  enableLogging?: boolean; // Enable detailed selection logging
}

interface InternalConfig {
  preferredDex?: 'tinyman' | 'pact';
  maxPriceImpact: number;
  prioritizeLiquidity: boolean;
  enableLogging: boolean;
}

export class MultiDexAggregator {
  private clients: Map<string, IDexClient> = new Map();
  private config: InternalConfig;
  
  constructor(
    algodClient: algosdk.Algodv2,
    network: 'mainnet' | 'testnet' = 'testnet',
    config: MultiDexConfig = {}
  ) {
    // Initialize DEX clients
    this.clients.set('tinyman', new TinymanV2Client(algodClient, network));
    this.clients.set('pact', new PactClient(algodClient, network));
    
    // Set default config
    this.config = {
      preferredDex: config.preferredDex,
      maxPriceImpact: config.maxPriceImpact ?? 0.05, // 5% default
      prioritizeLiquidity: config.prioritizeLiquidity ?? true,
      enableLogging: config.enableLogging ?? true,
    };
    
    if (this.config.enableLogging) {
      console.log('🔄 Multi-DEX Aggregator initialized');
      console.log(`   Available DEXs: ${Array.from(this.clients.keys()).join(', ')}`);
      console.log(`   Network: ${network}`);
      console.log(`   Config:`, this.config);
    }
  }
  
  /**
   * Get best quote across all DEXs with detailed selection logic
   */
  async getBestQuote(request: QuoteRequest): Promise<AggregatorQuote> {
    const startTime = Date.now();
    
    if (this.config.enableLogging) {
      console.log('\n🔍 Finding best swap route...');
      console.log(`   From Asset: ${typeof request.assetIn === 'number' ? request.assetIn : request.assetIn.id}`);
      console.log(`   To Asset: ${typeof request.assetOut === 'number' ? request.assetOut : request.assetOut.id}`);
      console.log(`   Amount In: ${request.amountIn.toString()}`);
    }
    
    // Fetch quotes from all DEXs in parallel
    const quotePromises = Array.from(this.clients.entries()).map(
      async ([dexName, client]) => {
        try {
          const quote = await client.getQuote(request);
          return { dexName, quote, error: null };
        } catch (error) {
          return { 
            dexName, 
            quote: null, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      }
    );
    
    const results = await Promise.all(quotePromises);
    
    // Filter out failed quotes
    const validQuotes = results.filter(r => r.quote !== null) as Array<{
      dexName: string;
      quote: SwapQuote;
      error: null;
    }>;
    
    if (validQuotes.length === 0) {
      const errors = results.map(r => `${r.dexName}: ${r.error}`).join(', ');
      throw new Error(`No valid quotes found. Errors: ${errors}`);
    }
    
    // Log all quotes
    if (this.config.enableLogging) {
      console.log('\n📊 Quotes from all DEXs:');
      for (const { dexName, quote } of validQuotes) {
        console.log(`   ${dexName.toUpperCase()}:`);
        console.log(`     Amount Out: ${quote.amountOut.toString()}`);
        console.log(`     Price Impact: ${(quote.priceImpact * 100).toFixed(4)}%`);
        console.log(`     Fee: ${quote.feeBps} bps`);
        console.log(`     Route: ${quote.route.hops} hop(s)`);
      }
      
      // Log failed DEXs
      const failedQuotes = results.filter(r => r.error !== null);
      if (failedQuotes.length > 0) {
        console.log('\n❌ Failed DEXs:');
        for (const { dexName, error } of failedQuotes) {
          console.log(`   ${dexName.toUpperCase()}: ${error}`);
        }
      }
    }
    
    // Select best quote using multi-criteria decision
    const selection = this.selectBestQuote(validQuotes);
    
    const elapsedTime = Date.now() - startTime;
    
    if (this.config.enableLogging) {
      console.log(`\n✅ SELECTED: ${selection.selected.dexName.toUpperCase()}`);
      console.log(`   Reason: ${selection.reason}`);
      console.log(`   Amount Out: ${selection.selected.quote.amountOut.toString()}`);
      console.log(`   Price Impact: ${(selection.selected.quote.priceImpact * 100).toFixed(4)}%`);
      console.log(`   Time: ${elapsedTime}ms`);
      
      if (selection.alternatives.length > 0) {
        console.log('\n📉 Alternative options:');
        for (const alt of selection.alternatives) {
          console.log(`   ${alt.dexName.toUpperCase()}: ${alt.reason}`);
        }
      }
    }
    
    // Build aggregator quote with metadata
    const bestQuote = selection.selected.quote;
    
    return {
      ...bestQuote,
      dexName: selection.selected.dexName,
      reason: selection.reason,
      alternatives: selection.alternatives,
    };
  }
  
  /**
   * Select best quote using multi-criteria logic
   */
  private selectBestQuote(
    validQuotes: Array<{ dexName: string; quote: SwapQuote }>
  ): {
    selected: { dexName: string; quote: SwapQuote };
    reason: string;
    alternatives: Array<{
      dexName: string;
      amountOut: bigint;
      priceImpact: number;
      reason: string;
    }>;
  } {
    // Step 1: Filter out quotes with excessive price impact
    const acceptableQuotes = validQuotes.filter(
      ({ quote }) => quote.priceImpact <= this.config.maxPriceImpact
    );
    
    const rejectedByImpact = validQuotes.filter(
      ({ quote }) => quote.priceImpact > this.config.maxPriceImpact
    );
    
    if (acceptableQuotes.length === 0) {
      // All quotes have high price impact, choose least bad
      const leastBad = validQuotes.reduce((prev, curr) => 
        curr.quote.priceImpact < prev.quote.priceImpact ? curr : prev
      );
      
      return {
        selected: leastBad,
        reason: `All DEXs exceed max price impact (${this.config.maxPriceImpact * 100}%). Selected lowest impact.`,
        alternatives: validQuotes
          .filter(q => q.dexName !== leastBad.dexName)
          .map(({ dexName, quote }) => ({
            dexName,
            amountOut: quote.amountOut,
            priceImpact: quote.priceImpact,
            reason: `Price impact too high: ${(quote.priceImpact * 100).toFixed(2)}%`,
          })),
      };
    }
    
    // Step 2: Check for preferred DEX
    if (this.config.preferredDex) {
      const preferred = acceptableQuotes.find(
        ({ dexName }) => dexName === this.config.preferredDex
      );
      
      if (preferred) {
        // Check if preferred DEX is within 0.5% of best output
        const bestOutput = acceptableQuotes.reduce((max, curr) =>
          curr.quote.amountOut > max ? curr.quote.amountOut : max, 0n
        );
        
        const outputDiff = Number(bestOutput - preferred.quote.amountOut) / Number(bestOutput);
        
        if (outputDiff <= 0.005) {
          // Within 0.5%, use preferred
          return {
            selected: preferred,
            reason: `Preferred DEX with acceptable output (within 0.5% of best)`,
            alternatives: this.buildAlternatives(acceptableQuotes, preferred.dexName, rejectedByImpact),
          };
        }
      }
    }
    
    // Step 3: Choose by best output amount
    const bestByOutput = acceptableQuotes.reduce((prev, curr) =>
      curr.quote.amountOut > prev.quote.amountOut ? curr : prev
    );
    
    // Check if multiple DEXs have similar output (within 0.1%)
    const similarQuotes = acceptableQuotes.filter(({ quote }) => {
      const diff = Number(bestByOutput.quote.amountOut - quote.amountOut) / 
                   Number(bestByOutput.quote.amountOut);
      return diff <= 0.001; // Within 0.1%
    });
    
    if (similarQuotes.length > 1 && this.config.prioritizeLiquidity) {
      // Multiple similar quotes, choose by liquidity
      const bestByLiquidity = similarQuotes.reduce((prev, curr) => {
        const prevLiquidity = prev.quote.route.pools[0]?.totalLiquidity || 0n;
        const currLiquidity = curr.quote.route.pools[0]?.totalLiquidity || 0n;
        return currLiquidity > prevLiquidity ? curr : prev;
      });
      
      return {
        selected: bestByLiquidity,
        reason: `Best output with highest liquidity (${bestByLiquidity.quote.route.pools[0]?.totalLiquidity.toString()})`,
        alternatives: this.buildAlternatives(acceptableQuotes, bestByLiquidity.dexName, rejectedByImpact),
      };
    }
    
    // Default: best output
    return {
      selected: bestByOutput,
      reason: `Best output amount: ${bestByOutput.quote.amountOut.toString()}`,
      alternatives: this.buildAlternatives(acceptableQuotes, bestByOutput.dexName, rejectedByImpact),
    };
  }
  
  /**
   * Build alternative options list
   */
  private buildAlternatives(
    acceptableQuotes: Array<{ dexName: string; quote: SwapQuote }>,
    selectedDex: string,
    rejectedByImpact: Array<{ dexName: string; quote: SwapQuote }>
  ): Array<{
    dexName: string;
    amountOut: bigint;
    priceImpact: number;
    reason: string;
  }> {
    const alternatives: Array<{
      dexName: string;
      amountOut: bigint;
      priceImpact: number;
      reason: string;
    }> = [];
    
    // Add acceptable but not chosen
    for (const { dexName, quote } of acceptableQuotes) {
      if (dexName !== selectedDex) {
        const selected = acceptableQuotes.find(q => q.dexName === selectedDex)!;
        const outputDiff = Number(selected.quote.amountOut - quote.amountOut);
        const outputDiffPct = (outputDiff / Number(selected.quote.amountOut)) * 100;
        
        alternatives.push({
          dexName,
          amountOut: quote.amountOut,
          priceImpact: quote.priceImpact,
          reason: `Lower output by ${outputDiffPct.toFixed(2)}%`,
        });
      }
    }
    
    // Add rejected by price impact
    for (const { dexName, quote } of rejectedByImpact) {
      alternatives.push({
        dexName,
        amountOut: quote.amountOut,
        priceImpact: quote.priceImpact,
        reason: `Rejected: price impact ${(quote.priceImpact * 100).toFixed(2)}% exceeds max ${(this.config.maxPriceImpact * 100).toFixed(2)}%`,
      });
    }
    
    return alternatives;
  }
  
  /**
   * Execute swap on selected DEX
   */
  async executeSwap(
    aggregatorQuote: AggregatorQuote,
    signer: WalletSigner
  ): Promise<SwapResult> {
    const client = this.clients.get(aggregatorQuote.dexName);
    
    if (!client) {
      throw new Error(`DEX client not found: ${aggregatorQuote.dexName}`);
    }
    
    if (this.config.enableLogging) {
      console.log(`\n🚀 Executing swap on ${aggregatorQuote.dexName.toUpperCase()}...`);
    }
    
  const result = await client.executeSwap(aggregatorQuote, signer);
    
    if (this.config.enableLogging) {
      console.log(`✅ Swap completed!`);
      console.log(`   Transaction ID: ${result.txId}`);
      console.log(`   Amount Out: ${result.amountOut.toString()}`);
    }
    
    return result;
  }
  
  /**
   * Get all pools from all DEXs
   */
  async getAllPools(): Promise<Map<string, PoolInfo[]>> {
    const poolsMap = new Map<string, PoolInfo[]>();
    
    for (const [dexName, client] of this.clients) {
      try {
        const pools = await client.fetchPools();
        poolsMap.set(dexName, pools);
        
        if (this.config.enableLogging) {
          console.log(`✅ ${dexName}: ${pools.length} pools`);
        }
      } catch (error) {
        console.error(`❌ ${dexName} fetch failed:`, error);
        poolsMap.set(dexName, []);
      }
    }
    
    return poolsMap;
  }
  
  /**
   * Find pools for specific asset pair across all DEXs
   */
  async findPools(asset1Id: number, asset2Id: number): Promise<{
    tinyman: PoolInfo | null;
    pact: PoolInfo | null;
  }> {
    const [tinymanPool, pactPool] = await Promise.all([
      this.clients.get('tinyman')?.getPool(asset1Id, asset2Id),
      this.clients.get('pact')?.getPool(asset1Id, asset2Id),
    ]);
    
    return {
      tinyman: tinymanPool || null,
      pact: pactPool || null,
    };
  }
}

/**
 * Factory function to create aggregator
 */
export function createMultiDexAggregator(
  algodClient: algosdk.Algodv2,
  network: 'mainnet' | 'testnet' = 'testnet',
  config?: MultiDexConfig
): MultiDexAggregator {
  return new MultiDexAggregator(algodClient, network, config);
}

/**
 * Pact DEX Client
 * 
 * Integrates with Pact Finance API to fetch pool data and quotes
 * API Docs: https://api.pact.fi/api/pools
 */

import algosdk from 'algosdk';
import { IDexClient, PoolInfo, SwapQuote, Asset, QuoteRequest, SwapResult, SwapRoute } from './types';
import { calculateAmountOut, calculatePriceImpact, applySlippage } from './utils';

// Pact API response types
interface PactAsset {
  id: number;
  on_chain_id: string;
  name: string;
  unit_name: string;
  decimals: number;
  is_liquidity_token: boolean;
  is_verified: boolean;
  price: string;
}

interface PactPool {
  id: number;
  on_chain_id: string;
  on_chain_address: string;
  version: number;
  primary_asset: PactAsset;
  secondary_asset: PactAsset;
  fee_bps: number;
  pool_type: 'CONST' | 'STABLE' | 'LEND';
  balance: string;
  tvl_usd: string;
  is_verified: boolean;
  is_deprecated: boolean;
}

interface PactApiResponse {
  count: number;
  results: PactPool[];
}

export class PactClient implements IDexClient {
  readonly name = 'pact' as const;
  readonly network: 'mainnet' | 'testnet';
  
  private readonly apiUrl: string;
  private readonly algodClient: algosdk.Algodv2;

  constructor(algodClient: algosdk.Algodv2, network: 'mainnet' | 'testnet' = 'mainnet') {
    this.algodClient = algodClient;
    this.network = network;
    // Pact API is the same for both networks
    this.apiUrl = 'https://api.pact.fi/api';
  }

  /**
   * Fetch all pools from Pact API
   */
  async fetchPools(): Promise<PoolInfo[]> {
    try {
      // Fetch with high limit to get all pools
      const response = await fetch(`${this.apiUrl}/pools?limit=5000`);
      
      if (!response.ok) {
        throw new Error(`Pact API error: ${response.status} ${response.statusText}`);
      }

      const data: PactApiResponse = await response.json();
      
      // Filter out deprecated pools and map to PoolInfo
      const pools = data.results
        .filter(pool => !pool.is_deprecated && pool.pool_type === 'CONST') // Only constant product pools for now
        .map(pool => this.mapPactPoolToPoolInfo(pool))
        .filter(pool => pool !== null) as PoolInfo[];

      console.log(`✅ Fetched ${pools.length} Pact pools`);
      return pools;
    } catch (error) {
      console.error('Error fetching Pact pools:', error);
      throw error;
    }
  }

  /**
   * Get a specific pool by asset pair
   */
  async getPool(assetInId: number, assetOutId: number): Promise<PoolInfo | null> {
    const pools = await this.fetchPools();
    
    // Find pool with matching asset pair (in either direction)
    return pools.find(pool => 
      (pool.asset1.id === assetInId && pool.asset2.id === assetOutId) ||
      (pool.asset1.id === assetOutId && pool.asset2.id === assetInId)
    ) || null;
  }

  /**
   * Get swap quote for a given input
   */
  async getQuote(request: QuoteRequest): Promise<SwapQuote> {
    // Extract asset IDs
    const assetInId = typeof request.assetIn === 'number' ? request.assetIn : request.assetIn.id;
    const assetOutId = typeof request.assetOut === 'number' ? request.assetOut : request.assetOut.id;
    
    // Get pool
    const pool = await this.getPool(assetInId, assetOutId);
    if (!pool) {
      throw new Error(`No Pact pool found for ${assetInId}-${assetOutId}`);
    }

    // Determine swap direction
    const isAsset1ToAsset2 = pool.asset1.id === assetInId;
    
    const reserveIn = isAsset1ToAsset2 ? pool.reserve1 : pool.reserve2;
    const reserveOut = isAsset1ToAsset2 ? pool.reserve2 : pool.reserve1;
    const assetOut = isAsset1ToAsset2 ? pool.asset2 : pool.asset1;
    const assetIn = isAsset1ToAsset2 ? pool.asset1 : pool.asset2;

    // Calculate output using constant product formula
    const amountOut = calculateAmountOut(
      request.amountIn,
      reserveIn,
      reserveOut,
      pool.fee / 10000 // Convert basis points to decimal
    );

    // Calculate price impact
    const priceImpact = calculatePriceImpact(request.amountIn, reserveIn, amountOut, reserveOut);

    // Apply slippage tolerance
    const slippageTolerance = request.slippageTolerance ?? 0.005; // 0.5% default
    const minimumAmountOut = applySlippage(amountOut, slippageTolerance);

    // Calculate execution prices
    const executionPrice = Number(amountOut) / Number(request.amountIn) * 
                          (10 ** assetIn.decimals) / (10 ** assetOut.decimals);
    const inversePrice = 1 / executionPrice;

    const route: SwapRoute = {
      path: [assetIn, assetOut],
      pools: [pool],
      dexes: [this.name],
      hops: 1,
    };

    return {
      amountIn: request.amountIn,
      amountOut,
      priceImpact,
      fee: BigInt(Math.floor(Number(request.amountIn) * pool.fee / 10000)),
      feeBps: pool.fee,
      minimumAmountOut,
      route,
      executionPrice,
      inversePrice,
    };
  }

  /**
   * Execute swap (placeholder - requires SDK integration)
   */
  async executeSwap(
    quote: SwapQuote,
    signerAddress: string
  ): Promise<SwapResult> {
    throw new Error('Pact swap execution requires @pactfi/pactsdk integration');
  }

  /**
   * Check if pool exists for asset pair
   */
  async hasPool(asset1Id: number, asset2Id: number): Promise<boolean> {
    const pool = await this.getPool(asset1Id, asset2Id);
    return pool !== null;
  }

  /**
   * Map Pact API pool to PoolInfo format
   */
  private mapPactPoolToPoolInfo(pool: PactPool): PoolInfo | null {
    try {
      const asset1: Asset = {
        id: parseInt(pool.primary_asset.on_chain_id),
        name: pool.primary_asset.name,
        symbol: pool.primary_asset.unit_name,
        decimals: pool.primary_asset.decimals,
        unitName: pool.primary_asset.unit_name,
      };

      const asset2: Asset = {
        id: parseInt(pool.secondary_asset.on_chain_id),
        name: pool.secondary_asset.name,
        symbol: pool.secondary_asset.unit_name,
        decimals: pool.secondary_asset.decimals,
        unitName: pool.secondary_asset.unit_name,
      };

      // Parse pool balance (TVL in USD)
      const tvlUsd = parseFloat(pool.tvl_usd);
      
      // Estimate reserves based on asset prices and TVL
      const price1 = parseFloat(pool.primary_asset.price);
      const price2 = parseFloat(pool.secondary_asset.price);
      
      // Skip pools with invalid data
      if (!isFinite(tvlUsd) || !isFinite(price1) || !isFinite(price2) || 
          tvlUsd <= 0 || price1 <= 0 || price2 <= 0) {
        return null;
      }
      
      // Simple approximation: split TVL equally in USD terms
      const reserve1Usd = tvlUsd / 2;
      const reserve2Usd = tvlUsd / 2;
      
      const reserve1Raw = (reserve1Usd / price1) * (10 ** asset1.decimals);
      const reserve2Raw = (reserve2Usd / price2) * (10 ** asset2.decimals);
      
      // Validate calculated reserves
      if (!isFinite(reserve1Raw) || !isFinite(reserve2Raw) || 
          reserve1Raw <= 0 || reserve2Raw <= 0) {
        return null;
      }
      
      const reserve1 = BigInt(Math.floor(reserve1Raw));
      const reserve2 = BigInt(Math.floor(reserve2Raw));

      // Estimate total liquidity
      const totalLiquidityRaw = Math.sqrt(Number(reserve1) * Number(reserve2));
      if (!isFinite(totalLiquidityRaw) || totalLiquidityRaw <= 0) {
        return null;
      }
      
      const totalLiquidity = BigInt(Math.floor(totalLiquidityRaw));

      return {
        poolId: pool.on_chain_address,
        dexName: this.name,
        asset1,
        asset2,
        reserve1,
        reserve2,
        totalLiquidity,
        fee: pool.fee_bps, // Keep as basis points
        poolAddress: pool.on_chain_address,
        appId: parseInt(pool.on_chain_id),
        lastUpdated: Date.now(),
      };
    } catch (error) {
      // Silently skip invalid pools
      return null;
    }
  }
}

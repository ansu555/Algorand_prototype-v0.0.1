/**
 * Tinyman V2 DEX Client
 * Implements pool fetching, quoting, and swap execution for Tinyman V2
 */

import algosdk from 'algosdk';
import {
  IDexClient,
  PoolInfo,
  QuoteRequest,
  SwapQuote,
  SwapResult,
  Asset,
  SwapRoute,
} from './types';
import {
  calculateAmountOut,
  calculatePriceImpact,
  applySlippage,
  getPoolKey,
  calculateFee,
} from './utils';
import { getTinymanV2PoolAppId, registerTinymanV2Pool } from './tinyman-v2-pools';

// Tinyman V2 constants
const TINYMAN_V2_VALIDATOR_APP_ID_MAINNET = 1002541853;
const TINYMAN_V2_VALIDATOR_APP_ID_TESTNET = 148607000;

interface TinymanAsset {
  id: string;
  name: string;
  unit_name: string;
  decimals: number;
}

interface TinymanPool {
  address: string;
  version: string;
  asset_1: TinymanAsset;
  asset_2: TinymanAsset;
  current_asset_1_reserves: string;
  current_asset_2_reserves: string;
  current_issued_liquidity_assets: string;
  is_verified: boolean;
  v2_address?: string; // V2 pool address (if this is a V1.1 pool)
}

export class TinymanV2Client implements IDexClient {
  readonly name = 'tinyman' as const;
  readonly network: 'mainnet' | 'testnet';
  private algodClient: algosdk.Algodv2;
  private poolCache: Map<string, PoolInfo> = new Map();
  private cacheExpiry: number = 0;
  private readonly cacheTTL = 30000; // 30 seconds
  private readonly apiBaseUrl: string;
  private readonly validatorAppId: number;

  constructor(
    algodClient: algosdk.Algodv2,
    network: 'mainnet' | 'testnet' = 'testnet'
  ) {
    this.algodClient = algodClient;
    this.network = network;
    this.apiBaseUrl =
      network === 'mainnet'
        ? 'https://mainnet.analytics.tinyman.org/api/v1'
        : 'https://testnet.analytics.tinyman.org/api/v1';
    this.validatorAppId =
      network === 'mainnet'
        ? TINYMAN_V2_VALIDATOR_APP_ID_MAINNET
        : TINYMAN_V2_VALIDATOR_APP_ID_TESTNET;
  }

  /**
   * Fetch all pools from Tinyman Analytics API
   */
  async fetchPools(): Promise<PoolInfo[]> {
    try {
      const now = Date.now();

      // Return cached data if still valid
      if (this.poolCache.size > 0 && now < this.cacheExpiry) {
        return Array.from(this.poolCache.values());
      }

      console.log(`Fetching Tinyman V2 pools from ${this.network}...`);

      const response = await fetch(`${this.apiBaseUrl}/pools/`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Tinyman API error: ${response.statusText}`);
      }

      const data = await response.json();
      const pools: TinymanPool[] = data.results || data || [];

      // Convert to PoolInfo format
      const poolInfos: PoolInfo[] = [];

      for (const pool of pools) {
        try {
          // Skip pools with invalid data
          if (!pool.asset_1?.id || !pool.asset_2?.id) {
            continue;
          }

          const asset1Id = parseInt(pool.asset_1.id);
          const asset2Id = parseInt(pool.asset_2.id);

          // Skip pools with no liquidity
          if (!pool.current_asset_1_reserves || !pool.current_asset_2_reserves || 
              pool.current_asset_1_reserves === '0' || pool.current_asset_2_reserves === '0') {
            continue;
          }

          // For Tinyman V2, we need the pool application ID
          // Strategy:
          // 1. Check lookup table first (fast)
          // 2. Try to fetch from blockchain (slow, but caches result)
          let poolAppId: number | undefined
          
          // First, try lookup table
          poolAppId = getTinymanV2PoolAppId(asset1Id, asset2Id)
          
          // If not in lookup table and this is a V1.1 pool with v2_address, fetch from blockchain
          if (!poolAppId && pool.version === '1.1' && pool.v2_address) {
            try {
              // Fetch account info to get the application ID
              const accountInfo = await this.algodClient.accountInformation(pool.v2_address).do()
              
              // V2 pools are smart contracts, check if this address is an application
              if (accountInfo && accountInfo.createdApps && accountInfo.createdApps.length > 0) {
                poolAppId = Number(accountInfo.createdApps[0].id)
                
                // Register this pool for future lookups
                registerTinymanV2Pool({
                  asset1Id,
                  asset2Id,
                  appId: poolAppId,
                  address: pool.v2_address
                })
              } else if (accountInfo && accountInfo.appsLocalState) {
                // Or check if it's opted into an application
                const apps = accountInfo.appsLocalState
                if (apps.length > 0) {
                  poolAppId = Number(apps[0].id)
                  
                  // Register this pool for future lookups
                  registerTinymanV2Pool({
                    asset1Id,
                    asset2Id,
                    appId: poolAppId,
                    address: pool.v2_address
                  })
                }
              }
            } catch (error) {
              console.warn(`Could not fetch app ID for pool ${pool.address} (v2: ${pool.v2_address})`)
            }
          }

          const poolInfo: PoolInfo = {
            poolId: pool.address,
            dexName: 'tinyman',
            asset1: {
              id: asset1Id,
              name: pool.asset_1.name || `Asset ${asset1Id}`,
              symbol: pool.asset_1.unit_name || `ASA${asset1Id}`,
              decimals: pool.asset_1.decimals || 0,
              unitName: pool.asset_1.unit_name,
            },
            asset2: {
              id: asset2Id,
              name: pool.asset_2.name || `Asset ${asset2Id}`,
              symbol: pool.asset_2.unit_name || `ASA${asset2Id}`,
              decimals: pool.asset_2.decimals || 0,
              unitName: pool.asset_2.unit_name,
            },
            reserve1: BigInt(pool.current_asset_1_reserves),
            reserve2: BigInt(pool.current_asset_2_reserves),
            totalLiquidity: BigInt(pool.current_issued_liquidity_assets || 0),
            fee: 30, // Tinyman V2 has 0.3% fee (30 basis points)
            poolAddress: pool.address,
            appId: poolAppId, // Pool application ID (V2 only)
            lastUpdated: now,
          };

          const key = getPoolKey(asset1Id, asset2Id);
          this.poolCache.set(key, poolInfo);
          poolInfos.push(poolInfo);
        } catch (error) {
          console.warn(`Failed to process pool ${pool.address}:`, error);
        }
      }

      this.cacheExpiry = now + this.cacheTTL;
      console.log(`✅ Fetched ${poolInfos.length} Tinyman V2 pools`);
      
      // Debug: Show first few pools
      if (poolInfos.length > 0) {
        console.log('Sample pools:');
        poolInfos.slice(0, 3).forEach(p => {
          console.log(`  - ${p.asset1.symbol}/${p.asset2.symbol} (${p.asset1.id}/${p.asset2.id})`);
        });
      }

      return poolInfos;
    } catch (error) {
      console.error('Error fetching Tinyman pools:', error);
      // Return cached data if available
      if (this.poolCache.size > 0) {
        console.log('Returning cached pool data');
        return Array.from(this.poolCache.values());
      }
      throw error;
    }
  }

  /**
   * Get specific pool for asset pair
   */
  async getPool(asset1Id: number, asset2Id: number): Promise<PoolInfo | null> {
    const key = getPoolKey(asset1Id, asset2Id);

    // Check cache first
    if (this.poolCache.has(key) && Date.now() < this.cacheExpiry) {
      return this.poolCache.get(key) || null;
    }

    // Fetch all pools to update cache
    await this.fetchPools();

    return this.poolCache.get(key) || null;
  }

  /**
   * Check if pool exists
   */
  async hasPool(asset1Id: number, asset2Id: number): Promise<boolean> {
    const pool = await this.getPool(asset1Id, asset2Id);
    return pool !== null && pool.reserve1 > 0n && pool.reserve2 > 0n;
  }

  /**
   * Get swap quote using constant product formula
   */
  async getQuote(request: QuoteRequest): Promise<SwapQuote> {
    const assetInId =
      typeof request.assetIn === 'number'
        ? request.assetIn
        : request.assetIn.id;
    const assetOutId =
      typeof request.assetOut === 'number'
        ? request.assetOut
        : request.assetOut.id;

    const pool = await this.getPool(assetInId, assetOutId);

    if (!pool) {
      throw new Error(
        `No Tinyman pool found for assets ${assetInId}-${assetOutId}`
      );
    }

    // Determine which direction we're swapping
    const isAsset1ToAsset2 = pool.asset1.id === assetInId;
    const reserveIn = isAsset1ToAsset2 ? pool.reserve1 : pool.reserve2;
    const reserveOut = isAsset1ToAsset2 ? pool.reserve2 : pool.reserve1;
    const assetIn = isAsset1ToAsset2 ? pool.asset1 : pool.asset2;
    const assetOut = isAsset1ToAsset2 ? pool.asset2 : pool.asset1;

    // Calculate swap output
    const amountOut = calculateAmountOut(
      request.amountIn,
      reserveIn,
      reserveOut,
      pool.fee
    );

    const priceImpact = calculatePriceImpact(
      request.amountIn,
      amountOut,
      reserveIn,
      reserveOut
    );

    const fee = calculateFee(request.amountIn, pool.fee);

    const slippageTolerance = request.slippageTolerance || 50; // 0.5% default
    const minimumAmountOut = applySlippage(amountOut, slippageTolerance);

    const executionPrice = Number(amountOut) / Number(request.amountIn);
    const inversePrice = Number(request.amountIn) / Number(amountOut);

    const route: SwapRoute = {
      path: [assetIn, assetOut],
      pools: [pool],
      dexes: ['tinyman'],
      hops: 1,
    };

    return {
      amountIn: request.amountIn,
      amountOut,
      priceImpact,
      fee,
      feeBps: pool.fee,
      minimumAmountOut,
      route,
      executionPrice,
      inversePrice,
    };
  }

  /**
   * Execute swap using Tinyman V2
   * Note: This is a simplified version. For production, use @tinymanorg/tinyman-js-sdk
   */
  async executeSwap(
    quote: SwapQuote,
    signerAddress: string
  ): Promise<SwapResult> {
    // TODO: Implement actual swap execution using Tinyman SDK
    // For now, this is a placeholder that shows the structure
    
    throw new Error(
      'Tinyman swap execution not yet implemented. Please integrate @tinymanorg/tinyman-js-sdk'
    );

    // When implemented, it should:
    // 1. Import Swap module from @tinymanorg/tinyman-js-sdk
    // 2. Generate swap transactions
    // 3. Sign and submit transactions
    // 4. Return SwapResult with txId and details
  }

  /**
   * Get asset information from Algod
   */
  private async getAssetInfo(assetId: number): Promise<Asset> {
    if (assetId === 0) {
      return {
        id: 0,
        name: 'Algorand',
        symbol: 'ALGO',
        decimals: 6,
        unitName: 'ALGO',
      };
    }

    try {
      const assetInfo = await this.algodClient.getAssetByID(assetId).do();
      return {
        id: assetId,
        name: assetInfo.params.name || `Asset ${assetId}`,
        symbol: assetInfo.params.unitName || `ASA${assetId}`,
        decimals: assetInfo.params.decimals || 0,
        unitName: assetInfo.params.unitName,
      };
    } catch (error) {
      console.warn(`Failed to fetch asset ${assetId}, using defaults`, error);
      return {
        id: assetId,
        name: `Asset ${assetId}`,
        symbol: `ASA${assetId}`,
        decimals: 0,
      };
    }
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.poolCache.clear();
    this.cacheExpiry = 0;
  }
}

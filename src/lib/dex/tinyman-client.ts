/**
 * Tinyman V2 DEX Client
 * Implements pool fetching, quoting, and swap execution for Tinyman V2
 */

import algosdk from 'algosdk';
// Tinyman SDK types are published via declaration files only, so we import both
// runtime modules and types explicitly to satisfy TypeScript.
import {
  poolUtils,
  Swap,
  SwapQuoteType,
  SwapType,
} from '@tinymanorg/tinyman-js-sdk';
import type {
  InitiatorSigner,
  SignerTransaction,
  SupportedNetwork,
} from '@tinymanorg/tinyman-js-sdk';
import {
  IDexClient,
  PoolInfo,
  QuoteRequest,
  SwapQuote,
  SwapResult,
  Asset,
  SwapRoute,
  WalletSigner,
} from './types';
import {
  calculateAmountOut,
  calculatePriceImpact,
  applySlippage,
  getPoolKey,
  calculateFee,
} from './utils';

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
}

type TinymanPoolsResponse =
  | TinymanPool[]
  | {
      results?: TinymanPool[];
      next?: string | null;
    };

interface HttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<TinymanPoolsResponse>;
}

export class TinymanV2Client implements IDexClient {
  readonly name = 'tinyman' as const;
  readonly network: 'mainnet' | 'testnet';
  private algodClient: algosdk.Algodv2;
  private poolCache: Map<string, PoolInfo> = new Map();
  private cacheExpiry: number = 0;
  private readonly cacheTTL = 300000; // 5 minutes (to avoid rate limits)
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
   * Note: Tinyman API has rate limits, so we fetch with delays
   */
  async fetchPools(): Promise<PoolInfo[]> {
    try {
      const now = Date.now();

      // Return cached data if still valid
      if (this.poolCache.size > 0 && now < this.cacheExpiry) {
        return Array.from(this.poolCache.values());
      }

      console.log(`Fetching Tinyman V2 pools from ${this.network}...`);

      const aggregatedPools: TinymanPool[] = [];
      let nextUrl: string | null = `${this.apiBaseUrl}/pools/`;
      let page = 1;
      const maxPages = 10; // Fetch more pages for better routing coverage (100 pools)

      // Paginate through pools with rate limiting
      while (nextUrl && page <= maxPages) {
        console.log(`  • Fetching Tinyman page ${page}...`);
        
        const response = (await fetch(nextUrl, {
          headers: {
            'Content-Type': 'application/json',
          },
        })) as HttpResponse;

        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`⚠️ Rate limit hit at page ${page}, stopping pagination`);
            break;
          }
          throw new Error(`Tinyman API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const pageResults: TinymanPool[] = Array.isArray(data)
          ? data
          : (data.results as TinymanPool[]) || [];

        aggregatedPools.push(...pageResults);

        // Check for next page
        const next = Array.isArray(data) ? null : data.next;
        if (next && page < maxPages) {
          nextUrl = next.startsWith('http') ? next : `${this.apiBaseUrl}${next}`;
          page += 1;
          
          // Add delay to avoid rate limiting (100ms between requests)
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          nextUrl = null;
        }
      }

      if (page > maxPages) {
        console.log(`  ℹ️ Stopped at page ${maxPages} to avoid rate limits`);
      }

      // Convert to PoolInfo format
      const poolInfos: PoolInfo[] = [];
      const freshCache = new Map<string, PoolInfo>();

      for (const pool of aggregatedPools) {
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
            lastUpdated: now,
          };

          const key = getPoolKey(asset1Id, asset2Id);
          freshCache.set(key, poolInfo);
          poolInfos.push(poolInfo);
        } catch (error) {
          console.warn(`Failed to process pool ${pool.address}:`, error);
        }
      }

      this.poolCache = freshCache;
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
    signer: WalletSigner
  ): Promise<SwapResult> {
    if (!quote?.route?.pools?.length || quote.route.hops !== 1) {
      throw new Error('Tinyman executor currently supports single-hop routes only');
    }
    const signerAddress = signer.address;

    const assetPath = quote.route.path;
    if (!assetPath || assetPath.length < 2) {
      throw new Error('Invalid Tinyman route: missing asset path');
    }

    const assetIn = assetPath[0];
    const assetOut = assetPath[assetPath.length - 1];

    await this.ensureAssetOptIn(signerAddress, assetOut.id);

    const tinymanNetwork = this.network as SupportedNetwork;
    const pool = await poolUtils.v2.getPoolInfo({
      client: this.algodClient,
      network: tinymanNetwork,
      asset1ID: Number(assetIn.id),
      asset2ID: Number(assetOut.id),
    });

    if (!pool) {
      throw new Error('Tinyman pool could not be resolved for the selected route');
    }

    const assetInDecimals = assetIn.decimals ?? (await this.getAssetInfo(assetIn.id)).decimals;
    const assetOutDecimals = assetOut.decimals ?? (await this.getAssetInfo(assetOut.id)).decimals;

    const directQuote = Swap.v2.getFixedInputDirectSwapQuote({
      pool,
      amount: quote.amountIn,
      assetIn: { id: assetIn.id, decimals: assetInDecimals },
      assetOut: { id: assetOut.id, decimals: assetOutDecimals },
    });

    const slippageFraction = this.calculateSlippageFraction(quote);

    const swapQuote = {
      type: SwapQuoteType.Direct,
      data: {
        pool,
        quote: directQuote,
      },
    } as const;

    const txGroup = await Swap.v2.generateTxns({
      client: this.algodClient,
      network: tinymanNetwork,
      quote: swapQuote,
      swapType: SwapType.FixedInput,
      slippage: slippageFraction,
      initiatorAddr: signerAddress,
    });

    const signedTxns = await Swap.v2.signTxns({
      txGroup,
      initiatorSigner: this.buildInitiatorSigner(signer),
    });

    const execution = await Swap.v2.execute({
      client: this.algodClient,
      quote: swapQuote,
      txGroup,
      signedTxns,
    });

    const amountOut = execution.assetOut?.amount ?? quote.amountOut;

    return {
      txId: execution.txnID,
      confirmedRound: execution.round,
      amountOut,
      route: quote.route,
      details: {
        dex: this.name,
        poolAddress: pool.account.address().toString(),
        validatorAppId: pool.validatorAppID,
        slippageFraction,
        estimatedAmountOut: quote.amountOut,
        minimumAmountOut: quote.minimumAmountOut,
      },
    };
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

  private calculateSlippageFraction(quote: SwapQuote): number {
    if (quote.amountOut === 0n) {
      return 0.005; // default 0.5%
    }

    const diff = Number(quote.amountOut - quote.minimumAmountOut);
    const base = Number(quote.amountOut);

    if (!isFinite(diff) || !isFinite(base) || base <= 0) {
      return 0.005;
    }

    const fraction = diff / base;
    return Math.min(Math.max(fraction, 0), 0.2); // cap at 20%
  }

  private async ensureAssetOptIn(address: string, assetId: number): Promise<void> {
    if (assetId === 0) {
      return;
    }

    const accountInfo = await this.algodClient.accountInformation(address).do();
    const hasAsset = (accountInfo.assets || []).some(
      (asset: any) => Number(asset.assetId ?? asset['asset-id']) === assetId
    );

    if (!hasAsset) {
      throw new Error(`Account ${address} must opt-in to asset ${assetId} before executing Tinyman swap`);
    }
  }

  private buildInitiatorSigner(signer: WalletSigner): InitiatorSigner {
    if (signer.signTinymanTransactions) {
      return signer.signTinymanTransactions;
    }

    return async (txGroupList: SignerTransaction[][]) => {
      const results: Uint8Array[] = [];
      const toSign: { txn: algosdk.Transaction; index: number }[] = [];

      for (const group of txGroupList) {
        for (const item of group) {
          const index = results.length;
          const requiresSignature =
            !item.signers ||
            item.signers.length === 0 ||
            item.signers.includes(signer.address);

          if (requiresSignature) {
            toSign.push({ txn: item.txn, index });
            results.push(new Uint8Array());
          } else {
            results.push(algosdk.encodeUnsignedTransaction(item.txn));
          }
        }
      }

      if (toSign.length > 0) {
        const signedPayloads = await signer.signTransactions(
          toSign.map((entry) => entry.txn)
        );

        toSign.forEach((entry, idx) => {
          results[entry.index] = signedPayloads[idx];
        });
      }

      return results;
    };
  }
}

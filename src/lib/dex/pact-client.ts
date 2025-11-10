/**
 * Pact DEX Client
 * 
 * Integrates with Pact Finance API to fetch pool data and quotes
 * API Docs: https://api.pact.fi/api/pools
 */

import algosdk from 'algosdk';
import { PactClient as PactSdkClient } from '@pactfi/pactsdk';
import {
  IDexClient,
  PoolInfo,
  SwapQuote,
  Asset,
  QuoteRequest,
  SwapResult,
  SwapRoute,
  WalletSigner,
} from './types';
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
  private pactSdkClient: PactSdkClient | null = null;

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
      pool.fee // Keep as basis points (integer)
    );

    // Calculate price impact
    const priceImpact = calculatePriceImpact(request.amountIn, reserveIn, amountOut, reserveOut);

    // Apply slippage tolerance (convert from decimal to basis points)
    const slippageTolerance = request.slippageTolerance ?? 50; // 50 bps = 0.5% default
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
    signer: WalletSigner
  ): Promise<SwapResult> {
    if (!quote?.route?.pools?.length || quote.route.hops !== 1) {
      throw new Error('Pact executor currently supports single-hop routes only');
    }
    const signerAddress = signer.address;

    const assetPath = quote.route.path;
    if (!assetPath || assetPath.length < 2) {
      throw new Error('Invalid Pact route: missing asset path');
    }

    const assetIn = assetPath[0];
    const assetOut = assetPath[assetPath.length - 1];

  await this.ensureAssetOptIn(signerAddress, assetOut.id);

    const pactSdk = this.getPactSdkClient();

    const primaryPool = quote.route.pools[0];
    let pool = null;

    if (primaryPool?.appId) {
      pool = await pactSdk.fetchPoolById(primaryPool.appId);
    } else {
      const pools = await pactSdk.fetchPoolsByAssets(assetIn.id, assetOut.id);
      pool = pools[0] ?? null;
    }

    if (!pool) {
      throw new Error('Pact pool could not be resolved for the selected route');
    }

    await pool.updateState();

    const depositAsset = pool.primaryAsset.index === assetIn.id ? pool.primaryAsset
      : pool.secondaryAsset.index === assetIn.id ? pool.secondaryAsset
      : null;

    if (!depositAsset) {
      throw new Error('Input asset does not belong to the resolved Pact pool');
    }

    if (quote.amountIn > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('Swap amount exceeds Pact SDK numeric limits');
    }

    const slippageFraction = this.calculateSlippageFraction(quote);
    const slippagePct = slippageFraction * 100;

    const swap = pool.prepareSwap({
      asset: depositAsset,
      amount: Number(quote.amountIn),
      slippagePct,
    });

    const txGroup = await swap.prepareTxGroup(signerAddress);
    const fromObj = (algosdk.Transaction as any).from_obj_for_encoding;

    if (typeof fromObj !== 'function') {
      throw new Error('algosdk.Transaction.from_obj_for_encoding is not available in current SDK version');
    }

    const walletTransactions = txGroup.transactions.map((txn: any) => {
      if (typeof txn.get_obj_for_encoding === 'function') {
        return fromObj.call(algosdk.Transaction, txn.get_obj_for_encoding());
      }

      return fromObj.call(algosdk.Transaction, txn);
    });

    const signedGroup = await signer.signTransactions(walletTransactions);

    const sendResult = await this.algodClient.sendRawTransaction(signedGroup).do();
    const txId = ((sendResult as any).txId ?? (sendResult as any).txid) as string;

    const confirmation = await algosdk.waitForConfirmation(this.algodClient, txId, 6);
    const confirmedRound = (confirmation.confirmedRound ?? (confirmation as any)['confirmed-round']) as
      | number
      | undefined;
    const amountOut =
  this.extractAmountOutFromConfirmation(confirmation, assetOut.id, signerAddress) ??
      BigInt(Math.round(swap.effect.amountReceived));

    return {
      txId,
      confirmedRound,
      amountOut,
      route: quote.route,
      details: {
        dex: this.name,
        poolAppId: pool.appId,
        poolEscrowAddress: pool.getEscrowAddress(),
        slippagePct,
        estimatedAmountOut: BigInt(Math.round(swap.effect.amountReceived)),
        minimumAmountOut: BigInt(Math.round(swap.effect.minimumAmountReceived)),
      },
    };
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

  private async ensureAssetOptIn(address: string, assetId: number): Promise<void> {
    if (assetId === 0) {
      return;
    }

    const accountInfo = await this.algodClient.accountInformation(address).do();
    const hasAsset = (accountInfo.assets || []).some(
      (asset: any) => Number(asset.assetId ?? asset['asset-id']) === assetId
    );

    if (!hasAsset) {
      throw new Error(`Account ${address} must opt-in to asset ${assetId} before executing Pact swap`);
    }
  }

  private calculateSlippageFraction(quote: SwapQuote): number {
    if (quote.amountOut === 0n) {
      return 0.005;
    }

    const diff = Number(quote.amountOut - quote.minimumAmountOut);
    const base = Number(quote.amountOut);

    if (!isFinite(diff) || !isFinite(base) || base <= 0) {
      return 0.005;
    }

    const fraction = diff / base;
    return Math.min(Math.max(fraction, 0), 0.2);
  }

  private extractAmountOutFromConfirmation(
    confirmation: any,
    assetOutId: number,
    receiver: string
  ): bigint | null {
    const inner = confirmation['inner-txns'] || [];

    for (const innerTxn of inner) {
      const txn = innerTxn.txn || {};

      if (assetOutId === 0 && txn['payment-transaction']) {
        const pay = txn['payment-transaction'];
        if (pay.receiver === receiver) {
          return BigInt(pay.amount ?? 0);
        }
      }

      if (assetOutId !== 0 && txn['asset-transfer-transaction']) {
        const transfer = txn['asset-transfer-transaction'];
        if (
          transfer.receiver === receiver &&
          Number(transfer['asset-id']) === assetOutId
        ) {
          return BigInt(transfer.amount ?? 0);
        }
      }

      if (innerTxn['inner-txns']) {
        const nested = this.extractAmountOutFromConfirmation(innerTxn, assetOutId, receiver);
        if (nested !== null) {
          return nested;
        }
      }
    }

    return null;
  }

  private getPactSdkClient(): PactSdkClient {
    if (!this.pactSdkClient) {
      this.pactSdkClient = new PactSdkClient(this.algodClient as any, { network: this.network });
    }

    return this.pactSdkClient;
  }
}

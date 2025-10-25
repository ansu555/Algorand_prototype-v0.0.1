/**
 * Multi-Source Price Feed Oracle
 * Aggregates prices from multiple DEXs and external sources
 * Fetches pool reserves via Algorand Indexer for accurate pricing
 */

import algosdk from 'algosdk';
import { getAlgodClient } from '../algorand';

export interface PriceSource {
  source: string;
  price: number;
  timestamp: number;
  confidence: number; // 0-1, based on liquidity
}

export interface AssetPrice {
  assetId: number;
  symbol: string;
  prices: PriceSource[];
  averagePrice: number;
  weightedPrice: number; // Weighted by liquidity/confidence
  priceDeviation: number; // Percentage deviation between sources
  lastUpdate: number;
}

export interface PoolReserves {
  reserve1: bigint;
  reserve2: bigint;
  asset1Id: number;
  asset2Id: number;
  liquidity: bigint;
}

export class MultiSourcePriceFeed {
  private indexerClient: algosdk.Indexer;
  private algodClient: algosdk.Algodv2;
  private priceCache: Map<number, AssetPrice> = new Map();
  private cacheTtl: number = 60; // 1 minute for testnet, 30 for mainnet
  private network: 'mainnet' | 'testnet';

  // DEX application IDs
  private readonly TINYMAN_V2_TESTNET = 148607000;
  private readonly TINYMAN_V2_MAINNET = 1002541853;
  private readonly PACT_APP_ID_MAINNET = 1004; // Example, update with real ID

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.network = network;
    this.algodClient = getAlgodClient();
    
    const indexerUrl = network === 'mainnet' 
      ? 'https://mainnet-idx.algonode.cloud'
      : 'https://testnet-idx.algonode.cloud';
      
    this.indexerClient = new algosdk.Indexer('', indexerUrl, 443);
    this.cacheTtl = network === 'mainnet' ? 30 : 60;
  }

  /**
   * Get price from multiple sources with weighted average
   */
  async getAssetPrice(assetId: number): Promise<number> {
    const cached = this.priceCache.get(assetId);
    const now = Date.now() / 1000;

    // Check cache
    if (cached && now - cached.lastUpdate < this.cacheTtl) {
      return cached.weightedPrice;
    }

    try {
      const prices: PriceSource[] = [];

      // Fetch from all sources in parallel
      const [tinymanPrice, pactPrice, vestigePrice, externalPrice] = await Promise.allSettled([
        this.getTinymanPrice(assetId),
        this.getPactPrice(assetId),
        this.getVestigePrice(assetId),
        this.getExternalPrice(assetId),
      ]);

      // Add Tinyman price
      if (tinymanPrice.status === 'fulfilled' && tinymanPrice.value) {
        prices.push(tinymanPrice.value);
      }

      // Add Pact price
      if (pactPrice.status === 'fulfilled' && pactPrice.value) {
        prices.push(pactPrice.value);
      }

      // Add Vestige price
      if (vestigePrice.status === 'fulfilled' && vestigePrice.value) {
        prices.push(vestigePrice.value);
      }

      // Add external API price (CoinGecko for known assets)
      if (externalPrice.status === 'fulfilled' && externalPrice.value) {
        prices.push(externalPrice.value);
      }

      if (prices.length === 0) {
        console.warn(`No prices found for asset ${assetId}`);
        return 0;
      }

      // Calculate simple average
      const averagePrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;

      // Calculate weighted average (weighted by confidence/liquidity)
      const totalConfidence = prices.reduce((sum, p) => sum + p.confidence, 0);
      const weightedPrice = prices.reduce((sum, p) => sum + (p.price * p.confidence), 0) / totalConfidence;

      // Calculate price deviation
      const maxPrice = Math.max(...prices.map(p => p.price));
      const minPrice = Math.min(...prices.map(p => p.price));
      const priceDeviation = ((maxPrice - minPrice) / averagePrice) * 100;

      // Get asset symbol
      const symbol = await this.getAssetSymbol(assetId);

      // Cache result
      const assetPrice: AssetPrice = {
        assetId,
        symbol,
        prices,
        averagePrice,
        weightedPrice,
        priceDeviation,
        lastUpdate: now,
      };

      this.priceCache.set(assetId, assetPrice);

      console.log(
        `✅ Price for ${symbol} (${assetId}): $${weightedPrice.toFixed(6)} ` +
        `(${prices.length} sources, ${priceDeviation.toFixed(2)}% deviation)`
      );

      return weightedPrice;
    } catch (error) {
      console.error(`Error fetching price for asset ${assetId}:`, error);
      return 0;
    }
  }

  /**
   * Get price from Tinyman V2 pools via Indexer
   */
  private async getTinymanPrice(assetId: number): Promise<PriceSource | null> {
    try {
      // Special case: ALGO
      if (assetId === 0) {
        const algoPrice = await this.getAlgoUSDPrice();
        return {
          source: 'Tinyman-ALGO',
          price: algoPrice,
          timestamp: Date.now() / 1000,
          confidence: 1.0,
        };
      }

      // Fetch pools from Tinyman Analytics API (faster than indexer)
      const apiUrl = this.network === 'mainnet'
        ? 'https://mainnet.analytics.tinyman.org/api/v1'
        : 'https://testnet.analytics.tinyman.org/api/v1';

      const response = await fetch(`${apiUrl}/pools/?asset=${assetId}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const pools = data.results || [];

      // Find ALGO pair pool with highest liquidity
      let bestPool = null;
      let maxLiquidity = 0;

      for (const pool of pools) {
        const asset1Id = parseInt(pool.asset_1?.id || '0');
        const asset2Id = parseInt(pool.asset_2?.id || '0');

        // Check if paired with ALGO
        if ((asset1Id === 0 || asset2Id === 0) && (asset1Id === assetId || asset2Id === assetId)) {
          const reserve1 = BigInt(pool.current_asset_1_reserves || '0');
          const reserve2 = BigInt(pool.current_asset_2_reserves || '0');
          const liquidity = reserve1 * reserve2;

          if (liquidity > maxLiquidity) {
            maxLiquidity = Number(liquidity);
            bestPool = pool;
          }
        }
      }

      if (!bestPool) return null;

      // Calculate price from reserves
      const reserve1 = BigInt(bestPool.current_asset_1_reserves);
      const reserve2 = BigInt(bestPool.current_asset_2_reserves);
      const asset1Id = parseInt(bestPool.asset_1.id);
      
      const decimals1 = bestPool.asset_1.decimals || 6;
      const decimals2 = bestPool.asset_2.decimals || 6;

      // Price in ALGO
      let priceInAlgo: number;
      if (asset1Id === assetId) {
        // assetId is asset1, ALGO is asset2
        priceInAlgo = Number(reserve2) / Number(reserve1) * Math.pow(10, decimals1 - decimals2);
      } else {
        // assetId is asset2, ALGO is asset1
        priceInAlgo = Number(reserve1) / Number(reserve2) * Math.pow(10, decimals2 - decimals1);
      }

      // Convert to USD
      const algoUsdPrice = await this.getAlgoUSDPrice();
      const priceUsd = priceInAlgo * algoUsdPrice;

      // Calculate confidence based on liquidity
      const liquidityUsd = Number(reserve1) * algoUsdPrice / 1e6;
      const confidence = Math.min(1.0, liquidityUsd / 10000); // Max confidence at $10k+ liquidity

      return {
        source: 'Tinyman',
        price: priceUsd,
        timestamp: Date.now() / 1000,
        confidence,
      };
    } catch (error) {
      console.debug(`Tinyman price fetch failed for asset ${assetId}:`, error);
      return null;
    }
  }

  /**
   * Get price from Pact pools via Indexer
   */
  private async getPactPrice(assetId: number): Promise<PriceSource | null> {
    try {
      // Fetch from Pact API
      const response = await fetch('https://api.pact.fi/api/pools?limit=5000');
      
      if (!response.ok) return null;

      const data = await response.json();
      const pools = data.results || [];

      // Find ALGO pair pool with highest TVL
      let bestPool = null;
      let maxTvl = 0;

      for (const pool of pools) {
        const asset1Id = parseInt(pool.primary_asset?.on_chain_id || '0');
        const asset2Id = parseInt(pool.secondary_asset?.on_chain_id || '0');

        // Check if paired with ALGO and matches our asset
        if ((asset1Id === 0 || asset2Id === 0) && (asset1Id === assetId || asset2Id === assetId)) {
          const tvl = parseFloat(pool.tvl_usd || '0');
          
          if (tvl > maxTvl && !pool.is_deprecated) {
            maxTvl = tvl;
            bestPool = pool;
          }
        }
      }

      if (!bestPool || maxTvl === 0) return null;

      // Get prices from pool
      const asset1Id = parseInt(bestPool.primary_asset.on_chain_id);
      const price1 = parseFloat(bestPool.primary_asset.price || '0');
      const price2 = parseFloat(bestPool.secondary_asset.price || '0');

      if (price1 <= 0 || price2 <= 0) return null;

      // Calculate asset price in USD
      const priceUsd = asset1Id === assetId ? price1 : price2;

      // Confidence based on TVL
      const confidence = Math.min(1.0, maxTvl / 50000); // Max confidence at $50k+ TVL

      return {
        source: 'Pact',
        price: priceUsd,
        timestamp: Date.now() / 1000,
        confidence,
      };
    } catch (error) {
      console.debug(`Pact price fetch failed for asset ${assetId}:`, error);
      return null;
    }
  }

  /**
   * Get price from Vestige API
   */
  private async getVestigePrice(assetId: number): Promise<PriceSource | null> {
    try {
      const response = await fetch(
        `https://free-api.vestige.fi/asset/${assetId}/price`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const price = data.price;

      if (!price || price <= 0) return null;

      return {
        source: 'Vestige',
        price,
        timestamp: Date.now() / 1000,
        confidence: 0.7, // Medium confidence for external API
      };
    } catch (error) {
      console.debug(`Vestige price fetch failed for asset ${assetId}:`, error);
      return null;
    }
  }

  /**
   * Get price from external APIs (CoinGecko, CoinMarketCap, etc.)
   */
  private async getExternalPrice(assetId: number): Promise<PriceSource | null> {
    try {
      // For ALGO, use CoinGecko
      if (assetId === 0) {
        const price = await this.getAlgoUSDPrice();
        return {
          source: 'CoinGecko',
          price,
          timestamp: Date.now() / 1000,
          confidence: 0.9,
        };
      }

      // For known ASAs, map to CoinGecko IDs
      const coinGeckoMap: Record<number, string> = {
        31566704: 'usd-coin', // USDC mainnet
        312769: 'tether', // USDT mainnet
        10458941: 'usd-coin', // USDC testnet
      };

      const coinId = coinGeckoMap[assetId];
      if (!coinId) return null;

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const price = data[coinId]?.usd;

      if (!price) return null;

      return {
        source: 'CoinGecko',
        price,
        timestamp: Date.now() / 1000,
        confidence: 0.9,
      };
    } catch (error) {
      console.debug(`External price fetch failed for asset ${assetId}:`, error);
      return null;
    }
  }

  /**
   * Get ALGO/USD price from CoinGecko
   */
  private async getAlgoUSDPrice(): Promise<number> {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=algorand&vs_currencies=usd',
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) {
        console.warn('CoinGecko API failed, using fallback ALGO price');
        return 0.20; // Fallback
      }

      const data = await response.json();
      return data.algorand?.usd || 0.20;
    } catch (error) {
      console.warn('CoinGecko API failed, using fallback ALGO price');
      return 0.20; // Fallback
    }
  }

  /**
   * Get pool reserves directly from Algorand Indexer
   * This reads on-chain state for maximum accuracy
   */
  async getPoolReservesFromIndexer(
    poolAddress: string
  ): Promise<PoolReserves | null> {
    try {
      // Look up pool account
      const accountInfo = await this.indexerClient
        .lookupAccountByID(poolAddress)
        .do();

      if (!accountInfo || !accountInfo.account) {
        return null;
      }

      const account = accountInfo.account;
      const assets = account.assets || [];

      // Pool should have exactly 2 assets (for constant product AMM)
      if (assets.length < 2) {
        return null;
      }

      // Get the two main assets (excluding liquidity token)
      const asset1 = assets[0];
      const asset2 = assets[1];

      const reserves: PoolReserves = {
        reserve1: BigInt(asset1.amount || 0),
        reserve2: BigInt(asset2.amount || 0),
        asset1Id: Number(asset1.assetId),
        asset2Id: Number(asset2.assetId),
        liquidity: BigInt(account.amount || 0), // ALGO balance
      };

      return reserves;
    } catch (error) {
      console.error(`Error fetching pool reserves from indexer:`, error);
      return null;
    }
  }

  /**
   * Get asset symbol from indexer
   */
  private async getAssetSymbol(assetId: number): Promise<string> {
    if (assetId === 0) return 'ALGO';

    try {
      const response = await this.indexerClient.lookupAssetByID(assetId).do();
      return response.asset.params.unitName || `ASA-${assetId}`;
    } catch (error) {
      return `ASA-${assetId}`;
    }
  }

  /**
   * Get detailed price information with all sources
   */
  async getPriceDetails(assetId: number): Promise<AssetPrice | null> {
    await this.getAssetPrice(assetId);
    return this.priceCache.get(assetId) || null;
  }

  /**
   * Get prices for multiple assets
   */
  async getBulkPrices(assetIds: number[]): Promise<Map<number, number>> {
    const prices = new Map<number, number>();
    
    const results = await Promise.allSettled(
      assetIds.map(id => this.getAssetPrice(id))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        prices.set(assetIds[index], result.value);
      }
    });

    return prices;
  }

  /**
   * Check if price is stale
   */
  isPriceStale(assetId: number): boolean {
    const cached = this.priceCache.get(assetId);
    if (!cached) return true;

    const now = Date.now() / 1000;
    return now - cached.lastUpdate > this.cacheTtl;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    assets: number[];
    oldestUpdate: number;
  } {
    const assets = Array.from(this.priceCache.keys());
    const oldestUpdate = Math.min(
      ...Array.from(this.priceCache.values()).map(p => p.lastUpdate)
    );

    return {
      size: this.priceCache.size,
      assets,
      oldestUpdate,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.priceCache.clear();
  }

  /**
   * Clear specific asset from cache
   */
  clearAssetCache(assetId: number) {
    this.priceCache.delete(assetId);
  }

  /**
   * Refresh price for specific asset
   */
  async refreshPrice(assetId: number): Promise<number> {
    this.clearAssetCache(assetId);
    return this.getAssetPrice(assetId);
  }
}

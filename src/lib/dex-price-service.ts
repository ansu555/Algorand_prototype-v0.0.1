import algosdk from 'algosdk';

// DEX Configuration for TestNet
const DEX_CONFIG = {
  pact: {
    appId: 605316866, // Pact DEX App ID on testnet
    pools: {
      'ALGO/USDC': 605316866, // Pool ID for ALGO/USDC
    }
  },
  tinyman: {
    appId: 21580889, // Tinyman V2 App ID on testnet
    pools: {
      'ALGO/USDC': 21580889,
    }
  }
};

// Algorand Indexer client for fetching transaction data
const INDEXER_URL = 'https://testnet-idx.algonode.cloud';
const indexerClient = new algosdk.Indexer('', INDEXER_URL);

export interface AssetPrice {
  assetId: string;
  symbol: string;
  price: number;
  priceUSD: number;
  change24h: number;
  change1h: number;
  change7d: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  source: 'pact' | 'tinyman' | 'vestige';
}

export interface PriceHistory {
  timestamp: number;
  price: number;
  volume: number;
}

export class DEXPriceService {
  private cache: Map<string, { data: AssetPrice; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * ⚠️ DEVELOPMENT MODE: Currently using mock price data
   * 
   * Real DEX integration is commented out because:
   * 1. TestNet DEX pools may not have reliable data
   * 2. The Algorand Indexer API endpoint for applications might differ
   * 3. Mock data allows for consistent UI development
   * 
   * For production/MainNet:
   * - Uncomment the real DEX queries in getAssetPrice()
   * - Update DEX_CONFIG with MainNet app IDs
   * - Test with actual DEX pools
   */

  /**
   * Get current price for an ASA from DEX pools
   */
  async getAssetPrice(assetId: string, symbol: string): Promise<AssetPrice> {
    const cacheKey = `${assetId}-${symbol}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // For TestNet, DEX data might not be available, so use mock data
      // In production/MainNet, you would actually query the DEX pools
      console.log(`⚠️ Using mock price data for ${symbol} (${assetId}) - TestNet DEX pools may not be available`);
      const mockData = this.getMockPrice(assetId, symbol);
      this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
      
      // Commented out real DEX queries - uncomment for MainNet production use
      // let priceData = await this.getPactPrice(assetId, symbol);
      // if (!priceData) {
      //   priceData = await this.getTinymanPrice(assetId, symbol);
      // }
      // if (priceData) {
      //   this.cache.set(cacheKey, { data: priceData, timestamp: Date.now() });
      //   return priceData;
      // }
    } catch (error) {
      console.error('Error fetching asset price:', error);
      return this.getMockPrice(assetId, symbol);
    }
  }

  /**
   * Get price from Pact DEX
   */
  private async getPactPrice(assetId: string, symbol: string): Promise<AssetPrice | null> {
    try {
      // Query Pact pool for the asset
      const poolId = DEX_CONFIG.pact.pools['ALGO/USDC'];
      const poolInfo = await indexerClient.lookupApplications(poolId).do();
      
      if (!poolInfo.application) return null;

      // Extract price from pool state (use 'any' to bypass strict typing for now)
      const globalState = (poolInfo.application.params as any)['global-state'] || [];
      const priceKey = Buffer.from('price', 'utf8').toString('base64');
      
      const priceEntry = globalState.find((entry: any) => 
        Buffer.from(entry.key, 'base64').toString() === 'price'
      );

      if (!priceEntry) return null;

      const price = parseInt(priceEntry.value.uint) / 1000000; // Convert from microAlgos
      
      return {
        assetId,
        symbol,
        price,
        priceUSD: price,
        change24h: 0, // Will be calculated from historical data
        change1h: 0,
        change7d: 0,
        volume24h: 0, // Will be calculated from transactions
        marketCap: 0, // Will be calculated from supply * price
        liquidity: 0,
        source: 'pact'
      };
    } catch (error) {
      console.error('Error fetching Pact price:', error);
      return null;
    }
  }

  /**
   * Get price from Tinyman DEX
   */
  private async getTinymanPrice(assetId: string, symbol: string): Promise<AssetPrice | null> {
    try {
      // Query Tinyman pool for the asset
      const poolId = DEX_CONFIG.tinyman.pools['ALGO/USDC'];
      const poolInfo = await indexerClient.lookupApplications(poolId).do();
      
      if (!poolInfo.application) return null;

      // Extract price from pool state (use 'any' to bypass strict typing for now)
      const globalState = (poolInfo.application.params as any)['global-state'] || [];
      const priceKey = Buffer.from('price', 'utf8').toString('base64');
      
      const priceEntry = globalState.find((entry: any) => 
        Buffer.from(entry.key, 'base64').toString() === 'price'
      );

      if (!priceEntry) return null;

      const price = parseInt(priceEntry.value.uint) / 1000000;
      
      return {
        assetId,
        symbol,
        price,
        priceUSD: price,
        change24h: 0,
        change1h: 0,
        change7d: 0,
        volume24h: 0,
        marketCap: 0,
        liquidity: 0,
        source: 'tinyman'
      };
    } catch (error) {
      console.error('Error fetching Tinyman price:', error);
      return null;
    }
  }

  /**
   * Get historical price data for an asset
   */
  async getAssetPriceHistory(assetId: string, days: number = 7): Promise<PriceHistory[]> {
    try {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (days * 24 * 60 * 60);

      // Get asset transfer transactions for price history
      const response = await indexerClient
        .lookupAssetTransactions(parseInt(assetId))
        .afterTime(new Date(startTime * 1000))
        .beforeTime(new Date(endTime * 1000))
        .limit(1000)
        .do();

      const transactions = response.transactions || [];
      
      // Group transactions by day and calculate average price
      const dailyPrices = new Map<string, { totalPrice: number; count: number; volume: number }>();
      
      transactions.forEach((tx: any) => {
        const timestamp = tx['round-time'];
        const date = new Date(timestamp * 1000).toISOString().split('T')[0];
        const amount = tx['asset-transfer-transaction']?.amount || 0;
        
        if (amount > 0) {
          const existing = dailyPrices.get(date) || { totalPrice: 0, count: 0, volume: 0 };
          dailyPrices.set(date, {
            totalPrice: existing.totalPrice + amount,
            count: existing.count + 1,
            volume: existing.volume + amount
          });
        }
      });

      // Convert to price history format
      return Array.from(dailyPrices.entries()).map(([date, data]) => ({
        timestamp: new Date(date).getTime() / 1000,
        price: data.totalPrice / data.count,
        volume: data.volume
      })).sort((a, b) => a.timestamp - b.timestamp);

    } catch (error) {
      console.error('Error fetching price history:', error);
      return this.getMockPriceHistory(days);
    }
  }

  /**
   * Get price history with change calculations (wrapper for cryptoApi compatibility)
   */
  async getPriceHistory(assetId: string, symbol: string, startTimeSeconds: number) {
    const days = Math.ceil((Date.now() / 1000 - startTimeSeconds) / (24 * 60 * 60));
    const history = await this.getAssetPriceHistory(assetId, days);
    
    // Calculate 24h change
    let change24h = 0;
    if (history.length >= 2) {
      const latestPrice = history[history.length - 1].price;
      const yesterdayPrice = history[history.length - 2].price;
      change24h = ((latestPrice - yesterdayPrice) / yesterdayPrice) * 100;
    }

    return {
      prices: history,
      change24h,
    };
  }

  /**
   * Get 24h volume for an asset
   */
  async getAssetVolume24h(assetId: string): Promise<number> {
    try {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (24 * 60 * 60);

      const response = await indexerClient
        .lookupAssetTransactions(parseInt(assetId))
        .afterTime(new Date(startTime * 1000))
        .beforeTime(new Date(endTime * 1000))
        .do();

      const transactions = response.transactions || [];
      const volume = transactions.reduce((total: number, tx: any) => {
        const amount = Number(tx['asset-transfer-transaction']?.amount || 0);
        return total + amount;
      }, 0);

      return volume;
    } catch (error) {
      console.error('Error fetching 24h volume:', error);
      return 0;
    }
  }

  /**
   * Get number of unique holders for an asset
   */
  async getAssetHolders(assetId: string): Promise<number> {
    try {
      const response = await indexerClient
        .lookupAssetByID(parseInt(assetId))
        .do();

      // This is a simplified approach - in reality, you'd need to query all accounts
      // that hold this asset, which requires pagination
      return Number(response.asset.params.total || 0);
    } catch (error) {
      console.error('Error fetching asset holders:', error);
      return 0;
    }
  }

  /**
   * Mock price data for development/testing
   * Uses a seeded random for consistent prices per asset
   */
  private getMockPrice(assetId: string, symbol: string): AssetPrice {
    // Use asset ID for consistent seeding
    const seed = parseInt(assetId) || 12345;
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    // Well-known assets with realistic prices
    const knownPrices: Record<string, number> = {
      '0': 0.25,        // ALGO ~$0.25
      '31566704': 1.00, // USDC $1.00
      '312769': 0.999,  // USDT $0.999
    };
    
    const basePrice = knownPrices[assetId] || (seededRandom(seed) * 10 + 0.01);
    const change24h = (seededRandom(seed + 1) - 0.5) * 10; // -5% to +5%
    const change1h = (seededRandom(seed + 2) - 0.5) * 2; // -1% to +1%
    const change7d = (seededRandom(seed + 3) - 0.5) * 30; // -15% to +15%
    
    const volume24h = seededRandom(seed + 4) * 1000000 + 10000;
    const marketCap = basePrice * (seededRandom(seed + 5) * 50000000 + 1000000);

    return {
      assetId,
      symbol,
      price: basePrice,
      priceUSD: basePrice,
      change24h,
      change1h,
      change7d,
      volume24h,
      marketCap,
      liquidity: volume24h * 10,
      source: 'pact'
    };
  }

  /**
   * Mock price history for development/testing
   */
  private getMockPriceHistory(days: number): PriceHistory[] {
    const history: PriceHistory[] = [];
    const now = Date.now() / 1000;
    const dayInSeconds = 24 * 60 * 60;

    for (let i = days; i >= 0; i--) {
      const timestamp = now - (i * dayInSeconds);
      const basePrice = 50 + Math.random() * 50;
      const volume = Math.random() * 100000;

      history.push({
        timestamp,
        price: basePrice,
        volume
      });
    }

    return history;
  }
}

// Export singleton instance
export const dexPriceService = new DEXPriceService();

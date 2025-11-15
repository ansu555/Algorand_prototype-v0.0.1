/**
 * Dynamic Asset Discovery Service
 * Automatically discovers all available assets from DEX pools
 */

import algosdk from 'algosdk';

export interface AssetInfo {
  id: number;
  name: string;
  unitName: string;
  decimals: number;
  total: number;
  creator: string;
  url?: string;
  verified?: boolean;
  hasPools?: boolean;
  logoUrl?: string;
  poolCount?: number;
  dexSources?: string[];
}

export class AssetDiscoveryService {
  private indexerClient: algosdk.Indexer;
  private assetsCache: Map<number, AssetInfo> = new Map();
  private lastUpdate: number = 0;
  private cacheDuration: number = 3600; // 1 hour
  private network: 'mainnet' | 'testnet';

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.network = network;
    const indexerUrl = network === 'mainnet'
      ? 'https://mainnet-idx.algonode.cloud'
      : 'https://testnet-idx.algonode.cloud';
    
    this.indexerClient = new algosdk.Indexer('', indexerUrl, 443);
  }

  /**
   * Discover all tradeable assets from DEX pools
   */
  async discoverTradeableAssets(): Promise<AssetInfo[]> {
    const currentTime = Date.now() / 1000;

    // Check cache
    if (this.assetsCache.size > 0 && currentTime - this.lastUpdate < this.cacheDuration) {
      console.log(`Returning cached assets (${this.assetsCache.size} assets)`);
      return Array.from(this.assetsCache.values());
    }

    try {
      console.log('🔍 Discovering tradeable assets from DEX pools...');

      // Track assets with pool count and DEX sources
      const assetData = new Map<number, { poolCount: number; dexSources: Set<string> }>();
      assetData.set(0, { poolCount: 0, dexSources: new Set(['native']) }); // Always include ALGO

      // Add verified testnet assets by default (for pool creation)
      if (this.network === 'testnet') {
        const defaultTestnetAssets = [
          31566704, // USDC testnet
          67395862, // USDC testnet (primary)
          10458941, // USDC testnet (secondary)
          67396430, // USDt testnet
          70283957, // ALGF testnet
        ];
        defaultTestnetAssets.forEach(assetId => {
          if (!assetData.has(assetId)) {
            assetData.set(assetId, { poolCount: 0, dexSources: new Set(['verified']) });
          }
        });
      }

      // Discover assets from Tinyman pools
      const tinymanAssets = await this.discoverTinymanAssets();
      tinymanAssets.forEach(({ assetId, poolCount }) => {
        const existing = assetData.get(assetId) || { poolCount: 0, dexSources: new Set<string>() };
        existing.poolCount += poolCount;
        existing.dexSources.add('Tinyman');
        assetData.set(assetId, existing);
      });

      // Discover assets from Pact pools - COMMENTED OUT (Only using Tinyman)
      // const pactAssets = await this.discoverPactAssets();
      // pactAssets.forEach(({ assetId, poolCount }) => {
      //   const existing = assetData.get(assetId) || { poolCount: 0, dexSources: new Set<string>() };
      //   existing.poolCount += poolCount;
      //   existing.dexSources.add('Pact');
      //   assetData.set(assetId, existing);
      // });

      // Fetch detailed info for all discovered assets
      const assets: AssetInfo[] = [];

      for (const [assetId, data] of assetData) {
        const assetInfo = await this.getAssetInfo(assetId);
        if (assetInfo) {
          // Add pool count and DEX sources
          assetInfo.poolCount = data.poolCount;
          assetInfo.dexSources = Array.from(data.dexSources);
          
          assets.push(assetInfo);
          this.assetsCache.set(assetId, assetInfo);
        }
      }

      this.lastUpdate = currentTime;
      console.log(`✅ Discovered ${assets.length} tradeable assets`);

      return assets.sort((a, b) => {
        // Sort: verified first, then by pool count, then by name
        if (a.verified && !b.verified) return -1;
        if (!a.verified && b.verified) return 1;
        
        // For same token names, prioritize the one with more pools
        if (a.unitName === b.unitName) {
          return (b.poolCount || 0) - (a.poolCount || 0);
        }
        
        return a.unitName.localeCompare(b.unitName);
      });
    } catch (error) {
      console.error(`Error discovering assets:`, error);
      return Array.from(this.assetsCache.values());
    }
  }

  /**
   * Discover assets from Tinyman pools via Analytics API
   */
  private async discoverTinymanAssets(): Promise<Array<{ assetId: number; poolCount: number }>> {
    const assetPoolCounts = new Map<number, number>();

    try {
      const apiUrl = this.network === 'mainnet'
        ? 'https://mainnet.analytics.tinyman.org/api/v1'
        : 'https://testnet.analytics.tinyman.org/api/v1';

      const response = await fetch(`${apiUrl}/pools/`);
      
      if (!response.ok) {
        throw new Error(`Tinyman API error: ${response.status}`);
      }

      const data = await response.json();
      const pools = data.results || [];

      for (const pool of pools) {
        const asset1Id = parseInt(pool.asset_1?.id || '0');
        const asset2Id = parseInt(pool.asset_2?.id || '0');

        if (asset1Id && asset1Id !== 0) {
          assetPoolCounts.set(asset1Id, (assetPoolCounts.get(asset1Id) || 0) + 1);
        }
        if (asset2Id && asset2Id !== 0) {
          assetPoolCounts.set(asset2Id, (assetPoolCounts.get(asset2Id) || 0) + 1);
        }
      }

      console.log(`  ✅ Tinyman: Found ${assetPoolCounts.size} unique assets in ${pools.length} pools`);
    } catch (error) {
      console.warn(`  ⚠️ Tinyman asset discovery failed:`, error);
    }

    return Array.from(assetPoolCounts.entries()).map(([assetId, poolCount]) => ({
      assetId,
      poolCount
    }));
  }

  /**
   * Discover assets from Pact pools
   */
  private async discoverPactAssets(): Promise<Array<{ assetId: number; poolCount: number }>> {
    const assetPoolCounts = new Map<number, number>();

    try {
      // Pact Finance only operates on mainnet
      if (this.network === 'testnet') {
        console.log(`  ℹ️  Pact: Skipping (only available on mainnet)`);
        return [];
      }

      const response = await fetch('https://api.pact.fi/api/pools?limit=5000');
      
      if (!response.ok) {
        throw new Error(`Pact API error: ${response.status}`);
      }

      const data = await response.json();
      const pools = data.results || [];

      for (const pool of pools) {
        if (pool.is_deprecated) continue;

        const asset1Id = parseInt(pool.primary_asset?.on_chain_id || '0');
        const asset2Id = parseInt(pool.secondary_asset?.on_chain_id || '0');

        if (asset1Id && asset1Id !== 0) {
          assetPoolCounts.set(asset1Id, (assetPoolCounts.get(asset1Id) || 0) + 1);
        }
        if (asset2Id && asset2Id !== 0) {
          assetPoolCounts.set(asset2Id, (assetPoolCounts.get(asset2Id) || 0) + 1);
        }
      }

      console.log(`  ✅ Pact: Found ${assetPoolCounts.size} unique assets in ${pools.length} pools`);
    } catch (error) {
      console.warn(`  ⚠️ Pact asset discovery failed:`, error);
    }

    return Array.from(assetPoolCounts.entries()).map(([assetId, poolCount]) => ({
      assetId,
      poolCount
    }));
  }

  /**
   * Get detailed asset information
   */
  async getAssetInfo(assetId: number): Promise<AssetInfo | null> {
    // Check cache
    if (this.assetsCache.has(assetId)) {
      return this.assetsCache.get(assetId)!;
    }

    try {
      if (assetId === 0) {
        // ALGO special case
        return {
          id: 0,
          name: 'Algorand',
          unitName: 'ALGO',
          decimals: 6,
          total: 10_000_000_000_000_000,
          creator: '',
          verified: true,
          hasPools: true,
          logoUrl: 'https://algorand-wallet-mainnet.b-cdn.net/media/asset_verification_requests_logo_png/2023/01/17/9368b001c1fe4af88eadd08476152c57.png'
        };
      }

      const response = await this.indexerClient.lookupAssetByID(assetId).do();
      const params = response.asset.params;

      const assetInfo: AssetInfo = {
        id: assetId,
        name: params.name || `Asset ${assetId}`,
        unitName: params.unitName || `ASA-${assetId}`,
        decimals: params.decimals || 0,
        total: Number(params.total || 0),
        creator: params.creator,
        url: params.url,
        verified: this.isVerifiedAsset(assetId),
        hasPools: true,
        logoUrl: this.getAssetLogoUrl(assetId)
      };

      this.assetsCache.set(assetId, assetInfo);
      return assetInfo;
    } catch (error) {
      console.error(`Error fetching asset ${assetId}:`, error);
      return null;
    }
  }

  /**
   * Check if asset is verified
   */
  private isVerifiedAsset(assetId: number): boolean {
    // Known verified testnet assets
    const verifiedTestnetAssets = [
      0, // ALGO
      31566704, // USDC testnet (default in UI)
      67395862, // USDC testnet (primary - has most pools)
      10458941, // USDC testnet (secondary)
      67396430, // USDt testnet
      70283957, // ALGF testnet
    ];

    // Known verified mainnet assets
    const verifiedMainnetAssets = [
      0, // ALGO
      31566704, // USDC
      312769, // USDT
      1058926737, // WBTC
      887406851, // WETH
    ];

    const verifiedAssets = this.network === 'mainnet' 
      ? verifiedMainnetAssets 
      : verifiedTestnetAssets;

    return verifiedAssets.includes(assetId);
  }

  /**
   * Get asset logo URL (placeholder - can integrate with asset verification service)
   */
  private getAssetLogoUrl(assetId: number): string {
    // Common asset logos
    const logos: Record<number, string> = {
      0: 'https://algorand-wallet-mainnet.b-cdn.net/media/asset_verification_requests_logo_png/2023/01/17/9368b001c1fe4af88eadd08476152c57.png',
      31566704: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
      67395862: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
      10458941: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
      67396430: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
      312769: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
    };

    return logos[assetId] || `https://vestige.fi/asset-logo/${assetId}`;
  }

  /**
   * Search assets by name (for UI autocomplete)
   */
  async searchAssetsByName(query: string, limit: number = 20): Promise<AssetInfo[]> {
    try {
      const response = await this.indexerClient
        .searchForAssets()
        .name(query)
        .limit(limit)
        .do();

      const assets: AssetInfo[] = [];

      for (const asset of response.assets) {
        const params = asset.params;
        const assetId = Number(asset.index);

        assets.push({
          id: assetId,
          name: params.name || '',
          unitName: params.unitName || '',
          decimals: params.decimals || 0,
          total: Number(params.total || 0),
          creator: params.creator,
          url: params.url,
          verified: this.isVerifiedAsset(assetId),
          logoUrl: this.getAssetLogoUrl(assetId)
        });
      }

      return assets;
    } catch (error) {
      console.error(`Error searching assets:`, error);
      return [];
    }
  }

  /**
   * Get assets by account (for wallet balances)
   */
  async getAccountAssets(address: string): Promise<AssetInfo[]> {
    try {
      const response = await this.indexerClient.lookupAccountByID(address).do();

      const holdings = response.account.assets || [];
      const assets: AssetInfo[] = [];

      // Add ALGO
      if (response.account.amount > 0) {
        const algoInfo = await this.getAssetInfo(0);
        if (algoInfo) {
          assets.push(algoInfo);
        }
      }

      // Add ASAs
      for (const holding of holdings) {
        if (holding.amount > 0) {
          const assetInfo = await this.getAssetInfo(Number(holding.assetId));
          if (assetInfo) {
            assets.push(assetInfo);
          }
        }
      }

      return assets;
    } catch (error) {
      console.error(`Error fetching account assets:`, error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.assetsCache.clear();
    this.lastUpdate = 0;
    console.log('Asset cache cleared');
  }
}

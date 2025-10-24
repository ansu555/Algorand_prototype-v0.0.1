import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Algorand Indexer API configuration
const ALGORAND_INDEXER_URL = 'https://testnet-idx.algonode.cloud';

export const algorandApi = createApi({
  reducerPath: 'algorandApi',
  baseQuery: fetchBaseQuery({
    baseUrl: ALGORAND_INDEXER_URL,
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Asset', 'AssetDetails', 'AssetHistory', 'AssetStats'],
  endpoints: (builder) => ({
    // Get all ASAs with basic information
    getAssets: builder.query({
      query: ({ limit = 100, next = '' }: { limit?: number; next?: string } = {}) => {
        const params = new URLSearchParams({
          limit: limit.toString(),
          ...(next && { next }),
        });
        return `/v2/assets?${params.toString()}`;
      },
      transformResponse: (response: any) => {
        return {
          assets: response.assets.map((asset: any) => ({
            id: asset.index.toString(),
            name: asset.params.name || 'Unnamed Asset',
            symbol: asset.params.unit_name || 'UNKNOWN',
            decimals: asset.params.decimals,
            totalSupply: asset.params.total,
            creator: asset.params.creator,
            manager: asset.params.manager,
            reserve: asset.params.reserve,
            freeze: asset.params.freeze,
            clawback: asset.params.clawback,
            defaultFrozen: asset.params.default_frozen,
            url: asset.params.url,
            createdAt: asset.created_at,
            destroyed: asset.deleted,
            // For compatibility with existing components
            rank: 0, // Will be calculated based on market cap
            price: '0', // Will be fetched from DEX
            change: '0',
            change1h: '0',
            change7d: '0',
            marketCap: '0',
            '24hVolume': '0',
            supply: {
              circulating: asset.params.total?.toString() || '0',
              total: asset.params.total?.toString() || '0',
              max: asset.params.total?.toString() || '0'
            }
          })),
          nextToken: response['next-token'] || null,
          currentRound: response['current-round']
        };
      },
      providesTags: ['Asset'],
    }),

    // Get detailed information about a specific ASA
    getAssetDetails: builder.query({
      query: (assetId: string) => `/v2/assets/${assetId}`,
      transformResponse: (response: any) => {
        const asset = response.asset;
        return {
          id: asset.index.toString(),
          name: asset.params.name || 'Unnamed Asset',
          symbol: asset.params.unit_name || 'UNKNOWN',
          decimals: asset.params.decimals,
          totalSupply: asset.params.total,
          creator: asset.params.creator,
          manager: asset.params.manager,
          reserve: asset.params.reserve,
          freeze: asset.params.freeze,
          clawback: asset.params.clawback,
          defaultFrozen: asset.params.default_frozen,
          url: asset.params.url,
          createdAt: asset.created_at,
          destroyed: asset.deleted,
          // For compatibility with existing components
          price: '0', // Will be fetched from DEX
          change: '0',
          change1h: '0',
          change7d: '0',
          marketCap: '0',
          '24hVolume': '0',
          supply: {
            circulating: asset.params.total?.toString() || '0',
            total: asset.params.total?.toString() || '0',
            max: asset.params.total?.toString() || '0'
          }
        };
      },
      providesTags: (result, error, assetId) => [{ type: 'AssetDetails', id: assetId }],
    }),

    // Get asset transactions for price history
    getAssetHistory: builder.query({
      query: ({ assetId, limit = 100, afterTime, beforeTime }: { assetId: string; limit?: number; afterTime?: string; beforeTime?: string } = {} as any) => {
        const params = new URLSearchParams({
          'asset-id': assetId,
          limit: limit.toString(),
          ...(afterTime && { 'after-time': afterTime }),
          ...(beforeTime && { 'before-time': beforeTime }),
        });
        return `/v2/transactions?${params.toString()}`;
      },
      transformResponse: (response: any) => {
        // Filter for asset transfer transactions and extract price data
        const transactions = response.transactions
          .filter((tx: any) => tx['asset-transfer-transaction']?.['asset-id']?.toString() === response.transactions[0]?.['asset-transfer-transaction']?.['asset-id']?.toString())
          .map((tx: any) => ({
            timestamp: tx['round-time'],
            price: '0', // Will be calculated from DEX data
            amount: tx['asset-transfer-transaction']?.amount || 0,
            type: tx['tx-type'],
            sender: tx.sender,
            receiver: tx['asset-transfer-transaction']?.receiver
          }));

        return {
          history: transactions,
          currentRound: response['current-round']
        };
      },
      providesTags: (result, error, arg) => [{ type: 'AssetHistory', id: arg?.assetId }],
    }),

    // Get asset statistics (holders, volume, etc.)
    getAssetStats: builder.query({
      query: (assetId: string) => `/v2/assets/${assetId}`,
      transformResponse: async (response: any) => {
        // This will be enhanced with DEX data integration
        const asset = response.asset;
        return {
          assetId: asset.index.toString(),
          totalSupply: asset.params.total,
          decimals: asset.params.decimals,
          holders: 0, // Will be calculated from account data
          volume24h: '0', // Will be calculated from DEX transactions
          marketCap: '0', // Will be calculated from price * supply
          price: '0', // Will be fetched from DEX
          change24h: '0',
          change1h: '0',
          change7d: '0'
        };
      },
      providesTags: (result, error, assetId) => [{ type: 'AssetStats', id: assetId }],
    }),

    // Get global Algorand network statistics
    getNetworkStats: builder.query({
      query: () => '/v2/status',
      transformResponse: (response: any) => {
        return {
          totalAssets: 0, // Will be calculated from asset count
          totalMarketCap: '0', // Will be calculated from all ASA market caps
          total24hVolume: '0', // Will be calculated from all ASA volumes
          networkStatus: response.status,
          lastRound: response['last-round'],
          timeSinceLastRound: response['time-since-last-round']
        };
      },
      providesTags: ['AssetStats'],
    }),
  }),
});

export const {
  useGetAssetsQuery,
  useGetAssetDetailsQuery,
  useGetAssetHistoryQuery,
  useGetAssetStatsQuery,
  useGetNetworkStatsQuery,
} = algorandApi;

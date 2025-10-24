import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { DEXPriceService } from '@/lib/dex-price-service'

// Use Algorand Indexer for ASA data instead of CoinGecko
const ALGORAND_INDEXER_URL = process.env.NEXT_PUBLIC_ALGORAND_INDEXER_URL || 'https://testnet-idx.algonode.cloud'
const dexPriceService = new DEXPriceService()

// Well-known Algorand ASAs (you can expand this list)
const KNOWN_ASSETS = [
  { id: '0', symbol: 'ALGO', name: 'Algorand' },
  { id: '31566704', symbol: 'USDC', name: 'USD Coin' },
  { id: '312769', symbol: 'USDT', name: 'Tether USDt' },
  // Add more verified ASAs here
]

export const cryptoApi = createApi({
  reducerPath: 'cryptoApi',
  baseQuery: fetchBaseQuery({
    baseUrl: ALGORAND_INDEXER_URL,
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json')
      return headers
    },
  }),
  tagTypes: ['Assets', 'AssetDetails', 'AssetHistory', 'Stats'],
  endpoints: (builder) => ({
    // Get Algorand Standard Assets with market data
    getCryptos: builder.query<any, number | void>({
      query: (count = 50) => `/v2/assets?limit=${count}`,
      transformResponse: async (response: any, meta, count = 50) => {
        const assets = response.assets || []
        
        // Filter out assets without proper names or symbols
        const validAssets = assets.filter((asset: any) => 
          asset.params?.name && 
          asset.params?.['unit-name'] && 
          !asset.deleted &&
          asset.params?.total > 0
        )

        // Enrich with DEX price data
        const enrichedAssets = await Promise.all(
          validAssets.slice(0, count as number).map(async (asset: any, index: number) => {
            const assetId = asset.index.toString()
            const symbol = asset.params['unit-name'] || 'UNKNOWN'
            const name = asset.params.name || 'Unnamed Asset'
            
            try {
              // Fetch price from DEX (currently using mock data for TestNet)
              const priceData = await dexPriceService.getAssetPrice(assetId, symbol)
              
              return {
                uuid: assetId,
                id: assetId,
                rank: index + 1,
                symbol: symbol,
                name: name,
                price: priceData.priceUSD.toFixed(6),
                change: priceData.change24h.toFixed(2),
                change1h: priceData.change1h.toFixed(2),
                change7d: priceData.change7d.toFixed(2),
                marketCap: priceData.marketCap.toFixed(0),
                '24hVolume': priceData.volume24h.toFixed(0),
                iconUrl: asset.params.url || '',
                supply: {
                  circulating: asset.params.total?.toString() || '0',
                  total: asset.params.total?.toString() || '0',
                  max: asset.params.total?.toString() || '0'
                },
                decimals: asset.params.decimals || 0,
                creator: asset.params.creator,
                // Additional Algorand-specific fields
                isVerified: KNOWN_ASSETS.some(ka => ka.id === assetId),
                isAlgorandASA: true,
              }
            } catch (error) {
              console.error(`Error enriching asset ${assetId}:`, error)
              // Return basic asset data without price info
              return {
                uuid: assetId,
                id: assetId,
                rank: index + 1,
                symbol: symbol,
                name: name,
                price: '0',
                change: '0',
                change1h: '0',
                change7d: '0',
                marketCap: '0',
                '24hVolume': '0',
                iconUrl: asset.params.url || '',
                supply: {
                  circulating: asset.params.total?.toString() || '0',
                  total: asset.params.total?.toString() || '0',
                  max: asset.params.total?.toString() || '0'
                },
                decimals: asset.params.decimals || 0,
                creator: asset.params.creator,
                isVerified: KNOWN_ASSETS.some(ka => ka.id === assetId),
                isAlgorandASA: true,
              }
            }
          })
        )

        return {
          coins: enrichedAssets,
          stats: {
            total: response['current-round'],
            totalAssets: enrichedAssets.length,
          }
        }
      },
      providesTags: ['Assets'],
    }),

    // Get overall Algorand network statistics
    getStats: builder.query<any, void>({
      query: () => '/health',
      transformResponse: async (response: any) => {
        // Fetch overall stats from indexer
        try {
          return {
            totalCoins: response.round || 0,
            totalMarketCap: '0', // Will be calculated from all assets
            total24hVolume: '0',
            totalExchanges: 3, // Pact, Tinyman, Vestige
            totalMarkets: 100,
            btcDominance: 0,
          }
        } catch (error) {
          console.error('Error fetching stats:', error)
          return {
            totalCoins: 0,
            totalMarketCap: '0',
            total24hVolume: '0',
            totalExchanges: 3,
            totalMarkets: 100,
            btcDominance: 0,
          }
        }
      },
      providesTags: ['Stats'],
    }),

    // Get detailed information about a specific ASA
    getCryptoDetails: builder.query<any, string>({
      query: (assetId) => `/v2/assets/${assetId}`,
      transformResponse: async (response: any) => {
        const asset = response.asset
        const assetId = asset.index.toString()
        const symbol = asset.params['unit-name'] || 'UNKNOWN'
        const name = asset.params.name || 'Unnamed Asset'

        try {
          // Fetch price from DEX (currently using mock data for TestNet)
          const priceData = await dexPriceService.getAssetPrice(assetId, symbol)
          
          return {
            uuid: assetId,
            id: assetId,
            symbol: symbol,
            name: name,
            description: `Algorand Standard Asset (ASA) on Algorand blockchain. Asset ID: ${assetId}`,
            price: priceData.priceUSD.toFixed(6),
            marketCap: priceData.marketCap.toFixed(0),
            '24hVolume': priceData.volume24h.toFixed(0),
            change: priceData.change24h.toFixed(2),
            supply: {
              circulating: asset.params.total?.toString() || '0',
              total: asset.params.total?.toString() || '0',
              max: asset.params.total?.toString() || '0'
            },
            numberOfMarkets: 3, // Algorand DEXes
            numberOfExchanges: 3, // Pact, Tinyman, Vestige
            websiteUrl: asset.params.url || '',
            links: {
              website: asset.params.url ? [asset.params.url] : [],
              explorer: [`https://testnet.algoexplorer.io/asset/${assetId}`],
            },
            // Algorand-specific fields
            decimals: asset.params.decimals || 0,
            creator: asset.params.creator,
            manager: asset.params.manager,
            reserve: asset.params.reserve,
            freeze: asset.params.freeze,
            clawback: asset.params.clawback,
            defaultFrozen: asset.params['default-frozen'] || false,
            isVerified: KNOWN_ASSETS.some(ka => ka.id === assetId),
            isAlgorandASA: true,
          }
        } catch (error) {
          console.error(`Error fetching details for ${assetId}:`, error)
          throw error
        }
      },
      providesTags: (result, error, assetId) => [{ type: 'AssetDetails' as const, id: assetId }],
    }),

    // Get price history for an ASA from DEX transactions
    getCryptoHistory: builder.query<any, { coinId: string; timePeriod: string }>({
      query: ({ coinId }) => `/v2/assets/${coinId}/transactions?limit=100`,
      transformResponse: async (response: any, meta, { coinId, timePeriod }) => {
        const transactions = response.transactions || []
        
        // Convert timePeriod to time range
        const now = Date.now()
        const timeRanges: Record<string, number> = {
          '3h': 3 * 60 * 60 * 1000,
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
          '3m': 90 * 24 * 60 * 60 * 1000,
          '1y': 365 * 24 * 60 * 60 * 1000,
          '3y': 3 * 365 * 24 * 60 * 60 * 1000,
          '5y': 5 * 365 * 24 * 60 * 60 * 1000,
        }
        
        const timeRange = timeRanges[timePeriod] || timeRanges['7d']
        const startTime = now - timeRange

        // Fetch price history from DEX service
        try {
          const asset = await fetch(`${ALGORAND_INDEXER_URL}/v2/assets/${coinId}`).then(r => r.json())
          const symbol = asset.asset?.params?.['unit-name'] || 'UNKNOWN'
          
          const history = await dexPriceService.getPriceHistory(coinId, symbol, Math.floor(startTime / 1000))
          
          return {
            change: history.change24h?.toFixed(2) || '0',
            history: history.prices.map((point: any) => ({
              price: point.price.toString(),
              timestamp: point.timestamp,
            }))
          }
        } catch (error) {
          console.error(`Error fetching history for ${coinId}:`, error)
          // Return mock data for development
          return {
            change: '0',
            history: [],
          }
        }
      },
      providesTags: (result, error, { coinId }) => [{ type: 'AssetHistory' as const, id: coinId }],
    }),
  }),
})

export const {
  useGetCryptosQuery,
  useGetStatsQuery,
  useGetCryptoDetailsQuery,
  useGetCryptoHistoryQuery,
} = cryptoApi

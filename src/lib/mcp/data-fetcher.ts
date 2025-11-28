// Multi-Source Crypto Data Fetcher
import { OHLCV, Granularity } from './types'

const COINGECKO_API = 'https://api.coingecko.com/api/v3'
const ALGORAND_INDEXER = process.env.NEXT_PUBLIC_INDEXER_SERVER || 'https://testnet-idx.4160.nodely.dev'

export interface EnhancedMarketData {
  price: number
  priceChange24h: number
  priceChangePercentage24h: number
  marketCap: number
  marketCapRank?: number
  volume24h: number
  circulatingSupply: number
  totalSupply: number
  maxSupply?: number
  ath: number
  athDate: string
  athChangePercentage: number
  atl: number
  atlDate: string
  atlChangePercentage: number
  links: {
    homepage: string[]
    blockchain: string[]
    officialForum: string[]
    twitter?: string
    telegram?: string
    reddit?: string
    github?: string[]
    explorer?: string[]
    exchanges: Array<{ name: string; url: string }>
  }
  description?: string
  lastUpdated: string
}

export interface AlgorandAssetInfo {
  assetId: number
  name: string
  unitName: string
  total: number
  decimals: number
  creator: string
  url?: string
  verified: boolean
  explorerUrl: string
}

/**
 * Fetch historical OHLCV data from CoinGecko
 */
export async function fetchHistoricalData(
  coin: string,
  days: number,
  granularity: Granularity
): Promise<OHLCV[]> {
  try {
    const data = await fetchCoinGeckoData(coin, days)
    
    if (data.length === 0) {
      throw new Error(`No data found for ${coin}`)
    }

    // Apply granularity filtering
    if (granularity === '4h') {
      return data.filter((_, i) => i % 4 === 0)
    } else if (granularity === '1d') {
      return data.filter((_, i) => i % 24 === 0)
    }
    
    return data
  } catch (error: any) {
    throw new Error(`Failed to fetch data for ${coin}: ${error.message}`)
  }
}

/**
 * Fetch data from CoinGecko API
 */
async function fetchCoinGeckoData(coinId: string, days: number): Promise<OHLCV[]> {
  const url = `${COINGECKO_API}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Coin "${coinId}" not found. Try using the CoinGecko ID (e.g., "bitcoin", "ethereum", "algorand")`
      )
    }
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No historical data available for ${coinId}`)
  }

  // Convert CoinGecko format [timestamp, open, high, low, close] to OHLCV
  return data.map((candle: number[]) => ({
    timestamp: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
    volume: 0, // CoinGecko OHLC endpoint doesn't include volume
  }))
}

/**
 * Fetch enhanced market data with links and additional info
 */
export async function fetchEnhancedMarketData(coinId: string): Promise<EnhancedMarketData> {
  const url = `${COINGECKO_API}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch enhanced data for ${coinId}`)
  }

  const data = await response.json()
  const marketData = data.market_data
  const links = data.links

  // Extract top exchanges
  const exchanges = [
    { name: 'Coinbase', url: `https://www.coinbase.com/price/${coinId}` },
    { name: 'Binance', url: `https://www.binance.com/en/trade/${data.symbol?.toUpperCase()}_USDT` },
    { name: 'Kraken', url: `https://www.kraken.com/prices/${coinId}` },
  ]

  return {
    price: marketData.current_price?.usd || 0,
    priceChange24h: marketData.price_change_24h || 0,
    priceChangePercentage24h: marketData.price_change_percentage_24h || 0,
    marketCap: marketData.market_cap?.usd || 0,
    marketCapRank: marketData.market_cap_rank,
    volume24h: marketData.total_volume?.usd || 0,
    circulatingSupply: marketData.circulating_supply || 0,
    totalSupply: marketData.total_supply || 0,
    maxSupply: marketData.max_supply,
    ath: marketData.ath?.usd || 0,
    athDate: marketData.ath_date?.usd || '',
    athChangePercentage: marketData.ath_change_percentage?.usd || 0,
    atl: marketData.atl?.usd || 0,
    atlDate: marketData.atl_date?.usd || '',
    atlChangePercentage: marketData.atl_change_percentage?.usd || 0,
    links: {
      homepage: links.homepage?.filter(Boolean) || [],
      blockchain: links.blockchain_site?.filter(Boolean) || [],
      officialForum: links.official_forum_url?.filter(Boolean) || [],
      twitter: links.twitter_screen_name ? `https://twitter.com/${links.twitter_screen_name}` : undefined,
      telegram: links.telegram_channel_identifier ? `https://t.me/${links.telegram_channel_identifier}` : undefined,
      reddit: links.subreddit_url,
      github: links.repos_url?.github || [],
      explorer: [
        coinId === 'algorand' ? 'https://algoexplorer.io' : undefined,
        coinId === 'algorand' ? 'https://www.allo.info' : undefined,
      ].filter(Boolean) as string[],
      exchanges,
    },
    description: data.description?.en?.slice(0, 300),
    lastUpdated: data.last_updated,
  }
}

/**
 * Fetch Algorand asset information
 */
export async function fetchAlgorandAssetInfo(assetId: number): Promise<AlgorandAssetInfo | null> {
  try {
    const network = process.env.NEXT_PUBLIC_ALGORAND_NETWORK || 'testnet'
    const explorerBase = network === 'mainnet'
      ? 'https://algoexplorer.io/asset'
      : 'https://testnet.algoexplorer.io/asset'

    const response = await fetch(`${ALGORAND_INDEXER}/v2/assets/${assetId}`)

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const asset = data.asset

    return {
      assetId,
      name: asset.params.name || 'Unknown',
      unitName: asset.params['unit-name'] || 'ASA',
      total: asset.params.total,
      decimals: asset.params.decimals,
      creator: asset.params.creator,
      url: asset.params.url,
      verified: false, // Would need separate verification service
      explorerUrl: `${explorerBase}/${assetId}`,
    }
  } catch (error) {
    console.error('Failed to fetch Algorand asset info:', error)
    return null
  }
}

/**
 * Fetch trending Algorand ecosystem tokens
 */
export async function fetchTrendingAlgorandTokens(): Promise<Array<{
  id: string
  name: string
  symbol: string
  priceChange24h: number
  marketCap?: number
  volume24h?: number
}>> {
  try {
    // Algorand ecosystem tokens to check
    const algorandTokens = [
      'algorand',           // ALGO
      'algofi',            // ALGOFI (if exists)
      'planets',           // PLANETS
      'yieldly',           // YLDY
      'algorand-ecosystem-token', // Generic
    ]

    const results = await Promise.all(
      algorandTokens.map(async (coinId) => {
        try {
          const response = await fetch(
            `${COINGECKO_API}/coins/${coinId}?localization=false&tickers=false&market_data=true`,
            { headers: { 'Accept': 'application/json' } }
          )
          if (!response.ok) return null

          const data = await response.json()
          return {
            id: data.id,
            name: data.name,
            symbol: data.symbol?.toUpperCase() || '',
            priceChange24h: data.market_data?.price_change_percentage_24h || 0,
            marketCap: data.market_data?.market_cap?.usd || 0,
            volume24h: data.market_data?.total_volume?.usd || 0,
          }
        } catch {
          return null
        }
      })
    )

    return results.filter(Boolean) as Array<{
      id: string
      name: string
      symbol: string
      priceChange24h: number
      marketCap?: number
      volume24h?: number
    }>
  } catch (error) {
    console.error('Failed to fetch Algorand trending tokens:', error)
    return []
  }
}

/**
 * Fetch top Algorand ASAs by volume (from Algorand indexer)
 */
export async function fetchTopAlgorandASAs(): Promise<Array<{
  assetId: number
  name: string
  unitName: string
  creator: string
  explorerUrl: string
}>> {
  try {
    // This would ideally fetch from DeFi Llama or Vestige for Algorand ASA data
    // For now, return known popular Algorand ASAs
    const network = process.env.NEXT_PUBLIC_ALGORAND_NETWORK || 'testnet'
    const explorerBase = network === 'mainnet'
      ? 'https://algoexplorer.io/asset'
      : 'https://testnet.algoexplorer.io/asset'

    const popularASAs = network === 'mainnet' ? [
      { assetId: 31566704, name: 'USDC', unitName: 'USDC', creator: 'Algorand Foundation' },
      { assetId: 312769, name: 'Tether USDt', unitName: 'USDt', creator: 'Tether' },
      { assetId: 226701642, name: 'Yieldly', unitName: 'YLDY', creator: 'Yieldly' },
      { assetId: 27165954, name: 'PLANETS', unitName: 'PLANETS', creator: 'PlanetWatch' },
      { assetId: 470842789, name: 'Defly Token', unitName: 'DEFLY', creator: 'Defly' },
    ] : [
      { assetId: 10458941, name: 'USDC', unitName: 'USDC', creator: 'Circle' },
      { assetId: 67396430, name: 'Tether USDt', unitName: 'USDt', creator: 'Tether' },
      { assetId: 70283957, name: 'ALFG Test', unitName: 'ALFG', creator: 'Test' },
    ]

    return popularASAs.map(asa => ({
      ...asa,
      explorerUrl: `${explorerBase}/${asa.assetId}`
    }))
  } catch (error) {
    console.error('Failed to fetch Algorand ASAs:', error)
    return []
  }
}

/**
 * Fetch trending coins (general crypto)
 */
export async function fetchTrendingCoins(): Promise<Array<{ id: string; name: string; symbol: string; priceChange24h: number }>> {
  try {
    const response = await fetch(`${COINGECKO_API}/search/trending`, {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.coins.slice(0, 5).map((item: any) => ({
      id: item.item.id,
      name: item.item.name,
      symbol: item.item.symbol,
      priceChange24h: item.item.price_change_percentage_24h?.usd || 0,
    }))
  } catch (error) {
    console.error('Failed to fetch trending coins:', error)
    return []
  }
}

/**
 * Fetch latest crypto news for a specific coin
 */
export async function fetchCryptoNews(coinId: string, limit: number = 5): Promise<Array<{
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  sentiment?: 'positive' | 'negative' | 'neutral'
}>> {
  try {
    // Using CryptoPanic API (free tier)
    const response = await fetch(
      `https://cryptopanic.com/api/v1/posts/?auth_token=free&currencies=${coinId}&public=true`,
      { headers: { 'Accept': 'application/json' } }
    )

    if (!response.ok) {
      // Fallback to general crypto news
      return []
    }

    const data = await response.json()

    return (data.results || []).slice(0, limit).map((article: any) => ({
      title: article.title || 'No title',
      description: article.title || '',
      url: article.url || '#',
      source: article.source?.title || 'CryptoPanic',
      publishedAt: article.published_at || new Date().toISOString(),
      sentiment: article.votes?.positive > article.votes?.negative
        ? 'positive'
        : article.votes?.negative > article.votes?.positive
        ? 'negative'
        : 'neutral'
    }))
  } catch (error) {
    console.error('Failed to fetch crypto news:', error)
    return []
  }
}

/**
 * Get Fear & Greed Index
 */
export async function fetchFearGreedIndex(): Promise<{
  value: number
  valueClassification: string
  timestamp: string
} | null> {
  try {
    const response = await fetch('https://api.alternative.me/fng/', {
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) return null

    const data = await response.json()
    const latest = data.data[0]

    return {
      value: parseInt(latest.value),
      valueClassification: latest.value_classification,
      timestamp: latest.timestamp
    }
  } catch (error) {
    console.error('Failed to fetch Fear & Greed Index:', error)
    return null
  }
}

/**
 * Validate coin ID format
 */
export function validateCoinId(coin: string): string {
  return coin.toLowerCase().trim()
}

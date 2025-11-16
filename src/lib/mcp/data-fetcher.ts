// CoinGecko Data Fetcher
import { OHLCV, Granularity } from './types'

const COINGECKO_API = 'https://api.coingecko.com/api/v3'

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
 * Validate coin ID format
 */
export function validateCoinId(coin: string): string {
  return coin.toLowerCase().trim()
}

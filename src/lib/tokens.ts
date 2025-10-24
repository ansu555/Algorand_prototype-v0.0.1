// Token registry for Algorand testnet only

export type TokenInfo = {
  symbol: string
  address: number // Algorand ASA IDs
  decimals: number
  coingeckoId?: string
  network: 'algorand'
}

// Algorand testnet ASAs only
const ALGORAND_TESTNET_TOKENS: Record<string, TokenInfo> = {
  ALGO: { symbol: 'ALGO', address: 0, decimals: 6, coingeckoId: 'algorand', network: 'algorand' },
  USDC: { symbol: 'USDC', address: 10458941, decimals: 6, coingeckoId: 'usd-coin', network: 'algorand' }
}

export function resolveTokenBySymbol(symbol?: string): TokenInfo | null {
  if (!symbol) return null
  const key = symbol.toUpperCase()
  return ALGORAND_TESTNET_TOKENS[key] ?? null
}

export function resolveAlgorandAsset(symbol: string): TokenInfo | null {
  return ALGORAND_TESTNET_TOKENS[symbol.toUpperCase()] ?? null
}

// Export for compatibility with existing components
export const FUJI_SYMBOL_TO_TOKEN = ALGORAND_TESTNET_TOKENS

// --- CoinGecko helpers: fetch Algorand-platform tokens -----------------
// These helpers call the public CoinGecko REST API to list coins and
// filter only those that have a platform entry for "algorand".
// See: https://docs.coingecko.com/v3.0.1/reference/endpoint-overview

export type CoinGeckoCoin = {
  id: string
  symbol: string
  name: string
  platforms?: Record<string, string>
}

/**
 * Fetch the full CoinGecko /coins/list (include_platform=true) and return
 * only coins which have a non-empty `platforms.algorand` entry.
 *
 * Note: this returns the raw coin list entries (id, symbol, name, platforms).
 */
export async function fetchAlgorandAssets(): Promise<CoinGeckoCoin[]> {
  const url = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true'
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`CoinGecko API error fetching coins list: ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as CoinGeckoCoin[]

  // Filter coins that have a platforms object with an 'algorand' key and a non-empty value
  const algorandCoins = data.filter((c) => {
    if (!c || !c.platforms) return false
    // keys might be different-cased; normalize
    const platformKeys = Object.keys(c.platforms)
    for (const k of platformKeys) {
      if (k.toLowerCase() === 'algorand' && c.platforms[k]) return true
    }
    return false
  })

  return algorandCoins
}

/**
 * Optionally fetch market data for Algorand coins (uses /coins/markets).
 * CoinGecko limits `ids` length and `per_page` to 250; this helper batches
 * requests if necessary and returns combined market entries.
 */
export async function fetchAlgorandMarketData(vs_currency = 'usd') {
  const coins = await fetchAlgorandAssets()
  const ids = coins.map((c) => c.id).filter(Boolean)
  if (ids.length === 0) return []

  const CHUNK = 250
  const results: any[] = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const marketsUrl =
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=' +
      encodeURIComponent(vs_currency) +
      '&ids=' +
      encodeURIComponent(chunk.join(',')) +
      '&order=market_cap_desc&per_page=' +
      encodeURIComponent(chunk.length)

    const r = await fetch(marketsUrl)
    if (!r.ok) {
      throw new Error(`CoinGecko API error fetching markets: ${r.status} ${r.statusText}`)
    }
    const json = await r.json()
    results.push(...json)
  }

  return results
}


const API_URL = process.env.NEXT_PUBLIC_CRYPTO_API_URL as string
const API_KEY = process.env.NEXT_PUBLIC_RAPID_API_KEY as string
const API_HOST = process.env.NEXT_PUBLIC_CRYPTO_API_HOST as string

type CoinDetails = {
  id: string
  price: number
  change24hPct: number // e.g. -3.5 for -3.5%
  symbol?: string
  name?: string
}

export async function fetchCoinDetails(coinId: string): Promise<CoinDetails | null> {
  if (!API_URL || !API_KEY || !API_HOST) return null
  const url = `${API_URL}/coin/${coinId}`
  const res = await fetch(url, {
    headers: {
      "x-rapidapi-key": API_KEY,
      "x-rapidapi-host": API_HOST,
    },
    cache: "no-store",
  })
  if (!res.ok) return null
  const json = await res.json()
  const coin = json?.data?.coin
  if (!coin) return null
  return {
    id: coin.uuid || coin.id || coinId,
    price: Number(coin.price),
  change24hPct: Number(coin.change),
  symbol: coin.symbol,
  name: coin.name,
  }
}

export async function fetchManyCoinDetails(ids: string[]): Promise<Map<string, CoinDetails>> {
  const map = new Map<string, CoinDetails>()
  for (const id of ids) {
    try {
      const d = await fetchCoinDetails(id)
      if (d) map.set(id, d)
    } catch {}
  }
  return map
}

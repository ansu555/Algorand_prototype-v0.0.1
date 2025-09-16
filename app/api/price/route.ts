import { NextResponse } from "next/server"
import { fetchCoinDetails } from "@/lib/server/prices"

export const runtime = "nodejs"

function mockPriceForCoin(coinId: string): number {
  // Simple deterministic hash -> price between ~5 and ~500
  let hash = 0
  for (let i = 0; i < coinId.length; i++) hash = (hash * 31 + coinId.charCodeAt(i)) >>> 0
  const price = 5 + (hash % 495)
  return Number(price.toFixed(2))
}

function deterministicPctDelta(coinId: string, window: string): number {
  // Produce a deterministic percentage delta in range [-15, +15]
  const key = `${coinId}:${window}`
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 33 + key.charCodeAt(i)) >>> 0
  const sign = (hash & 1) ? 1 : -1
  const magnitude = (hash % 1500) / 100 // 0..15
  return sign * magnitude
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const coin = searchParams.get("coin")
  const window = searchParams.get("window") || undefined
  if (!coin) return NextResponse.json({ error: "Missing coin query param" }, { status: 400 })

  try {
    const details = await fetchCoinDetails(coin)
    if (details && Number.isFinite(details.price) && details.price > 0) {
      const price = Number(details.price)
      let prevPrice: number | undefined
      // If a window is requested and we have a 24h change, approximate previous price
      if (window && typeof details.change24hPct === 'number') {
        const pct = Number(details.change24hPct)
        if (Number.isFinite(pct)) {
          prevPrice = Number((price / (1 + pct / 100)).toFixed(6))
        }
      }
  return NextResponse.json({ coinId: coin, price, symbol: details.symbol, name: details.name, ...(window ? { window } : {}), ...(prevPrice ? { prevPrice } : {}), source: "rapidapi" })
    }
  } catch {
    // ignore and fall back to mock
  }

  const price = mockPriceForCoin(coin)
  let prevPrice: number | undefined
  if (window) {
    const pct = deterministicPctDelta(coin, window)
    prevPrice = Number((price / (1 + pct / 100)).toFixed(6))
  }
  return NextResponse.json({ coinId: coin, price, ...(window ? { window } : {}), ...(prevPrice ? { prevPrice } : {}), source: "mock" })
}

import { NextResponse } from "next/server"
// Price API route - now using Algorand DEX integration
// This route is deprecated in favor of /api/algorand/assets/[id]

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

  // Redirect to Algorand API for ASA price data
  return NextResponse.json({ 
    error: "This endpoint is deprecated. Use /api/algorand/assets/[id] for ASA price data",
    redirect: `/api/algorand/assets/${coin}`
  }, { status: 410 })
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

type Asset = {
  id: number
  name: string
  symbol: string
  decimals: number
  unitName?: string
}

type PoolInfo = {
  poolId: string
  dexName: string
  asset1: Asset
  asset2: Asset
  reserve1: string | bigint
  reserve2: string | bigint
  totalLiquidity: string | bigint
  fee: number
  poolAddress?: string
  appId?: number
  lastUpdated: number
}

export default function PoolDetailPage() {
  const params = useParams<{ id: string }>()
  const poolId = Array.isArray(params?.id) ? params?.id[0] : params?.id

  const [pool, setPool] = useState<PoolInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!poolId) return
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/pools/all", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load pool data")
        const data = await res.json()
        const pools: PoolInfo[] = data?.pools ?? []
        const match = pools.find((p) => p.poolId === poolId || p.appId?.toString() === poolId)
        if (!match) throw new Error("Pool not found")
        setPool(match)
      } catch (e: any) {
        setError(e?.message || "Unable to load pool")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [poolId])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pool Details</h1>
        <Link href="/pool" className="text-sm text-blue-600 hover:underline">← Back to Pools</Link>
      </div>

      {loading && (
        <div className="text-muted-foreground">Loading pool...</div>
      )}

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {pool && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Pool ID</div>
            <div className="font-mono break-all text-sm">{pool.poolId}</div>
          </div>

          {pool.poolAddress && (
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Pool Address</div>
              <div className="font-mono break-all text-sm">{pool.poolAddress}</div>
            </div>
          )}

          {typeof pool.appId !== "undefined" && (
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">App ID</div>
              <div className="font-mono text-sm">{pool.appId}</div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Token A</div>
              <div className="mt-1 font-medium">{pool.asset1.symbol} {pool.asset1.unitName ? `(${pool.asset1.unitName})` : ''}</div>
              <div className="mt-1 font-mono text-sm">ID: {pool.asset1.id}</div>
              <div className="text-xs text-muted-foreground">Decimals: {pool.asset1.decimals}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Token B</div>
              <div className="mt-1 font-medium">{pool.asset2.symbol} {pool.asset2.unitName ? `(${pool.asset2.unitName})` : ''}</div>
              <div className="mt-1 font-mono text-sm">ID: {pool.asset2.id}</div>
              <div className="text-xs text-muted-foreground">Decimals: {pool.asset2.decimals}</div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">DEX: {pool.dexName}</div>
        </div>
      )}
    </div>
  )
}

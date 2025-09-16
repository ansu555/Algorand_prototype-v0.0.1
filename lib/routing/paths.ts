// Multi-hop route discovery & quoting (up to configurable max hops) for Fuji pools.
// Depth definition: number of pools (hops) in the route. depth=1 => single pool (direct), depth=3 => three pools (two intermediates).

import { resolveTokenBySymbol, type TokenInfo } from '../tokens'
import { listPools, quoteSingleHop, type Pool } from './pools'

export interface Route {
  pools: Pool[]
  tokens: TokenInfo[] // length = pools + 1
}

export interface RouteQuote {
  route: Route
  amountOut: bigint
  cumulativePriceImpactBps: number | null
  kind: 'DIRECT' | 'MULTI_HOP'
}

// Build adjacency list of token address => pools referencing it.
function buildAdjacency(): Map<string, Pool[]> {
  const map = new Map<string, Pool[]>()
  for (const p of listPools()) {
    const a0 = p.token0.address
    const a1 = p.token1.address
    if (!map.has(a0)) map.set(a0, [])
    if (!map.has(a1)) map.set(a1, [])
    map.get(a0)!.push(p)
    map.get(a1)!.push(p)
  }
  return map
}

// Discover candidate routes up to maxHops pools (maxHops >=1). Avoid repeating a token to prevent cycles.
export function discoverRoutes(tokenIn: TokenInfo, tokenOut: TokenInfo, maxHops: number): Route[] {
  const adjacency = buildAdjacency()
  const results: Route[] = []
  const startAddr = tokenIn.address
  const targetAddr = tokenOut.address

  interface StackItem { current: TokenInfo; pathPools: Pool[]; pathTokens: TokenInfo[] }
  const stack: StackItem[] = [{ current: tokenIn, pathPools: [], pathTokens: [tokenIn] }]

  while (stack.length) {
    const { current, pathPools, pathTokens } = stack.pop()!
    if (pathPools.length >= maxHops) continue
    const neighPools = adjacency.get(current.address) || []
    for (const pool of neighPools) {
      // Determine the opposite token of the pool
      const nextToken = pool.token0.address === current.address ? pool.token1 : pool.token0
      // Skip if token already in path (simple cycle prevention)
      if (pathTokens.some(t => t.address === nextToken.address)) continue
      const newPools = [...pathPools, pool]
      const newTokens = [...pathTokens, nextToken]
      if (nextToken.address === targetAddr) {
        results.push({ pools: newPools, tokens: newTokens })
      } else {
        stack.push({ current: nextToken, pathPools: newPools, pathTokens: newTokens })
      }
    }
  }

  return results
}

// Quote a multi-hop route sequentially. If any hop fails, return null.
export function quoteRoute(route: Route, amountIn: bigint): { amountOut: bigint; cumulativePriceImpactBps: number | null } | null {
  let runningAmount = amountIn
  let totalImpact = 0
  for (let i = 0; i < route.pools.length; i++) {
    const tokenIn = route.tokens[i]
    const tokenOut = route.tokens[i + 1]
    const hopQuote = quoteSingleHop(tokenIn, tokenOut, runningAmount)
    if (!hopQuote) return null
    runningAmount = hopQuote.amountOut
    if (hopQuote.priceImpactBps != null) totalImpact += hopQuote.priceImpactBps
  }
  return { amountOut: runningAmount, cumulativePriceImpactBps: totalImpact }
}

// Find and rank best route up to maxHops. Includes direct path implicitly (since direct is depth=1).
export function findBestRouteQuote(tokenIn: TokenInfo, tokenOut: TokenInfo, amountIn: bigint, maxHops: number): RouteQuote | null {
  if (maxHops < 1) maxHops = 1
  const routes = discoverRoutes(tokenIn, tokenOut, maxHops)
  if (!routes.length) return null
  const quoted: RouteQuote[] = []
  for (const r of routes) {
    const q = quoteRoute(r, amountIn)
    if (!q) continue
    quoted.push({
      route: r,
      amountOut: q.amountOut,
      cumulativePriceImpactBps: q.cumulativePriceImpactBps,
      kind: r.pools.length === 1 ? 'DIRECT' : 'MULTI_HOP'
    })
  }
  if (!quoted.length) return null
  // Rank: highest amountOut, then fewer pools, then lower price impact
  quoted.sort((a, b) => {
    if (a.amountOut === b.amountOut) {
      if (a.route.pools.length === b.route.pools.length) {
        const ia = a.cumulativePriceImpactBps ?? 0
        const ib = b.cumulativePriceImpactBps ?? 0
        return ia - ib
      }
      return a.route.pools.length - b.route.pools.length
    }
    return b.amountOut > a.amountOut ? 1 : -1
  })
  return quoted[0]
}

// Convenience: resolve symbols then call findBestRouteQuote.
export function findBestRouteQuoteBySymbol(tokenInSymbol: string, tokenOutSymbol: string, amountIn: bigint, maxHops: number): RouteQuote | null {
  const tIn = resolveTokenBySymbol(tokenInSymbol)
  const tOut = resolveTokenBySymbol(tokenOutSymbol)
  if (!tIn || !tOut) return null
  return findBestRouteQuote(tIn, tOut, amountIn, maxHops)
}

// TODO: Future improvements
// - Gas estimation per hop & adjust scoring (amountOut - gasCostValue)
// - Split routes (parallel multi-path) with proportional allocation
// - Adaptive depth: increase only if direct liquidity < threshold
// - Cache route discovery per block for performance

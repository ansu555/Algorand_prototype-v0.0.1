import { NextRequest, NextResponse } from 'next/server'
import { parseUnits, createPublicClient, http } from 'viem'
import { avalancheFuji } from 'viem/chains'
import { resolveTokenBySymbol } from '../../../../lib/tokens'
import { discoverRoutes, quoteRoute, type Route } from '../../../../lib/routing/paths'
import RouterAbi from '@/app/abis/Router.json'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tokenInSymbol = searchParams.get('tokenIn')
    const tokenOutSymbol = searchParams.get('tokenOut')
    const amount = searchParams.get('amount')
    const slippageBps = parseInt(searchParams.get('slippage') || '100')
    const maxRoutes = parseInt(searchParams.get('maxRoutes') || '3')

    if (!tokenInSymbol || !tokenOutSymbol || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: tokenIn, tokenOut, amount' },
        { status: 400 }
      )
    }

    const tokenIn = resolveTokenBySymbol(tokenInSymbol)
    const tokenOut = resolveTokenBySymbol(tokenOutSymbol)
    
    if (!tokenIn || !tokenOut) {
      return NextResponse.json(
        { error: 'Unsupported token symbols' },
        { status: 400 }
      )
    }

    const amountInUnits = parseUnits(amount, tokenIn.decimals)
    
    // Discover all routes up to depth 3
    const allRoutes = await discoverRoutes(tokenIn, tokenOut, 3)
    const quotedRoutes = []

    // Setup on-chain client
    const rpcUrl = process.env.RPC_URL_FUJI || process.env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc'
    const routerAddress = process.env.CUSTOM_SWAP_ROUTER || process.env.NEXT_PUBLIC_AMM_ROUTER || ''
  const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(rpcUrl) })

    for (const route of allRoutes) {
      let amountOut: bigint | null = null
      let priceImpactBps: number | null = null
      // For direct routes, use on-chain getAmountsOut
      if (route.pools.length === 1 && routerAddress) {
        try {
          const path = route.tokens.map(t => t.address)
          const amounts = await publicClient.readContract({
            address: routerAddress as `0x${string}`,
            abi: RouterAbi as any,
            functionName: 'getAmountsOut',
            args: [amountInUnits, path]
          }) as bigint[]
          amountOut = amounts[amounts.length - 1]
        } catch (e) {
          // fallback to local math if on-chain fails
          const quote = await quoteRoute(route, amountInUnits)
          amountOut = quote ? quote.amountOut : null
        }
      } else {
        // For multi-hop, use local math
        const quote = await quoteRoute(route, amountInUnits)
        amountOut = quote ? quote.amountOut : null
        priceImpactBps = quote ? quote.cumulativePriceImpactBps : null
      }
      if (!amountOut) continue
      const minOut = (amountOut * BigInt(10000 - slippageBps)) / BigInt(10000)
      const estimatedGas = 100000 + (route.pools.length * 150000)
      const poolAddresses = route.pools.map((p: any) => p.id).join('-')
      const routeId = Buffer.from(poolAddresses).toString('base64').slice(0, 16)
      quotedRoutes.push({
        routeId,
        tokenSymbols: route.tokens.map((t: any) => t.symbol),
        poolIds: route.pools.map((p: any) => p.id),
        amountOut: amountOut.toString(),
        minOut: minOut.toString(),
        priceImpactBps,
        estimatedGas,
        kind: route.pools.length === 1 ? 'DIRECT' : 'MULTI_HOP'
      })
    }

    // Sort by amountOut desc, then by fewer pools, then by lower price impact
    quotedRoutes.sort((a, b) => {
      const aOut = BigInt(a.amountOut)
      const bOut = BigInt(b.amountOut)
      if (aOut !== bOut) return bOut > aOut ? 1 : -1
      if (a.poolIds.length !== b.poolIds.length) return a.poolIds.length - b.poolIds.length
      const aImpact = a.priceImpactBps || 0
      const bImpact = b.priceImpactBps || 0
      return aImpact - bImpact
    })

    const bestRoutes = quotedRoutes.slice(0, maxRoutes)

    return NextResponse.json({
      tokenIn: tokenInSymbol,
      tokenOut: tokenOutSymbol,
      amountIn: amount,
      slippageBps,
      routes: bestRoutes,
      bestRoute: bestRoutes[0] || null,
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('Quote API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenIn, tokenOut, amount, slippage = 100, maxRoutes = 3 } = body

    if (!tokenIn || !tokenOut || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenIn, tokenOut, amount' },
        { status: 400 }
      )
    }

    // Reuse GET logic with POST body
    const tokenInResolved = resolveTokenBySymbol(tokenIn)
    const tokenOutResolved = resolveTokenBySymbol(tokenOut)
    
    if (!tokenInResolved || !tokenOutResolved) {
      return NextResponse.json(
        { error: 'Unsupported token symbols' },
        { status: 400 }
      )
    }

    const amountInUnits = parseUnits(amount, tokenInResolved.decimals)
    const allRoutes = await discoverRoutes(tokenInResolved, tokenOutResolved, 3)
    const quotedRoutes = []

    for (const route of allRoutes) {
      const quote = await quoteRoute(route, amountInUnits)
      if (!quote) continue

      const minOut = (quote.amountOut * BigInt(10000 - slippage)) / BigInt(10000)
      const estimatedGas = 100000 + (route.pools.length * 150000)
      const poolAddresses = route.pools.map((p: any) => p.id).join('-')
      const routeId = Buffer.from(poolAddresses).toString('base64').slice(0, 16)

      quotedRoutes.push({
        routeId,
        tokenSymbols: route.tokens.map((t: any) => t.symbol),
        poolIds: route.pools.map((p: any) => p.id),
        amountOut: quote.amountOut.toString(),
        minOut: minOut.toString(),
        priceImpactBps: quote.cumulativePriceImpactBps,
        estimatedGas,
        kind: route.pools.length === 1 ? 'DIRECT' : 'MULTI_HOP'
      })
    }

    quotedRoutes.sort((a, b) => {
      const aOut = BigInt(a.amountOut)
      const bOut = BigInt(b.amountOut)
      if (aOut !== bOut) return bOut > aOut ? 1 : -1
      if (a.poolIds.length !== b.poolIds.length) return a.poolIds.length - b.poolIds.length
      const aImpact = a.priceImpactBps || 0
      const bImpact = b.priceImpactBps || 0
      return aImpact - bImpact
    })

    const bestRoutes = quotedRoutes.slice(0, maxRoutes)

    return NextResponse.json({
      tokenIn,
      tokenOut,
      amountIn: amount,
      slippageBps: slippage,
      routes: bestRoutes,
      bestRoute: bestRoutes[0] || null,
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('Quote API POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
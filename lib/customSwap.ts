import { Address, erc20Abi, parseUnits } from 'viem'
import RouterAbi from '@/app/abis/Router.json'
import { resolveTokenBySymbol } from './tokens'
import { quoteBest, getPoolById, type Pool } from './routing/pools'
import { findBestRouteQuote, discoverRoutes, quoteRoute, type Route, type RouteQuote } from './routing/paths'
// @ts-ignore Ensure local error module is picked up
import { CustomSwapError, wrapUnknown, interpretExecutionError } from './errors'
import { logSwapEvent } from './log'

/**
 * Reconstruct route from routeId (base64 encoded pool addresses).
 * Returns the Route object or null if routeId is invalid or pools don't exist.
 */
export async function reconstructRouteFromId(
  tokenIn: string, 
  tokenOut: string, 
  routeId: string
): Promise<Route | null> {
  try {
    // Decode base64 routeId to get pool addresses
    const poolAddresses = Buffer.from(routeId, 'base64').toString('utf-8')
    const poolIds = poolAddresses.split('-')
    
    if (!poolIds.length) return null
    
    // Get pools by ID
    const poolPromises = poolIds.map(id => getPoolById(id))
    const poolResults = await Promise.all(poolPromises)
    const pools = poolResults.filter(Boolean) as Pool[]
    if (pools.length !== poolIds.length) {
      // Some pools not found
      return null
    }
    
    // Reconstruct token path by following pool connections
    const tokenInInfo = resolveTokenBySymbol(tokenIn)
    const tokenOutInfo = resolveTokenBySymbol(tokenOut)
    if (!tokenInInfo || !tokenOutInfo) return null
    
    const tokens = [tokenInInfo]
    let currentToken = tokenInInfo
    
    for (const pool of pools) {
      // Find the next token in the path
      const nextToken = pool.token0.address === currentToken.address 
        ? pool.token1 
        : pool.token1.address === currentToken.address 
          ? pool.token0 
          : null
      
      if (!nextToken) {
        // Pool doesn't connect to current token - invalid route
        return null
      }
      tokens.push(nextToken)
      currentToken = nextToken
    }
    
    // Verify the final token matches the expected output
    if (tokens[tokens.length - 1].address !== tokenOutInfo.address) {
      return null
    }
    
    return { pools, tokens }
  } catch (error) {
    // Invalid base64 or other parsing error
    return null
  }
}

/**
 * Simulate a swap using local pool math if available; fallback to router static call.
/**
 * Returns expected output, minOut, and price impact (bps if pool math used).
 */
export async function simulateCustomSwap(
  ctx: { chainId: number; publicClient: any; accountAddress: Address },
  params: CustomSwapParams
) {
  const tokenIn = resolveTokenBySymbol(params.tokenInSymbol, ctx.chainId)
  const tokenOut = resolveTokenBySymbol(params.tokenOutSymbol, ctx.chainId)
  if (!tokenIn || !tokenOut) {
    throw new CustomSwapError('UNSUPPORTED_TOKEN', 'Unsupported token symbol(s)', { data: { tokenIn: params.tokenInSymbol, tokenOut: params.tokenOutSymbol } })
  }
  const amountInUnits = parseUnits(params.amount, tokenIn.decimals)
  const routerAddress = (process.env.CUSTOM_SWAP_ROUTER || process.env.NEXT_PUBLIC_AMM_ROUTER || '').trim() as Address | ''
  if (!routerAddress) {
    throw new CustomSwapError('ROUTER_NOT_CONFIGURED', 'CUSTOM_SWAP_ROUTER not set')
  }

  let expectedOutUnits: bigint
  let priceImpactBps: number | null = null
  let routeKind: string
  let routeData: Route | null = null

  // Check if specific route ID is provided
  if (params.routeId) {
    if (params.routeId.startsWith('ONCHAIN:')) {
      // Force direct on-chain quote ignoring local pools
      try {
        const path = [tokenIn.address, tokenOut.address]
        const amounts = await ctx.publicClient.readContract({
          address: routerAddress,
          abi: RouterAbi as any,
          functionName: 'getAmountsOut',
          args: [amountInUnits, path]
        }) as bigint[]
        expectedOutUnits = amounts[amounts.length - 1]
        routeKind = 'ONCHAIN_DIRECT'
      } catch (e: any) {
        throw wrapUnknown('SIMULATION_FAILED', 'On-chain direct quote failed', e)
      }
    } else {
    const reconstructedRoute = await reconstructRouteFromId(
      params.tokenInSymbol, 
      params.tokenOutSymbol, 
      params.routeId
    )
    
    if (!reconstructedRoute) {
      throw new CustomSwapError('ROUTE_NOT_FOUND', 'Invalid or expired route ID', { 
        data: { routeId: params.routeId } 
      })
    }
    
    const routeQuote = await quoteRoute(reconstructedRoute, amountInUnits)
    if (!routeQuote) {
      throw new CustomSwapError('ROUTE_QUOTE_FAILED', 'Failed to quote specified route', { 
        data: { routeId: params.routeId } 
      })
    }
    
    expectedOutUnits = routeQuote.amountOut
    priceImpactBps = routeQuote.cumulativePriceImpactBps
    routeKind = reconstructedRoute.pools.length === 1 ? 'DIRECT' : 'MULTI_HOP'
    routeData = reconstructedRoute
    }
  } else {
    // Auto-select best route (existing logic)
    // 1. Try multi-hop best route (up to depth 3)
    const bestRoute = await findBestRouteQuote(tokenIn, tokenOut, amountInUnits, 3)
    if (bestRoute) {
      expectedOutUnits = bestRoute.amountOut
      priceImpactBps = bestRoute.cumulativePriceImpactBps
      routeKind = bestRoute.kind
      routeData = bestRoute.route
    } else {
      // 2. Fallback: direct single-hop quote (legacy helper)
      const localQuote = await quoteBest(tokenIn, tokenOut, amountInUnits)
      if (localQuote) {
        expectedOutUnits = localQuote.amountOut
        priceImpactBps = localQuote.priceImpactBps
        routeKind = 'DIRECT'
      } else {
        // 3. Final fallback: on-chain router static call
        try {
          // Build simple direct path [tokenIn, tokenOut]
          const path = [tokenIn.address, tokenOut.address]
          const amounts = await ctx.publicClient.readContract({
            address: routerAddress,
            abi: RouterAbi as any,
            functionName: 'getAmountsOut',
            args: [amountInUnits, path]
          }) as bigint[]
          expectedOutUnits = amounts[amounts.length - 1]
          routeKind = 'ROUTER_DIRECT_FALLBACK'
        } catch (e: any) {
          throw wrapUnknown('SIMULATION_FAILED', 'Router getAmountsOut failed', e)
        }
      }
    }
  }

  const slippageBps = params.slippageBps ?? 100
  const minOutUnits = (expectedOutUnits * BigInt(10000 - slippageBps)) / BigInt(10000)

  return {
    expectedOut: expectedOutUnits.toString(),
    minOut: minOutUnits.toString(),
    priceImpactBps,
    route: routeData 
      ? { 
          hops: routeData.tokens.map(t => t.address), 
          kind: routeKind,
          pools: routeData.pools.map(p => p.id)
        }
      : { hops: [tokenIn.address, tokenOut.address], kind: routeKind }
  }
}

// (Removed unused CUSTOM_SWAP_ABI placeholder; Router ABI is used directly.)

export interface CustomSwapParams {
  tokenInSymbol: string
  tokenOutSymbol: string
  amount: string              // human readable
  slippageBps?: number        // default 100 (1%)
  wait?: boolean
  recipient?: Address         // default smart account address
  // Route selection (optional)
  /** Route ID from quote API to execute specific route; if omitted, auto-selects best route */
  routeId?: string
  // MEV mitigation & execution control (optional)
  /** Absolute unix timestamp (seconds) after which tx reverts; if omitted, uses now + (deadlineSecondsFromNow || 300) */
  deadline?: number
  /** Relative seconds from now to compute deadline if absolute not provided (default 300) */
  deadlineSecondsFromNow?: number
  /** If true, attempt to send privately (placeholder – requires integration with a private relay) */
  privateTx?: boolean
  /** Max fee per gas in Gwei (EIP-1559). Converted to wei BigInt */
  maxFeePerGasGwei?: string
  /** Max priority fee per gas in Gwei (EIP-1559). Converted to wei BigInt */
  maxPriorityFeePerGasGwei?: string
}

export interface CustomSwapResult {
  hash: string
  details: {
    tokenIn: string
    tokenOut: string
    amountIn: string
    expectedOut: string
    minOut: string
    slippageBps: number
    route: { 
      hops: string[]; 
      kind: string; 
      pools?: string[] 
    }
    mev?: {
      deadline: number
      privateTx: boolean
      maxFeePerGasGwei?: string
      maxPriorityFeePerGasGwei?: string
    }
  }
}

/**
 * prepareCustomSwap currently just returns naive expectations using 1:1 placeholder.
 * Later this will:
 *  - query pools / aggregator
 *  - compute expectedOut via simulation
 *  - return structured route object
 */
export async function prepareCustomSwap(opts: CustomSwapParams, chainId: number) {
  const tokenIn = resolveTokenBySymbol(opts.tokenInSymbol, chainId)
  const tokenOut = resolveTokenBySymbol(opts.tokenOutSymbol, chainId)
  if (!tokenIn || !tokenOut) throw new Error('Unsupported token symbol(s)')

  const amountInUnits = parseUnits(opts.amount, tokenIn.decimals)
  // Placeholder: assume 1:1 (no fees) for expectedOut => this MUST be replaced by real routing math
  const expectedOutUnits = amountInUnits
  const slippageBps = opts.slippageBps ?? 100 // 1%
  // Use explicit BigInt constants without numeric separators for broader TS target compatibility
  const minOutUnits = (expectedOutUnits * BigInt(10000 - slippageBps)) / BigInt(10000)

  return {
    tokenIn,
    tokenOut,
    amountInUnits,
    expectedOutUnits,
    minOutUnits,
    slippageBps,
    route: { hops: [tokenIn.address === 'AVAX' ? 'NATIVE' : (tokenIn.address as string), tokenOut.address === 'AVAX' ? 'NATIVE' : (tokenOut.address as string)], kind: 'DIRECT_PLACEHOLDER' as const }
  }
}

export async function executeCustomSwap(
  ctx: {
    chainId: number
    publicClient: any
    smartAccount?: any
    walletClient?: any
    accountAddress: Address
  },
  params: CustomSwapParams
): Promise<CustomSwapResult> {
  logSwapEvent('swap.request', { chainId: ctx.chainId, params })
  
  // Get simulation result which includes route information
  const simulation = await simulateCustomSwap(ctx, params)
  const tokenIn = resolveTokenBySymbol(params.tokenInSymbol, ctx.chainId)!
  const tokenOut = resolveTokenBySymbol(params.tokenOutSymbol, ctx.chainId)!
  const amountInUnits = parseUnits(params.amount, tokenIn.decimals)
  const minOutUnits = BigInt(simulation.minOut)

  // If tokenIn is ERC20 (not AVAX sentinel), ensure allowance to (future) router or target contract
  // Allow server to fall back to NEXT_PUBLIC_AMM_ROUTER (set for frontend) if CUSTOM_SWAP_ROUTER is not provided
  const routerAddress = (process.env.CUSTOM_SWAP_ROUTER || process.env.NEXT_PUBLIC_AMM_ROUTER || '').trim() as Address | ''
  if (!routerAddress) {
    logSwapEvent('swap.error', { code: 'ROUTER_NOT_CONFIGURED', params })
    throw new CustomSwapError('ROUTER_NOT_CONFIGURED', 'CUSTOM_SWAP_ROUTER or NEXT_PUBLIC_AMM_ROUTER not set. Deploy router and set env variable.')
  }

  if (tokenIn.address !== 'AVAX') {
    try {
      const allowance: bigint = await ctx.publicClient.readContract({
        address: tokenIn.address as Address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [ctx.accountAddress, routerAddress]
      })
      if (allowance < amountInUnits) {
        // Use smartAccount if available, otherwise use walletClient
        const client = ctx.smartAccount || ctx.walletClient
        if (!client) {
          throw new Error('No wallet client available for approval')
        }
        
        const approveTx = await client.writeContract({
          address: tokenIn.address as Address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [routerAddress, amountInUnits]
        })
        await ctx.publicClient.waitForTransactionReceipt({ hash: approveTx })
      }
    } catch (e: any) {
      throw wrapUnknown('APPROVAL_FAILED', 'Token approval failed', e, { token: tokenIn.address })
    }
  }

  // Determine deadline (priority: explicit absolute > relative > default 300s)
  const nowSec = Math.floor(Date.now() / 1000)
  const effectiveDeadlineSec = params.deadline
    ? params.deadline
    : nowSec + (params.deadlineSecondsFromNow ?? 300)
  const deadline = BigInt(effectiveDeadlineSec)
  
  if (effectiveDeadlineSec <= nowSec) {
    throw new CustomSwapError('DEADLINE_PAST', 'Deadline must be in the future', { 
      data: { deadline: effectiveDeadlineSec, now: nowSec } 
    })
  }

  // Gas fee overrides (EIP-1559). Convert Gwei strings to wei BigInt.
  let maxFeePerGas: bigint | undefined
  let maxPriorityFeePerGas: bigint | undefined
  const toWei = (g?: string) => {
    if (!g) return undefined
    // Basic validation: digits & optional decimal
    if (!/^\d+(\.\d+)?$/.test(g)) throw new CustomSwapError('GAS_FEE_INVALID', 'Invalid gas fee number: ' + g)
    // parseUnits with 9 decimals (Gwei) -> wei
    return parseUnits(g, 9)
  }
  
  try {
    maxFeePerGas = toWei(params.maxFeePerGasGwei)
    maxPriorityFeePerGas = toWei(params.maxPriorityFeePerGasGwei)
  } catch (e: any) {
    throw wrapUnknown('GAS_FEE_INVALID', 'Gas fee parsing failed', e)
  }

  // NOTE: privateTx is a placeholder here; actual implementation would require
  // integration with a service (e.g., Flashbots-style relay for supported chains).
  const privateTx = !!params.privateTx
  
  // Build execution path. If simulation produced a multi-hop route, use it; otherwise fallback to direct.
  let path: Address[]
  if (simulation.route && simulation.route.hops && simulation.route.hops.length > 2) {
    // Use simulated hops; validate first & map any AVAX sentinel if ever present in route (currently tokens are ERC20s)
    const hops = simulation.route.hops
    // Basic sanity: first & last hop must match tokenIn/tokenOut
    if (hops[0].toLowerCase() !== tokenIn.address.toLowerCase() || hops[hops.length - 1].toLowerCase() !== tokenOut.address.toLowerCase()) {
      throw new CustomSwapError('ROUTE_NOT_FOUND', 'Simulated route endpoints mismatch tokenIn/tokenOut', { data: { hops, tokenIn: tokenIn.address, tokenOut: tokenOut.address } })
    }
    path = hops.map(a => a as Address)
  } else {
    // Direct path (two-token)
    path = [
      tokenIn.address === 'AVAX' ? '0x0000000000000000000000000000000000000000' : tokenIn.address as Address,
      tokenOut.address === 'AVAX' ? '0x0000000000000000000000000000000000000000' : tokenOut.address as Address
    ]
  }

  const txWriteArgs: any = {
    address: routerAddress,
    abi: RouterAbi as any,
    functionName: 'swapExactTokensForTokens',
    args: [
      amountInUnits,
      minOutUnits,
      path,
      params.recipient || ctx.accountAddress
    ]
  }
  
  if (maxFeePerGas) txWriteArgs.maxFeePerGas = maxFeePerGas
  if (maxPriorityFeePerGas) txWriteArgs.maxPriorityFeePerGas = maxPriorityFeePerGas

  let txHash: string
  try {
    // Use smartAccount if available, otherwise use walletClient
    const client = ctx.smartAccount || ctx.walletClient
    if (!client) {
      throw new Error('No wallet client available for swap execution')
    }
    
    // Debug logging
    console.log('CustomSwap execution args:', {
      address: txWriteArgs.address,
      functionName: txWriteArgs.functionName,
      args: txWriteArgs.args,
      accountAddress: ctx.accountAddress
    })
    
    txHash = await client.writeContract(txWriteArgs)
    logSwapEvent('swap.execute', { chainId: ctx.chainId, params, txHash, route: simulation.route })
  } catch (e: any) {
    console.error('CustomSwap execution error:', e)
    logSwapEvent('swap.error', { code: 'EXECUTION_REVERTED', error: e?.message, params })
    throw interpretExecutionError(e)
  }

  if (params.wait) {
    await ctx.publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
  }

  return {
    hash: txHash,
    details: {
      tokenIn: tokenIn.symbol,
      tokenOut: tokenOut.symbol,
      amountIn: params.amount,
      expectedOut: simulation.expectedOut,
      minOut: simulation.minOut,
      slippageBps: params.slippageBps ?? 100,
      route: simulation.route,
      mev: {
        deadline: effectiveDeadlineSec,
        privateTx,
        maxFeePerGasGwei: params.maxFeePerGasGwei,
        maxPriorityFeePerGasGwei: params.maxPriorityFeePerGasGwei
      }
    }
  }
}

/**
 * High-level convenience function to perform full custom swap flow.
 */
export async function customSwapFlow(
  agentCtx: { chainId: number; publicClient: any; smartAccount?: any; walletClient?: any; accountAddress: Address },
  p: CustomSwapParams
) {
  return executeCustomSwap(agentCtx, p)
}

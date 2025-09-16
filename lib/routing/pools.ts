// Static (virtual) pool registry for Avalanche Fuji.
// These reserves are NOT on-chain fetched yet; they are placeholder values to enable
// price impact & routing math scaffolding. Replace with real on-chain queries later.
//
// Model: Constant product pools (Uniswap V2 style): price = R_out / R_in; dy = (amountIn * R_out * (1 - fee)) / (R_in + amountIn * (1 - fee))
// All fees expressed in basis points (e.g., 30 = 0.30%).

import { resolveTokenBySymbol, type TokenInfo } from '../tokens'

export interface Pool {
  id: string
  token0: TokenInfo
  token1: TokenInfo
  reserve0: bigint
  reserve1: bigint
  feeBps: number // e.g. 30 = 0.30%
  type: 'V2'
}

// Helper to create BigInt from decimal-like string for reserves
function toUnits(amount: string, decimals: number): bigint {
  const [int, frac = ''] = amount.split('.')
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(int + fracPadded)
}

const pools: Pool[] = (() => {
  const WAVAX = resolveTokenBySymbol('WAVAX')!
  const USDC = resolveTokenBySymbol('USDC')!
  const WETH = resolveTokenBySymbol('WETH.e') || resolveTokenBySymbol('WETH')!
  const USDT = resolveTokenBySymbol('USDT.e') || resolveTokenBySymbol('USDT')!

  // Virtual liquidity assumption (adjust once real data available)
  // Aim: make small trades show tiny price impact while large trades move price.
  return [
    {
      id: 'WAVAX-USDC',
      token0: WAVAX,
      token1: USDC,
      reserve0: toUnits('500', WAVAX.decimals),     // 500 WAVAX
      reserve1: toUnits('200000', USDC.decimals),   // 200,000 USDC
      feeBps: 30,
      type: 'V2'
    },
    {
      id: 'WAVAX-WETH',
      token0: WAVAX,
      token1: WETH,
      reserve0: toUnits('400', WAVAX.decimals),
      reserve1: toUnits('400', WETH.decimals),
      feeBps: 30,
      type: 'V2'
    },
    {
      id: 'USDC-USDT',
      token0: USDC,
      token1: USDT,
      reserve0: toUnits('150000', USDC.decimals),
      reserve1: toUnits('149500', USDT.decimals), // slight skew
      feeBps: 5, // stable pair lower fee
      type: 'V2'
    }
  ]
})()

export function listPools(): Pool[] { return pools }

export function getPoolById(id: string): Pool | null {
  return pools.find(p => p.id === id) || null
}

export interface QuoteResult {
  amountOut: bigint
  priceImpactBps: number
  route: { pools: string[]; hops: string[] }
}

// Compute output for single-hop constant product pool
export function quoteSingleHop(tokenIn: TokenInfo, tokenOut: TokenInfo, amountIn: bigint): QuoteResult | null {
  const pool = pools.find(p => (p.token0.address === tokenIn.address && p.token1.address === tokenOut.address) || (p.token1.address === tokenIn.address && p.token0.address === tokenOut.address))
  if (!pool) return null
  const zeroForOne = pool.token0.address === tokenIn.address
  const reserveIn = zeroForOne ? pool.reserve0 : pool.reserve1
  const reserveOut = zeroForOne ? pool.reserve1 : pool.reserve0
  if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) return null
  const feeFactor = BigInt(10000 - pool.feeBps)
  const amountInAfterFee = amountIn * feeFactor / BigInt(10000)
  const numerator = amountInAfterFee * reserveOut
  const denominator = reserveIn + amountInAfterFee
  const amountOut = numerator / denominator

  // Mid price (pre-trade) = reserveOut / reserveIn
  // Execution price = amountIn / amountOut
  // price impact = (execution - mid)/mid
  // In bps = ((executionPrice - midPrice)/midPrice)*10000
  const midPriceNum = Number(reserveOut) / Number(reserveIn)
  const executionPriceNum = Number(amountIn) / Number(amountOut)
  const priceImpact = ((executionPriceNum - midPriceNum) / midPriceNum) * 10000
  return {
    amountOut,
    priceImpactBps: Math.max(0, Math.round(priceImpact)),
    route: { pools: [pool.id], hops: [tokenIn.symbol, tokenOut.symbol] }
  }
}

// Future: multi-hop quoting (WAVAX -> USDC -> USDT, etc.)
export function quoteBest(tokenIn: TokenInfo, tokenOut: TokenInfo, amountIn: bigint): QuoteResult | null {
  // 1. Direct pool
  const direct = quoteSingleHop(tokenIn, tokenOut, amountIn)
  // 2. (Placeholder) Could attempt two-hop via WAVAX or USDC as common bases
  // Return best by amountOut
  return direct // for now
}

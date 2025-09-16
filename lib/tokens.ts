import type { Address } from 'viem'

// Token registry supporting Base and Algorand networks only

export type TokenInfo = {
  symbol: string
  address: Address | 'ETH' | number // number for Algorand ASA IDs
  decimals: number
  coingeckoId?: string
  network?: 'base' | 'algorand'
}

// Algorand mainnet ASAs
const ALGORAND_MAINNET_TOKENS: Record<string, TokenInfo> = {
  ALGO: { symbol: 'ALGO', address: 0, decimals: 6, coingeckoId: 'algorand', network: 'algorand' },
  USDC: { symbol: 'USDC', address: 31566704, decimals: 6, coingeckoId: 'usd-coin', network: 'algorand' },
  USDT: { symbol: 'USDT', address: 312769, decimals: 6, coingeckoId: 'tether', network: 'algorand' },
  WBTC: { symbol: 'WBTC', address: 1058926737, decimals: 8, coingeckoId: 'wrapped-bitcoin', network: 'algorand' },
  WETH: { symbol: 'WETH', address: 887406851, decimals: 18, coingeckoId: 'weth', network: 'algorand' }
}

// Algorand testnet ASAs
const ALGORAND_TESTNET_TOKENS: Record<string, TokenInfo> = {
  ALGO: { symbol: 'ALGO', address: 0, decimals: 6, coingeckoId: 'algorand', network: 'algorand' },
  USDC: { symbol: 'USDC', address: 10458941, decimals: 6, coingeckoId: 'usd-coin', network: 'algorand' }
}

// Base mainnet tokens
const BASE_TOKENS: Record<string, TokenInfo> = {
  ETH: { symbol: 'ETH', address: 'ETH', decimals: 18, coingeckoId: 'ethereum', network: 'base' },
  WETH: { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, coingeckoId: 'weth', network: 'base' },
  USDC: { symbol: 'USDC', address: '0x833589fCD6EDb6E08f4c7C10d6D3e96cF6a47b8f', decimals: 6, coingeckoId: 'usd-coin', network: 'base' }
}

// Get the appropriate token registry based on chain ID
function getTokenRegistry(chainId?: number | string): Record<string, TokenInfo> {
  // Handle Algorand networks
  if (chainId === 'algorand-mainnet' || process.env.ALGORAND_NETWORK === 'mainnet') {
    return ALGORAND_MAINNET_TOKENS
  }
  if (chainId === 'algorand-testnet' || process.env.ALGORAND_NETWORK === 'testnet') {
    return ALGORAND_TESTNET_TOKENS
  }
  
  // Handle Base chain only
  return BASE_TOKENS
}

export function resolveTokenBySymbol(symbol?: string, chainId?: number | string): TokenInfo | null {
  if (!symbol) return null
  const key = symbol.toUpperCase()
  const registry = getTokenRegistry(chainId)
  return registry[key] ?? null
}

export function resolveAlgorandAsset(symbol: string, network: 'mainnet' | 'testnet' = 'testnet'): TokenInfo | null {
  const registry = network === 'mainnet' ? ALGORAND_MAINNET_TOKENS : ALGORAND_TESTNET_TOKENS
  return registry[symbol.toUpperCase()] ?? null
}

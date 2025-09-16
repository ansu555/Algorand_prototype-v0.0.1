import type { Address } from 'viem'

// Token registry supporting both Avalanche mainnet and Fuji testnet

export type TokenInfo = {
  symbol: string
  address: Address | 'AVAX'
  decimals: number
  coingeckoId?: string
}

// Mainnet token addresses (Avalanche C-Chain 43114)
const MAINNET_TOKENS: Record<string, TokenInfo> = {
  AVAX:  { symbol: 'AVAX',  address: 'AVAX', decimals: 18, coingeckoId: 'avalanche-2' },
  WAVAX: { symbol: 'WAVAX', address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', decimals: 18, coingeckoId: 'wrapped-avax' },
  USDC:  { symbol: 'USDC',  address: '0xB97EF9Ef8734C71901E3d8E6B9B81C7cD1cFAe25', decimals: 6, coingeckoId: 'usd-coin' },
  'USDC.E': { symbol: 'USDC.e', address: '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', decimals: 6, coingeckoId: 'usd-coin-avalanche-bridged-usdc-e' },
  USDT:  { symbol: 'USDT',  address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6, coingeckoId: 'tether' },
  'USDT.E': { symbol: 'USDT.e', address: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118', decimals: 6, coingeckoId: 'tether-avalanche-bridged-usdt-e' },
  WETH:  { symbol: 'WETH',  address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18, coingeckoId: 'weth' },
  'WETH.E': { symbol: 'WETH.e', address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18, coingeckoId: 'weth' }
}

// Fuji testnet tokens (for reference/backward compatibility)
const FUJI_TOKENS: Record<string, TokenInfo> = {
  AVAX:  { symbol: 'AVAX',  address: 'AVAX', decimals: 18, coingeckoId: 'avalanche-2' },
  WETH:  { symbol: 'WETH.e', address: '0x12162c3E810393dEC01362aBf156D7ecf6159528', decimals: 18, coingeckoId: 'weth' },
  'WETH.E':  { symbol: 'WETH.e', address: '0x12162c3E810393dEC01362aBf156D7ecf6159528', decimals: 18, coingeckoId: 'weth' },
  USDT:  { symbol: 'USDT.e', address: '0xA27f39E9C21b3376e1DA169e90e2DbA0C2e88d7b', decimals: 6, coingeckoId: 'tether' },
  'USDT.E':  { symbol: 'USDT.e', address: '0xA27f39E9C21b3376e1DA169e90e2DbA0C2e88d7b', decimals: 6, coingeckoId: 'tether' }
}

// Dynamic custom/test tokens from env (for custom deployed tokens)
function getCustomEnvTokens(): Record<string, TokenInfo> {
  const out: Record<string, TokenInfo> = {}
  if (process.env.NEXT_PUBLIC_TOKEN_A) {
    out.TOKEN_A = { symbol: 'TOKEN_A', address: process.env.NEXT_PUBLIC_TOKEN_A as Address, decimals: 18 }
  }
  if (process.env.NEXT_PUBLIC_TOKEN_B) {
    out.TOKEN_B = { symbol: 'TOKEN_B', address: process.env.NEXT_PUBLIC_TOKEN_B as Address, decimals: 18 }
  }
  if (process.env.NEXT_PUBLIC_TOKEN_C) {
    out.TOKEN_C = { symbol: 'TOKEN_C', address: process.env.NEXT_PUBLIC_TOKEN_C as Address, decimals: 18 }
  }
  return out
}

// Get the appropriate token registry based on chain ID
function getTokenRegistry(chainId?: number): Record<string, TokenInfo> {
  const isMainnet = chainId === 43114 || (!chainId && process.env.CHAIN_ID === '43114')
  
  if (isMainnet) {
    return {
      ...MAINNET_TOKENS,
      ...getCustomEnvTokens()
    }
  } else {
    // Fuji testnet or unspecified
    return {
      ...FUJI_TOKENS,
      ...getCustomEnvTokens()
    }
  }
}

// Legacy export for backward compatibility
export const FUJI_SYMBOL_TO_TOKEN: Record<string, TokenInfo> = getTokenRegistry(43113)

export function resolveTokenBySymbol(symbol?: string, chainId?: number): TokenInfo | null {
  if (!symbol) return null
  const key = symbol.toUpperCase()
  const registry = getTokenRegistry(chainId)
  return registry[key] ?? null
}

export function resolveTokenByCoinrankingId(): TokenInfo | null {
  return null
}

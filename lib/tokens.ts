// Token registry for Algorand testnet only

export type TokenInfo = {
  symbol: string
  address: number // Algorand ASA IDs
  decimals: number
  coingeckoId?: string
  network: 'algorand'
}

// Algorand testnet ASAs only
const ALGORAND_TESTNET_TOKENS: Record<string, TokenInfo> = {
  ALGO: { symbol: 'ALGO', address: 0, decimals: 6, coingeckoId: 'algorand', network: 'algorand' },
  USDC: { symbol: 'USDC', address: 10458941, decimals: 6, coingeckoId: 'usd-coin', network: 'algorand' }
}

export function resolveTokenBySymbol(symbol?: string): TokenInfo | null {
  if (!symbol) return null
  const key = symbol.toUpperCase()
  return ALGORAND_TESTNET_TOKENS[key] ?? null
}

export function resolveAlgorandAsset(symbol: string): TokenInfo | null {
  return ALGORAND_TESTNET_TOKENS[symbol.toUpperCase()] ?? null
}

// Export for compatibility with existing components
export const FUJI_SYMBOL_TO_TOKEN = ALGORAND_TESTNET_TOKENS

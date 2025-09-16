// Central config for on-chain AMM integration
// Values can be overridden via NEXT_PUBLIC_ env variables at build/runtime.

export interface AmmAddresses {
  factory: string
  router: string
  tokens: Record<string, string>
}

// Default placeholders (replace after deploy to testnet or load from deploy JSON)
const DEFAULT_ADDRESSES: AmmAddresses = {
  factory: process.env.NEXT_PUBLIC_AMM_FACTORY || '',
  router: process.env.NEXT_PUBLIC_AMM_ROUTER || '',
  tokens: {
    TOKENA: process.env.NEXT_PUBLIC_TOKEN_A || '',
    TOKENB: process.env.NEXT_PUBLIC_TOKEN_B || '',
    TOKENC: process.env.NEXT_PUBLIC_TOKEN_C || ''
  }
}

export function getAmmAddresses(): AmmAddresses {
  return DEFAULT_ADDRESSES
}

export function isAmmConfigured() {
  const a = getAmmAddresses()
  return !!(a.factory && a.router)
}

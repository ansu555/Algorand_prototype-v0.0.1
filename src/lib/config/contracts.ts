/**
 * Smart Contract Configuration
 * 
 * Stores deployed contract App IDs for different networks
 */

export const CONTRACTS = {
  testnet: {
    // Deployed on Oct 25, 2025 - Transaction: J55ZVWC2OXIKV5YSWKGONT7XXUKN5HVFPZEBYRPZP6T4BTW7XH6Q
    MULTIHOP_ROUTER: 748465069,
  },
  mainnet: {
    MULTIHOP_ROUTER: 0, // Deploy to mainnet later
  },
} as const

export type Network = keyof typeof CONTRACTS

/**
 * Get the MultihopSwapRouter contract App ID for a network
 */
export function getContractAppId(network: Network = 'testnet'): number {
  const appId = CONTRACTS[network].MULTIHOP_ROUTER
  
  if (appId === 0) {
    console.warn(`⚠️  MultihopSwapRouter not deployed on ${network}!`)
    console.warn('   Deploy with: cd Blockchain/10x_Swap/projects/10x_Swap && ./deploy.sh')
  }
  
  return appId
}

/**
 * Check if contract is deployed on a network
 */
export function isContractDeployed(network: Network = 'testnet'): boolean {
  return CONTRACTS[network].MULTIHOP_ROUTER !== 0
}

/**
 * Get contract address from App ID
 * Note: This calculates the contract's Algorand address
 */
export function getContractAddress(network: Network = 'testnet'): string | null {
  const appId = getContractAppId(network)
  
  if (appId === 0) {
    return null
  }
  
  // Algorand contract address format
  // You can also get this from AlgoExplorer
  return `Contract App ID: ${appId}`
}

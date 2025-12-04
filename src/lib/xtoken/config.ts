/**
 * X Token Configuration
 * =====================
 * 
 * The official reward token for the 10xSwap ecosystem.
 * 
 * Tokenomics Design Principles:
 * - Fair Launch: No pre-mine, tokens are minted to treasury and distributed via rewards
 * - Inflationary with Burns: Controlled emission through rewards, deflation via fee burns
 * - Utility-Focused: Fee discounts, staking, governance voting power
 * - Community-Owned: 100% distributed to users through platform activity
 */

// Token Properties
export const X_TOKEN_CONFIG = {
  // Basic Properties
  name: 'X Token',
  symbol: 'X',
  decimals: 6, // Same as ALGO for consistency
  unitName: 'X', // Short symbol for Algorand (max 8 chars)
  
  // Supply Configuration
  // Initial mint to treasury - distributed only via rewards
  // Using 1 billion as initial supply with 6 decimals = 1,000,000,000,000,000 base units
  initialSupply: 1_000_000_000, // 1 billion X tokens
  
  // Treasury & Distribution
  treasury: {
    // Percentage allocations from initial supply
    rewardsPool: 70,      // 70% - 700M tokens for user rewards
    liquidityMining: 15,  // 15% - 150M tokens for LP incentives  
    development: 10,      // 10% - 100M for development/operations
    reserve: 5,           // 5%  - 50M reserve for future use
  },
  
  // Emission Schedule (tokens per action - these are the virtual points that convert 1:1)
  emissions: {
    // Onboarding
    connectWallet: 10,
    firstSwap: 25,
    firstLiquidity: 40,
    firstAutoPilot: 30,
    
    // Milestones
    swap5: 50,
    swap25: 150,
    swap100: 500,
    swap500: 1500,
    
    // Daily
    dailyLogin: 5,
    dailySwap: 10,
    dailyLiquidityCheck: 8,
    
    // Weekly
    weekly20Swaps: 100,
    weeklyLiquidity100: 200,
    weekly3Rules: 150,
    
    // Achievements
    volume10k: 500,
    volume50k: 2500,
    lp90Days: 1000,
    
    // Referrals
    referralSignup: 50,
    referralFirstSwap: 25,
  },
  
  // Streak Multipliers
  streakMultipliers: {
    day1to6: 1.0,
    day7to13: 1.5,
    day14to29: 2.0,
    day30plus: 3.0,
  },
  
  // Fee Tier Thresholds (tokens held for discount)
  feeTiers: {
    bronze: { min: 0, max: 999, discount: 0 },
    silver: { min: 1000, max: 4999, discount: 10 },
    gold: { min: 5000, max: 19999, discount: 25 },
    platinum: { min: 20000, max: 49999, discount: 50 },
    diamond: { min: 50000, max: Infinity, discount: 75 },
  },
  
  // Staking APY (future)
  stakingTiers: {
    flexible: 15,
    lock30Days: 18,
    lock90Days: 22,
    lock180Days: 28,
    lock365Days: 40,
  },
  
  // On-chain URLs and Metadata
  metadata: {
    url: 'https://10xswap.io/xtoken',
    description: 'X Token - The reward token for 10xSwap DEX ecosystem on Algorand',
  },
} as const

// Deployed Token Info (updated after deployment)
export interface XTokenDeployment {
  asaId: number
  creatorAddress: string
  treasuryAddress: string
  deployedAt: string
  network: 'testnet' | 'mainnet'
  txId: string
}

// Will be populated after deployment
export let X_TOKEN_DEPLOYMENT: XTokenDeployment | null = null

// Set deployment info (called after token is deployed)
export function setXTokenDeployment(deployment: XTokenDeployment) {
  X_TOKEN_DEPLOYMENT = deployment
}

// Get the ASA ID (from env or deployment)
export function getXTokenAsaId(): number | null {
  // First check environment variable
  const envAsaId = process.env.NEXT_PUBLIC_X_TOKEN_ASA_ID
  if (envAsaId) {
    return parseInt(envAsaId, 10)
  }
  
  // Fall back to deployment config
  return X_TOKEN_DEPLOYMENT?.asaId || null
}

// Get treasury address
export function getTreasuryAddress(): string | null {
  const envAddress = process.env.X_TOKEN_TREASURY_ADDRESS
  if (envAddress) {
    return envAddress
  }
  return X_TOKEN_DEPLOYMENT?.treasuryAddress || null
}

// Calculate base units from token amount
export function toBaseUnits(amount: number): bigint {
  return BigInt(Math.floor(amount * (10 ** X_TOKEN_CONFIG.decimals)))
}

// Calculate token amount from base units
export function fromBaseUnits(baseUnits: bigint | number): number {
  return Number(baseUnits) / (10 ** X_TOKEN_CONFIG.decimals)
}

// Format token amount for display
export function formatXTokenAmount(amount: number, decimals: number = 2): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(decimals)}M X`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(decimals)}K X`
  }
  return `${amount.toFixed(decimals)} X`
}

// Get fee discount based on token holdings
export function getFeeDiscount(xTokenBalance: number): { tier: string; discount: number } {
  const tiers = X_TOKEN_CONFIG.feeTiers
  
  if (xTokenBalance >= tiers.diamond.min) {
    return { tier: 'diamond', discount: tiers.diamond.discount }
  }
  if (xTokenBalance >= tiers.platinum.min) {
    return { tier: 'platinum', discount: tiers.platinum.discount }
  }
  if (xTokenBalance >= tiers.gold.min) {
    return { tier: 'gold', discount: tiers.gold.discount }
  }
  if (xTokenBalance >= tiers.silver.min) {
    return { tier: 'silver', discount: tiers.silver.discount }
  }
  return { tier: 'bronze', discount: tiers.bronze.discount }
}

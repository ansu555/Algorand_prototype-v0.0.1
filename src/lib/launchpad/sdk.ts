/**
 * WaveBreak Bonding Curve SDK
 * ============================
 * 
 * A modular, reusable SDK for fair token launches using bonding curves.
 * Can be integrated into various applications across different industries.
 * 
 * Use Cases:
 * - Meme Tokens: Community-driven fair launches
 * - DAO Governance: Fair distribution of voting tokens
 * - Gaming Tokens: In-game currency launches with anti-bot protection
 * - Creator Tokens: Personal tokens for artists/influencers
 * - Utility Tokens: Protocol tokens with controlled price discovery
 * 
 * Standards Compliance:
 * - ARC-4: Application Binary Interface (ABI)
 * - ARC-20: Fungible Token Standard
 * - ARC-0010/0011: dApp-Wallet Integration
 * 
 * @example
 * ```typescript
 * import { BondingCurveSDK } from '@/lib/launchpad/sdk'
 * 
 * const sdk = new BondingCurveSDK()
 * 
 * // Launch a token
 * const { asaId, appId } = await sdk.launchToken({
 *   name: 'My Token',
 *   symbol: 'MYT',
 *   totalSupply: 1000000,
 *   bondingTarget: 100000000000, // 100,000 ALGO
 *   curveType: 'sigmoid',
 * }, signer)
 * 
 * // Purchase tokens
 * const txId = await sdk.buyTokens(appId, asaId, 1000, signer)
 * ```
 */

// Core types
export type {
  LaunchProject,
  TokenPurchase,
  UserPoints,
  CurveType,
  ProjectStatus,
  BondingCurveConfig,
  LaunchResult,
} from './types'

// Algorand operations
export {
  // Token creation
  createARC20Token,
  
  // Contract deployment
  deployBondingCurveContract,
  initializeBondingCurve,
  fundBondingCurve,
  activateBondingCurve,
  
  // Purchase flow
  purchaseTokens,
  
  // Data fetching
  getCurrentPrice,
  getSaleStats,
  
  // Complete flow
  completeLaunchFlow,
  
  // Clients
  algodClient,
  indexerClient,
} from './algorand'

// Database operations
export {
  // Project management
  createLaunchProject,
  getLaunchProject,
  getAllLaunchProjects,
  updateProjectStatus,
  
  // Purchase tracking
  recordTokenPurchase,
  getUserPurchases,
  
  // Points system
  getUserPoints,
  updateUserPoints,
  
  // Analytics
  getProjectMetrics,
} from './db'

/**
 * Main SDK Class
 * 
 * Provides a unified interface for all bonding curve operations.
 */
export class BondingCurveSDK {
  /**
   * Launch a new token with bonding curve
   * 
   * This handles the complete launch flow:
   * 1. Create ARC-20 token (ASA)
   * 2. Deploy bonding curve smart contract
   * 3. Initialize contract parameters
   * 4. Fund contract with tokens
   * 5. Activate sale
   * 6. Record in database
   */
  async launchToken(
    config: {
      name: string
      symbol: string
      decimals?: number
      totalSupply: number
      description?: string
      logoUrl?: string
      websiteUrl?: string
      twitterUrl?: string
      telegramUrl?: string
      curveType: 'linear' | 'exponential' | 'sigmoid'
      basePrice: number // microALGO
      maxPrice: number // microALGO
      bondingTarget: number // microALGO
      tokensForSale: number
      liquidityPercentage?: number
      lpLockDuration?: number
    },
    creatorAddress: string,
    signer: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<{ asaId: number; appId: number; projectId: string }> {
    const { completeLaunchFlow } = await import('./algorand')
    const { createLaunchProject } = await import('./db')
    
    console.log('🚀 Launching token:', config.name)
    
    // Execute on-chain launch
    const { asaId, appId } = await completeLaunchFlow(
      creatorAddress,
      {
        creator_address: creatorAddress,
        token_name: config.name,
        token_symbol: config.symbol,
        token_decimals: config.decimals || 6,
        total_supply: BigInt(config.totalSupply),
        description: config.description,
        logo_url: config.logoUrl,
        website_url: config.websiteUrl,
        twitter_url: config.twitterUrl,
        telegram_url: config.telegramUrl,
        curve_type: config.curveType,
        base_price: BigInt(config.basePrice),
        max_price: BigInt(config.maxPrice),
        bonding_target: BigInt(config.bondingTarget),
        tokens_for_sale: BigInt(config.tokensForSale),
        liquidity_percentage: config.liquidityPercentage || 80,
        lp_lock_duration: BigInt(config.lpLockDuration || 15552000),
        dex_platform: 'tinyman',
        status: 'active',
        tokens_sold: BigInt(0),
        algo_raised: BigInt(0),
        participant_count: 0,
        created_at: new Date().toISOString(),
      },
      signer
    )
    
    // Record in database
    const projectId = await createLaunchProject({
      ...config,
      creator_address: creatorAddress,
      asa_id: BigInt(asaId),
      app_id: BigInt(appId),
      status: 'active',
    })
    
    console.log('✅ Launch complete!')
    console.log(`   Project ID: ${projectId}`)
    console.log(`   ASA ID: ${asaId}`)
    console.log(`   App ID: ${appId}`)
    
    return { asaId, appId, projectId }
  }
  
  /**
   * Purchase tokens from bonding curve
   */
  async buyTokens(
    appId: number,
    asaId: number,
    tokenAmount: number,
    buyerAddress: string,
    signer: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<string> {
    const { purchaseTokens, getCurrentPrice } = await import('./algorand')
    
    // Get current price
    const currentPrice = await getCurrentPrice(appId)
    const algoPayment = Math.ceil((currentPrice * tokenAmount) / 1_000_000)
    
    console.log(`💰 Purchasing ${tokenAmount} tokens for ${algoPayment / 1_000_000} ALGO`)
    
    // Execute purchase
    return purchaseTokens(buyerAddress, appId, asaId, tokenAmount, algoPayment, signer)
  }
  
  /**
   * Get project details
   */
  async getProject(projectId: string) {
    const { getLaunchProject } = await import('./db')
    return getLaunchProject(projectId)
  }
  
  /**
   * List all projects
   */
  async listProjects(filters?: { status?: string; creator?: string }) {
    const { getAllLaunchProjects } = await import('./db')
    return getAllLaunchProjects(filters)
  }
  
  /**
   * Get user's purchase history
   */
  async getUserPurchaseHistory(userAddress: string, projectId?: string) {
    const { getUserPurchases } = await import('./db')
    return getUserPurchases(userAddress, projectId)
  }
  
  /**
   * Get user's points balance
   */
  async getUserPointsBalance(userAddress: string, projectId: string) {
    const { getUserPoints } = await import('./db')
    return getUserPoints(userAddress, projectId)
  }
  
  /**
   * Get on-chain sale statistics
   */
  async getSaleStatistics(appId: number) {
    const { getSaleStats } = await import('./algorand')
    return getSaleStats(appId)
  }
  
  /**
   * Get current token price
   */
  async getTokenPrice(appId: number) {
    const { getCurrentPrice } = await import('./algorand')
    return getCurrentPrice(appId)
  }
}

/**
 * Industry-Specific SDK Extensions
 */

/**
 * MemeTokenLauncher - Simplified interface for meme token launches
 */
export class MemeTokenLauncher extends BondingCurveSDK {
  async launchMemeToken(config: {
    name: string
    symbol: string
    logoUrl: string
    websiteUrl?: string
    twitterUrl?: string
    telegramUrl?: string
    totalSupply: number
    bondingTarget: number
  }, creatorAddress: string, signer: any) {
    return this.launchToken({
      ...config,
      decimals: 6,
      curveType: 'sigmoid', // Memes use sigmoid for hype curve
      basePrice: 1000, // 0.001 ALGO
      maxPrice: 100000, // 0.1 ALGO
      tokensForSale: config.totalSupply,
      liquidityPercentage: 80,
    }, creatorAddress, signer)
  }
}

/**
 * DAOTokenLauncher - Governance token launches for DAOs
 */
export class DAOTokenLauncher extends BondingCurveSDK {
  async launchGovernanceToken(config: {
    name: string
    symbol: string
    description: string
    websiteUrl: string
    totalSupply: number
    bondingTarget: number
    votingPower?: 'linear' | 'quadratic'
  }, creatorAddress: string, signer: any) {
    return this.launchToken({
      ...config,
      decimals: 6,
      curveType: 'linear', // Fair linear distribution for governance
      basePrice: 10000, // 0.01 ALGO
      maxPrice: 50000, // 0.05 ALGO
      tokensForSale: Math.floor(config.totalSupply * 0.7), // 70% public sale
      liquidityPercentage: 90, // More liquidity for governance tokens
    }, creatorAddress, signer)
  }
}

/**
 * GamingTokenLauncher - In-game currency launches
 */
export class GamingTokenLauncher extends BondingCurveSDK {
  async launchGameCurrency(config: {
    name: string
    symbol: string
    gameTitle: string
    description: string
    logoUrl: string
    websiteUrl: string
    totalSupply: number
    bondingTarget: number
  }, creatorAddress: string, signer: any) {
    return this.launchToken({
      ...config,
      decimals: 6,
      curveType: 'exponential', // Incentivize early players
      basePrice: 500, // 0.0005 ALGO (very low for in-game currency)
      maxPrice: 10000, // 0.01 ALGO
      tokensForSale: Math.floor(config.totalSupply * 0.5), // 50% via bonding curve
      liquidityPercentage: 75,
    }, creatorAddress, signer)
  }
}

/**
 * CreatorTokenLauncher - Personal tokens for artists/influencers
 */
export class CreatorTokenLauncher extends BondingCurveSDK {
  async launchCreatorToken(config: {
    name: string
    symbol: string
    creatorName: string
    description: string
    profileImageUrl: string
    websiteUrl?: string
    twitterUrl?: string
    totalSupply: number
    bondingTarget: number
  }, creatorAddress: string, signer: any) {
    return this.launchToken({
      ...config,
      decimals: 6,
      curveType: 'sigmoid', // Reward early supporters
      basePrice: 5000, // 0.005 ALGO
      maxPrice: 200000, // 0.2 ALGO
      tokensForSale: Math.floor(config.totalSupply * 0.6), // 60% public
      liquidityPercentage: 80,
    }, creatorAddress, signer)
  }
}

/**
 * Usage Examples for Judges
 */
export const SDK_USAGE_EXAMPLES = {
  meme: `
// Launch a meme token
import { MemeTokenLauncher } from '@/lib/launchpad/sdk'

const launcher = new MemeTokenLauncher()
const result = await launcher.launchMemeToken({
  name: "Doge Moon",
  symbol: "DMOON",
  logoUrl: "ipfs://...",
  twitterUrl: "https://twitter.com/dogemoon",
  totalSupply: 1000000000, // 1B tokens
  bondingTarget: 100000000000, // 100K ALGO
}, creatorAddress, signer)

console.log('Launched:', result.asaId, result.appId)
`,
  
  dao: `
// Launch a DAO governance token
import { DAOTokenLauncher } from '@/lib/launchpad/sdk'

const launcher = new DAOTokenLauncher()
const result = await launcher.launchGovernanceToken({
  name: "AlgoDAO Governance",
  symbol: "ADAO",
  description: "Vote on protocol upgrades",
  websiteUrl: "https://algodao.org",
  totalSupply: 10000000, // 10M tokens
  bondingTarget: 500000000000, // 500K ALGO
  votingPower: 'quadratic',
}, creatorAddress, signer)
`,
  
  gaming: `
// Launch in-game currency
import { GamingTokenLauncher } from '@/lib/launchpad/sdk'

const launcher = new GamingTokenLauncher()
const result = await launcher.launchGameCurrency({
  name: "Space Coins",
  symbol: "SPACE",
  gameTitle: "Galaxy Conquest",
  description: "In-game currency for Galaxy Conquest",
  logoUrl: "https://...",
  websiteUrl: "https://galaxyconquest.game",
  totalSupply: 1000000000, // 1B coins
  bondingTarget: 50000000000, // 50K ALGO
}, creatorAddress, signer)
`,
  
  creator: `
// Launch creator token
import { CreatorTokenLauncher } from '@/lib/launchpad/sdk'

const launcher = new CreatorTokenLauncher()
const result = await launcher.launchCreatorToken({
  name: "Artist Token",
  symbol: "ART",
  creatorName: "Famous Artist",
  description: "Access exclusive content and events",
  profileImageUrl: "https://...",
  twitterUrl: "https://twitter.com/artist",
  totalSupply: 100000, // 100K tokens
  bondingTarget: 100000000000, // 100K ALGO
}, creatorAddress, signer)
`,
}

/**
 * Quick Start Guide
 */
export const QUICK_START = `
# WaveBreak Bonding Curve SDK - Quick Start

## Installation
\`\`\`bash
npm install algosdk
\`\`\`

## Basic Usage

### 1. Launch a Token
\`\`\`typescript
import { BondingCurveSDK } from '@/lib/launchpad/sdk'

const sdk = new BondingCurveSDK()

const { asaId, appId, projectId } = await sdk.launchToken({
  name: "My Token",
  symbol: "MYT",
  totalSupply: 1000000,
  curveType: "sigmoid",
  basePrice: 1000,
  maxPrice: 100000,
  bondingTarget: 100000000000,
  tokensForSale: 1000000,
}, creatorAddress, signer)
\`\`\`

### 2. Buy Tokens
\`\`\`typescript
const txId = await sdk.buyTokens(
  appId,
  asaId,
  1000, // token amount
  buyerAddress,
  signer
)
\`\`\`

### 3. Check Price
\`\`\`typescript
const price = await sdk.getTokenPrice(appId)
console.log(\`Current price: \${price / 1_000_000} ALGO\`)
\`\`\`

## Industry-Specific Launchers

Use pre-configured launchers for common use cases:

- **MemeTokenLauncher**: Meme tokens with sigmoid curves
- **DAOTokenLauncher**: Governance tokens with linear curves
- **GamingTokenLauncher**: In-game currencies with exponential curves
- **CreatorTokenLauncher**: Personal tokens for artists/influencers

See SDK_USAGE_EXAMPLES for detailed code samples.
`

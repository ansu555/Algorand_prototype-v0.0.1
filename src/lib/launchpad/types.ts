// TypeScript types for WaveBreak Launchpad

export type CurveType = 'linear' | 'exponential' | 'sigmoid'
export type ProjectStatus = 'pending' | 'active' | 'graduated' | 'cancelled'
export type DexPlatform = 'tinyman' | 'pact' | 'folks'

export interface LaunchProject {
  id: string
  creatorAddress: string
  tokenName: string
  tokenSymbol: string
  tokenDecimals: number
  totalSupply: bigint
  description?: string
  logoUrl?: string
  websiteUrl?: string
  twitterUrl?: string
  telegramUrl?: string

  // ASA Information
  asaId?: bigint
  appId?: bigint
  configTxId?: string
  bootstrapTxId?: string
  fundingTxId?: string

  // Bonding Curve Config
  curveType: CurveType
  basePrice: bigint // microALGO
  maxPrice: bigint // microALGO
  bondingTarget: bigint // microALGO to raise
  tokensForSale: bigint

  // Sale State
  status: ProjectStatus
  tokensSold: bigint
  algoRaised: bigint
  participantCount: number
  launchRound?: bigint
  graduationRound?: bigint

  // Liquidity Config
  liquidityPercentage: number // 0-100
  lpLockDuration: bigint // blocks
  dexPlatform: DexPlatform

  // Security Config
  maxBuyPerTx?: bigint
  maxBuyPerUser?: bigint
  cooldownBlocks?: bigint

  // Timestamps
  createdAt: string
  launchedAt?: string
  graduatedAt?: string
  updatedAt: string
}

export interface TokenPurchase {
  id: string
  projectId: string
  buyerAddress: string
  tokensAmount: bigint
  algoPaid: bigint
  pricePerToken: bigint
  pointsEarned: bigint
  transactionId: string
  blockRound: bigint
  timestamp: string
}

export interface LaunchpadPoints {
  userAddress: string
  projectId: string
  pointsBalance: bigint
  totalEarned: bigint
  totalClaimed: bigint
  lastClaimRound?: bigint
  createdAt: string
  updatedAt: string
}

export interface LaunchpadClaim {
  id: string
  userAddress: string
  projectId: string
  claimDay: number
  pointsUsed: bigint
  algoClaimed: bigint
  transactionId?: string
  blockRound?: bigint
  timestamp: string
}

export interface LaunchpadLiquidity {
  projectId: string
  poolAddress?: string
  poolAppId?: bigint
  lpTokenId?: bigint
  lpTokensMinted?: bigint
  lpTokensLocked?: bigint
  lockExpiryRound?: bigint
  algoDeposited?: bigint
  tokensDeposited?: bigint
  createdAt: string
}

export interface AntiBotRecord {
  userAddress: string
  projectId: string
  purchaseCount: number
  lastPurchaseRound?: bigint
  totalTokensBought: bigint
  flaggedAsBot: boolean
  whalePenalty: boolean
  createdAt: string
  updatedAt: string
}

export interface LaunchpadMetrics {
  projectId: string
  uniqueBuyers: number
  avgPurchaseSize: bigint
  medianPurchaseSize: bigint
  largestPurchase: bigint
  smallestPurchase: bigint
  priceAt25Percent?: bigint
  priceAt50Percent?: bigint
  priceAt75Percent?: bigint
  priceAt100Percent?: bigint
  totalPointsDistributed: bigint
  updatedAt: string
}

export interface WhitelistEntry {
  projectId: string
  userAddress: string
  allocationLimit?: bigint
  addedBy: string
  addedAt: string
}

// Bonding Curve Calculation Types
export interface BondingCurveParams {
  curveType: CurveType
  basePrice: bigint
  maxPrice: bigint
  totalSupply: bigint
  tokensSold: bigint
}

export interface PriceQuote {
  tokensAmount: bigint
  totalCost: bigint
  averagePrice: bigint
  priceImpact: number // percentage
  pointsToEarn: bigint
}

// Constants
export const BLOCKS_PER_DAY = 28800n // ~3.3s per block
export const DEFAULT_LP_LOCK_MONTHS = 6
export const MAX_PURCHASE_PER_TX_PERCENT = 1 // 1% of total supply
export const MAX_PURCHASE_PER_USER_PERCENT = 5 // 5% of total supply
export const COOLDOWN_BLOCKS = 10n // ~33 seconds between purchases
export const POINTS_MULTIPLIER_BASE = 10000n // For fixed-point math
export const EARLY_BONUS_MULTIPLIER = 30000n // Up to 3x for earliest buyers

// Helper functions
export function calculateProgress(tokensSold: bigint, totalSupply: bigint): number {
  if (totalSupply === 0n) return 0
  return Number((tokensSold * 10000n) / totalSupply) / 100
}

export function calculateEarlyBonus(progress: number): number {
  // Returns multiplier from 1.0 to 3.0 based on progress (0-100%)
  // Earlier = higher bonus
  return 3.0 - (progress / 100) * 2.0
}

export function blocksToSeconds(blocks: bigint): number {
  return Number(blocks) * 3.3
}

export function secondsToBlocks(seconds: number): bigint {
  return BigInt(Math.ceil(seconds / 3.3))
}

export function formatAlgo(microAlgo: bigint): string {
  return (Number(microAlgo) / 1_000_000).toFixed(6)
}

export function formatTokens(amount: bigint, decimals: number): string {
  return (Number(amount) / Math.pow(10, decimals)).toFixed(decimals)
}

// Type definitions for the WaveBreak Token Launchpad

export type ProjectStatus = 'pending' | 'active' | 'graduated'
export type CurveType = 'linear' | 'exponential' | 'sigmoid'

export interface LaunchProject {
  id: string
  creatorAddress: string
  tokenName: string
  tokenSymbol: string
  tokenDecimals: number
  totalSupply: bigint
  description: string
  logoUrl?: string
  websiteUrl?: string
  twitterUrl?: string
  telegramUrl?: string
  curveType: CurveType
  basePrice: bigint
  maxPrice: bigint
  bondingTarget: bigint
  tokensForSale: bigint
  tokensSold: bigint
  algoRaised: bigint
  participantCount: number
  status: ProjectStatus
  liquidityPercentage: number
  lpLockDuration: bigint
  dexPlatform: string
  // Blockchain fields
  asaId?: bigint
  appId?: bigint
  configTxId?: string
  bootstrapTxId?: string
  fundingTxId?: string
  launchRound?: bigint
  graduationRound?: bigint
  // Anti-bot params
  maxBuyPerTx?: bigint
  maxBuyPerUser?: bigint
  cooldownBlocks?: bigint
  // Timestamps
  createdAt: string
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

export interface UserPoints {
  userAddress: string
  projectId: string
  pointsBalance: bigint
  totalEarned: bigint
  totalClaimed: bigint
  lastClaimRound?: bigint
  createdAt: string
  updatedAt: string
}

export interface PriceQuote {
  tokensAmount: bigint
  totalCost: bigint
  averagePrice: bigint
  priceImpact: number
  pointsToEarn: bigint
}

export interface AntiBotRecord {
  userAddress: string
  projectId: string
  purchaseCount: number
  lastPurchaseRound?: bigint
  totalTokensBought: bigint
  flaggedAsBot: number
  whalePenalty: number
}

export interface ProjectHolder {
  buyerAddress: string
  totalTokens: bigint
  totalAlgo: bigint
  purchaseCount: number
  lastPurchaseAt: string | null
}

export interface UserPortfolio {
  projectId: string
  tokenName: string
  tokenSymbol: string
  tokenDecimals: number
  logoUrl?: string
  tokensHeld: bigint
  algoSpent: bigint
  averagePrice: bigint
  purchaseCount: number
  totalPointsEarned: bigint
  firstPurchaseAt: string
  lastPurchaseAt: string
}

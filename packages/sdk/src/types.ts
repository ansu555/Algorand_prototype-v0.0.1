/**
 * Common types used across the 10xSwap SDK
 */

import type { Transaction } from 'algosdk'

export type Network = 'testnet' | 'mainnet'

/**
 * Swap and Routing Types
 */
export interface QuoteRequest {
  assetIn: number
  assetOut: number
  amount: number
  maxHops?: number
  slippage?: number
}

export interface SwapQuote {
  assetIn: number
  assetOut: number
  amountIn: number
  amountOut: number
  minReceived: number
  priceImpact: number
  fee: number
  dex: string
  route?: SwapRoute
  path?: number[]
}

export interface SwapRoute {
  pools: PoolInfo[]
  path: number[]
  totalFee: number
}

export interface PoolInfo {
  poolId: string
  asset1: number
  asset2: number
  reserve1: number
  reserve2: number
  lpTokenId?: number
  feeBps: number
  dex: string
}

/**
 * Transaction Result Types
 */
export interface TxResult {
  txId: string
  confirmedRound?: number
}

/**
 * Agent Wallet Types
 */
export interface BalanceInfo {
  algo: number
  availableBalance: number
  assets: AssetHolding[]
}

export interface AssetHolding {
  assetId: number
  balance: number
  symbol: string
  decimals: number
}

export interface TransferParams {
  to: string
  amount: number
  assetId: number
  note?: string
}

/**
 * AutoPilot Rule Types
 */
export type RuleType = 'dca' | 'rebalance' | 'rotate'
export type RuleStatus = 'active' | 'paused' | 'cancelled'
export type TriggerType = 'price_drop_pct' | 'trend' | 'momentum'

export interface RuleConfig {
  strategy: 'DCA' | 'REBALANCE' | 'ROTATE'
  assetIn?: number
  assetOut?: number
  targets?: string[]
  trigger: TriggerConfig
  maxSpendUSD: number
  maxSlippage: number
  cooldownMinutes: number
  rotateTopN?: number
}

export interface TriggerConfig {
  type: TriggerType
  value?: number
  window?: string
  threshold?: number
  lookback?: number
}

export interface Rule {
  id: string
  ownerAddress: string
  type: RuleType
  targets: string[]
  trigger: TriggerConfig
  maxSpendUSD: number
  maxSlippage: number
  cooldownMinutes: number
  status: RuleStatus
  createdAt: number
  lastExecuted?: number
  totalExecutions: number
  totalSpent: number
}

/**
 * Market Analysis Types
 */
export interface AnalysisRequest {
  coin: string
  horizonDays?: number
  granularity?: string
  tasks?: ('analysis' | 'prediction' | 'strategy' | 'charts')[]
  chartType?: 'line' | 'candlestick' | 'area' | 'bar'
}

export interface AnalysisResult {
  ok: boolean
  summary?: string
  insights?: string[]
  predictions?: Prediction[]
  strategies?: Strategy[]
  charts?: Chart[]
  marketData?: MarketData
  error?: string
}

export interface Prediction {
  date: string
  price: number
  probability: number
}

export interface Strategy {
  action: 'buy' | 'sell' | 'hold'
  confidence: number
  reason: string
  entryPoint?: number
  exitPoint?: number
  stopLoss?: number
}

export interface Chart {
  title: string
  type: string
  url: string
}

export interface MarketData {
  price: number
  priceChangePercentage24h: number
  marketCap: number
  marketCapRank?: number
  volume24h: number
  circulatingSupply: number
  totalSupply?: number
  maxSupply?: number
  ath: number
  athDate: string
  athChangePercentage: number
  atl: number
  atlDate: string
  atlChangePercentage: number
  links: {
    homepage: string[]
    twitter?: string
    telegram?: string
    reddit?: string
    github: string[]
    explorer: string[]
    exchanges: Array<{ name: string; url: string }>
  }
}

export interface FearGreedIndex {
  value: number
  valueClassification: string
  timestamp: string
}

export interface TrendingToken {
  id: string
  name: string
  symbol: string
  priceChange24h: number
  marketCap?: number
  volume24h?: number
}

/**
 * Liquidity Pool Types
 */
export interface PoolInfoDetailed {
  poolId: string
  asset1: number
  asset2: number
  reserve1: number
  reserve2: number
  lpTokenSupply: number
  lpTokenId: number
  feeBps: number
  totalLiquidity: number
}

export interface QuoteResult {
  amountOut: number
  priceImpact: number
  fee: number
  minReceived: number
}

export interface LiquidityParams {
  amount1: number
  amount2: number
  minLpTokens: number
}

/**
 * API Configuration
 */
export interface SDKConfig {
  network: Network
  algodUrl?: string
  algodToken?: string
  algodPort?: number
  apiBaseUrl?: string
}

/**
 * Error Types
 */
export class SDKError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'SDKError'
  }
}

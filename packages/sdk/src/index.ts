/**
 * 10xSwap SDK - Official TypeScript SDK for Algorand DeFi Platform
 * @packageDocumentation
 */

// Core modules
export { SwapRouter } from './SwapRouter'
export { AgentWallet } from './AgentWallet'
export { AutoPilot } from './AutoPilot'
export { MarketAnalysis } from './MarketAnalysis'
export { LiquidityPool } from './LiquidityPool'

// Types
export type {
  Network,
  QuoteRequest,
  SwapQuote,
  SwapRoute,
  PoolInfo,
  TxResult,
  BalanceInfo,
  AssetHolding,
  TransferParams,
  RuleType,
  RuleStatus,
  TriggerType,
  RuleConfig,
  TriggerConfig,
  Rule,
  AnalysisRequest,
  AnalysisResult,
  Prediction,
  Strategy,
  Chart,
  MarketData,
  FearGreedIndex,
  TrendingToken,
  PoolInfoDetailed,
  QuoteResult,
  LiquidityParams,
  SDKConfig,
  SDKError,
} from './types'

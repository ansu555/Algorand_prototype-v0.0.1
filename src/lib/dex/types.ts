import type algosdk from 'algosdk';
import type { SignerTransaction } from '@tinymanorg/tinyman-js-sdk';

/**
 * DEX Integration Types
 * Common interfaces for multi-DEX routing and aggregation
 */

export interface Asset {
  id: number;
  name: string;
  symbol: string;
  decimals: number;
  unitName?: string;
}

export interface PoolInfo {
  poolId: string;
  dexName: 'tinyman' | 'pact' | 'vestige' | 'humble' | '10xswap';
  asset1: Asset;
  asset2: Asset;
  reserve1: bigint;
  reserve2: bigint;
  totalLiquidity: bigint;
  fee: number; // Fee in basis points (e.g., 30 = 0.3%)
  poolAddress?: string;
  appId?: number;
  lpTokenId?: number; // LP token asset ID (mainly for 10xswap)
  lastUpdated?: number; // Unix timestamp
}

export interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number; // Percentage (e.g., 0.5 = 0.5%)
  fee: bigint;
  feeBps: number; // Fee in basis points
  minimumAmountOut: bigint; // With slippage tolerance applied
  route: SwapRoute;
  executionPrice: number; // Price per unit
  inversePrice: number; // Inverse price
}

export interface SwapRoute {
  path: Asset[]; // [ALGO, USDC] or [ALGO, PLANET, USDC]
  pools: PoolInfo[];
  dexes: string[]; // ['tinyman', 'pact']
  hops: number; // Number of swaps (path.length - 1)
}

export interface SwapResult {
  txId: string;
  confirmedRound?: number;
  amountOut: bigint;
  route: SwapRoute;
  details: any;
}

export interface QuoteRequest {
  assetIn: Asset | number; // Asset object or asset ID
  assetOut: Asset | number;
  amountIn: bigint;
  slippageTolerance?: number; // Default 0.5%
  maxHops?: number; // Default 3
}

export interface WalletSigner {
  address: string;
  signTransactions(transactions: algosdk.Transaction[]): Promise<Uint8Array[]>;
  signTinymanTransactions?: (
    txGroups: SignerTransaction[][],
  ) => Promise<Uint8Array[]>;
}

/**
 * Generic DEX Client Interface
 * All DEX implementations must conform to this interface
 */
export interface IDexClient {
  readonly name: 'tinyman' | 'pact' | 'vestige' | 'humble' | '10xswap';
  readonly network: 'mainnet' | 'testnet';
  
  /**
   * Fetch all available pools from this DEX
   */
  fetchPools(): Promise<PoolInfo[]>;
  
  /**
   * Get pool information for a specific asset pair
   */
  getPool(asset1Id: number, asset2Id: number): Promise<PoolInfo | null>;
  
  /**
   * Get swap quote for given input/output
   */
  getQuote(request: QuoteRequest): Promise<SwapQuote>;
  
  /**
   * Execute the swap
   */
  executeSwap(quote: SwapQuote, signer: WalletSigner): Promise<SwapResult>;
  
  /**
   * Check if pool exists for asset pair
   */
  hasPool(asset1Id: number, asset2Id: number): Promise<boolean>;
}

/**
 * Aggregated quote from multiple DEXs
 */
export interface AggregatedQuote {
  bestQuote: SwapQuote;
  allQuotes: SwapQuote[];
  savings: bigint; // Compared to worst quote
  savingsPercentage: number;
}

/**
 * Route finding options
 */
export interface RouteFinderOptions {
  maxHops: number;
  maxRoutes: number; // Max routes to return
  minLiquidity?: bigint; // Minimum pool liquidity
  excludedDexes?: string[];
  preferredDexes?: string[];
}

/**
 * Pool data cache entry
 */
export interface CachedPoolData {
  pools: Map<string, PoolInfo>; // Key: "assetId1-assetId2"
  lastUpdated: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Pool Creation Types
 */
export interface CreatePoolParams {
  asset1Id: number;
  asset2Id: number;
  amount1: bigint;
  amount2: bigint;
  feeBps: number; // Fee in basis points (e.g., 30 = 0.3%)
  userAddress: string;
}

export interface CreatePoolResult {
  txId: string;
  confirmedRound: number;
  poolAddress: string;
  lpTokenId: number;
  lpTokensReceived: bigint;
}

export interface LiquidityPosition {
  poolId: string;
  poolAddress: string;
  asset1: Asset;
  asset2: Asset;
  lpTokenId: number;
  lpTokenAmount: bigint;
  share: number; // Percentage of pool owned (e.g., 0.5 = 0.5%)
  asset1Amount: bigint; // User's share of asset 1
  asset2Amount: bigint; // User's share of asset 2
  feeBps: number;
}

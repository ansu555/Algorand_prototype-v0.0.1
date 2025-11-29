import { Transaction, Algodv2 } from 'algosdk';

/**
 * Common types used across the 10xSwap SDK
 */
type Network = 'testnet' | 'mainnet';
/**
 * Swap and Routing Types
 */
interface QuoteRequest {
    assetIn: number;
    assetOut: number;
    amount: number;
    maxHops?: number;
    slippage?: number;
}
interface SwapQuote {
    assetIn: number;
    assetOut: number;
    amountIn: number;
    amountOut: number;
    minReceived: number;
    priceImpact: number;
    fee: number;
    dex: string;
    route?: SwapRoute;
    path?: number[];
}
interface SwapRoute {
    pools: PoolInfo[];
    path: number[];
    totalFee: number;
}
interface PoolInfo {
    poolId: string;
    asset1: number;
    asset2: number;
    reserve1: number;
    reserve2: number;
    lpTokenId?: number;
    feeBps: number;
    dex: string;
}
/**
 * Transaction Result Types
 */
interface TxResult {
    txId: string;
    confirmedRound?: number;
}
/**
 * Agent Wallet Types
 */
interface BalanceInfo {
    algo: number;
    availableBalance: number;
    assets: AssetHolding[];
}
interface AssetHolding {
    assetId: number;
    balance: number;
    symbol: string;
    decimals: number;
}
interface TransferParams {
    to: string;
    amount: number;
    assetId: number;
    note?: string;
}
/**
 * AutoPilot Rule Types
 */
type RuleType = 'dca' | 'rebalance' | 'rotate';
type RuleStatus = 'active' | 'paused' | 'cancelled';
type TriggerType = 'price_drop_pct' | 'trend' | 'momentum';
interface RuleConfig {
    strategy: 'DCA' | 'REBALANCE' | 'ROTATE';
    assetIn?: number;
    assetOut?: number;
    targets?: string[];
    trigger: TriggerConfig;
    maxSpendUSD: number;
    maxSlippage: number;
    cooldownMinutes: number;
    rotateTopN?: number;
}
interface TriggerConfig {
    type: TriggerType;
    value?: number;
    window?: string;
    threshold?: number;
    lookback?: number;
}
interface Rule {
    id: string;
    ownerAddress: string;
    type: RuleType;
    targets: string[];
    trigger: TriggerConfig;
    maxSpendUSD: number;
    maxSlippage: number;
    cooldownMinutes: number;
    status: RuleStatus;
    createdAt: number;
    lastExecuted?: number;
    totalExecutions: number;
    totalSpent: number;
}
/**
 * Market Analysis Types
 */
interface AnalysisRequest {
    coin: string;
    horizonDays?: number;
    granularity?: string;
    tasks?: ('analysis' | 'prediction' | 'strategy' | 'charts')[];
    chartType?: 'line' | 'candlestick' | 'area' | 'bar';
}
interface AnalysisResult {
    ok: boolean;
    summary?: string;
    insights?: string[];
    predictions?: Prediction[];
    strategies?: Strategy[];
    charts?: Chart[];
    marketData?: MarketData;
    error?: string;
}
interface Prediction {
    date: string;
    price: number;
    probability: number;
}
interface Strategy {
    action: 'buy' | 'sell' | 'hold';
    confidence: number;
    reason: string;
    entryPoint?: number;
    exitPoint?: number;
    stopLoss?: number;
}
interface Chart {
    title: string;
    type: string;
    url: string;
}
interface MarketData {
    price: number;
    priceChangePercentage24h: number;
    marketCap: number;
    marketCapRank?: number;
    volume24h: number;
    circulatingSupply: number;
    totalSupply?: number;
    maxSupply?: number;
    ath: number;
    athDate: string;
    athChangePercentage: number;
    atl: number;
    atlDate: string;
    atlChangePercentage: number;
    links: {
        homepage: string[];
        twitter?: string;
        telegram?: string;
        reddit?: string;
        github: string[];
        explorer: string[];
        exchanges: Array<{
            name: string;
            url: string;
        }>;
    };
}
interface FearGreedIndex {
    value: number;
    valueClassification: string;
    timestamp: string;
}
interface TrendingToken {
    id: string;
    name: string;
    symbol: string;
    priceChange24h: number;
    marketCap?: number;
    volume24h?: number;
}
/**
 * Liquidity Pool Types
 */
interface PoolInfoDetailed {
    poolId: string;
    asset1: number;
    asset2: number;
    reserve1: number;
    reserve2: number;
    lpTokenSupply: number;
    lpTokenId: number;
    feeBps: number;
    totalLiquidity: number;
}
interface QuoteResult {
    amountOut: number;
    priceImpact: number;
    fee: number;
    minReceived: number;
}
interface LiquidityParams {
    amount1: number;
    amount2: number;
    minLpTokens: number;
}
/**
 * API Configuration
 */
interface SDKConfig {
    network: Network;
    algodUrl?: string;
    algodToken?: string;
    algodPort?: number;
    apiBaseUrl?: string;
}
/**
 * Error Types
 */
declare class SDKError extends Error {
    code?: string | undefined;
    details?: any | undefined;
    constructor(message: string, code?: string | undefined, details?: any | undefined);
}

/**
 * SwapRouter - Multi-DEX routing and optimal swap path finding
 */

declare class SwapRouter {
    private algodClient;
    private network;
    private pools;
    private apiBaseUrl;
    private initialized;
    constructor(config: Network | SDKConfig);
    private createDefaultAlgodClient;
    /**
     * Initialize the router by fetching all available pools
     */
    initialize(): Promise<void>;
    /**
     * Find the best route for a swap across all DEXs
     */
    findBestRoute(request: QuoteRequest): Promise<SwapQuote>;
    /**
     * Build unsigned swap transaction
     */
    buildSwapTransaction(quote: SwapQuote, sender: string): Promise<Transaction>;
    /**
     * Get all available pools
     */
    getPools(): PoolInfo[];
    /**
     * Get pools for a specific asset pair
     */
    getPoolsForPair(asset1: number, asset2: number): PoolInfo[];
    /**
     * Get the Algod client instance
     */
    getAlgodClient(): Algodv2;
    /**
     * Get current network
     */
    getNetwork(): Network;
    private handleError;
}

/**
 * AgentWallet - Encrypted wallet management for automated trading
 */

declare class AgentWallet {
    private account;
    private algodClient;
    private network;
    private apiBaseUrl;
    private constructor();
    /**
     * Create a new agent wallet
     */
    static create(userAddress: string, password: string, config?: Network | SDKConfig): Promise<AgentWallet>;
    /**
     * Recover an existing agent wallet
     */
    static recover(userAddress: string, password: string, config?: Network | SDKConfig): Promise<AgentWallet>;
    /**
     * Get wallet address
     */
    getAddress(): string;
    /**
     * Get wallet balance and holdings
     */
    getBalance(): Promise<BalanceInfo>;
    /**
     * Opt-in to an asset
     */
    optIn(assetId: number): Promise<TxResult>;
    /**
     * Transfer ALGO or ASA
     */
    transfer(params: TransferParams): Promise<TxResult>;
    /**
     * Execute a swap using a quote
     */
    swap(quote: SwapQuote): Promise<TxResult>;
    /**
     * Get the Algod client
     */
    getAlgodClient(): Algodv2;
    /**
     * Get the network
     */
    getNetwork(): Network;
    private static parseConfig;
    private static handleError;
}

/**
 * AutoPilot - Automated trading rules engine
 */

declare class AutoPilot {
    private network;
    private apiBaseUrl;
    private contractId?;
    constructor(config: Network | SDKConfig, contractId?: string);
    /**
     * Create a new automated trading rule
     */
    createRule(config: RuleConfig, ownerAddress: string): Promise<Rule>;
    /**
     * Get all rules for a user
     */
    getRules(ownerAddress: string): Promise<Rule[]>;
    /**
     * Get a specific rule by ID
     */
    getRule(ruleId: string, ownerAddress: string): Promise<Rule>;
    /**
     * Update rule status (pause/resume/cancel)
     */
    updateRuleStatus(ruleId: string, status: RuleStatus, ownerAddress: string): Promise<void>;
    /**
     * Update rule parameters
     */
    updateRuleParameters(ruleId: string, ownerAddress: string, updates: Partial<{
        maxSpendUSD: number;
        maxSlippage: number;
        cooldownMinutes: number;
        targets: string[];
    }>): Promise<void>;
    /**
     * Manually execute a rule
     */
    executeRule(ruleId: string, ownerAddress: string): Promise<TxResult>;
    /**
     * Delete a rule
     */
    deleteRule(ruleId: string, ownerAddress: string): Promise<void>;
    /**
     * Get rule execution statistics
     */
    getRuleStats(ruleId: string, ownerAddress: string): Promise<{
        totalExecutions: number;
        totalSpent: number;
        lastExecuted?: number;
        averageReturn?: number;
    }>;
    private handleError;
}

/**
 * MarketAnalysis - AI-powered cryptocurrency analysis and predictions
 */

declare class MarketAnalysis {
    private network;
    private apiBaseUrl;
    constructor(config?: Network | SDKConfig);
    /**
     * Analyze a cryptocurrency with AI
     */
    analyze(request: AnalysisRequest): Promise<AnalysisResult>;
    /**
     * Get Fear & Greed Index
     */
    getFearGreedIndex(): Promise<FearGreedIndex>;
    /**
     * Get trending cryptocurrencies
     */
    getTrendingCoins(): Promise<TrendingToken[]>;
    /**
     * Get trending Algorand ecosystem tokens
     */
    getTrendingAlgorandTokens(): Promise<TrendingToken[]>;
    /**
     * Get cryptocurrency news
     */
    getNews(coinId: string, limit?: number): Promise<Array<{
        title: string;
        description: string;
        url: string;
        source: string;
        publishedAt: string;
        sentiment?: 'positive' | 'negative' | 'neutral';
    }>>;
    /**
     * Get quick price for a coin
     */
    getPrice(coinId: string): Promise<{
        price: number;
        priceChange24h: number;
        marketCap: number;
        volume24h: number;
    }>;
    /**
     * Compare multiple cryptocurrencies
     */
    compare(coins: string[]): Promise<Array<{
        coin: string;
        price: number;
        priceChange24h: number;
        marketCap: number;
        volume24h: number;
    }>>;
    private handleError;
    /**
     * Static methods for quick access without instantiation
     */
    static quickAnalyze(coin: string, network?: Network): Promise<AnalysisResult>;
    static quickPrice(coin: string, network?: Network): Promise<number>;
}

/**
 * LiquidityPool - Constant Product AMM (Uniswap V2 model)
 */

declare class LiquidityPool {
    private poolAppId;
    private algodClient;
    private network;
    private apiBaseUrl;
    constructor(poolAppId: number, config?: Network | SDKConfig);
    private createDefaultAlgodClient;
    /**
     * Get pool information
     */
    getPoolInfo(): Promise<PoolInfoDetailed>;
    /**
     * Get swap quote without executing
     */
    getSwapQuote(assetIn: number, amountIn: number): Promise<QuoteResult>;
    /**
     * Create a new pool (permissionless)
     */
    createPool(asset1: number, asset2: number, feeBps: number, senderAddress: string): Promise<Transaction>;
    /**
     * Add liquidity to pool
     */
    addLiquidity(params: LiquidityParams, senderAddress: string): Promise<Transaction>;
    /**
     * Remove liquidity from pool
     */
    removeLiquidity(lpTokens: number, minAmount1: number, minAmount2: number, senderAddress: string): Promise<Transaction>;
    /**
     * Swap assets in pool
     */
    swap(assetIn: number, amountIn: number, minAmountOut: number, senderAddress: string): Promise<Transaction>;
    /**
     * Calculate price impact for a swap
     */
    calculatePriceImpact(assetIn: number, amountIn: number): Promise<number>;
    /**
     * Get pool's current price ratio
     */
    getPrice(assetIn: number): Promise<number>;
    /**
     * Get pool's TVL (Total Value Locked)
     */
    getTVL(): Promise<number>;
    /**
     * Get the Algod client
     */
    getAlgodClient(): Algodv2;
    /**
     * Get pool app ID
     */
    getPoolAppId(): number;
    private handleError;
}

export { AgentWallet, type AnalysisRequest, type AnalysisResult, type AssetHolding, AutoPilot, type BalanceInfo, type Chart, type FearGreedIndex, type LiquidityParams, LiquidityPool, MarketAnalysis, type MarketData, type Network, type PoolInfo, type PoolInfoDetailed, type Prediction, type QuoteRequest, type QuoteResult, type Rule, type RuleConfig, type RuleStatus, type RuleType, type SDKConfig, SDKError, type Strategy, type SwapQuote, type SwapRoute, SwapRouter, type TransferParams, type TrendingToken, type TriggerConfig, type TriggerType, type TxResult };

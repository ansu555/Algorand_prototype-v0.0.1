# 10xSwap Backend Architecture Deep Dive

## Table of Contents
1. [Core Agent System](#core-agent-system)
2. [Multi-Chain Management](#multi-chain-management)
3. [Transaction Processing Pipeline](#transaction-processing-pipeline)
4. [AI Integration Layer](#ai-integration-layer)
5. [Data Persistence Strategy](#data-persistence-strategy)
6. [Security Implementation](#security-implementation)
7. [Performance Optimization](#performance-optimization)
8. [Error Handling & Recovery](#error-handling--recovery)

---

## Core Agent System

### Agent Factory Pattern

The system uses a factory pattern to create and manage per-chain agent instances:

```typescript
// lib/agent.ts - Core architecture
class AgentManager {
  private static instances = new Map<number, Promise<Agent>>()
  
  static async getAgent(chainIdOverride?: number): Promise<Agent> {
    const chainId = chainIdOverride ?? Number(process.env.CHAIN_ID) ?? 43113
    
    if (!this.instances.has(chainId)) {
      this.instances.set(chainId, this.buildAgent(chainId))
    }
    
    return this.instances.get(chainId)!
  }
  
  private static async buildAgent(chainId: number): Promise<Agent> {
    // Chain-specific configuration resolution
    const config = this.resolveChainConfig(chainId)
    
    // Initialize blockchain clients
    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl)
    })
    
    // Initialize 0xGasless AgentKit
    const agentkit = await Agentkit.configureWithWallet({
      privateKey: config.privateKey,
      rpcUrl: config.rpcUrl,
      apiKey: config.gaslessApiKey,
      chainID: chainId,
      paymasterUrl: config.paymasterUrl
    })
    
    return new Agent(publicClient, agentkit, config)
  }
}
```

### Chain Configuration Resolution

Each chain has specific environment variables that are resolved at runtime:

```typescript
interface ChainConfig {
  chainId: number
  chain: Chain
  rpcUrl: string
  gaslessApiKey: string
  paymasterUrl?: string
  nativeSymbol: string
  explorerUrl: string
  swapEnabled: boolean
}

function resolveChainConfig(chainId: number): ChainConfig {
  const configs: Record<number, Partial<ChainConfig>> = {
    8453: {  // Base
      chain: base,
      rpcUrl: process.env.RPC_URL_BASE || process.env.RPC_URL,
      gaslessApiKey: process.env.GASLESS_API_KEY_BASE || process.env.GASLESS_API_KEY,
      paymasterUrl: process.env.GASLESS_PAYMASTER_URL_BASE,
      nativeSymbol: 'ETH',
      explorerUrl: 'https://basescan.org',
      swapEnabled: true
    },
    43114: { // Avalanche
      chain: avalanche,
      rpcUrl: process.env.RPC_URL_AVALANCHE || process.env.RPC_URL,
      gaslessApiKey: process.env.GASLESS_API_KEY_AVALANCHE || process.env.GASLESS_API_KEY,
      paymasterUrl: process.env.GASLESS_PAYMASTER_URL_AVALANCHE,
      nativeSymbol: 'AVAX',
      explorerUrl: 'https://snowtrace.io',
      swapEnabled: true
    },
    43113: { // Fuji
      chain: avalancheFuji,
      rpcUrl: process.env.RPC_URL_FUJI || process.env.RPC_URL,
      gaslessApiKey: process.env.GASLESS_API_KEY_FUJI || process.env.GASLESS_API_KEY,
      paymasterUrl: process.env.GASLESS_PAYMASTER_URL_FUJI,
      nativeSymbol: 'AVAX',
      explorerUrl: 'https://testnet.snowtrace.io',
      swapEnabled: false
    }
  }
  
  return { chainId, ...configs[chainId] } as ChainConfig
}
```

---

## Multi-Chain Management

### Token Registry System

The token registry provides a standardized way to handle tokens across different chains:

```typescript
// lib/tokens.ts
interface TokenInfo {
  symbol: string
  address: Address | 'AVAX' | 'ETH'  // Native token sentinels
  decimals: number
  coingeckoId?: string
}

// Per-chain token mappings
const TOKEN_REGISTRIES: Record<number, Record<string, TokenInfo>> = {
  8453: {  // Base
    ETH: { symbol: 'ETH', address: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
    WETH: { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    USDC: { symbol: 'USDC', address: '0x833589fCD6EDb6E08f4c7C10d6D3e96cF6a47b8f', decimals: 6 }
  },
  43114: { // Avalanche
    AVAX: { symbol: 'AVAX', address: 'AVAX', decimals: 18, coingeckoId: 'avalanche-2' },
    WAVAX: { symbol: 'WAVAX', address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', decimals: 18 },
    USDC: { symbol: 'USDC', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 }
  },
  43113: { // Fuji
    AVAX: { symbol: 'AVAX', address: 'AVAX', decimals: 18, coingeckoId: 'avalanche-2' },
    WAVAX: { symbol: 'WAVAX', address: '0xd00ae08403B9bbb9124bb305C09058E32C39A48c', decimals: 18 },
    USDC: { symbol: 'USDC', address: '0x5425890298aed601595a70AB815c96711a31Bc65', decimals: 6 }
  }
}

export function resolveTokenBySymbol(symbol: string, chainId: number): TokenInfo | null {
  const registry = TOKEN_REGISTRIES[chainId]
  return registry?.[symbol.toUpperCase()] ?? null
}
```

### Swap Protocol Integration

Different chains use different swap protocols with chain-specific endpoints:

```typescript
async function smartSwap(opts: SwapOptions): Promise<TxResult> {
  const { chainId } = this.config
  
  // Validate chain supports swaps
  if (!this.config.swapEnabled) {
    throw new Error(`Swap not available on chain ${chainId}`)
  }
  
  // Select appropriate 0x API endpoint
  const apiEndpoints: Record<number, string> = {
    8453: 'https://base.api.0x.org/swap/v1/quote',
    43114: 'https://avalanche.api.0x.org/swap/v1/quote'
  }
  
  const endpoint = apiEndpoints[chainId]
  if (!endpoint) {
    throw new Error(`Swap protocol not configured for chain ${chainId}`)
  }
  
  // Resolve tokens for this chain
  const tokenIn = resolveTokenBySymbol(opts.tokenInSymbol, chainId)
  const tokenOut = resolveTokenBySymbol(opts.tokenOutSymbol, chainId)
  
  // Handle native token addresses
  const nativeSymbol = this.config.nativeSymbol
  const sellToken = tokenIn.address === nativeSymbol ? nativeSymbol : tokenIn.address
  const buyToken = tokenOut.address === nativeSymbol ? nativeSymbol : tokenOut.address
  
  // Get quote from 0x
  const quote = await this.get0xQuote(endpoint, {
    sellToken,
    buyToken,
    sellAmount: parseUnits(opts.amount, tokenIn.decimals).toString(),
    takerAddress: await this.getAddress(),
    slippagePercentage: (opts.slippage ?? 0.5) / 100
  })
  
  // Execute swap transaction
  return this.executeSwap(quote, tokenIn, nativeSymbol)
}
```

---

## Transaction Processing Pipeline

### Smart Account Transaction Flow

All transactions go through the 0xGasless smart account system:

```typescript
interface TransactionPipeline {
  // 1. Intent Recognition
  parseIntent(userInput: string): TransactionIntent
  
  // 2. Parameter Validation  
  validateParams(intent: TransactionIntent): ValidationResult
  
  // 3. Pre-flight Checks
  preflightChecks(params: ValidatedParams): PreflightResult
  
  // 4. Transaction Construction
  buildTransaction(params: ValidatedParams): UnsignedTransaction
  
  // 5. Smart Account Execution
  executeViaSmartAccount(tx: UnsignedTransaction): Promise<TxHash>
  
  // 6. Status Monitoring
  monitorTransaction(txHash: TxHash): Promise<TxReceipt>
  
  // 7. Result Processing
  processResult(receipt: TxReceipt): TransactionResult
}
```

### Balance and Portfolio Management

```typescript
class PortfolioManager {
  async getPortfolioOverview(address?: Address): Promise<Portfolio> {
    const targetAddress = address || await this.getAddress()
    
    // Get native token balance
    const nativeBalance = await this.publicClient.getBalance({ 
      address: targetAddress 
    })
    
    // Get supported ERC-20 balances
    const supportedTokens = this.getSupportedTokens()
    const tokenBalances = await Promise.allSettled(
      supportedTokens.map(async (token) => {
        const balance = await this.getTokenBalance(token.address, targetAddress)
        const price = await this.getPriceData(token.symbol)
        
        return {
          symbol: token.symbol,
          balance: formatUnits(balance, token.decimals),
          price: price.price,
          valueUSD: Number(formatUnits(balance, token.decimals)) * price.price
        }
      })
    )
    
    // Calculate total portfolio value
    const nativePrice = await this.getPriceData(this.config.nativeSymbol)
    const nativeValueUSD = Number(formatEther(nativeBalance)) * nativePrice.price
    
    const totalValueUSD = tokenBalances
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value.valueUSD)
      .reduce((sum, value) => sum + value, nativeValueUSD)
    
    return {
      address: targetAddress,
      totalValueUSD,
      assets: [
        {
          symbol: this.config.nativeSymbol,
          balance: formatEther(nativeBalance),
          price: nativePrice.price,
          valueUSD: nativeValueUSD
        },
        ...tokenBalances
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value)
      ]
    }
  }
}
```

---

## AI Integration Layer

### LangChain Agent Configuration

The AI system uses LangChain with 0xGasless toolkit integration:

```typescript
// app/api/agent/chat/route.ts
class AIAgentSystem {
  private static createAgent(agentkit: Agentkit): ReactAgent {
    // Initialize 0xGasless toolkit
    const toolkit = new AgentkitToolkit(agentkit)
    const tools = toolkit.getTools()
    
    // Configure LLM
    const llm = this.configureLLM()
    
    // Create React agent with memory
    const memory = new MemorySaver()
    
    return createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: this.getSystemPrompt()
    })
  }
  
  private static configureLLM(): ChatOpenAI {
    const provider = process.env.AI_PROVIDER?.toLowerCase() ?? 'openrouter'
    const model = process.env.AI_MODEL ?? 'gpt-4o-mini'
    
    if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
      return new ChatOpenAI({
        model,
        apiKey: process.env.OPENROUTER_API_KEY,
        configuration: { baseURL: 'https://openrouter.ai/api/v1' }
      })
    }
    
    if (process.env.OPENAI_API_KEY) {
      return new ChatOpenAI({
        model,
        apiKey: process.env.OPENAI_API_KEY
      })
    }
    
    throw new Error('No AI provider configured')
  }
  
  private static getSystemPrompt(): string {
    return `You are a helpful crypto agent using 0xGasless smart accounts. You can:
    - Get user's smart account address and balances
    - Perform gasless transfers and swaps on supported chains
    - Fetch market data, token prices, and gas estimates
    - Provide portfolio information and transaction history
    
    Always explain actions in simple terms. If a request is unsafe or unsupported, 
    explain why clearly. Current supported chains: Base, Avalanche, Avalanche Fuji.`
  }
}
```

### Fallback Processing System

When AI services are unavailable, the system uses pattern matching:

```typescript
class FallbackProcessor {
  private static intentPatterns = {
    address: /\b(address|wallet)\b/i,
    balance: /\b(balance|balances)\b/i,
    price: /\b(price|prices?|market)\b/i,
    gas: /\b(gas|gas price|fees?)\b/i,
    transfer: /transfer\s+(\d+(?:\.\d+)?)\s*([A-Za-z]{2,6})?\s*(?:to|=>)\s*(0x[a-fA-F0-9]{40})/i,
    swap: /swap\s+(\d+(?:\.\d+)?)\s*([A-Za-z]{2,6})\s*(?:to|for)\s*([A-Za-z]{2,6})/i,
    portfolio: /\b(portfolio|portfolio overview|total value|net worth)\b/i,
    history: /\b(transactions?|history|recent|tx)\b/i
  }
  
  static async processIntent(input: string, agent: Agent): Promise<string> {
    const text = input.toLowerCase().trim()
    
    // Address queries
    if (this.intentPatterns.address.test(text)) {
      return this.handleAddressQuery(agent)
    }
    
    // Balance queries  
    if (this.intentPatterns.balance.test(text)) {
      return this.handleBalanceQuery(text, agent)
    }
    
    // Price queries
    if (this.intentPatterns.price.test(text)) {
      return this.handlePriceQuery(text, agent)
    }
    
    // Gas queries
    if (this.intentPatterns.gas.test(text)) {
      return this.handleGasQuery(agent)
    }
    
    // Transfer operations
    const transferMatch = text.match(this.intentPatterns.transfer)
    if (transferMatch) {
      return this.handleTransfer(transferMatch, agent)
    }
    
    // Swap operations
    const swapMatch = text.match(this.intentPatterns.swap)
    if (swapMatch) {
      return this.handleSwap(swapMatch, agent)
    }
    
    return "I couldn't understand that request. Try asking about balances, prices, transfers, or swaps."
  }
}
```

---

## Data Persistence Strategy

### Database Schema Design

```sql
-- Core user management
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT UNIQUE NOT NULL,
    smart_account_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transaction logging
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    chain_id INTEGER NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT,
    value TEXT, -- Store as string to preserve precision
    token_address TEXT,
    type TEXT NOT NULL, -- 'transfer', 'swap', 'approve'
    status TEXT NOT NULL, -- 'pending', 'success', 'failed'
    gas_used TEXT,
    gas_price TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Trading automation rules
CREATE TABLE trading_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    conditions TEXT NOT NULL, -- JSON encoded conditions
    actions TEXT NOT NULL,    -- JSON encoded actions
    chain_id INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_executed DATETIME,
    execution_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Price data caching
CREATE TABLE price_cache (
    symbol TEXT PRIMARY KEY,
    price REAL NOT NULL,
    change_24h REAL,
    market_cap REAL,
    volume_24h REAL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System logs
CREATE TABLE system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL, -- 'info', 'warn', 'error'
    message TEXT NOT NULL,
    data TEXT, -- JSON encoded additional data
    source TEXT, -- Component that generated the log
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics
CREATE TABLE metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    tags TEXT, -- JSON encoded tags
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Data Access Layer

```typescript
// lib/db.ts
class DatabaseManager {
  private static instance: Database
  
  static getInstance(): Database {
    if (!this.instance) {
      if (process.env.DB_DRIVER === 'turso') {
        this.instance = createClient({
          url: process.env.TURSO_DATABASE_URL!,
          authToken: process.env.TURSO_AUTH_TOKEN!
        })
      } else {
        this.instance = new Database('./data/db.sqlite')
      }
    }
    return this.instance
  }
  
  // User management
  static async createUser(walletAddress: string): Promise<User> {
    const db = this.getInstance()
    const result = await db.execute({
      sql: 'INSERT INTO users (wallet_address) VALUES (?) RETURNING *',
      args: [walletAddress]
    })
    return result.rows[0] as User
  }
  
  // Transaction logging
  static async logTransaction(tx: TransactionData): Promise<void> {
    const db = this.getInstance()
    await db.execute({
      sql: `INSERT INTO transactions 
            (hash, user_id, chain_id, from_address, to_address, value, 
             token_address, type, status, gas_used, gas_price) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        tx.hash, tx.userId, tx.chainId, tx.fromAddress, 
        tx.toAddress, tx.value, tx.tokenAddress, tx.type, 
        tx.status, tx.gasUsed, tx.gasPrice
      ]
    })
  }
  
  // Price caching
  static async cachePrice(symbol: string, priceData: PriceData): Promise<void> {
    const db = this.getInstance()
    await db.execute({
      sql: `INSERT OR REPLACE INTO price_cache 
            (symbol, price, change_24h, market_cap, volume_24h, updated_at) 
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        symbol, priceData.price, priceData.change24h, 
        priceData.marketCap, priceData.volume24h
      ]
    })
  }
}
```

---

## Security Implementation

### Private Key Management

```typescript
// Secure key handling
class KeyManager {
  private static validatePrivateKey(key: string): `0x${string}` {
    // Normalize key format
    const normalizedKey = key.startsWith('0x') ? key : `0x${key}`
    
    // Validate key length and format
    if (!/^0x[a-fA-F0-9]{64}$/.test(normalizedKey)) {
      throw new Error('Invalid private key format')
    }
    
    return normalizedKey as `0x${string}`
  }
  
  static getAgentKey(): `0x${string}` {
    const key = process.env.PRIVATE_KEY
    if (!key) {
      throw new Error('PRIVATE_KEY environment variable required')
    }
    
    return this.validatePrivateKey(key)
  }
}
```

### RPC Security Validation

```typescript
class RPCValidator {
  static async validateRPC(rpcUrl: string, expectedChainId: number): Promise<void> {
    try {
      // Test basic connectivity
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1
        }),
        timeout: 5000
      })
      
      if (!response.ok) {
        throw new Error(`RPC returned ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      const chainId = parseInt(data.result, 16)
      
      if (chainId !== expectedChainId) {
        throw new Error(
          `Chain ID mismatch: expected ${expectedChainId}, got ${chainId}`
        )
      }
    } catch (error) {
      throw new Error(`RPC validation failed: ${error.message}`)
    }
  }
  
  static validateRPCUrl(url: string): void {
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
        throw new Error('Invalid RPC protocol')
      }
    } catch {
      throw new Error('Invalid RPC URL format')
    }
  }
}
```

### Request Validation

```typescript
class RequestValidator {
  static validateAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
  
  static validateAmount(amount: string): boolean {
    const num = parseFloat(amount)
    return !isNaN(num) && num > 0 && num < 1e18
  }
  
  static validateTokenSymbol(symbol: string): boolean {
    return /^[A-Z0-9]{2,10}$/.test(symbol.toUpperCase())
  }
  
  static validateChainId(chainId: number): boolean {
    return [8453, 43114, 43113].includes(chainId)
  }
  
  static sanitizeUserInput(input: string): string {
    return input
      .replace(/[<>\"'&]/g, '') // Remove HTML/script chars
      .trim()
      .slice(0, 1000) // Limit length
  }
}
```

---

## Performance Optimization

### Caching Strategy

```typescript
// Multi-tier caching system
class CacheManager {
  private static agentCache = new Map<number, Promise<Agent>>()
  private static priceCache = new Map<string, {data: PriceData, expiry: number}>()
  private static balanceCache = new Map<string, {balance: string, expiry: number}>()
  
  // Agent instance caching (permanent)
  static cacheAgent(chainId: number, agent: Promise<Agent>): void {
    this.agentCache.set(chainId, agent)
  }
  
  static getCachedAgent(chainId: number): Promise<Agent> | undefined {
    return this.agentCache.get(chainId)
  }
  
  // Price data caching (5 minute TTL)
  static cachePrice(symbol: string, data: PriceData): void {
    this.priceCache.set(symbol, {
      data,
      expiry: Date.now() + 5 * 60 * 1000 // 5 minutes
    })
  }
  
  static getCachedPrice(symbol: string): PriceData | null {
    const cached = this.priceCache.get(symbol)
    if (cached && cached.expiry > Date.now()) {
      return cached.data
    }
    this.priceCache.delete(symbol)
    return null
  }
  
  // Balance caching (30 second TTL)
  static cacheBalance(address: string, token: string, balance: string): void {
    const key = `${address}:${token}`
    this.balanceCache.set(key, {
      balance,
      expiry: Date.now() + 30 * 1000 // 30 seconds
    })
  }
  
  static getCachedBalance(address: string, token: string): string | null {
    const key = `${address}:${token}`
    const cached = this.balanceCache.get(key)
    if (cached && cached.expiry > Date.now()) {
      return cached.balance
    }
    this.balanceCache.delete(key)
    return null
  }
  
  // Cache cleanup
  static cleanup(): void {
    const now = Date.now()
    
    for (const [key, value] of this.priceCache.entries()) {
      if (value.expiry <= now) {
        this.priceCache.delete(key)
      }
    }
    
    for (const [key, value] of this.balanceCache.entries()) {
      if (value.expiry <= now) {
        this.balanceCache.delete(key)
      }
    }
  }
}

// Cleanup interval
setInterval(() => CacheManager.cleanup(), 60 * 1000) // Every minute
```

### Connection Pooling

```typescript
class ConnectionPool {
  private static rpcClients = new Map<string, PublicClient>()
  
  static getClient(rpcUrl: string, chain: Chain): PublicClient {
    if (!this.rpcClients.has(rpcUrl)) {
      const client = createPublicClient({
        chain,
        transport: http(rpcUrl, {
          batch: true,
          wait: 100,
          retryCount: 3,
          retryDelay: 1000
        })
      })
      this.rpcClients.set(rpcUrl, client)
    }
    
    return this.rpcClients.get(rpcUrl)!
  }
}
```

---

## Error Handling & Recovery

### Comprehensive Error System

```typescript
class ErrorHandler {
  // Error classification
  static classifyError(error: unknown): ErrorType {
    const message = String(error)
    
    if (message.includes('insufficient funds')) {
      return 'INSUFFICIENT_FUNDS'
    }
    if (message.includes('user rejected')) {
      return 'USER_REJECTED'  
    }
    if (message.includes('network error')) {
      return 'NETWORK_ERROR'
    }
    if (message.includes('gas')) {
      return 'GAS_ERROR'
    }
    if (message.includes('revert')) {
      return 'CONTRACT_REVERT'
    }
    if (message.includes('timeout')) {
      return 'TIMEOUT'
    }
    
    return 'UNKNOWN_ERROR'
  }
  
  // Recovery strategies
  static async handleError(error: unknown, context: string): Promise<string> {
    const errorType = this.classifyError(error)
    
    switch (errorType) {
      case 'INSUFFICIENT_FUNDS':
        return 'Insufficient balance for this transaction. Please check your token balances.'
        
      case 'GAS_ERROR':
        return 'Transaction failed due to gas estimation issues. Please try again or contact support.'
        
      case 'NETWORK_ERROR':
        return 'Network connectivity issue. Please check your connection and try again.'
        
      case 'CONTRACT_REVERT':
        return 'Transaction reverted by smart contract. Please verify your parameters.'
        
      case 'TIMEOUT':
        return 'Transaction timed out. It may still be processing on the blockchain.'
        
      default:
        console.error(`Unhandled error in ${context}:`, error)
        return 'An unexpected error occurred. Please try again or contact support.'
    }
  }
  
  // Retry logic with exponential backoff
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: unknown
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries) {
          throw error
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }
}

// Usage example
async function robustTokenTransfer(params: TransferParams): Promise<TxResult> {
  return ErrorHandler.withRetry(async () => {
    try {
      return await agent.smartTransfer(params)
    } catch (error) {
      const userMessage = await ErrorHandler.handleError(error, 'token_transfer')
      throw new Error(userMessage)
    }
  }, 3, 2000)
}
```

### Health Monitoring

```typescript
class HealthMonitor {
  static async checkSystemHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRPCConnections(),
      this.checkExternalAPIs(),
      this.checkAIServices()
    ])
    
    const results = checks.map((check, index) => ({
      service: ['database', 'rpc', 'apis', 'ai'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      error: check.status === 'rejected' ? check.reason : null
    }))
    
    const overallHealth = results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded'
    
    return {
      overall: overallHealth,
      services: results,
      timestamp: new Date().toISOString()
    }
  }
  
  private static async checkDatabase(): Promise<void> {
    const db = DatabaseManager.getInstance()
    await db.execute({ sql: 'SELECT 1', args: [] })
  }
  
  private static async checkRPCConnections(): Promise<void> {
    const chains = [8453, 43114, 43113]
    await Promise.all(chains.map(async (chainId) => {
      const agent = await getAgent(chainId)
      await agent.publicClient.getBlockNumber()
    }))
  }
  
  private static async checkExternalAPIs(): Promise<void> {
    // Test CoinGecko
    const response = await fetch('https://api.coingecko.com/api/v3/ping')
    if (!response.ok) throw new Error('CoinGecko API unavailable')
    
    // Test 0x API
    const oxResponse = await fetch('https://base.api.0x.org/swap/v1/sources')
    if (!oxResponse.ok) throw new Error('0x API unavailable')
  }
  
  private static async checkAIServices(): Promise<void> {
    try {
      const llm = new ChatOpenAI({
        model: 'gpt-3.5-turbo',
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 5000
      })
      await llm.invoke([{ content: 'test', role: 'user' }])
    } catch {
      throw new Error('AI services unavailable')
    }
  }
}
```

This comprehensive backend architecture provides robust, scalable infrastructure for multi-chain DeFi operations with AI integration, ensuring high availability, security, and performance across all supported networks.

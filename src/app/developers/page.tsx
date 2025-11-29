"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code2, Book, Rocket, Terminal, Package, Github, FileCode, Blocks, Zap, Shield } from "lucide-react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function DevelopersPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const CodeBlock = ({ code, language = "typescript", id }: { code: string; language?: string; id: string }) => (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 z-10 text-xs"
        onClick={() => copyCode(code, id)}
      >
        {copiedCode === id ? "Copied!" : "Copy"}
      </Button>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          padding: '1.5rem',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full border border-primary/20 bg-primary/5">
          <Code2 className="h-5 w-5 text-primary dark:text-[#F3C623]" />
          <span className="text-sm font-medium">Developer Documentation</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Build on <span className="text-primary dark:text-[#F3C623]">10xSwap</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
          Comprehensive tools, APIs, and SDKs to integrate DeFi functionality into your Algorand applications
        </p>

        {/* Quick Install Banner */}
        <div className="max-w-3xl mx-auto">
          <Card className="border-2 border-primary/20 dark:border-[#F3C623]/20 bg-gradient-to-r from-primary/5 to-transparent dark:from-[#F3C623]/5">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <h3 className="font-semibold mb-1">Get Started in Seconds</h3>
                  <code className="text-sm bg-background/50 px-3 py-1 rounded">
                    npm install @10xswap/sdk algosdk
                  </code>
                </div>
                <div className="flex gap-3">
                  <Button asChild variant="default" size="sm">
                    <a href="https://www.npmjs.com/package/@10xswap/sdk" target="_blank" rel="noopener noreferrer">
                      <Package className="h-4 w-4 mr-2" />
                      View on NPM
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href="https://github.com/10xswap" target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-2" />
                      GitHub
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary dark:text-[#F3C623]" />
              </div>
              <div>
                <div className="text-2xl font-bold">5+</div>
                <div className="text-xs text-muted-foreground">Core SDKs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileCode className="h-5 w-5 text-primary dark:text-[#F3C623]" />
              </div>
              <div>
                <div className="text-2xl font-bold">3</div>
                <div className="text-xs text-muted-foreground">Smart Contracts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary dark:text-[#F3C623]" />
              </div>
              <div>
                <div className="text-2xl font-bold">20+</div>
                <div className="text-xs text-muted-foreground">API Endpoints</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary dark:text-[#F3C623]" />
              </div>
              <div>
                <div className="text-2xl font-bold">100%</div>
                <div className="text-xs text-muted-foreground">On-Chain</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
          <TabsTrigger value="sdk">SDK Reference</TabsTrigger>
          <TabsTrigger value="api">API Docs</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Overview</CardTitle>
              <CardDescription>
                10xSwap provides a complete DeFi infrastructure on Algorand with automated trading, liquidity pools, and market intelligence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Blocks className="h-4 w-4 text-primary dark:text-[#F3C623]" />
                    Core Features
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Multi-DEX routing (Tinyman, Pact, 10xSwap)</li>
                    <li>• Automated trading rules (DCA, Rebalance, Rotate)</li>
                    <li>• Agent wallet management</li>
                    <li>• Liquidity pool AMM (x * y = k)</li>
                    <li>• Market analysis & predictions</li>
                    <li>• Token launchpad with bonding curves</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-primary dark:text-[#F3C623]" />
                    Developer Tools
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• TypeScript SDK with full type safety</li>
                    <li>• RESTful API endpoints</li>
                    <li>• Smart contract clients (AlgoPy)</li>
                    <li>• WebSocket support for real-time data</li>
                    <li>• Comprehensive documentation</li>
                    <li>• Example applications</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-primary/5 border-l-4 border-primary dark:border-[#F3C623] rounded">
                <h3 className="font-semibold mb-2">Network Support</h3>
                <div className="flex gap-2">
                  <Badge variant="outline">Testnet</Badge>
                  <Badge variant="outline">Mainnet</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Full feature parity across both networks with automatic network detection
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Start Tab */}
        <TabsContent value="quickstart" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Start Guide</CardTitle>
              <CardDescription>Get started with 10xSwap in minutes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary dark:text-[#F3C623] text-sm">1</span>
                  Installation
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Install the official 10xSwap SDK from npm:
                </p>
                <CodeBlock
                  id="install"
                  code={`# Using npm
npm install @10xswap/sdk algosdk

# Using yarn
yarn add @10xswap/sdk algosdk

# Using pnpm
pnpm add @10xswap/sdk algosdk`}
                  language="bash"
                />
                <div className="mt-3 p-3 bg-blue-500/10 border-l-4 border-blue-500 rounded text-sm">
                  <p className="font-semibold mb-1">📦 Package Published</p>
                  <p className="text-muted-foreground">
                    View on NPM: <a href="https://www.npmjs.com/package/@10xswap/sdk" target="_blank" rel="noopener noreferrer" className="text-primary dark:text-[#F3C623] underline">@10xswap/sdk</a>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary dark:text-[#F3C623] text-sm">2</span>
                  Setup & Configuration
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Import the SDK and initialize with your preferred network:
                </p>
                <CodeBlock
                  id="init"
                  code={`import { SwapRouter, AgentWallet, AutoPilot, MarketAnalysis } from '@10xswap/sdk'
import algosdk from 'algosdk'

// Option 1: Quick setup with default configuration (testnet)
const router = new SwapRouter('testnet')
await router.initialize()

// Option 2: Use mainnet
const mainnetRouter = new SwapRouter('mainnet')
await mainnetRouter.initialize()

// Option 3: Custom configuration with your own Algod client
const algodClient = new algosdk.Algodv2(
  '', // token
  'https://testnet-api.4160.nodely.io', // server
  '' // port
)

const customRouter = new SwapRouter({
  network: 'testnet',
  algodUrl: 'https://testnet-api.4160.nodely.io',
  algodToken: '',
  apiBaseUrl: 'http://localhost:3000/api' // Optional: custom API endpoint
})`}
                />
                <div className="mt-3 p-3 bg-amber-500/10 border-l-4 border-amber-500 rounded text-sm">
                  <p className="font-semibold mb-1">⚙️ Configuration Options</p>
                  <ul className="text-muted-foreground space-y-1 ml-4 list-disc">
                    <li><strong>network</strong>: 'testnet' or 'mainnet'</li>
                    <li><strong>algodUrl</strong>: Custom Algod node URL (optional)</li>
                    <li><strong>algodToken</strong>: API token for your node (optional)</li>
                    <li><strong>apiBaseUrl</strong>: 10xSwap API endpoint (optional)</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary dark:text-[#F3C623] text-sm">3</span>
                  Execute Your First Swap
                </h3>
                <CodeBlock
                  id="swap"
                  code={`// Find best route across all DEXs
const quote = await router.findBestRoute({
  assetIn: 0,           // ALGO
  assetOut: 10458941,   // USDC (testnet)
  amount: 1000000,      // 1 ALGO (microAlgos)
  maxHops: 3            // Allow multi-hop routing
})

console.log('Best DEX:', quote.dex)
console.log('Price Impact:', quote.priceImpact, '%')
console.log('Fee:', quote.fee, 'microAlgos')
console.log('Min Received:', quote.minReceived)

// Execute the swap
const txn = await router.buildSwapTransaction(quote, userAddress)
const signedTxn = await wallet.signTransaction(txn)
const result = await algodClient.sendRawTransaction(signedTxn).do()

console.log('Transaction ID:', result.txId)`}
                />
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary dark:text-[#F3C623] text-sm">4</span>
                  Create an Agent Wallet (Optional)
                </h3>
                <CodeBlock
                  id="agent"
                  code={`// Create encrypted agent wallet for automation
const agent = await AgentWallet.create(userAddress, password)

// Get balance
const balance = await agent.getBalance()
console.log('ALGO Balance:', balance.algo)

// Opt-in to assets
await agent.optIn(10458941) // Opt-in to USDC

// Transfer funds
const result = await agent.transfer({
  to: recipientAddress,
  amount: 500000,  // 0.5 ALGO
  assetId: 0       // ALGO (use asset ID for ASAs)
})

console.log('Transfer TX:', result.txId)`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SDK Reference Tab */}
        <TabsContent value="sdk" className="space-y-6">
          {/* Swap Router */}
          <Card>
            <CardHeader>
              <CardTitle>SwapRouter</CardTitle>
              <CardDescription>Multi-DEX routing and optimal swap path finding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Constructor</h4>
                <CodeBlock
                  id="router-const"
                  code={`constructor(network: 'testnet' | 'mainnet', algodClient?: Algodv2)`}
                  language="typescript"
                />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Methods</h4>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">initialize(): Promise&lt;void&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Fetches all pools and builds routing graph</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">findBestRoute(request: QuoteRequest): Promise&lt;SwapQuote&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Finds optimal swap path across DEXs with best price</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">buildSwapTransaction(quote: SwapQuote, sender: string): Promise&lt;Transaction&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Builds unsigned transaction for the swap</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Example</h4>
                <CodeBlock
                  id="router-example"
                  code={`const router = new SwapRouter('testnet')
await router.initialize()

const quote = await router.findBestRoute({
  assetIn: 0,
  assetOut: 10458941,
  amount: 1000000,
  maxHops: 3,
  slippage: 0.5  // 0.5% slippage tolerance
})

// Returns: { route, dex, priceImpact, fee, minReceived, path }`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Agent Wallet */}
          <Card>
            <CardHeader>
              <CardTitle>AgentWallet</CardTitle>
              <CardDescription>Encrypted wallet management for automated trading</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Static Methods</h4>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">create(userAddress: string, password: string): Promise&lt;AgentWallet&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Creates new encrypted agent wallet with AES-256-GCM</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">recover(userAddress: string, password: string): Promise&lt;AgentWallet&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Recovers existing agent wallet from database</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Instance Methods</h4>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">getBalance(): Promise&lt;BalanceInfo&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Returns ALGO balance and all ASA holdings</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">optIn(assetId: number): Promise&lt;TxResult&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Opts wallet into an ASA token</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">transfer(params: TransferParams): Promise&lt;TxResult&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Transfers ALGO or ASAs to recipient</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">swap(quote: SwapQuote): Promise&lt;TxResult&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Executes swap using provided quote</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Security Features</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>AES-256-GCM encryption for mnemonic storage</li>
                  <li>Password-based key derivation (PBKDF2)</li>
                  <li>Secure database persistence with encryption at rest</li>
                  <li>Automatic wallet recovery on app restart</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* AutoPilot */}
          <Card>
            <CardHeader>
              <CardTitle>AutoPilot</CardTitle>
              <CardDescription>Automated trading rules engine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Rule Types</h4>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="p-3 border rounded-lg">
                    <h5 className="font-medium mb-1">DCA</h5>
                    <p className="text-xs text-muted-foreground">Dollar Cost Averaging - recurring purchases at fixed intervals</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h5 className="font-medium mb-1">REBALANCE</h5>
                    <p className="text-xs text-muted-foreground">Maintain target portfolio allocation ratios</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h5 className="font-medium mb-1">ROTATE</h5>
                    <p className="text-xs text-muted-foreground">Automatically swap to top N performing assets</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Methods</h4>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">createRule(config: RuleConfig): Promise&lt;Rule&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Creates new automated trading rule on-chain</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">executeRule(ruleId: string): Promise&lt;TxResult&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Manually triggers rule execution</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">updateRuleStatus(ruleId: string, status: 'active' | 'paused'): Promise&lt;void&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Pauses or resumes rule execution</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Example</h4>
                <CodeBlock
                  id="autopilot-example"
                  code={`const autopilot = new AutoPilot(contractId)

// Create DCA rule: Buy USDC with ALGO when price drops 10%
const rule = await autopilot.createRule({
  strategy: 'DCA',
  assetIn: 0,          // ALGO
  assetOut: 10458941,  // USDC
  trigger: {
    type: 'price_drop_pct',
    value: 10,
    window: '24h'
  },
  maxSpendUSD: 100,
  maxSlippage: 0.5,
  cooldownMinutes: 1440  // 24 hours
})

// Rule executes automatically when conditions are met`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Market Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>MarketAnalysis</CardTitle>
              <CardDescription>AI-powered cryptocurrency analysis and predictions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Features</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Technical indicators (RSI, MACD, SMA20, SMA50, Volatility)</li>
                  <li>30-day price predictions with confidence scores</li>
                  <li>Trading strategy recommendations (Buy/Sell/Hold)</li>
                  <li>Chart generation (line, candlestick, area)</li>
                  <li>Fear & Greed Index integration</li>
                  <li>Real-time news aggregation</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Example</h4>
                <CodeBlock
                  id="analysis-example"
                  code={`const analysis = await MarketAnalysis.analyze({
  coin: 'algorand',
  horizonDays: 30,
  tasks: ['analysis', 'prediction', 'strategy', 'charts'],
  chartType: 'candlestick'
})

console.log('Summary:', analysis.summary)
console.log('Insights:', analysis.insights)
console.log('Predictions:', analysis.predictions)
console.log('Strategies:', analysis.strategies)
console.log('Chart URLs:', analysis.charts)

// Get Fear & Greed Index
const fgi = await MarketAnalysis.getFearGreedIndex()
console.log('Market Sentiment:', fgi.valueClassification)  // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"

// Get trending Algorand tokens
const trending = await MarketAnalysis.getTrendingAlgorandTokens()
console.log('Trending:', trending)`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Liquidity Pool */}
          <Card>
            <CardHeader>
              <CardTitle>LiquidityPool</CardTitle>
              <CardDescription>Constant Product AMM (Uniswap V2 model)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Methods</h4>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">createPool(asset1: number, asset2: number, feeBps: number): Promise&lt;TxResult&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Creates new liquidity pool (permissionless)</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">addLiquidity(amount1: number, amount2: number, minLPTokens: number): Promise&lt;TxResult&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Adds liquidity and receives LP tokens</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">removeLiquidity(lpTokens: number, minAmount1: number, minAmount2: number): Promise&lt;TxResult&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Burns LP tokens to withdraw assets</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">swap(assetIn: number, amountIn: number, minAmountOut: number): Promise&lt;TxResult&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Swaps assets using x*y=k formula</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm">getSwapQuote(assetIn: number, amountIn: number): Promise&lt;QuoteResult&gt;</code>
                    <p className="text-sm text-muted-foreground mt-1">Calculates swap output without executing</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Example</h4>
                <CodeBlock
                  id="pool-example"
                  code={`const pool = new LiquidityPool(poolAppId)

// Get pool information
const info = await pool.getPoolInfo()
console.log('Reserves:', info.reserve1, info.reserve2)
console.log('LP Token Supply:', info.lpTokenSupply)
console.log('Fee:', info.feeBps, 'bps')

// Get swap quote
const quote = await pool.getSwapQuote(0, 1000000) // 1 ALGO in
console.log('Will receive:', quote.amountOut, 'USDC')
console.log('Price impact:', quote.priceImpact, '%')

// Execute swap
const result = await pool.swap(0, 1000000, quote.amountOut * 0.995) // 0.5% slippage
console.log('Swap TX:', result.txId)`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Reference Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>REST API Endpoints</CardTitle>
              <CardDescription>Base URL: https://10xswap.com/api</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Swap APIs */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono rounded">GET</span>
                  Swap & Routing
                </h3>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">/api/router/quote</code>
                    <p className="text-sm text-muted-foreground mt-1">Get best swap quote across all DEXs</p>
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-primary dark:text-[#F3C623]">Query Parameters</summary>
                      <CodeBlock
                        id="quote-params"
                        code={`assetIn: number      // Input asset ID
assetOut: number     // Output asset ID
amount: number       // Input amount in base units
slippage?: number    // Slippage tolerance (default: 0.5%)
maxHops?: number     // Max routing hops (default: 3)
network?: string     // 'testnet' | 'mainnet'`}
                        language="typescript"
                      />
                    </details>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">/api/swap/submit</code>
                    <Badge variant="outline" className="ml-2 text-xs">POST</Badge>
                    <p className="text-sm text-muted-foreground mt-1">Submit signed swap transaction</p>
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-primary dark:text-[#F3C623]">Request Body</summary>
                      <CodeBlock
                        id="swap-submit"
                        code={`{
  "signedTxn": "base64_encoded_transaction",
  "assetIn": 0,
  "assetOut": 10458941,
  "amountIn": 1000000,
  "amountOut": 950000,
  "sender": "ALGORAND_ADDRESS"
}`}
                        language="json"
                      />
                    </details>
                  </div>
                </div>
              </div>

              {/* Pool APIs */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono rounded">GET</span>
                  Liquidity Pools
                </h3>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">/api/pools/all</code>
                    <p className="text-sm text-muted-foreground mt-1">Fetch all pools from Tinyman, Pact, and 10xSwap</p>
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-primary dark:text-[#F3C623]">Response Example</summary>
                      <CodeBlock
                        id="pools-response"
                        code={`{
  "pools": [
    {
      "poolId": "749739213",
      "asset1": 0,
      "asset2": 10458941,
      "reserve1": 5000000000,
      "reserve2": 10000000,
      "lpTokenId": 12345678,
      "feeBps": 30,
      "dex": "10xswap"
    }
  ]
}`}
                        language="json"
                      />
                    </details>
                  </div>
                </div>
              </div>

              {/* AutoPilot APIs */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-mono rounded">POST</span>
                  AutoPilot Rules
                </h3>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">/api/rules</code>
                    <p className="text-sm text-muted-foreground mt-1">Create new automated trading rule</p>
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-primary dark:text-[#F3C623]">Request Example</summary>
                      <CodeBlock
                        id="create-rule"
                        code={`{
  "ownerAddress": "ALGORAND_ADDRESS",
  "type": "dca",
  "targets": ["algorand", "usdc"],
  "triggerType": "price_drop_pct",
  "dropPercent": 10,
  "maxSpendUSD": 100,
  "maxSlippage": 0.5,
  "cooldownMinutes": 1440,
  "status": "active"
}`}
                        language="json"
                      />
                    </details>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">/api/rules?owner=ADDRESS</code>
                    <Badge variant="outline" className="ml-2 text-xs">GET</Badge>
                    <p className="text-sm text-muted-foreground mt-1">Fetch all rules for user</p>
                  </div>
                </div>
              </div>

              {/* Market Analysis APIs */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-mono rounded">POST</span>
                  Market Analysis
                </h3>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">/api/mcp/analyze</code>
                    <p className="text-sm text-muted-foreground mt-1">AI-powered cryptocurrency analysis</p>
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-primary dark:text-[#F3C623]">Request Example</summary>
                      <CodeBlock
                        id="analyze-request"
                        code={`{
  "coin": "algorand",
  "horizonDays": 30,
  "granularity": "1d",
  "tasks": ["analysis", "prediction", "strategy", "charts"],
  "chartType": "candlestick"
}`}
                        language="json"
                      />
                    </details>
                  </div>
                </div>
              </div>

              {/* Rate Limits */}
              <div className="p-4 bg-amber-500/10 border-l-4 border-amber-500 rounded">
                <h3 className="font-semibold mb-2">Rate Limits</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Public endpoints: 100 requests/minute</li>
                  <li>• Authenticated endpoints: 300 requests/minute</li>
                  <li>• Swap submission: 10 requests/minute</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Contracts Tab */}
        <TabsContent value="contracts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Smart Contracts</CardTitle>
              <CardDescription>On-chain contracts deployed on Algorand</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Liquidity Pool Contract */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Liquidity Pool Contract</h3>
                    <p className="text-sm text-muted-foreground">Constant Product AMM (x * y = k)</p>
                  </div>
                  <Badge>Testnet: 749739213</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language:</span>
                    <span className="font-mono">AlgoPy (Python)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span>Uniswap V2 (x * y = k)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Storage:</span>
                    <span>Box storage (multi-pool support)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Permission:</span>
                    <span className="text-green-600 dark:text-green-400">Permissionless</span>
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="text-xs cursor-pointer text-primary dark:text-[#F3C623]">Available Methods</summary>
                  <div className="mt-2 space-y-1 text-xs font-mono">
                    <div>• create_pool(asset_1, asset_2, fee_bps)</div>
                    <div>• add_liquidity(amount_1, amount_2, min_lp_tokens)</div>
                    <div>• remove_liquidity(lp_tokens, min_amount_1, min_amount_2)</div>
                    <div>• swap(asset_in, amount_in, min_amount_out)</div>
                    <div>• get_pool_info() → PoolInfo</div>
                    <div>• get_swap_quote(asset_in, amount_in) → QuoteInfo</div>
                  </div>
                </details>
              </div>

              {/* AutoPilot Contract */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">AutoPilot Rule Contract</h3>
                    <p className="text-sm text-muted-foreground">Automated trading rules engine</p>
                  </div>
                  <Badge>Testnet: 749509231</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language:</span>
                    <span className="font-mono">AlgoPy (Python)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rule Types:</span>
                    <span>DCA, Rebalance, Rotate</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Storage:</span>
                    <span>Box storage (per-user rules)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Execution:</span>
                    <span>On-chain with cooldown enforcement</span>
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="text-xs cursor-pointer text-primary dark:text-[#F3C623]">Available Methods</summary>
                  <div className="mt-2 space-y-1 text-xs font-mono">
                    <div>• create_rule(rule_type, targets, trigger, risk_params)</div>
                    <div>• execute_rule(rule_id, asset_in, asset_out, amount)</div>
                    <div>• update_rule_status(rule_id, status)</div>
                    <div>• update_rule_parameters(rule_id, new_params)</div>
                    <div>• delete_rule(rule_id)</div>
                    <div>• get_rule(rule_id) → RuleInfo</div>
                  </div>
                </details>
              </div>

              {/* Multihop Swap Router */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Multihop Swap Router</h3>
                    <p className="text-sm text-muted-foreground">Multi-DEX swap aggregator</p>
                  </div>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Hops:</span>
                    <span>3 (Asset A → B → C → D)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DEX Support:</span>
                    <span>Tinyman, Pact, 10xSwap</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Execution:</span>
                    <span>Atomic (all-or-nothing)</span>
                  </div>
                </div>
              </div>

              {/* Contract Addresses */}
              <div className="p-4 bg-primary/5 border-l-4 border-primary dark:border-[#F3C623] rounded">
                <h3 className="font-semibold mb-2">Contract Addresses</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Testnet Pool:</span>
                    <code className="bg-background px-2 py-1 rounded text-xs">5DPHQIR6YVSRYQV2UXSOOCGAHJKH42YIPMKDUT4AO32KTCSUREYKVJ7WPQ</code>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Mainnet Pool:</span>
                    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resources Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
          <CardDescription>Essential links and documentation for developers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <a
              href="https://www.npmjs.com/package/@10xswap/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Package className="h-8 w-8 text-primary dark:text-[#F3C623]" />
              <div>
                <h3 className="font-semibold">NPM Package</h3>
                <p className="text-sm text-muted-foreground">@10xswap/sdk on npm</p>
              </div>
            </a>
            <a
              href="https://github.com/10xswap"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Github className="h-8 w-8 text-primary dark:text-[#F3C623]" />
              <div>
                <h3 className="font-semibold">GitHub Repository</h3>
                <p className="text-sm text-muted-foreground">Source code and examples</p>
              </div>
            </a>
            <a
              href="/api/docs"
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Book className="h-8 w-8 text-primary dark:text-[#F3C623]" />
              <div>
                <h3 className="font-semibold">API Documentation</h3>
                <p className="text-sm text-muted-foreground">REST API reference</p>
              </div>
            </a>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-[#F3C623]/10 dark:to-[#F3C623]/5 rounded-lg border border-primary/20 dark:border-[#F3C623]/20">
            <h4 className="font-semibold mb-2">🚀 Quick Start Commands</h4>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Install:</span>
                <code className="px-2 py-1 bg-background rounded">npm install @10xswap/sdk algosdk</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Import:</span>
                <code className="px-2 py-1 bg-background rounded">import &#123; SwapRouter &#125; from '@10xswap/sdk'</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Version:</span>
                <code className="px-2 py-1 bg-background rounded">v1.0.0</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

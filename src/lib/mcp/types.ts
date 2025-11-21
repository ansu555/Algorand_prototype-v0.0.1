// MCP Analytics Types

export type Granularity = '1h' | '4h' | '1d'
export type Task = 'analysis' | 'prediction' | 'strategy' | 'charts'
export type RiskLevel = 'low' | 'medium' | 'high'
export type ChartType = 'line' | 'bar' | 'candlestick' | 'area'

export interface OHLCV {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Prediction {
  date: string
  price: number
  probability?: number
}

export interface Strategy {
  name: string
  description: string
  risk: RiskLevel
}

export interface Chart {
  title: string
  url: string
}

export interface Indicators {
  rsi: number
  macd: { value: number; signal: number; histogram: number }
  sma20: number
  sma50: number
  volatility: number
  trend: 'bullish' | 'bearish' | 'neutral'
}

export interface AnalyzeRequest {
  coin: string
  horizonDays?: number
  granularity?: Granularity
  tasks?: Task[]
  chartType?: ChartType
}

export interface AnalyzeResponse {
  ok: boolean
  summary?: string
  insights?: string[]
  predictions?: Prediction[]
  strategies?: Strategy[]
  overallAnalysis?: string
  charts?: Chart[]
  methodology?: {
    dataPoints: number
    timeframe: string
    method: string
    indicators: string[]
    confidence: string
    calculations?: string
  }
  marketData?: {
    price: number
    priceChange24h: number
    priceChangePercentage24h: number
    marketCap: number
    marketCapRank?: number
    volume24h: number
    circulatingSupply: number
    totalSupply: number
    maxSupply?: number
    ath: number
    athDate: string
    athChangePercentage: number
    atl: number
    atlDate: string
    atlChangePercentage: number
    links: {
      homepage: string[]
      blockchain: string[]
      officialForum: string[]
      twitter?: string
      telegram?: string
      reddit?: string
      github?: string[]
      explorer?: string[]
      exchanges: Array<{ name: string; url: string }>
    }
    description?: string
    lastUpdated: string
  }
  error?: string
  suggestion?: string
}

export interface RuleSuggestion {
  strategy: 'DCA' | 'REBALANCE' | 'ROTATE'
  description: string
  reasoning: string
  trigger: {
    type: 'price_drop_pct' | 'trend_pct' | 'momentum'
    value: number
    window?: '24h' | '7d' | '30d'
    lookbackDays?: number
  }
  riskLevel: RiskLevel
  suggestedParams: {
    maxSpendUSD: number
    maxSlippage: number
    cooldownMinutes: number
    rotateTopN?: number
  }
}

/**
 * MarketAnalysis - AI-powered cryptocurrency analysis and predictions
 */

import axios from 'axios'
import type {
  Network,
  AnalysisRequest,
  AnalysisResult,
  FearGreedIndex,
  TrendingToken,
  SDKConfig,
} from './types'

export class MarketAnalysis {
  private network: Network
  private apiBaseUrl: string

  constructor(config?: Network | SDKConfig) {
    if (!config || typeof config === 'string') {
      this.network = config || 'testnet'
      this.apiBaseUrl = this.network === 'mainnet'
        ? 'https://10xswap.com/api'
        : 'http://localhost:3000/api'
    } else {
      this.network = config.network
      this.apiBaseUrl = config.apiBaseUrl || (config.network === 'mainnet'
        ? 'https://10xswap.com/api'
        : 'http://localhost:3000/api')
    }
  }

  /**
   * Analyze a cryptocurrency with AI
   */
  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/mcp/analyze`, {
        coin: request.coin,
        horizonDays: request.horizonDays || 30,
        granularity: request.granularity || '1d',
        tasks: request.tasks || ['analysis', 'prediction', 'strategy', 'charts'],
        chartType: request.chartType || 'candlestick',
        network: this.network
      })

      return response.data
    } catch (error: any) {
      throw this.handleError(error, 'Failed to analyze cryptocurrency')
    }
  }

  /**
   * Get Fear & Greed Index
   */
  async getFearGreedIndex(): Promise<FearGreedIndex> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/mcp/fear-greed`)

      if (response.data.ok && response.data.index) {
        return response.data.index
      } else {
        throw new Error(response.data.error || 'Failed to fetch Fear & Greed Index')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch Fear & Greed Index')
    }
  }

  /**
   * Get trending cryptocurrencies
   */
  async getTrendingCoins(): Promise<TrendingToken[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/mcp/trending`)

      if (response.data.ok && response.data.trending) {
        return response.data.trending
      } else {
        throw new Error(response.data.error || 'Failed to fetch trending coins')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch trending coins')
    }
  }

  /**
   * Get trending Algorand ecosystem tokens
   */
  async getTrendingAlgorandTokens(): Promise<TrendingToken[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/mcp/trending/algorand`)

      if (response.data.ok && response.data.trending) {
        return response.data.trending
      } else {
        throw new Error(response.data.error || 'Failed to fetch Algorand trending tokens')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch Algorand trending tokens')
    }
  }

  /**
   * Get cryptocurrency news
   */
  async getNews(coinId: string, limit: number = 5): Promise<Array<{
    title: string
    description: string
    url: string
    source: string
    publishedAt: string
    sentiment?: 'positive' | 'negative' | 'neutral'
  }>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/mcp/news`, {
        params: { coinId, limit }
      })

      if (response.data.ok && response.data.news) {
        return response.data.news
      } else {
        throw new Error(response.data.error || 'Failed to fetch news')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch news')
    }
  }

  /**
   * Get quick price for a coin
   */
  async getPrice(coinId: string): Promise<{
    price: number
    priceChange24h: number
    marketCap: number
    volume24h: number
  }> {
    try {
      const analysis = await this.analyze({
        coin: coinId,
        horizonDays: 1,
        tasks: ['analysis']
      })

      if (analysis.ok && analysis.marketData) {
        return {
          price: analysis.marketData.price,
          priceChange24h: analysis.marketData.priceChangePercentage24h,
          marketCap: analysis.marketData.marketCap,
          volume24h: analysis.marketData.volume24h
        }
      } else {
        throw new Error('Failed to fetch price data')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch price')
    }
  }

  /**
   * Compare multiple cryptocurrencies
   */
  async compare(coins: string[]): Promise<Array<{
    coin: string
    price: number
    priceChange24h: number
    marketCap: number
    volume24h: number
  }>> {
    try {
      const results = await Promise.all(
        coins.map(coin => this.getPrice(coin))
      )

      return coins.map((coin, index) => ({
        coin,
        ...results[index]
      }))
    } catch (error: any) {
      throw this.handleError(error, 'Failed to compare cryptocurrencies')
    }
  }

  private handleError(error: any, message: string): Error {
    if (error.response) {
      return new Error(`${message}: ${error.response.data?.error || error.message}`)
    }
    return new Error(`${message}: ${error.message}`)
  }

  /**
   * Static methods for quick access without instantiation
   */
  static async quickAnalyze(coin: string, network: Network = 'testnet'): Promise<AnalysisResult> {
    const instance = new MarketAnalysis(network)
    return instance.analyze({ coin })
  }

  static async quickPrice(coin: string, network: Network = 'testnet'): Promise<number> {
    const instance = new MarketAnalysis(network)
    const data = await instance.getPrice(coin)
    return data.price
  }
}

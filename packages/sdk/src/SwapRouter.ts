/**
 * SwapRouter - Multi-DEX routing and optimal swap path finding
 */

import algosdk, { Algodv2, Transaction } from 'algosdk'
import axios from 'axios'
import type {
  Network,
  QuoteRequest,
  SwapQuote,
  PoolInfo,
  SDKConfig,
  SDKError,
} from './types'

export class SwapRouter {
  private algodClient: Algodv2
  private network: Network
  private pools: PoolInfo[] = []
  private apiBaseUrl: string
  private initialized: boolean = false

  constructor(config: Network | SDKConfig) {
    if (typeof config === 'string') {
      // Simple network string
      this.network = config
      this.algodClient = this.createDefaultAlgodClient(config)
      this.apiBaseUrl = config === 'mainnet'
        ? 'https://10xswap.com/api'
        : 'http://localhost:3000/api'
    } else {
      // Full config object
      this.network = config.network
      this.apiBaseUrl = config.apiBaseUrl || (config.network === 'mainnet'
        ? 'https://10xswap.com/api'
        : 'http://localhost:3000/api')

      if (config.algodUrl) {
        this.algodClient = new Algodv2(
          config.algodToken || '',
          config.algodUrl,
          config.algodPort || ''
        )
      } else {
        this.algodClient = this.createDefaultAlgodClient(config.network)
      }
    }
  }

  private createDefaultAlgodClient(network: Network): Algodv2 {
    if (network === 'mainnet') {
      return new Algodv2('', 'https://mainnet-api.4160.nodely.io', '')
    }
    return new Algodv2('', 'https://testnet-api.4160.nodely.io', '')
  }

  /**
   * Initialize the router by fetching all available pools
   */
  async initialize(): Promise<void> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/pools/all`, {
        params: { network: this.network }
      })

      if (response.data.pools) {
        this.pools = response.data.pools
        this.initialized = true
      } else {
        throw new Error('Failed to fetch pools')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to initialize SwapRouter')
    }
  }

  /**
   * Find the best route for a swap across all DEXs
   */
  async findBestRoute(request: QuoteRequest): Promise<SwapQuote> {
    if (!this.initialized) {
      throw new Error('SwapRouter not initialized. Call initialize() first.')
    }

    try {
      const response = await axios.get(`${this.apiBaseUrl}/router/quote`, {
        params: {
          assetIn: request.assetIn,
          assetOut: request.assetOut,
          amount: request.amount,
          slippage: request.slippage || 0.5,
          maxHops: request.maxHops || 3,
          network: this.network
        }
      })

      if (response.data.ok && response.data.quote) {
        return response.data.quote
      } else {
        throw new Error(response.data.error || 'Failed to get quote')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to find best route')
    }
  }

  /**
   * Build unsigned swap transaction
   */
  async buildSwapTransaction(quote: SwapQuote, sender: string): Promise<Transaction> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/swap/prepare`, {
        quote,
        sender,
        network: this.network
      })

      if (response.data.ok && response.data.txn) {
        // Decode base64 transaction
        const txnBytes = Buffer.from(response.data.txn, 'base64')
        return algosdk.decodeUnsignedTransaction(txnBytes)
      } else {
        throw new Error(response.data.error || 'Failed to build transaction')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to build swap transaction')
    }
  }

  /**
   * Get all available pools
   */
  getPools(): PoolInfo[] {
    return this.pools
  }

  /**
   * Get pools for a specific asset pair
   */
  getPoolsForPair(asset1: number, asset2: number): PoolInfo[] {
    return this.pools.filter(pool =>
      (pool.asset1 === asset1 && pool.asset2 === asset2) ||
      (pool.asset1 === asset2 && pool.asset2 === asset1)
    )
  }

  /**
   * Get the Algod client instance
   */
  getAlgodClient(): Algodv2 {
    return this.algodClient
  }

  /**
   * Get current network
   */
  getNetwork(): Network {
    return this.network
  }

  private handleError(error: any, message: string): Error {
    if (error.response) {
      return new Error(`${message}: ${error.response.data?.error || error.message}`)
    }
    return new Error(`${message}: ${error.message}`)
  }
}

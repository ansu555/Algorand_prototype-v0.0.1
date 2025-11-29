/**
 * LiquidityPool - Constant Product AMM (Uniswap V2 model)
 */

import algosdk, { Algodv2, Transaction } from 'algosdk'
import axios from 'axios'
import type {
  Network,
  PoolInfoDetailed,
  QuoteResult,
  LiquidityParams,
  TxResult,
  SDKConfig,
} from './types'

export class LiquidityPool {
  private poolAppId: number
  private algodClient: Algodv2
  private network: Network
  private apiBaseUrl: string

  constructor(
    poolAppId: number,
    config?: Network | SDKConfig
  ) {
    this.poolAppId = poolAppId

    if (!config || typeof config === 'string') {
      this.network = config || 'testnet'
      this.algodClient = this.createDefaultAlgodClient(this.network)
      this.apiBaseUrl = this.network === 'mainnet'
        ? 'https://10xswap.com/api'
        : 'http://localhost:3000/api'
    } else {
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
   * Get pool information
   */
  async getPoolInfo(): Promise<PoolInfoDetailed> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/pools/${this.poolAppId}`, {
        params: { network: this.network }
      })

      if (response.data.ok && response.data.pool) {
        return response.data.pool
      } else {
        throw new Error(response.data.error || 'Failed to fetch pool info')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch pool info')
    }
  }

  /**
   * Get swap quote without executing
   */
  async getSwapQuote(assetIn: number, amountIn: number): Promise<QuoteResult> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/pools/${this.poolAppId}/quote`, {
        params: {
          assetIn,
          amountIn,
          network: this.network
        }
      })

      if (response.data.ok && response.data.quote) {
        return response.data.quote
      } else {
        throw new Error(response.data.error || 'Failed to get quote')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to get swap quote')
    }
  }

  /**
   * Create a new pool (permissionless)
   */
  async createPool(
    asset1: number,
    asset2: number,
    feeBps: number,
    senderAddress: string
  ): Promise<Transaction> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/pools/create`, {
        asset1,
        asset2,
        feeBps,
        sender: senderAddress,
        network: this.network
      })

      if (response.data.ok && response.data.txn) {
        const txnBytes = Buffer.from(response.data.txn, 'base64')
        return algosdk.decodeUnsignedTransaction(txnBytes)
      } else {
        throw new Error(response.data.error || 'Failed to build create pool transaction')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to create pool')
    }
  }

  /**
   * Add liquidity to pool
   */
  async addLiquidity(
    params: LiquidityParams,
    senderAddress: string
  ): Promise<Transaction> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/pools/${this.poolAppId}/add-liquidity`, {
        amount1: params.amount1,
        amount2: params.amount2,
        minLpTokens: params.minLpTokens,
        sender: senderAddress,
        network: this.network
      })

      if (response.data.ok && response.data.txn) {
        const txnBytes = Buffer.from(response.data.txn, 'base64')
        return algosdk.decodeUnsignedTransaction(txnBytes)
      } else {
        throw new Error(response.data.error || 'Failed to build add liquidity transaction')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to add liquidity')
    }
  }

  /**
   * Remove liquidity from pool
   */
  async removeLiquidity(
    lpTokens: number,
    minAmount1: number,
    minAmount2: number,
    senderAddress: string
  ): Promise<Transaction> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/pools/${this.poolAppId}/remove-liquidity`, {
        lpTokens,
        minAmount1,
        minAmount2,
        sender: senderAddress,
        network: this.network
      })

      if (response.data.ok && response.data.txn) {
        const txnBytes = Buffer.from(response.data.txn, 'base64')
        return algosdk.decodeUnsignedTransaction(txnBytes)
      } else {
        throw new Error(response.data.error || 'Failed to build remove liquidity transaction')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to remove liquidity')
    }
  }

  /**
   * Swap assets in pool
   */
  async swap(
    assetIn: number,
    amountIn: number,
    minAmountOut: number,
    senderAddress: string
  ): Promise<Transaction> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/pools/${this.poolAppId}/swap`, {
        assetIn,
        amountIn,
        minAmountOut,
        sender: senderAddress,
        network: this.network
      })

      if (response.data.ok && response.data.txn) {
        const txnBytes = Buffer.from(response.data.txn, 'base64')
        return algosdk.decodeUnsignedTransaction(txnBytes)
      } else {
        throw new Error(response.data.error || 'Failed to build swap transaction')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to swap')
    }
  }

  /**
   * Calculate price impact for a swap
   */
  async calculatePriceImpact(assetIn: number, amountIn: number): Promise<number> {
    try {
      const quote = await this.getSwapQuote(assetIn, amountIn)
      return quote.priceImpact
    } catch (error: any) {
      throw this.handleError(error, 'Failed to calculate price impact')
    }
  }

  /**
   * Get pool's current price ratio
   */
  async getPrice(assetIn: number): Promise<number> {
    try {
      const poolInfo = await this.getPoolInfo()

      if (assetIn === poolInfo.asset1) {
        return poolInfo.reserve2 / poolInfo.reserve1
      } else if (assetIn === poolInfo.asset2) {
        return poolInfo.reserve1 / poolInfo.reserve2
      } else {
        throw new Error('Asset not in pool')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to get price')
    }
  }

  /**
   * Get pool's TVL (Total Value Locked)
   */
  async getTVL(): Promise<number> {
    try {
      const poolInfo = await this.getPoolInfo()
      return poolInfo.totalLiquidity
    } catch (error: any) {
      throw this.handleError(error, 'Failed to get TVL')
    }
  }

  /**
   * Get the Algod client
   */
  getAlgodClient(): Algodv2 {
    return this.algodClient
  }

  /**
   * Get pool app ID
   */
  getPoolAppId(): number {
    return this.poolAppId
  }

  private handleError(error: any, message: string): Error {
    if (error.response) {
      return new Error(`${message}: ${error.response.data?.error || error.message}`)
    }
    return new Error(`${message}: ${error.message}`)
  }
}

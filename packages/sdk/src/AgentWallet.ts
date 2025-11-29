/**
 * AgentWallet - Encrypted wallet management for automated trading
 */

import algosdk, { Algodv2, Account, Transaction } from 'algosdk'
import axios from 'axios'
import type {
  Network,
  BalanceInfo,
  TransferParams,
  TxResult,
  SwapQuote,
  SDKConfig,
} from './types'

export class AgentWallet {
  private account: Account
  private algodClient: Algodv2
  private network: Network
  private apiBaseUrl: string

  private constructor(
    account: Account,
    algodClient: Algodv2,
    network: Network,
    apiBaseUrl: string
  ) {
    this.account = account
    this.algodClient = algodClient
    this.network = network
    this.apiBaseUrl = apiBaseUrl
  }

  /**
   * Create a new agent wallet
   */
  static async create(
    userAddress: string,
    password: string,
    config?: Network | SDKConfig
  ): Promise<AgentWallet> {
    const { algodClient, network, apiBaseUrl } = AgentWallet.parseConfig(config || 'testnet')

    try {
      const response = await axios.post(`${apiBaseUrl}/agent`, {
        action: 'create',
        userAddress,
        password,
        network
      })

      if (response.data.ok && response.data.mnemonic) {
        const account = algosdk.mnemonicToSecretKey(response.data.mnemonic)
        return new AgentWallet(account, algodClient, network, apiBaseUrl)
      } else {
        throw new Error(response.data.error || 'Failed to create agent wallet')
      }
    } catch (error: any) {
      throw AgentWallet.handleError(error, 'Failed to create agent wallet')
    }
  }

  /**
   * Recover an existing agent wallet
   */
  static async recover(
    userAddress: string,
    password: string,
    config?: Network | SDKConfig
  ): Promise<AgentWallet> {
    const { algodClient, network, apiBaseUrl } = AgentWallet.parseConfig(config || 'testnet')

    try {
      const response = await axios.post(`${apiBaseUrl}/agent`, {
        action: 'recover',
        userAddress,
        password,
        network
      })

      if (response.data.ok && response.data.mnemonic) {
        const account = algosdk.mnemonicToSecretKey(response.data.mnemonic)
        return new AgentWallet(account, algodClient, network, apiBaseUrl)
      } else {
        throw new Error(response.data.error || 'Failed to recover agent wallet')
      }
    } catch (error: any) {
      throw AgentWallet.handleError(error, 'Failed to recover agent wallet')
    }
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.account.addr.toString()
  }

  /**
   * Get wallet balance and holdings
   */
  async getBalance(): Promise<BalanceInfo> {
    try {
      const accountInfo = await this.algodClient.accountInformation(this.account.addr).do()

      const assets = (accountInfo.assets || []).map((asset: any) => ({
        assetId: asset['asset-id'],
        balance: asset.amount,
        symbol: 'ASA',
        decimals: 0
      }))

      return {
        algo: Number(accountInfo.amount) / 1_000_000,
        availableBalance: (Number(accountInfo.amount) - Number(accountInfo.minBalance)) / 1_000_000,
        assets
      }
    } catch (error: any) {
      throw AgentWallet.handleError(error, 'Failed to get balance')
    }
  }

  /**
   * Opt-in to an asset
   */
  async optIn(assetId: number): Promise<TxResult> {
    try {
      const params = await this.algodClient.getTransactionParams().do()

      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: this.account.addr,
        receiver: this.account.addr,
        amount: 0,
        assetIndex: assetId,
        suggestedParams: params
      })

      const signedTxn = txn.signTxn(this.account.sk)
      const response = await this.algodClient.sendRawTransaction(signedTxn).do()
      const txId = response.txid

      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(this.algodClient, txId, 4)

      return {
        txId,
        confirmedRound: confirmedTxn.confirmedRound ? Number(confirmedTxn.confirmedRound) : undefined
      }
    } catch (error: any) {
      throw AgentWallet.handleError(error, 'Failed to opt-in to asset')
    }
  }

  /**
   * Transfer ALGO or ASA
   */
  async transfer(params: TransferParams): Promise<TxResult> {
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do()

      let txn: Transaction

      if (params.assetId === 0) {
        // ALGO transfer
        txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account.addr,
          receiver: params.to,
          amount: BigInt(params.amount),
          note: params.note ? new TextEncoder().encode(params.note) : undefined,
          suggestedParams
        })
      } else {
        // ASA transfer
        txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: this.account.addr,
          receiver: params.to,
          amount: BigInt(params.amount),
          assetIndex: params.assetId,
          note: params.note ? new TextEncoder().encode(params.note) : undefined,
          suggestedParams
        })
      }

      const signedTxn = txn.signTxn(this.account.sk)
      const response = await this.algodClient.sendRawTransaction(signedTxn).do()
      const txId = response.txid

      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(this.algodClient, txId, 4)

      return {
        txId,
        confirmedRound: confirmedTxn.confirmedRound ? Number(confirmedTxn.confirmedRound) : undefined
      }
    } catch (error: any) {
      throw AgentWallet.handleError(error, 'Failed to transfer')
    }
  }

  /**
   * Execute a swap using a quote
   */
  async swap(quote: SwapQuote): Promise<TxResult> {
    try {
      // Build swap transaction
      const response = await axios.post(`${this.apiBaseUrl}/swap/prepare`, {
        quote,
        sender: this.account.addr,
        network: this.network
      })

      if (!response.data.ok || !response.data.txn) {
        throw new Error(response.data.error || 'Failed to prepare swap')
      }

      // Decode and sign transaction
      const txnBytes = Buffer.from(response.data.txn, 'base64')
      const txn = algosdk.decodeUnsignedTransaction(txnBytes)
      const signedTxn = txn.signTxn(this.account.sk)

      // Submit transaction
      const submitResponse = await axios.post(`${this.apiBaseUrl}/swap/submit`, {
        signedTxn: Buffer.from(signedTxn).toString('base64'),
        assetIn: quote.assetIn,
        assetOut: quote.assetOut,
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        sender: this.account.addr,
        network: this.network
      })

      if (submitResponse.data.ok) {
        return {
          txId: submitResponse.data.txId,
          confirmedRound: submitResponse.data.confirmedRound
        }
      } else {
        throw new Error(submitResponse.data.error || 'Failed to submit swap')
      }
    } catch (error: any) {
      throw AgentWallet.handleError(error, 'Failed to execute swap')
    }
  }

  /**
   * Get the Algod client
   */
  getAlgodClient(): Algodv2 {
    return this.algodClient
  }

  /**
   * Get the network
   */
  getNetwork(): Network {
    return this.network
  }

  private static parseConfig(config: Network | SDKConfig): {
    algodClient: Algodv2
    network: Network
    apiBaseUrl: string
  } {
    if (typeof config === 'string') {
      const network = config
      const algodClient = network === 'mainnet'
        ? new Algodv2('', 'https://mainnet-api.4160.nodely.io', '')
        : new Algodv2('', 'https://testnet-api.4160.nodely.io', '')
      const apiBaseUrl = network === 'mainnet'
        ? 'https://10xswap.com/api'
        : 'http://localhost:3000/api'
      return { algodClient, network, apiBaseUrl }
    } else {
      const network = config.network
      const algodClient = config.algodUrl
        ? new Algodv2(config.algodToken || '', config.algodUrl, config.algodPort || '')
        : (network === 'mainnet'
          ? new Algodv2('', 'https://mainnet-api.4160.nodely.io', '')
          : new Algodv2('', 'https://testnet-api.4160.nodely.io', ''))
      const apiBaseUrl = config.apiBaseUrl || (network === 'mainnet'
        ? 'https://10xswap.com/api'
        : 'http://localhost:3000/api')
      return { algodClient, network, apiBaseUrl }
    }
  }

  private static handleError(error: any, message: string): Error {
    if (error.response) {
      return new Error(`${message}: ${error.response.data?.error || error.message}`)
    }
    return new Error(`${message}: ${error.message}`)
  }
}

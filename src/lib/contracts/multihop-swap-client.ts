/**
 * Multihop Swap Contract Client
 * Provides methods to interact with the deployed MultihopSwapRouter contract
 */

import algosdk from 'algosdk';
import { getContractConfig } from '../config/contracts';
import { getMultihopRouterSpec } from './artifacts';

export interface SwapParams {
  inputAsset: number;
  intermediateAsset?: number;
  outputAsset: number;
  pool1AppId: number;
  pool2AppId?: number;
  amountIn: bigint;
  minAmountOut: bigint;
  userAddress: string;
}

export class MultihopSwapClient {
  private algodClient: algosdk.Algodv2;
  private routerAppId: number;
  private contractSpec: any;

  constructor(algodClient: algosdk.Algodv2, network: 'mainnet' | 'testnet' = 'testnet') {
    this.algodClient = algodClient;
    const config = getContractConfig(network);
    this.routerAppId = config.multihopRouter.appId;
    this.contractSpec = getMultihopRouterSpec();
  }

  /**
   * Execute a 2-hop swap through the router
   */
  async executeSwap2Hop(params: SwapParams): Promise<string> {
    if (!params.intermediateAsset || !params.pool2AppId) {
      throw new Error('2-hop swap requires intermediateAsset and pool2AppId');
    }

    if (this.routerAppId === 0) {
      throw new Error('MultihopSwapRouter not deployed. Please deploy the contract first.');
    }

    const suggestedParams = await this.algodClient.getTransactionParams().do();

    // Create application call transaction
    const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
      sender: params.userAddress,
      suggestedParams,
      appIndex: this.routerAppId,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs: [
        // Method selector for execute_swap_2hop
        new Uint8Array(Buffer.from('execute_swap_2hop')),
        algosdk.encodeUint64(params.inputAsset),
        algosdk.encodeUint64(params.intermediateAsset),
        algosdk.encodeUint64(params.outputAsset),
        algosdk.encodeUint64(params.pool1AppId),
        algosdk.encodeUint64(params.pool2AppId),
        algosdk.encodeUint64(Number(params.amountIn)),
        algosdk.encodeUint64(Number(params.minAmountOut)),
      ],
      foreignAssets: [params.inputAsset, params.intermediateAsset, params.outputAsset],
      foreignApps: [params.pool1AppId, params.pool2AppId],
    });

    return appCallTxn.txID();
  }

  /**
   * Execute a direct swap (1-hop)
   */
  async executeSwap1Hop(params: Omit<SwapParams, 'intermediateAsset' | 'pool2AppId'>): Promise<string> {
    if (this.routerAppId === 0) {
      throw new Error('MultihopSwapRouter not deployed. Please deploy the contract first.');
    }

    const suggestedParams = await this.algodClient.getTransactionParams().do();

    const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
      sender: params.userAddress,
      suggestedParams,
      appIndex: this.routerAppId,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs: [
        new Uint8Array(Buffer.from('execute_swap_1hop')),
        algosdk.encodeUint64(params.inputAsset),
        algosdk.encodeUint64(params.outputAsset),
        algosdk.encodeUint64(params.pool1AppId),
        algosdk.encodeUint64(Number(params.amountIn)),
        algosdk.encodeUint64(Number(params.minAmountOut)),
      ],
      foreignAssets: [params.inputAsset, params.outputAsset],
      foreignApps: [params.pool1AppId],
    });

    return appCallTxn.txID();
  }

  /**
   * Get router application info
   */
  async getApplicationInfo() {
    if (this.routerAppId === 0) {
      return null;
    }

    try {
      const appInfo = await this.algodClient.getApplicationByID(this.routerAppId).do();
      return appInfo;
    } catch (error) {
      console.error('Error fetching application info:', error);
      return null;
    }
  }

  /**
   * Check if router is deployed and accessible
   */
  async isDeployed(): Promise<boolean> {
    if (this.routerAppId === 0) {
      return false;
    }

    const info = await this.getApplicationInfo();
    return info !== null;
  }
}

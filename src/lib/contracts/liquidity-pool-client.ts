/**
 * Liquidity Pool Contract Client
 * Provides methods to interact with the custom Liquidity Pool smart contract
 */

import algosdk from 'algosdk';
import { getContractConfig } from '../config/contracts';

export interface CreatePoolParams {
  asset1Id: number;
  asset2Id: number;
  feeBps: number;
  userAddress: string;
}

export interface AddLiquidityParams {
  poolId: Uint8Array; // NEW: Required for multi-pool factory (raw 32 bytes)
  asset1Id: number;
  asset2Id: number;
  amount1: bigint;
  amount2: bigint;
  minLpTokens: bigint;
  userAddress: string;
}

export interface RemoveLiquidityParams {
  poolId: Uint8Array; // NEW: Required for multi-pool factory (raw 32 bytes)
  lpTokenAmount: bigint;
  minAsset1: bigint;
  minAsset2: bigint;
  userAddress: string;
}

export interface SwapParams {
  poolId: Uint8Array; // NEW: Required for multi-pool factory (raw 32 bytes)
  assetInId: number;
  assetOutId: number;
  amountIn: bigint;
  minAmountOut: bigint;
  userAddress: string;
}

export interface PoolInfo {
  asset1Id: bigint;
  asset2Id: bigint;
  reserve1: bigint;
  reserve2: bigint;
  totalLiquidity: bigint;
  feeBps: number;
  lpTokenId: bigint;
  initialized: boolean;
}

export class LiquidityPoolClient {
  private algodClient: algosdk.Algodv2;
  private poolAppId: number;

  constructor(algodClient: algosdk.Algodv2, network: 'mainnet' | 'testnet' = 'testnet') {
    this.algodClient = algodClient;
    const config = getContractConfig(network);
    this.poolAppId = config.liquidityPool?.appId || 0;
  }

  /**
   * Build transactions to create a new pool
   * Returns unsigned transactions that need to be signed by the user
   *
   * Note: The contract will handle asset opt-ins via inner transactions
   */
  async buildCreatePoolTxns(params: CreatePoolParams): Promise<algosdk.Transaction[]> {
    if (this.poolAppId === 0) {
      throw new Error('Liquidity Pool contract not deployed. Please deploy the contract first.');
    }

    const suggestedParams = await this.algodClient.getTransactionParams().do();
    const transactions: algosdk.Transaction[] = [];

    // Increase fee to cover inner transactions (opt-ins + LP token creation)
    // Need fees for: 2 asset opt-ins + 1 LP token creation = 3 inner txns
    const modifiedParams = { ...suggestedParams };
    modifiedParams.fee = BigInt(4000); // 1000 for this txn + 3000 for inner txns
    modifiedParams.flatFee = true;

    // Create ARC-4 method for proper encoding
    const createPoolMethod = new algosdk.ABIMethod({
      name: 'create_pool',
      args: [
        { type: 'uint64', name: 'asset_1' },
        { type: 'uint64', name: 'asset_2' },
        { type: 'uint16', name: 'fee_bps' },
      ],
      returns: { type: 'string' },
    });

    // Encode method arguments using ABIType for proper encoding
    const appArgs: Uint8Array[] = [createPoolMethod.getSelector()];

    // Encode uint64 for asset_1
    const asset1Type = algosdk.ABIType.from('uint64');
    appArgs.push(asset1Type.encode(params.asset1Id));

    // Encode uint64 for asset_2
    const asset2Type = algosdk.ABIType.from('uint64');
    appArgs.push(asset2Type.encode(params.asset2Id));

    // Encode uint16 for fee_bps
    const feeType = algosdk.ABIType.from('uint16');
    appArgs.push(feeType.encode(params.feeBps));

    // CRITICAL: Compute pool ID and declare box reference
    // The create_pool method will create this box, so we need to declare it
    const poolIdBytes = this.computePoolId(params.asset1Id, params.asset2Id);
    const boxReference: algosdk.BoxReference = {
      appIndex: this.poolAppId,
      name: Buffer.from(poolIdBytes), // Pool ID is raw 32-byte SHA256 hash as Buffer
    };

    // Application call to create_pool with proper ARC-4 encoding
    const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
      sender: params.userAddress,
      suggestedParams: modifiedParams,
      appIndex: this.poolAppId,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs,
      foreignAssets: params.asset1Id === 0
        ? [params.asset2Id]  // Only include non-ALGO asset
        : params.asset2Id === 0
        ? [params.asset1Id]  // Only include non-ALGO asset
        : [params.asset1Id, params.asset2Id],  // Include both if neither is ALGO
      boxes: [boxReference], // Box reference with raw bytes
    });
    transactions.push(appCallTxn);

    return transactions;
  }

  /**
   * Build transactions to create LP token
   * NEW: Requires pool_id parameter for multi-pool factory
   */
  async buildCreateLPTokenTxn(
    userAddress: string,
    poolIdBytes: Uint8Array,
    totalSupply: bigint,
    decimals: number,
    name: string,
    unitName: string
  ): Promise<algosdk.Transaction> {
    if (this.poolAppId === 0) {
      throw new Error('Liquidity Pool contract not deployed.');
    }

    const suggestedParams = await this.algodClient.getTransactionParams().do();

    // Create ARC-4 method for proper encoding
    // NEW: pool_id is now the first parameter
    const createLPTokenMethod = new algosdk.ABIMethod({
      name: 'create_lp_token',
      args: [
        { type: 'string', name: 'pool_id' },
        { type: 'uint64', name: 'total' },
        { type: 'uint32', name: 'decimals' },
        { type: 'string', name: 'name' },
        { type: 'string', name: 'unit_name' },
      ],
      returns: { type: 'uint64' },
    });

    // Encode method arguments using ABIType for proper encoding
    const appArgs: Uint8Array[] = [createLPTokenMethod.getSelector()];

    // Encode pool_id as ARC-4 string (2-byte length prefix + raw bytes)
    // We need to manually create the ARC-4 string encoding
    const poolIdEncoded = new Uint8Array(2 + poolIdBytes.length);
    poolIdEncoded[0] = (poolIdBytes.length >> 8) & 0xFF; // High byte of length
    poolIdEncoded[1] = poolIdBytes.length & 0xFF;        // Low byte of length
    poolIdEncoded.set(poolIdBytes, 2);                   // Copy the bytes after length
    appArgs.push(poolIdEncoded);

    // Encode uint64 for total supply
    const totalType = algosdk.ABIType.from('uint64');
    appArgs.push(totalType.encode(totalSupply));

    // Encode uint32 for decimals
    const decimalsType = algosdk.ABIType.from('uint32');
    appArgs.push(decimalsType.encode(decimals));

    // Encode string for name
    const nameType = algosdk.ABIType.from('string');
    appArgs.push(nameType.encode(name));

    // Encode string for unit_name
    const unitNameType = algosdk.ABIType.from('string');
    appArgs.push(unitNameType.encode(unitName));

    // Increase fee to cover inner transaction (creating the LP token)
    const modifiedParams = { ...suggestedParams };
    modifiedParams.fee = BigInt(2000); // 1000 for this txn + 1000 for inner txn (asset creation)
    modifiedParams.flatFee = true;

    // CRITICAL: Box reference must use raw bytes WITHOUT ARC-4 encoding
    // The pool_id argument is ARC-4 encoded (with length prefix), but the box name is raw
    // Convert Uint8Array to Buffer to ensure proper encoding
    const boxReference: algosdk.BoxReference = {
      appIndex: this.poolAppId,
      name: Buffer.from(poolIdBytes), // Raw 32-byte pool ID as Buffer
    };

    const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
      sender: userAddress,
      suggestedParams: modifiedParams,
      appIndex: this.poolAppId,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs,
      boxes: [boxReference], // Box reference with raw bytes
    });

    return appCallTxn;
  }

  /**
   * Build transactions to add liquidity to the pool
   */
  async buildAddLiquidityTxns(params: AddLiquidityParams): Promise<algosdk.Transaction[]> {
    if (this.poolAppId === 0) {
      throw new Error('Liquidity Pool contract not deployed.');
    }

    const suggestedParams = await this.algodClient.getTransactionParams().do();
    const poolAddress = algosdk.getApplicationAddress(this.poolAppId);
    const transactions: algosdk.Transaction[] = [];

    // Transaction 1: Transfer asset 1 to pool
    if (params.asset1Id === 0) {
      // ALGO payment
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.userAddress,
        receiver: poolAddress,
        amount: Number(params.amount1),
        suggestedParams,
      });
      transactions.push(paymentTxn);
    } else {
      // Asset transfer
      const assetTxn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: params.userAddress,
        receiver: poolAddress,
        assetIndex: params.asset1Id,
        amount: Number(params.amount1),
        suggestedParams,
      });
      transactions.push(assetTxn1);
    }

    // Transaction 2: Transfer asset 2 to pool
    if (params.asset2Id === 0) {
      // ALGO payment
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.userAddress,
        receiver: poolAddress,
        amount: Number(params.amount2),
        suggestedParams,
      });
      transactions.push(paymentTxn);
    } else {
      // Asset transfer
      const assetTxn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: params.userAddress,
        receiver: poolAddress,
        assetIndex: params.asset2Id,
        amount: Number(params.amount2),
        suggestedParams,
      });
      transactions.push(assetTxn2);
    }

    // Transaction 3: Application call to add_liquidity
    // Create ARC-4 method for proper encoding
    // Note: axfer transactions are in the group, but must be in the signature for selector
    // NEW: pool_id is now the first parameter
    const addLiquidityMethod = new algosdk.ABIMethod({
      name: 'add_liquidity',
      args: [
        { type: 'string', name: 'pool_id' },
        { type: 'axfer', name: 'asset_1_payment' },
        { type: 'axfer', name: 'asset_2_payment' },
        { type: 'uint64', name: 'min_lp_tokens' },
      ],
      returns: { type: 'uint64' },
    });

    // Only non-transaction arguments are encoded in appArgs
    const appArgs: Uint8Array[] = [addLiquidityMethod.getSelector()];

    // Encode string for pool_id (NEW)
    const poolIdType = algosdk.ABIType.from('string');
    appArgs.push(poolIdType.encode(params.poolId));

    const minLpTokensType = algosdk.ABIType.from('uint64');
    appArgs.push(minLpTokensType.encode(params.minLpTokens));

    // Increase fee to cover inner transaction (sending LP tokens back)
    const modifiedParams = { ...suggestedParams };
    modifiedParams.fee = BigInt(2000); // 1000 for this txn + 1000 for inner txn
    modifiedParams.flatFee = true;

    // CRITICAL: Declare box reference for box storage access
    const boxReference: algosdk.BoxReference = {
      appIndex: this.poolAppId,
      name: Buffer.from(params.poolId), // Pool ID is raw 32-byte hash as Buffer
    };

    const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
      sender: params.userAddress,
      suggestedParams: modifiedParams,
      appIndex: this.poolAppId,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs,
      foreignAssets: [params.asset1Id, params.asset2Id],
      boxes: [boxReference], // Box reference with raw bytes
    });
    transactions.push(appCallTxn);

    // Don't group here - let the caller group all transactions together
    return transactions;
  }

  /**
   * Build transactions to remove liquidity from the pool
   */
  async buildRemoveLiquidityTxns(params: RemoveLiquidityParams, lpTokenId: number): Promise<algosdk.Transaction[]> {
    if (this.poolAppId === 0) {
      throw new Error('Liquidity Pool contract not deployed.');
    }

    const suggestedParams = await this.algodClient.getTransactionParams().do();
    const poolAddress = algosdk.getApplicationAddress(this.poolAppId);
    const transactions: algosdk.Transaction[] = [];

    // Transaction 1: Transfer LP tokens to pool
    const lpTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: params.userAddress,
      receiver: poolAddress,
      assetIndex: lpTokenId,
      amount: Number(params.lpTokenAmount),
      suggestedParams,
    });
    transactions.push(lpTransferTxn);

    // Transaction 2: Application call to remove_liquidity
    // Create ARC-4 method for proper encoding
    // Note: axfer transaction is in the group, but must be in the signature for selector
    // NEW: pool_id is now the first parameter
    const removeLiquidityMethod = new algosdk.ABIMethod({
      name: 'remove_liquidity',
      args: [
        { type: 'string', name: 'pool_id' },
        { type: 'axfer', name: 'lp_token_payment' },
        { type: 'uint64', name: 'min_asset_1' },
        { type: 'uint64', name: 'min_asset_2' },
      ],
      returns: { type: '(uint64,uint64)' },
    });

    // Only non-transaction arguments are encoded in appArgs
    const appArgs: Uint8Array[] = [removeLiquidityMethod.getSelector()];

    // Encode string for pool_id (NEW)
    const poolIdType = algosdk.ABIType.from('string');
    appArgs.push(poolIdType.encode(params.poolId));

    const minAsset1Type = algosdk.ABIType.from('uint64');
    appArgs.push(minAsset1Type.encode(params.minAsset1));
    const minAsset2Type = algosdk.ABIType.from('uint64');
    appArgs.push(minAsset2Type.encode(params.minAsset2));

    // Increase fee to cover inner transactions (sending both assets back)
    const modifiedParams = { ...suggestedParams };
    modifiedParams.fee = BigInt(3000); // 1000 for this txn + 2000 for 2 inner txns (2 asset transfers)
    modifiedParams.flatFee = true;

    // CRITICAL: Declare box reference for box storage access
    const boxReference: algosdk.BoxReference = {
      appIndex: this.poolAppId,
      name: Buffer.from(params.poolId), // Pool ID is raw 32-byte hash as Buffer
    };

    const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
      sender: params.userAddress,
      suggestedParams: modifiedParams,
      appIndex: this.poolAppId,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs,
      foreignAssets: [lpTokenId],
      boxes: [boxReference], // Box reference with raw bytes
    });
    transactions.push(appCallTxn);

    // Don't group here - let the caller group all transactions together
    return transactions;
  }

  /**
   * Build transactions to swap tokens
   */
  async buildSwapTxns(params: SwapParams): Promise<algosdk.Transaction[]> {
    if (this.poolAppId === 0) {
      throw new Error('Liquidity Pool contract not deployed.');
    }

    const suggestedParams = await this.algodClient.getTransactionParams().do();
    const poolAddress = algosdk.getApplicationAddress(this.poolAppId);
    const transactions: algosdk.Transaction[] = [];

    // Transaction 1: Transfer input asset to pool
    if (params.assetInId === 0) {
      // ALGO payment
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.userAddress,
        receiver: poolAddress,
        amount: Number(params.amountIn),
        suggestedParams,
      });
      transactions.push(paymentTxn);
    } else {
      // Asset transfer
      const assetTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: params.userAddress,
        receiver: poolAddress,
        assetIndex: params.assetInId,
        amount: Number(params.amountIn),
        suggestedParams,
      });
      transactions.push(assetTxn);
    }

    // Transaction 2: Application call to swap
    // Create ARC-4 method for proper encoding
    // Note: axfer transaction is in the group, but must be in the signature for selector
    // NEW: pool_id is now the first parameter
    const swapMethod = new algosdk.ABIMethod({
      name: 'swap',
      args: [
        { type: 'string', name: 'pool_id' },
        { type: 'axfer', name: 'asset_in_payment' },
        { type: 'uint64', name: 'asset_out_id' },
        { type: 'uint64', name: 'min_amount_out' },
      ],
      returns: { type: 'uint64' },
    });

    // Only non-transaction arguments are encoded in appArgs
    const appArgs: Uint8Array[] = [swapMethod.getSelector()];

    // Encode string for pool_id (NEW)
    const poolIdType = algosdk.ABIType.from('string');
    appArgs.push(poolIdType.encode(params.poolId));

    const assetOutIdType = algosdk.ABIType.from('uint64');
    appArgs.push(assetOutIdType.encode(params.assetOutId));
    const minAmountOutType = algosdk.ABIType.from('uint64');
    appArgs.push(minAmountOutType.encode(params.minAmountOut));

    // Increase fee to cover inner transaction (sending output asset back)
    const modifiedParams = { ...suggestedParams };
    modifiedParams.fee = BigInt(2000); // 1000 for this txn + 1000 for inner txn (asset transfer)
    modifiedParams.flatFee = true;

    // CRITICAL: Declare box reference for box storage access
    const boxReference: algosdk.BoxReference = {
      appIndex: this.poolAppId,
      name: Buffer.from(params.poolId), // Pool ID is raw 32-byte hash as Buffer
    };

    const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
      sender: params.userAddress,
      suggestedParams: modifiedParams,
      appIndex: this.poolAppId,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs,
      foreignAssets: [params.assetInId, params.assetOutId],
      boxes: [boxReference], // Box reference with raw bytes
    });
    transactions.push(appCallTxn);

    // Don't group here - let the caller group all transactions together
    return transactions;
  }

  /**
   * Compute pool ID for an asset pair (client-side)
   * NEW: Required for multi-pool factory
   *
   * Replicates the contract's get_pool_key logic:
   * - Sort asset IDs
   * - Concatenate as bytes
   * - SHA256 hash
   * - Return as raw bytes (Uint8Array)
   */
  computePoolId(asset1Id: number, asset2Id: number): Uint8Array {
    // Sort asset IDs to ensure consistent key
    const [sortedAsset1, sortedAsset2] = asset1Id < asset2Id
      ? [asset1Id, asset2Id]
      : [asset2Id, asset1Id];

    // Concatenate as 8-byte big-endian values
    const buffer = Buffer.alloc(16);
    buffer.writeBigUInt64BE(BigInt(sortedAsset1), 0);
    buffer.writeBigUInt64BE(BigInt(sortedAsset2), 8);

    // SHA256 hash - return as raw bytes
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(buffer).digest();

    // Return as Uint8Array (raw 32 bytes)
    return new Uint8Array(hash);
  }

  /**
   * Get pool information (read-only)
   * NEW: For multi-pool factory, we'll need to use box storage
   * This is a placeholder - actual implementation would require simulate/dryrun
   */
  async getPoolInfo(poolId: string): Promise<PoolInfo | null> {
    if (this.poolAppId === 0) {
      return null;
    }

    try {
      // For now, return null - getting box data requires simulate API
      // In production, you would use the simulate endpoint to call get_pool_info
      console.warn('getPoolInfo not fully implemented for multi-pool factory. Use compute_pool_id to get poolId, then query boxes directly.');
      return null;
    } catch (error) {
      console.error('Error fetching pool info:', error);
      return null;
    }
  }

  /**
   * Get swap quote (read-only)
   * NEW: Requires poolId for multi-pool factory
   *
   * Note: Currently calculates locally. For production, should use simulate API
   */
  async getSwapQuote(
    poolId: string,
    assetInId: number,
    assetOutId: number,
    amountIn: bigint
  ): Promise<bigint> {
    if (this.poolAppId === 0) {
      throw new Error('Liquidity Pool contract not deployed.');
    }

    // For now, we'll need the pool info from the frontend/caller
    // In production, this would use the simulate API to call get_swap_quote
    console.warn('getSwapQuote: This method needs pool reserves. Pass them from the frontend or use simulate API.');

    // Placeholder - return 0 for now
    // The frontend should calculate quotes locally using pool reserves
    return 0n;
  }

  /**
   * Get pool address
   */
  getPoolAddress(): string {
    if (this.poolAppId === 0) {
      return '';
    }
    return algosdk.getApplicationAddress(this.poolAppId).toString();
  }

  /**
   * Check if pool is deployed
   */
  async isDeployed(): Promise<boolean> {
    if (this.poolAppId === 0) {
      return false;
    }

    try {
      await this.algodClient.getApplicationByID(this.poolAppId).do();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Token Launchpad - Blockchain Utilities
 * 
 * Core utilities for interacting with the Token Launchpad smart contract
 * and Algorand blockchain.
 */

import algosdk from 'algosdk'
import { ApplicationClient } from '@algorandfoundation/algokit-utils/types/app-client'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

// Contract configuration
export const LAUNCHPAD_APP_ID = parseInt(process.env.NEXT_PUBLIC_LAUNCHPAD_APP_ID || '750321727')
export const ALGORAND_NETWORK = process.env.NEXT_PUBLIC_ALGORAND_NETWORK || 'testnet'

// Algorand node configuration
const ALGOD_SERVER = process.env.NEXT_PUBLIC_ALGOD_SERVER || 'https://testnet-api.algonode.cloud'
const ALGOD_PORT = parseInt(process.env.NEXT_PUBLIC_ALGOD_PORT || '443')
const ALGOD_TOKEN = process.env.NEXT_PUBLIC_ALGOD_TOKEN || ''

/**
 * Get configured Algod client
 */
export function getAlgodClient(): algosdk.Algodv2 {
    return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
}

/**
 * Get AlgorandClient instance
 */
export function getAlgorandClient(): AlgorandClient {
    return AlgorandClient.fromClients({
        algod: getAlgodClient(),
    })
}

/**
 * Create Algorand Standard Asset (ASA)
 * 
 * @param params Asset creation parameters
 * @param signer Transaction signer from wallet
 * @returns Created asset ID
 */
export async function createASA(
    params: {
        name: string
        symbol: string
        total: bigint
        decimals: number
        url?: string
        metadataHash?: Uint8Array
        creator: string
    },
    signer: algosdk.TransactionSigner
): Promise<number> {
    const algodClient = getAlgodClient()
    const suggestedParams = await algodClient.getTransactionParams().do()

    // Create asset transaction
    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        sender: params.creator,
        total: params.total,
        decimals: params.decimals,
        assetName: params.name,
        unitName: params.symbol,
        assetURL: params.url,
        assetMetadataHash: params.metadataHash,
        defaultFrozen: false,
        suggestedParams,
    })

    // Sign and send
    const signedTxn = await signer([txn], [0])
    const sendResult = await algodClient.sendRawTransaction(signedTxn).do()
    const txId = sendResult.txid

    // Wait for confirmation
    const result = await algosdk.waitForConfirmation(algodClient, txId, 4)
    const assetIndex = result.assetIndex

    if (!assetIndex) {
        throw new Error('Failed to create asset - no asset ID returned')
    }

    return Number(assetIndex)
}

/**
 * Configure the Token Launchpad smart contract
 * 
 * @param params Configuration parameters
 * @param signer Transaction signer from wallet
 * @returns Transaction ID
 */
export async function configureContract(
    params: {
        userAddress: string
        asaId: number
        totalSupply: bigint
        tokensForSale: bigint
        startPrice: bigint
        targetPrice: bigint
        bondingTarget: bigint
        curveType: number // 0=Linear, 1=Exponential, 2=Sigmoid
        maxBuyPerTx: bigint
        maxBuyPerUser: bigint
        liquidityPercent: bigint
        liquidityLockDays: bigint
    },
    signer: algosdk.TransactionSigner
): Promise<string> {
    const algodClient = getAlgodClient()
    const suggestedParams = await algodClient.getTransactionParams().do()

    // Build app call transaction
    const configureMethod = new algosdk.ABIMethod({
        name: 'configure',
        args: [
            { type: 'asset', name: 'asa' },
            { type: 'uint64', name: 'total_supply' },
            { type: 'uint64', name: 'tokens_for_sale' },
            { type: 'uint64', name: 'start_price' },
            { type: 'uint64', name: 'target_price' },
            { type: 'uint64', name: 'bonding_target' },
            { type: 'uint64', name: 'curve_type' },
            { type: 'uint64', name: 'max_buy_per_tx' },
            { type: 'uint64', name: 'max_buy_per_user' },
            { type: 'uint64', name: 'liquidity_percent' },
            { type: 'uint64', name: 'liquidity_lock_days' }
        ],
        returns: { type: 'void' }
    })

    const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: params.userAddress,
        appIndex: LAUNCHPAD_APP_ID,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
            configureMethod.getSelector(),
            algosdk.encodeUint64(params.asaId), // Asset ID passed as uint64 for foreign array ref? No, for ABI asset arg, it's the index in foreign assets.
            // Wait, for ABI 'asset' type, the argument in appArgs is the index in the foreignAssets array (1 byte).
            // BUT algosdk.atomicTransactionComposer handles this. Here we are doing manual construction.
            // For manual construction of ABI calls with reference types (account, asset, app), the argument in appArgs must be the index in the respective array.
            // params.asaId is in foreignAssets[0], so the index is 0.
            new Uint8Array([0]),
            algosdk.encodeUint64(params.totalSupply),
            algosdk.encodeUint64(params.tokensForSale),
            algosdk.encodeUint64(params.startPrice),
            algosdk.encodeUint64(params.targetPrice),
            algosdk.encodeUint64(params.bondingTarget),
            algosdk.encodeUint64(BigInt(params.curveType)),
            algosdk.encodeUint64(params.maxBuyPerTx),
            algosdk.encodeUint64(params.maxBuyPerUser),
            algosdk.encodeUint64(params.liquidityPercent),
            algosdk.encodeUint64(params.liquidityLockDays),
        ],
        foreignAssets: [params.asaId],
        suggestedParams,
    })

    // Sign and send
    const signedTxn = await signer([appCallTxn], [0])
    const sendResult = await algodClient.sendRawTransaction(signedTxn).do()
    const txId = sendResult.txid

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 4)

    return txId
}

/**
 * Bootstrap the contract (opt into ASA)
 * 
 * @param params Bootstrap parameters
 * @param signer Transaction signer from wallet
 * @returns Transaction ID
 */
export async function bootstrapContract(
    params: {
        userAddress: string
        asaId: number
    },
    signer: algosdk.TransactionSigner
): Promise<string> {
    const algodClient = getAlgodClient()
    const suggestedParams = await algodClient.getTransactionParams().do()

    const bootstrapMethod = new algosdk.ABIMethod({
        name: 'bootstrap',
        args: [{ type: 'asset', name: 'asa' }],
        returns: { type: 'void' }
    })

    const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: params.userAddress,
        appIndex: LAUNCHPAD_APP_ID,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
            bootstrapMethod.getSelector(),
            new Uint8Array([0]) // Index 0 in foreignAssets
        ],
        foreignAssets: [params.asaId],
        suggestedParams,
    })

    const signedTxn = await signer([appCallTxn], [0])
    const sendResult = await algodClient.sendRawTransaction(signedTxn).do()
    const txId = sendResult.txid

    await algosdk.waitForConfirmation(algodClient, txId, 4)

    return txId
}

/**
 * Fund the contract with tokens
 * 
 * @param params Funding parameters
 * @param signer Transaction signer from wallet
 * @returns Transaction ID
 */
export async function fundContract(
    params: {
        userAddress: string
        asaId: number
        amount: bigint
    },
    signer: algosdk.TransactionSigner
): Promise<string> {
    const algodClient = getAlgodClient()
    const suggestedParams = await algodClient.getTransactionParams().do()

    // Get contract address
    const contractAddress = algosdk.getApplicationAddress(LAUNCHPAD_APP_ID)

    const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: params.userAddress,
        receiver: contractAddress,
        assetIndex: params.asaId,
        amount: params.amount,
        suggestedParams,
    })

    const signedTxn = await signer([assetTransferTxn], [0])
    const sendResult = await algodClient.sendRawTransaction(signedTxn).do()
    const txId = sendResult.txid

    await algosdk.waitForConfirmation(algodClient, txId, 4)

    return txId
}

/**
 * Buy tokens from the bonding curve
 * 
 * @param params Purchase parameters
 * @param signer Transaction signer from wallet
 * @returns Transaction ID
 */
/**
 * Initialize project in a single atomic group
 * Includes: Configure, Fund MBR, Bootstrap (Opt-in), and Fund Tokens
 */
export async function initializeProject(
    params: {
        userAddress: string
        asaId: number
        totalSupply: bigint
        tokensForSale: bigint
        startPrice: bigint
        targetPrice: bigint
        bondingTarget: bigint
        curveType: number
        maxBuyPerTx: bigint
        maxBuyPerUser: bigint
        liquidityPercent: bigint
        liquidityLockDays: bigint
        platformAddress?: string
    },
    signer: algosdk.TransactionSigner
): Promise<{ configTxId: string, bootstrapTxId: string, fundingTxId: string }> {
    const algodClient = getAlgodClient()
    const suggestedParams = await algodClient.getTransactionParams().do()
    const appAddress = algosdk.getApplicationAddress(LAUNCHPAD_APP_ID)

    // Default Platform Address (Treasury) - Replace with env var in production
    const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS || "5IZJEVVOAVXOVCN35JQ5PBDBDAPEBUTKST7GDGUGEBP5QNY7S5YWDYSME4" // Using deployer as fallback

    // 1. Configure App Call
    const configureMethod = new algosdk.ABIMethod({
        name: 'configure',
        args: [
            { type: 'asset', name: 'asa' },
            { type: 'uint64', name: 'total_supply' },
            { type: 'uint64', name: 'tokens_for_sale' },
            { type: 'uint64', name: 'start_price' },
            { type: 'uint64', name: 'target_price' },
            { type: 'uint64', name: 'bonding_target' },
            { type: 'uint64', name: 'curve_type' },
            { type: 'uint64', name: 'max_buy_per_tx' },
            { type: 'uint64', name: 'max_buy_per_user' },
            { type: 'uint64', name: 'liquidity_percent' },
            { type: 'uint64', name: 'liquidity_lock_days' },
            { type: 'account', name: 'platform_address' }
        ],
        returns: { type: 'void' }
    })

    const platformAddr = params.platformAddress || PLATFORM_ADDRESS

    const configureTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: params.userAddress,
        appIndex: LAUNCHPAD_APP_ID,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
            configureMethod.getSelector(),
            new Uint8Array([0]), // Index 0 in foreignAssets (ASA)
            algosdk.encodeUint64(params.totalSupply),
            algosdk.encodeUint64(params.tokensForSale),
            algosdk.encodeUint64(params.startPrice),
            algosdk.encodeUint64(params.targetPrice),
            algosdk.encodeUint64(params.bondingTarget),
            algosdk.encodeUint64(BigInt(params.curveType)),
            algosdk.encodeUint64(params.maxBuyPerTx),
            algosdk.encodeUint64(params.maxBuyPerUser),
            algosdk.encodeUint64(params.liquidityPercent),
            algosdk.encodeUint64(params.liquidityLockDays),
            new Uint8Array([1]) // Index 1 in accounts (Platform Address) - Index 0 is sender
        ],
        foreignAssets: [params.asaId],
        accounts: [platformAddr],
        suggestedParams,
    })

    // 2. Payment for MBR (0.2 ALGO)
    const mbrPaymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.userAddress,
        receiver: appAddress,
        amount: 200_000, // 0.2 ALGO
        suggestedParams,
    })

    // 3. Bootstrap App Call (Opt-in)
    const bootstrapMethod = new algosdk.ABIMethod({
        name: 'bootstrap',
        args: [{ type: 'asset', name: 'asa' }],
        returns: { type: 'void' }
    })

    const bootstrapTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: params.userAddress,
        appIndex: LAUNCHPAD_APP_ID,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
            bootstrapMethod.getSelector(),
            new Uint8Array([0])
        ],
        foreignAssets: [params.asaId],
        suggestedParams,
    })

    // 4. Fund Tokens (Asset Transfer)
    const fundTokensTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: params.userAddress,
        receiver: appAddress,
        assetIndex: params.asaId,
        amount: params.tokensForSale,
        suggestedParams,
    })

    // Group transactions
    const txns = [configureTxn, mbrPaymentTxn, bootstrapTxn, fundTokensTxn]
    algosdk.assignGroupID(txns)

    // Sign all
    const signedTxns = await signer(txns, [0, 1, 2, 3])

    // Send
    const sendResult = await algodClient.sendRawTransaction(signedTxns).do()
    const txId = sendResult.txid

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 4)

    // Return IDs (using the group ID or individual tx IDs - here we return the main group ID for config, but strictly they are separate)
    // We can calculate the IDs of the individual transactions if needed, but for our DB we just need references.
    // The txId returned by sendRawTransaction is the ID of the first transaction (configure).

    return {
        configTxId: txns[0].txID(),
        bootstrapTxId: txns[2].txID(),
        fundingTxId: txns[3].txID()
    }
}

export async function buyTokens(
    params: {
        userAddress: string
        appId?: bigint | number
        asaId: bigint | number
        tokensToBuy: bigint
        maxAlgoCost: bigint
    },
    signer: algosdk.TransactionSigner
): Promise<string> {
    const algodClient = getAlgodClient()
    const suggestedParams = await algodClient.getTransactionParams().do()

    const appId = params.appId ? Number(params.appId) : LAUNCHPAD_APP_ID
    const contractAddress = algosdk.getApplicationAddress(appId)

    // Build atomic transaction group:
    // 1. Payment transaction (ALGO to contract)
    // 2. App call transaction (buy method)

    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.userAddress,
        receiver: contractAddress,
        amount: params.maxAlgoCost,
        suggestedParams,
    })

    const buyMethod = new algosdk.ABIMethod({
        name: 'buy',
        args: [{ type: 'uint64', name: 'quantity' }],
        returns: { type: 'void' }
    })

    const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: params.userAddress,
        appIndex: appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
            buyMethod.getSelector(),
            algosdk.encodeUint64(params.tokensToBuy),
        ],
        foreignAssets: [Number(params.asaId)],
        suggestedParams,
    })

    // Group transactions
    const txns = [paymentTxn, appCallTxn]
    algosdk.assignGroupID(txns)

    // Sign group
    const signedTxns = await signer(txns, [0, 1])

    // Send group
    const sendResult = await algodClient.sendRawTransaction(signedTxns).do()
    const txId = sendResult.txid

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 4)

    return txId
}

/**
 * Get contract global state
 * 
 * @returns Contract state
 */
export async function getContractState(): Promise<Record<string, any>> {
    const algodClient = getAlgodClient()
    const appInfo = await algodClient.getApplicationByID(LAUNCHPAD_APP_ID).do()

    const globalState: Record<string, any> = {}

    if (appInfo.params.globalState) {
        for (const item of appInfo.params.globalState) {
            // Convert Uint8Array to string first
            const keyBytes = new Uint8Array(item.key)
            const keyStr = String.fromCharCode(...Array.from(keyBytes))
            const key = atob(keyStr)

            let value: string | number

            if (item.value.type === 1) {
                // Bytes value
                const valueBytes = new Uint8Array(item.value.bytes || [])
                const valueStr = String.fromCharCode(...Array.from(valueBytes))
                value = atob(valueStr)
            } else {
                // Uint value - convert bigint to number
                value = Number(item.value.uint || 0)
            }

            globalState[key] = value
        }
    }

    return globalState
}

/**
 * Get current round number
 */
export async function getCurrentRound(): Promise<number> {
    const algodClient = getAlgodClient()
    const status = await algodClient.status().do()
    return Number(status.lastRound)
}

/**
 * Convert micro units to standard units (e.g., microALGO to ALGO)
 */
export function microToStandard(micro: bigint | number, decimals: number = 6): number {
    return Number(micro) / Math.pow(10, decimals)
}

/**
 * Convert standard units to micro units
 */
export function standardToMicro(standard: number, decimals: number = 6): bigint {
    return BigInt(Math.floor(standard * Math.pow(10, decimals)))
}

/**
 * Format ALGO amount for display
 */
export function formatAlgo(microAlgo: bigint | number): string {
    const algo = microToStandard(microAlgo, 6)
    return algo.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
    })
}

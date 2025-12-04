/**
 * Token Launchpad - Blockchain Utilities
 * Matches TokenLaunchpad.py (algopy) contract
 */

import algosdk from 'algosdk'
import { AtomicTransactionComposer } from 'algosdk'

// Contract configuration
export const LAUNCHPAD_APP_ID = parseInt(process.env.NEXT_PUBLIC_LAUNCHPAD_APP_ID || '750324113')
export const ALGORAND_NETWORK = process.env.NEXT_PUBLIC_ALGORAND_NETWORK || 'testnet'

// Algorand node configuration
const ALGOD_SERVER = process.env.NEXT_PUBLIC_ALGOD_SERVER || 'https://testnet-api.algonode.cloud'
const ALGOD_PORT = parseInt(process.env.NEXT_PUBLIC_ALGOD_PORT || '443')
const ALGOD_TOKEN = process.env.NEXT_PUBLIC_ALGOD_TOKEN || ''

// Platform Address (Treasury)
const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS ||
    "5IZJEVVOAVXOVCN35JQ5PBDBDAPEBUTKST7GDGUGEBP5QNY7S5YWDYSME4"

/**
 * Get configured Algod client
 */
export function getAlgodClient(): algosdk.Algodv2 {
    return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
}

/**
 * Deploy a new TokenLaunchpad contract instance
 * IMPORTANT: Each project needs its own contract instance!
 */
export async function deployLaunchpadContract(
    params: {
        creator: string
    },
    signer: algosdk.TransactionSigner
): Promise<number> {
    const algodClient = getAlgodClient()
    const suggestedParams = await algodClient.getTransactionParams().do()

    // Read the compiled contract from artifacts
    const approvalProgram = 'CyAEAAgBAiYRDWxhdW5jaF9zdGF0dXMHY3JlYXRvcgthbGdvX3JhaXNlZAt0b2tlbnNfc29sZAZhc2FfaWQPdG9rZW5zX2Zvcl9zYWxlC3N0YXJ0X3ByaWNlDHRhcmdldF9wcmljZQ5ib25kaW5nX3RhcmdldA5tYXhfYnV5X3Blcl90eBBtYXhfYnV5X3Blcl91c2VyEHBsYXRmb3JtX2FkZHJlc3MUcGxhdGZvcm1fZmVlX3BlcmNlbnQMdG90YWxfc3VwcGx5CmN1cnZlX3R5cGURbGlxdWlkaXR5X3BlcmNlbnQTbGlxdWlkaXR5X2xvY2tfZGF5czEYQABCKTIDZycEImcnDSJnJwUiZycGImcnByJnJwgiZycOImcrImcqImcnCSJnJwoiZycPImcnECJnKCJnJwsyA2cnDCJnMRtBACsxGRREMRhEggQEePRB0QSgyt+KBEbuUP8EI9i3zjYaAI4EABYA6QEOAiAAMRkUMRgUEEQpMQBnKCJnJwwkZyRDNhoBSRUjEkQXNhoCSRUjEkQ2GgNJFSMSRDYaBEkVIxJENhoFSRUjEkQ2GgZJFSMSRDYaB0kVIxJENhoISRUjEkQ2GglJFSMSRDYaCkkVIxJENhoLSRUjEkQ2GgxJFYEgEkQxACIpZUQSRCIoZUQURE8KF0lETwoXSURPChdPChdKDERLAksEDkQnBE8MZycNTwRnJwVPA2cnBk8CZycHTGdPBhcnCExnTwUXJw5MZ08EFycJTGdPAxcnCkxnTwIXJw9MZ0wXJxBMZycLTGcoJGckQzYaAUkVIxJEFzEAIillRBJEsTIKIrISshSyEYEEshAisgGzJEOAAEk2GgFJFSMSRCIoZUQkEkQXRwJEIicFZUxJTgJOA0QiK2VMSU4CTgREIicGZUxOBEQiJwdlTE4EREsBRE8CCElPAg5EIjgQJBJEIjgHMgoSRCI4ADEAEkQxAEm+IkxBAAZLASJbRQFJSwlJTgIIIicKZURLAQ9EIicJZURLAg9ESwZLCElOAwlLAwtLCiULSwQIC0sLJQsKTwJLAwsISUUOIjgISUUOSUsCD0QrSwhnIiplREsCCCpMZ08CFjIGFlBLBklPAr+xIicEZURPBLISshGyFIEEshAisgGzDEEAE0sJSwsJsbIISwKyBySyECKyAbMiK2VESwgPQAANIiplRCInCGVED0EAAyglZyRDMQAiKWVEEkQiKGVEJRJEIiplRCInDGVESwELgWQKSU8CSwEJTEEAE7EiJwtlREsCsgiyBySyECKyAbNJQQASsSIpZURLAbIIsgckshAisgGzKIEDZyRD'
    const clearProgram = 'C4EBQw=='

    const approvalProgramBytes = new Uint8Array(Buffer.from(approvalProgram, 'base64'))
    const clearProgramBytes = new Uint8Array(Buffer.from(clearProgram, 'base64'))

    // Create application
    const txn = algosdk.makeApplicationCreateTxnFromObject({
        sender: params.creator,
        approvalProgram: approvalProgramBytes,
        clearProgram: clearProgramBytes,
        numGlobalByteSlices: 2,
        numGlobalInts: 15,
        numLocalByteSlices: 0,
        numLocalInts: 0,
        extraPages: 0,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        suggestedParams,
    })

    console.log('📝 Deploying new TokenLaunchpad contract...')
    const signedTxn = await signer([txn], [0])
    const sendResult = await algodClient.sendRawTransaction(signedTxn).do()
    const result = await algosdk.waitForConfirmation(algodClient, sendResult.txid, 4)

    const appId = result.applicationIndex
    if (!appId) {
        throw new Error('Failed to deploy contract - no app ID returned')
    }

    console.log('✅ Contract deployed! App ID:', appId)
    return Number(appId)
}

/**
 * Create Algorand Standard Asset (ASA)
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

    const signedTxn = await signer([txn], [0])
    const sendResult = await algodClient.sendRawTransaction(signedTxn).do()
    const result = await algosdk.waitForConfirmation(algodClient, sendResult.txid, 4)

    const assetIndex = result.assetIndex
    if (!assetIndex) {
        throw new Error('Failed to create asset - no asset ID returned')
    }

    return Number(assetIndex)
}

/**
 * Initialize project - Complete atomic group matching TokenLaunchpad contract
 * 
 * Steps:
 * 1. Configure (ABI call with 12 params including platform_address)
 * 2. Pay MBR (0.2 ALGO for asset opt-in)
 * 3. Bootstrap (ASA opt-in)
 * 4. Fund tokens (Asset transfer)
 */
export async function initializeProject(
    params: {
        userAddress: string
        appId: number  // Now required - each project has its own contract instance
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
): Promise<{ configTxId: string, bootstrapTxId: string, fundingTxId: string, groupId: string }> {
    const algodClient = getAlgodClient()
    const suggestedParams = await algodClient.getTransactionParams().do()
    const appAddress = algosdk.getApplicationAddress(params.appId)
    const platformAddr = params.platformAddress || PLATFORM_ADDRESS

    console.log('🚀 Initializing Token Launchpad...')
    console.log('App ID:', params.appId)
    console.log('App Address:', appAddress)
    console.log('Platform Address:', platformAddr)
    console.log('Asset ID:', params.asaId)

    const atc = new AtomicTransactionComposer()

    // 1. Configure Method (12 parameters)
    const configureMethod = new algosdk.ABIMethod({
        name: 'configure',
        args: [
            { type: 'uint64', name: 'asa' },
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
            { type: 'address', name: 'platform_address' }
        ],
        returns: { type: 'void' }
    })

    console.log('📝 Configure method selector:', Buffer.from(configureMethod.getSelector()).toString('hex'))

    atc.addMethodCall({
        appID: params.appId,
        method: configureMethod,
        methodArgs: [
            params.asaId,
            params.totalSupply,
            params.tokensForSale,
            params.startPrice,
            params.targetPrice,
            params.bondingTarget,
            BigInt(params.curveType),
            params.maxBuyPerTx,
            params.maxBuyPerUser,
            params.liquidityPercent,
            params.liquidityLockDays,
            platformAddr
        ],
        sender: params.userAddress,
        signer: signer,
        suggestedParams: suggestedParams,
    })

    // 2. Payment for MBR (Minimum Balance Requirement)
        const mbrPaymentTxnParams = {
            ...suggestedParams,
            fee: Number(suggestedParams.minFee),
            flatFee: true,
        }

        const mbrPaymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: params.userAddress,
            receiver: appAddress,
            amount: 200_000, // 0.2 ALGO for ASA opt-in
            suggestedParams: mbrPaymentTxnParams,
        })
    atc.addTransaction({ txn: mbrPaymentTxn, signer: signer })

    // 3. Bootstrap Method (ASA opt-in)
    const bootstrapMethod = new algosdk.ABIMethod({
        name: 'bootstrap',
        args: [{ type: 'uint64', name: 'asa' }],
        returns: { type: 'void' }
    })

    console.log('📝 Bootstrap method selector:', Buffer.from(bootstrapMethod.getSelector()).toString('hex'))

    // Increase fee to cover inner transaction (ASA opt-in)
        const bootstrapParams = {
            ...suggestedParams,
            fee: Number(suggestedParams.minFee) * 2,
            flatFee: true,
        }

    atc.addMethodCall({
        appID: params.appId,
        method: bootstrapMethod,
        methodArgs: [params.asaId],
        sender: params.userAddress,
        signer: signer,
        suggestedParams: bootstrapParams,
    })

    // 4. Fund Tokens (Asset Transfer)
    const fundTokensTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: params.userAddress,
        receiver: appAddress,
        assetIndex: params.asaId,
        amount: params.tokensForSale,
        suggestedParams,
    })
    atc.addTransaction({ txn: fundTokensTxn, signer: signer })

    console.log('📦 Atomic group created with 4 transactions')

    try {
        // Execute the atomic transaction group
        const result = await atc.execute(algodClient, 4)

        console.log('✅ Transaction group confirmed!')
        console.log('Confirmed Round:', result.confirmedRound)
        console.log('Transaction IDs:', result.txIDs)

        return {
            configTxId: result.txIDs[0],
            bootstrapTxId: result.txIDs[2],
            fundingTxId: result.txIDs[3],
            groupId: result.txIDs[0]
        }
    } catch (error: any) {
        console.error('❌ Transaction failed:', error)

        if (error.response?.body) {
            console.error('Error details:', JSON.stringify(error.response.body, null, 2))
        }

        throw new Error(`Failed to initialize project: ${error.message}`)
    }
}

/**
 * Buy tokens from the bonding curve
 * 
 * IMPORTANT: The contract expects:
 * - gtxn[0]: Payment (buyer -> app address)
 * - gtxn[1]: App call (buy method)
 */
export async function buyTokens(
    params: {
        userAddress: string
        appId?: bigint | number
        asaId: bigint | number
        tokensToBuy: bigint
        estimatedCost: bigint // Estimated ALGO cost (will calculate exact in contract)
    },
    signer: algosdk.TransactionSigner
): Promise<string> {
    const algodClient = getAlgodClient()
    const suggestedParams = await algodClient.getTransactionParams().do()

    const appId = params.appId ? Number(params.appId) : LAUNCHPAD_APP_ID
    const contractAddress = algosdk.getApplicationAddress(appId)

    console.log('💰 Buying tokens...')
    console.log('Quantity:', params.tokensToBuy.toString())
    console.log('Estimated cost:', params.estimatedCost.toString(), 'microALGO')

    const atc = new AtomicTransactionComposer()

    // 1. Payment transaction (MUST be gtxn[0])
        const paymentTxnParams = {
            ...suggestedParams,
            fee: Number(suggestedParams.minFee),
            flatFee: true,
        }

        const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: params.userAddress,
            receiver: contractAddress,
            amount: params.estimatedCost,
            suggestedParams: paymentTxnParams,
        })
    atc.addTransaction({ txn: paymentTxn, signer: signer })

    // Create params with extra fee for inner transaction (asset transfer)
    // The smart contract does an inner txn to transfer ASA to buyer, so we need to cover that fee
        const paramsWithExtraFee = {
            ...suggestedParams,
            fee: Number(suggestedParams.minFee) * 3, // app call + ASA transfer + change refund
            flatFee: true,
        }

    // 2. Buy method call (will be gtxn[1])
    const buyMethod = new algosdk.ABIMethod({
        name: 'buy',
        args: [{ type: 'uint64', name: 'quantity' }],
        returns: { type: 'void' }
    })

    console.log('📝 Buy method selector:', Buffer.from(buyMethod.getSelector()).toString('hex'))

    atc.addMethodCall({
        appID: appId,
        method: buyMethod,
        methodArgs: [params.tokensToBuy],
        sender: params.userAddress,
        signer: signer,
        suggestedParams: paramsWithExtraFee, // Use params with extra fee to cover inner transaction
        // Need to add the ASA as a foreign asset so the contract can transfer it
        appForeignAssets: [Number(params.asaId)],
        // Need to add boxes for user record
        boxes: [
            {
                appIndex: appId,
                name: algosdk.decodeAddress(params.userAddress).publicKey
            }
        ]
    })

    try {
        const result = await atc.execute(algodClient, 4)
        console.log('✅ Purchase successful!')
        console.log('Transaction ID:', result.txIDs[0])
        return result.txIDs[0]
    } catch (error: any) {
        console.error('❌ Purchase failed:', error)

        if (error.response?.body) {
            console.error('Error details:', JSON.stringify(error.response.body, null, 2))
        }

        throw new Error(`Failed to buy tokens: ${error.message}`)
    }
}

/**
 * Finalize the token sale (creator only)
 * Distributes funds to platform and creator
 */
export async function finalizeSale(
    params: {
        userAddress: string
        appId?: number
    },
    signer: algosdk.TransactionSigner
): Promise<string> {
    const algodClient = getAlgodClient()
    const suggestedParams = await algodClient.getTransactionParams().do()
    const appId = params.appId || LAUNCHPAD_APP_ID

    const atc = new AtomicTransactionComposer()

    const finalizeMethod = new algosdk.ABIMethod({
        name: 'finalize',
        args: [],
        returns: { type: 'void' }
    })

    // Increase fee to cover up to 2 inner transactions (platform fee + creator payout)
    const finalizeParams = { ...suggestedParams, fee: 3000, flatFee: true }

    atc.addMethodCall({
        appID: appId,
        method: finalizeMethod,
        methodArgs: [],
        sender: params.userAddress,
        signer: signer,
        suggestedParams: finalizeParams,
    })

    const result = await atc.execute(algodClient, 4)
    return result.txIDs[0]
}

/**
 * Calculate token price based on linear bonding curve
 * This matches the contract's pricing logic
 */
export function calculateTokenPrice(
    tokensSold: bigint,
    tokensForSale: bigint,
    startPrice: bigint,
    targetPrice: bigint
): bigint {
    if (tokensForSale === 0n) return startPrice

    // Linear price: p = p0 + (p1 - p0) * (sold / total)
    const deltaPrice = targetPrice - startPrice
    const priceIncrease = (deltaPrice * tokensSold) / tokensForSale

    return startPrice + priceIncrease
}

/**
 * Calculate cost for buying N tokens (integral of linear curve)
 */
export function calculatePurchaseCost(
    quantity: bigint,
    tokensSold: bigint,
    tokensForSale: bigint,
    startPrice: bigint,
    targetPrice: bigint
): bigint {
    // cost = p0*n + delta_p * n * (2*s + n) / (2 * total)
    const p0 = startPrice
    const p1 = targetPrice
    const deltaP = p1 - p0

    const numerator = deltaP * quantity * ((tokensSold * 2n) + quantity)
    const denominator = tokensForSale * 2n
    const curveAdd = numerator / denominator

    return p0 * quantity + curveAdd
}

/**
 * Get contract global state
 */
export async function getContractState(appId?: number): Promise<Record<string, any>> {
    const algodClient = getAlgodClient()
    const targetAppId = appId || LAUNCHPAD_APP_ID
    const appInfo = await algodClient.getApplicationByID(targetAppId).do()

    const globalState: Record<string, any> = {}

    if (appInfo.params.globalState) {
        for (const item of appInfo.params.globalState) {
            // Handle both string (base64) and Uint8Array
            const keyBuffer = typeof item.key === 'string'
                ? Buffer.from(item.key, 'base64')
                : Buffer.from(item.key)
            const key = keyBuffer.toString('utf-8')

            let value: string | number | bigint

            if (item.value.type === 1) {
                // Bytes value (for addresses)
                const valueBase64 = item.value.bytes
                const valueBuffer = typeof valueBase64 === 'string'
                    ? Buffer.from(valueBase64, 'base64')
                    : Buffer.from(valueBase64 || [])
                // Try to decode as address if it's 32 bytes
                if (valueBuffer.length === 32) {
                    value = algosdk.encodeAddress(Uint8Array.from(valueBuffer))
                } else {
                    value = valueBuffer.toString('utf-8')
                }
            } else {
                // Uint value
                value = BigInt(item.value.uint || 0)
            }

            globalState[key] = value
        }
    }

    return globalState
}

/**
 * Get user's purchase data from box storage
 */
export async function getUserPurchaseData(
    userAddress: string,
    appId?: number
): Promise<{ totalBought: bigint, lastBuyRound: bigint } | null> {
    try {
        const algodClient = getAlgodClient()
        const targetAppId = appId || LAUNCHPAD_APP_ID

        // Box name is the user's public key (32 bytes)
        const boxName = algosdk.decodeAddress(userAddress).publicKey

        const boxResponse = await algodClient.getApplicationBoxByName(targetAppId, boxName).do()
        const boxValue = boxResponse.value

        if (!boxValue || boxValue.length < 16) {
            return null
        }

        // UserRecord structure: (total_bought: UInt64, last_buy_round: UInt64)
        // Each UInt64 is 8 bytes in ARC4 encoding
        const boxBuffer = Buffer.from(boxValue)
        const view = new DataView(boxBuffer.buffer, boxBuffer.byteOffset, boxBuffer.byteLength)
        const totalBought = view.getBigUint64(0, false) // big-endian
        const lastBuyRound = view.getBigUint64(8, false)

        return { totalBought, lastBuyRound }
    } catch (error) {
        console.error('Error reading user box:', error)
        return null
    }
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
 * Utility: Convert micro units to standard units
 */
export function microToStandard(micro: bigint | number, decimals: number = 6): number {
    return Number(micro) / Math.pow(10, decimals)
}

/**
 * Utility: Convert standard units to micro units
 */
export function standardToMicro(standard: number, decimals: number = 6): bigint {
    return BigInt(Math.floor(standard * Math.pow(10, decimals)))
}

/**
 * Utility: Format ALGO amount for display
 */
export function formatAlgo(microAlgo: bigint | number): string {
    const algo = microToStandard(microAlgo, 6)
    return algo.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
    })
}

/**
 * Opt-in to an ASA (for users buying tokens)
 */
export async function optInToASA(
    params: {
        userAddress: string
        asaId: number
    },
    signer: algosdk.TransactionSigner
): Promise<string> {
    const algodClient = getAlgodClient()
    const suggestedParams = await algodClient.getTransactionParams().do()

    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: params.userAddress,
        receiver: params.userAddress,
        assetIndex: params.asaId,
        amount: 0n,
        suggestedParams,
    })

    const signedTxn = await signer([optInTxn], [0])
    const sendResult = await algodClient.sendRawTransaction(signedTxn).do()

    await algosdk.waitForConfirmation(algodClient, sendResult.txid, 4)

    return sendResult.txid
}

/**
 * Check if account has opted into an asset
 */
export async function hasOptedInToAsset(
    accountAddress: string,
    assetId: number
): Promise<boolean> {
    try {
        const algodClient = getAlgodClient()
        const accountInfo = await algodClient.accountInformation(accountAddress).do()

        return accountInfo.assets?.some((asset: any) => asset['asset-id'] === assetId) || false
    } catch (error) {
        console.error('Error checking opt-in status:', error)
        return false
    }
}

/**
 * Get launch status as human-readable string
 */
export function getLaunchStatusText(status: number): string {
    const statusMap: Record<number, string> = {
        0: 'Prelaunch',
        1: 'Live',
        2: 'Completed',
        3: 'Finalized'
    }
    return statusMap[status] || 'Unknown'
}
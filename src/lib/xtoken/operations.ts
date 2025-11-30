/**
 * X Token Operations
 * ==================
 * 
 * Core functions for interacting with the X Token on Algorand.
 * Handles transfers, opt-in/out, balance checks, and treasury operations.
 */

import algosdk from 'algosdk'
import { X_TOKEN_CONFIG, getXTokenAsaId, getTreasuryAddress, toBaseUnits, fromBaseUnits } from './config'

// Network configuration
const ALGOD_SERVER = process.env.NEXT_PUBLIC_ALGOD_SERVER || 'https://testnet-api.4160.nodely.dev'
const ALGOD_PORT = parseInt(process.env.NEXT_PUBLIC_ALGOD_PORT || '443', 10)
const ALGOD_TOKEN = process.env.NEXT_PUBLIC_ALGOD_TOKEN || ''

const INDEXER_SERVER = process.env.NEXT_PUBLIC_INDEXER_SERVER || 'https://testnet-idx.4160.nodely.dev'
const INDEXER_PORT = parseInt(process.env.NEXT_PUBLIC_INDEXER_PORT || '443', 10)
const INDEXER_TOKEN = process.env.NEXT_PUBLIC_INDEXER_TOKEN || ''

// Initialize clients
let algodClient: algosdk.Algodv2 | null = null
let indexerClient: algosdk.Indexer | null = null

export function getAlgodClient(): algosdk.Algodv2 {
  if (!algodClient) {
    algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
  }
  return algodClient
}

export function getIndexerClient(): algosdk.Indexer {
  if (!indexerClient) {
    indexerClient = new algosdk.Indexer(INDEXER_TOKEN, INDEXER_SERVER, INDEXER_PORT)
  }
  return indexerClient
}

/**
 * Result of a token operation
 */
export interface TokenOperationResult {
  success: boolean
  txId?: string
  error?: string
  amount?: number
}

/**
 * X Token balance info
 */
export interface XTokenBalance {
  address: string
  balance: number // Human-readable amount
  baseUnits: bigint // Raw units
  isOptedIn: boolean
  asaId: number
}

/**
 * Check if an address has opted into the X Token
 */
export async function isOptedIn(address: string): Promise<boolean> {
  const asaId = getXTokenAsaId()
  if (!asaId) {
    console.warn('X Token ASA ID not configured')
    return false
  }
  
  try {
    const client = getAlgodClient()
    const accountInfo = await client.accountInformation(address).do()
    
    // Check if the asset is in the account's assets array
    const assets = accountInfo.assets || []
    return assets.some((asset: any) => asset['asset-id'] === asaId || asset.assetId === asaId)
  } catch (error) {
    console.error('Error checking opt-in status:', error)
    return false
  }
}

/**
 * Get X Token balance for an address
 */
export async function getXTokenBalance(address: string): Promise<XTokenBalance> {
  const asaId = getXTokenAsaId()
  
  if (!asaId) {
    return {
      address,
      balance: 0,
      baseUnits: BigInt(0),
      isOptedIn: false,
      asaId: 0,
    }
  }
  
  try {
    const client = getAlgodClient()
    const accountInfo = await client.accountInformation(address).do()
    
    // Find the X Token in account assets
    const assets = accountInfo.assets || []
    const xTokenAsset = assets.find((asset: any) => 
      asset['asset-id'] === asaId || asset.assetId === asaId
    )
    
    if (!xTokenAsset) {
      return {
        address,
        balance: 0,
        baseUnits: BigInt(0),
        isOptedIn: false,
        asaId,
      }
    }
    
    const baseUnits = BigInt(xTokenAsset.amount || 0)
    const balance = fromBaseUnits(baseUnits)
    
    return {
      address,
      balance,
      baseUnits,
      isOptedIn: true,
      asaId,
    }
  } catch (error) {
    console.error('Error getting X Token balance:', error)
    return {
      address,
      balance: 0,
      baseUnits: BigInt(0),
      isOptedIn: false,
      asaId: asaId || 0,
    }
  }
}

/**
 * Build opt-in transaction for X Token
 * User needs to sign this transaction to receive X tokens
 */
export async function buildOptInTransaction(address: string): Promise<Uint8Array | null> {
  const asaId = getXTokenAsaId()
  if (!asaId) {
    console.error('X Token ASA ID not configured')
    return null
  }
  
  try {
    const client = getAlgodClient()
    const suggestedParams = await client.getTransactionParams().do()
    
    // Opt-in is a 0-amount transfer to self
    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: address,
      amount: 0,
      assetIndex: asaId,
      suggestedParams,
    })
    
    return optInTxn.toByte()
  } catch (error) {
    console.error('Error building opt-in transaction:', error)
    return null
  }
}

/**
 * Build opt-out transaction for X Token
 * Returns remaining balance to the asset creator
 */
export async function buildOptOutTransaction(address: string): Promise<Uint8Array | null> {
  const asaId = getXTokenAsaId()
  const treasuryAddress = getTreasuryAddress()
  
  if (!asaId || !treasuryAddress) {
    console.error('X Token configuration missing')
    return null
  }
  
  try {
    const client = getAlgodClient()
    const suggestedParams = await client.getTransactionParams().do()
    
    // Get current balance
    const balanceInfo = await getXTokenBalance(address)
    
    // Opt-out with close-to sends remaining balance to close address
    const optOutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: treasuryAddress,
      amount: Number(balanceInfo.baseUnits),
      assetIndex: asaId,
      closeRemainderTo: treasuryAddress, // Close asset position
      suggestedParams,
    })
    
    return optOutTxn.toByte()
  } catch (error) {
    console.error('Error building opt-out transaction:', error)
    return null
  }
}

/**
 * Transfer X Tokens from treasury to a user (reward distribution)
 * This is called by the server when a user claims rewards
 * Requires treasury private key
 */
export async function transferFromTreasury(
  recipientAddress: string,
  amount: number,
  note?: string
): Promise<TokenOperationResult> {
  const asaId = getXTokenAsaId()
  const treasuryMnemonic = process.env.DEPLOYER_MNEMONIC || process.env.ALGORAND_MNEMONIC
  
  if (!asaId) {
    return { success: false, error: 'X Token ASA ID not configured' }
  }
  
  if (!treasuryMnemonic) {
    return { success: false, error: 'Treasury mnemonic not configured' }
  }
  
  try {
    // Check if recipient is opted in
    const isRecipientOptedIn = await isOptedIn(recipientAddress)
    if (!isRecipientOptedIn) {
      return { 
        success: false, 
        error: 'Recipient has not opted into X Token. Please opt-in first.' 
      }
    }
    
    const client = getAlgodClient()
    const treasuryAccount = algosdk.mnemonicToSecretKey(treasuryMnemonic)
    const treasuryAddress = treasuryAccount.addr.toString()
    
    // Get suggested params
    const suggestedParams = await client.getTransactionParams().do()
    
    // Calculate base units
    const baseUnitsToSend = toBaseUnits(amount)
    
    // Build transfer transaction
    const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: treasuryAddress,
      receiver: recipientAddress,
      amount: Number(baseUnitsToSend),
      assetIndex: asaId,
      note: note ? new Uint8Array(Buffer.from(note)) : undefined,
      suggestedParams,
    })
    
    // Sign transaction
    const signedTxn = transferTxn.signTxn(treasuryAccount.sk)
    
    // Submit to network
    const txResponse = await client.sendRawTransaction(signedTxn).do()
    const txId = txResponse.txid
    
    // Wait for confirmation
    await algosdk.waitForConfirmation(client, txId, 4)
    
    console.log(`✅ Transferred ${amount} X tokens to ${recipientAddress}`)
    console.log(`   Transaction: ${txId}`)
    
    return {
      success: true,
      txId,
      amount,
    }
  } catch (error) {
    console.error('Error transferring X tokens:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Build a transfer transaction for user-to-user transfers
 * Returns unsigned transaction bytes for wallet signing
 */
export async function buildTransferTransaction(
  senderAddress: string,
  recipientAddress: string,
  amount: number,
  note?: string
): Promise<Uint8Array | null> {
  const asaId = getXTokenAsaId()
  if (!asaId) {
    console.error('X Token ASA ID not configured')
    return null
  }
  
  try {
    const client = getAlgodClient()
    const suggestedParams = await client.getTransactionParams().do()
    
    const baseUnitsToSend = toBaseUnits(amount)
    
    const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: senderAddress,
      receiver: recipientAddress,
      amount: Number(baseUnitsToSend),
      assetIndex: asaId,
      note: note ? new Uint8Array(Buffer.from(note)) : undefined,
      suggestedParams,
    })
    
    return transferTxn.toByte()
  } catch (error) {
    console.error('Error building transfer transaction:', error)
    return null
  }
}

/**
 * Get X Token asset information from the network
 */
export async function getXTokenInfo(): Promise<{
  asaId: number
  name: string
  symbol: string
  decimals: number
  totalSupply: number
  circulatingSupply: number
  treasuryBalance: number
  url: string
} | null> {
  const asaId = getXTokenAsaId()
  if (!asaId) {
    return null
  }
  
  try {
    const client = getAlgodClient()
    const assetInfo = await client.getAssetByID(asaId).do()
    
    const params = assetInfo.params
    const totalSupply = Number(params.total) / (10 ** params.decimals)
    
    // Get treasury balance
    const treasuryAddress = getTreasuryAddress()
    let treasuryBalance = 0
    if (treasuryAddress) {
      const balanceInfo = await getXTokenBalance(treasuryAddress)
      treasuryBalance = balanceInfo.balance
    }
    
    return {
      asaId,
      name: params.name || X_TOKEN_CONFIG.name,
      symbol: (params as any)['unit-name'] || params.unitName || X_TOKEN_CONFIG.symbol,
      decimals: params.decimals,
      totalSupply,
      circulatingSupply: totalSupply - treasuryBalance,
      treasuryBalance,
      url: params.url || X_TOKEN_CONFIG.metadata.url,
    }
  } catch (error) {
    console.error('Error getting X Token info:', error)
    return null
  }
}

/**
 * Get all X Token holders (uses indexer)
 */
export async function getXTokenHolders(limit: number = 100): Promise<{
  address: string
  balance: number
}[]> {
  const asaId = getXTokenAsaId()
  if (!asaId) {
    return []
  }
  
  try {
    const indexer = getIndexerClient()
    const response = await indexer
      .lookupAssetBalances(asaId)
      .limit(limit)
      .do()
    
    const balances = response.balances || []
    
    return balances
      .filter((b: any) => b.amount > 0)
      .map((b: any) => ({
        address: b.address,
        balance: fromBaseUnits(BigInt(b.amount)),
      }))
      .sort((a: any, b: any) => b.balance - a.balance)
  } catch (error) {
    console.error('Error getting X Token holders:', error)
    return []
  }
}

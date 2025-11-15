import algosdk from 'algosdk'
import type {
  ARC3Metadata,
  ARC20Metadata,
  FractionalizationConfig,
  FractionalizationResult,
  AssetCategory,
} from './types'
import {
  uploadToIPFS,
  createFractionalizedAsset,
  updateAssetWithFractionalization,
  getFractionalizedAsset,
} from './db'
import { getAlgodClient } from '@/lib/algorand'

/**
 * Step 1: Mint ARC-3 Compliant NFT
 * Creates the original high-value asset as an NFT
 */
export async function mintARC3NFT(
  metadata: ARC3Metadata,
  creator: algosdk.Account,
  manager?: string,
  reserve?: string
): Promise<{ assetId: number; txId: string; metadataUrl: string }> {
  try {
    // Upload metadata to IPFS
    const ipfsResult = await uploadToIPFS(metadata, 'arc3')
    
    const algodClient = getAlgodClient()
    const params = await algodClient.getTransactionParams().do()
    
    // Create ARC-3 compliant NFT
    const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: creator.addr,
      total: 1, // NFT must have total supply of 1
      decimals: 0, // NFT must have 0 decimals
      defaultFrozen: false,
      manager: manager || creator.addr,
      reserve: reserve || creator.addr,
      freeze: undefined, // No freeze address for NFTs
      clawback: undefined, // No clawback for NFTs
      unitName: metadata.name.substring(0, 8).toUpperCase().replace(/\s/g, ''),
      assetName: metadata.name.substring(0, 32),
      assetURL: ipfsResult.ipfsUrl, // Must point to ARC-3 metadata JSON
      assetMetadataHash: new Uint8Array(Buffer.from(ipfsResult.sha256Hash, 'hex')),
      suggestedParams: params,
    })
    
    // Sign and send transaction
    const signedTxn = assetCreateTxn.signTxn(creator.sk)
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do()
    
    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4)
    const assetId = confirmedTxn['asset-index']
    
    console.log(`✅ ARC-3 NFT minted: Asset ID ${assetId}`)
    console.log(`   Transaction: ${txId}`)
    console.log(`   Metadata: ${ipfsResult.gatewayUrl}`)
    
    return {
      assetId,
      txId,
      metadataUrl: ipfsResult.ipfsUrl,
    }
  } catch (error) {
    console.error('Error minting ARC-3 NFT:', error)
    throw new Error(`Failed to mint ARC-3 NFT: ${error}`)
  }
}

/**
 * Step 2: Create ARC-20 Compliant Fractional Tokens
 * Creates fungible tokens representing fractions of the original NFT
 */
export async function createARC20FractionalToken(
  config: {
    name: string
    symbol: string
    totalFractions: number
    decimals: number
    underlyingAssetId: number
    category: AssetCategory
    description?: string
    imageUrl?: string
  },
  creator: algosdk.Account,
  manager?: string
): Promise<{ assetId: number; txId: string; metadataUrl: string }> {
  try {
    // Create ARC-20 metadata
    const arc20Metadata: ARC20Metadata = {
      name: config.name,
      symbol: config.symbol,
      decimals: config.decimals,
      totalSupply: (config.totalFractions * Math.pow(10, config.decimals)).toString(),
      description: config.description,
      image: config.imageUrl,
      external_url: `https://app.algorand/fractionalize/${config.underlyingAssetId}`,
      properties: {
        underlying_asset_id: config.underlyingAssetId,
        fraction_type: config.category,
        total_fractions: config.totalFractions,
        standard: 'ARC-20',
      },
    }
    
    // Upload metadata to IPFS
    const ipfsResult = await uploadToIPFS(arc20Metadata, 'arc20')
    
    const algodClient = getAlgodClient()
    const params = await algodClient.getTransactionParams().do()
    
    // Create ARC-20 compliant fungible token
    const totalSupply = config.totalFractions * Math.pow(10, config.decimals)
    
    const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: creator.addr,
      total: totalSupply,
      decimals: config.decimals,
      defaultFrozen: false,
      manager: manager || creator.addr,
      reserve: creator.addr,
      freeze: undefined,
      clawback: undefined,
      unitName: config.symbol.substring(0, 8),
      assetName: config.name.substring(0, 32),
      assetURL: ipfsResult.ipfsUrl,
      assetMetadataHash: new Uint8Array(Buffer.from(ipfsResult.sha256Hash, 'hex')),
      suggestedParams: params,
    })
    
    // Sign and send transaction
    const signedTxn = assetCreateTxn.signTxn(creator.sk)
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do()
    
    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4)
    const assetId = confirmedTxn['asset-index']
    
    console.log(`✅ ARC-20 Fractional Token created: Asset ID ${assetId}`)
    console.log(`   Symbol: ${config.symbol}`)
    console.log(`   Total Supply: ${config.totalFractions} fractions`)
    console.log(`   Metadata: ${ipfsResult.gatewayUrl}`)
    
    return {
      assetId,
      txId,
      metadataUrl: ipfsResult.ipfsUrl,
    }
  } catch (error) {
    console.error('Error creating ARC-20 token:', error)
    throw new Error(`Failed to create ARC-20 token: ${error}`)
  }
}

/**
 * Step 3: Lock NFT in Escrow (Simplified Version - For Demo)
 * In production, this would use a smart contract
 * For hackathon demo, we'll use a multi-sig escrow account
 */
export async function lockNFTInEscrow(
  nftAssetId: number,
  escrowAccount: algosdk.Account,
  creator: algosdk.Account
): Promise<{ txId: string; escrowAddress: string }> {
  try {
    const algodClient = getAlgodClient()
    const params = await algodClient.getTransactionParams().do()
    
    // Step 1: Escrow opts into NFT
    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: escrowAccount.addr,
      to: escrowAccount.addr,
      amount: 0,
      assetIndex: nftAssetId,
      suggestedParams: params,
    })
    
    const signedOptIn = optInTxn.signTxn(escrowAccount.sk)
    const { txId: optInTxId } = await algodClient.sendRawTransaction(signedOptIn).do()
    await algosdk.waitForConfirmation(algodClient, optInTxId, 4)
    
    // Step 2: Transfer NFT from creator to escrow
    const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: creator.addr,
      to: escrowAccount.addr,
      amount: 1, // NFT has amount of 1
      assetIndex: nftAssetId,
      suggestedParams: params,
    })
    
    const signedTransfer = transferTxn.signTxn(creator.sk)
    const { txId } = await algodClient.sendRawTransaction(signedTransfer).do()
    await algosdk.waitForConfirmation(algodClient, txId, 4)
    
    console.log(`✅ NFT locked in escrow: ${escrowAccount.addr}`)
    console.log(`   Transaction: ${txId}`)
    
    return {
      txId,
      escrowAddress: escrowAccount.addr,
    }
  } catch (error) {
    console.error('Error locking NFT in escrow:', error)
    throw new Error(`Failed to lock NFT in escrow: ${error}`)
  }
}

/**
 * Complete Fractionalization Flow
 * Orchestrates all steps: NFT minting -> Fractional token creation -> Escrow locking
 */
export async function fractionalizeAsset(
  config: FractionalizationConfig & {
    arc3Metadata: ARC3Metadata
    creatorAccount: algosdk.Account
  }
): Promise<FractionalizationResult> {
  try {
    console.log('🚀 Starting asset fractionalization...')
    console.log(`   Category: ${config.category}`)
    console.log(`   Asset: ${config.metadata.name}`)
    console.log(`   Fractions: ${config.total_fractions}`)
    
    // Step 1: Mint ARC-3 NFT
    console.log('\n📝 Step 1: Minting ARC-3 NFT...')
    const nftResult = await mintARC3NFT(
      config.arc3Metadata,
      config.creatorAccount
    )
    
    // Create database record
    const assetId = createFractionalizedAsset({
      original_asset_id: nftResult.assetId,
      category: config.category,
      name: config.metadata.name,
      description: config.metadata.description,
      image_url: config.metadata.image_url,
      metadata_url: nftResult.metadataUrl,
      metadata_hash: '', // Will be set later
      total_fractions: config.total_fractions,
      fraction_price: config.fraction_price,
      valuation: config.total_fractions * config.fraction_price,
      creator_address: config.creatorAccount.addr,
      properties: config.arc3Metadata.properties,
    })
    
    // Step 2: Create escrow account
    console.log('\n🔐 Step 2: Creating escrow account...')
    const escrowAccount = algosdk.generateAccount()
    
    // Fund escrow with minimum balance
    const algodClient = getAlgodClient()
    const params = await algodClient.getTransactionParams().do()
    
    const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: config.creatorAccount.addr,
      to: escrowAccount.addr,
      amount: 500_000, // 0.5 ALGO for escrow operations
      suggestedParams: params,
    })
    
    const signedFund = fundTxn.signTxn(config.creatorAccount.sk)
    await algodClient.sendRawTransaction(signedFund).do()
    
    // Step 3: Lock NFT in escrow
    console.log('\n🔒 Step 3: Locking NFT in escrow...')
    const lockResult = await lockNFTInEscrow(
      nftResult.assetId,
      escrowAccount,
      config.creatorAccount
    )
    
    // Step 4: Create ARC-20 fractional tokens
    console.log('\n💎 Step 4: Creating ARC-20 fractional tokens...')
    const fractionSymbol = config.metadata.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 4) + 'F'
    
    const fractionalTokenResult = await createARC20FractionalToken(
      {
        name: `${config.metadata.name} Fraction`,
        symbol: fractionSymbol,
        totalFractions: config.total_fractions,
        decimals: 6,
        underlyingAssetId: nftResult.assetId,
        category: config.category,
        description: `Fractional ownership of ${config.metadata.name}`,
        imageUrl: config.metadata.image_url,
      },
      escrowAccount, // Escrow is the creator of fractional tokens
      escrowAccount.addr
    )
    
    // Update database with fractionalization details
    updateAssetWithFractionalization(assetId, {
      fractional_token_id: fractionalTokenResult.assetId,
      escrow_address: escrowAccount.addr,
      escrow_app_id: 0, // Would be smart contract app ID in production
      escrow_deploy_txid: lockResult.txId,
      fraction_creation_txid: fractionalTokenResult.txId,
    })
    
    const fractionalizedAsset = getFractionalizedAsset(assetId)!
    
    console.log('\n✅ Fractionalization Complete!')
    console.log(`   Original NFT: ${nftResult.assetId}`)
    console.log(`   Fractional Token: ${fractionalTokenResult.assetId}`)
    console.log(`   Escrow Address: ${escrowAccount.addr}`)
    console.log(`   Database ID: ${assetId}`)
    
    return {
      success: true,
      fractional_asset: fractionalizedAsset,
      escrow_address: escrowAccount.addr,
      transaction_ids: [
        nftResult.txId,
        lockResult.txId,
        fractionalTokenResult.txId,
      ],
    }
  } catch (error) {
    console.error('❌ Fractionalization failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Purchase Fractions Flow
 * Allows users to buy fractional tokens
 */
export async function purchaseFractions(
  fractionalAssetId: string,
  amount: number,
  buyer: algosdk.Account
): Promise<{ success: boolean; txId?: string; error?: string }> {
  try {
    const asset = getFractionalizedAsset(fractionalAssetId)
    if (!asset) {
      throw new Error('Asset not found')
    }
    
    if (asset.status !== 'active') {
      throw new Error('Asset is not available for purchase')
    }
    
    if (amount > (asset.total_fractions - asset.fractions_sold)) {
      throw new Error('Not enough fractions available')
    }
    
    const algodClient = getAlgodClient()
    const params = await algodClient.getTransactionParams().do()
    
    const totalCost = amount * asset.fraction_price
    
    // Buyer opts into fractional token
    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: buyer.addr,
      to: buyer.addr,
      amount: 0,
      assetIndex: asset.fractional_token_id!,
      suggestedParams: params,
    })
    
    // Payment to escrow
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: buyer.addr,
      to: asset.escrow_address!,
      amount: totalCost,
      suggestedParams: params,
    })
    
    // Escrow transfers fractional tokens to buyer
    // NOTE: In production, this would be handled by smart contract
    // For demo, we'd need escrow private key (stored securely)
    
    // Group transactions
    const txnGroup = [optInTxn, paymentTxn]
    algosdk.assignGroupID(txnGroup)
    
    const signedOptIn = optInTxn.signTxn(buyer.sk)
    const signedPayment = paymentTxn.signTxn(buyer.sk)
    
    const { txId } = await algodClient.sendRawTransaction([signedOptIn, signedPayment]).do()
    await algosdk.waitForConfirmation(algodClient, txId, 4)
    
    console.log(`✅ Fractions purchased: ${amount}`)
    console.log(`   Transaction: ${txId}`)
    
    return {
      success: true,
      txId,
    }
  } catch (error) {
    console.error('Error purchasing fractions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Purchase failed',
    }
  }
}

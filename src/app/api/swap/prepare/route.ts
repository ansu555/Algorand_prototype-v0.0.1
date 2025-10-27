/**
 * API Route: Prepare Swap Transactions
 * POST /api/swap/prepare
 * 
 * Builds unsigned swap transactions for Tinyman V2
 */

import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'
import { TinymanV2Client } from '@/lib/dex/tinyman-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      fromAssetId,
      toAssetId,
      amount,
      slippage,
      userAddress,
      route,
      minimumReceived,
    } = body

    console.log('Prepare swap request:', {
      fromAssetId,
      toAssetId,
      amount,
      slippage,
      userAddress,
      poolAddress: route?.pools?.[0]?.poolAddress
    })

    // Validate inputs
    if (!userAddress || !amount || fromAssetId === undefined || toAssetId === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    if (!route || !route.pools || route.pools.length === 0) {
      return NextResponse.json(
        { error: 'No route provided' },
        { status: 400 }
      )
    }

    const algodClient = getAlgodClient()
    
    // Check if user is opted into required assets
    try {
      const accountInfo = await algodClient.accountInformation(userAddress).do()
      
      // Check opt-in for non-ALGO assets
      const requiredAssets = [fromAssetId, toAssetId].filter(id => id !== 0)
      const userAssets = new Set((accountInfo.assets || []).map((a: any) => a['asset-id']))
      
      for (const assetId of requiredAssets) {
        if (!userAssets.has(assetId)) {
          return NextResponse.json(
            { error: `You need to opt-in to asset ${assetId} first` },
            { status: 400 }
          )
        }
      }
    } catch (error) {
      console.warn('Could not verify asset opt-ins:', error)
    }

    const suggestedParams = await algodClient.getTransactionParams().do()

    // Get pool info from route or fetch from Tinyman as fallback
  let poolAddress: string | undefined = route?.pools?.[0]?.poolAddress
  let poolAppId: number | undefined = route?.pools?.[0]?.appId

    if (!poolAddress || !poolAppId) {
      // Fallback: discover pool from Tinyman for the asset pair
      const tinyman = new TinymanV2Client(algodClient, 'testnet')
      // Try cache lookup first
      const match = await tinyman.getPool(fromAssetId, toAssetId)
      if (match) {
        poolAddress = match.poolAddress
        poolAppId = match.appId
      }
    }

    // If appId is missing, default to Tinyman V2 validator app id (testnet)
    if (!poolAppId) {
      // Tinyman V2 validator app id on testnet
      poolAppId = 148607000
    }

    if (!poolAddress || !poolAppId) {
      return NextResponse.json(
        { error: 'Could not resolve pool info (address/appId) for this pair' },
        { status: 400 }
      )
    }

    // Calculate minimum output with slippage
    const outputAmount = (typeof minimumReceived === 'number' && minimumReceived > 0)
      ? minimumReceived
      : amount * 0.95 // Fallback estimate if not provided
    const slippageBps = Math.floor((slippage || 0.5) * 100) // Convert % to basis points
    const minOutput = Math.floor(outputAmount * (10000 - slippageBps) / 10000)

    console.log('Swap calculation:', {
      amount,
      outputAmount,
      slippageBps,
      minOutput
    })

    const transactions: algosdk.Transaction[] = []

    // Transaction 1: Transfer input asset to pool
    if (fromAssetId === 0) {
      // Swapping from ALGO - use payment transaction
      transactions.push(
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: userAddress,
          receiver: poolAddress,
          amount: Math.floor(amount),
          suggestedParams,
        })
      )
    } else {
      // Swapping from ASA - use asset transfer
      transactions.push(
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: userAddress,
          receiver: poolAddress,
          assetIndex: fromAssetId,
          amount: Math.floor(amount),
          suggestedParams,
        })
      )
    }

    // Transaction 2: Application call to Tinyman pool (swap method)
    const appArgs = [
      new Uint8Array(Buffer.from('swap')), // Method name
      algosdk.encodeUint64(minOutput), // Minimum output amount
    ]

    const foreignAssets = [fromAssetId, toAssetId].filter(id => id !== 0)

    transactions.push(
      algosdk.makeApplicationCallTxnFromObject({
        sender: userAddress,
        appIndex: poolAppId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs,
        foreignAssets: foreignAssets.length > 0 ? foreignAssets : undefined,
        suggestedParams,
      })
    )

    // Assign group ID to make it an atomic transaction
    algosdk.assignGroupID(transactions)

    // Convert transactions to base64 for signing
    const txnsToSign = transactions.map(txn => ({
      txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64'),
    }))

    console.log('✅ Prepared', transactions.length, 'transactions for signing')

    return NextResponse.json({
      success: true,
      txnsToSign,
      txnCount: transactions.length,
    })

  } catch (error: any) {
    console.error('❌ Prepare swap error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to prepare swap',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

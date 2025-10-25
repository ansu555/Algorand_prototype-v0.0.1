/**
 * API Route: Prepare Swap Transactions
 * POST /api/swap/prepare
 * 
 * Builds unsigned swap transactions for Tinyman V2
 */

import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      fromAssetId,
      toAssetId,
      amount,
      slippage,
      userAddress,
      route
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
    const suggestedParams = await algodClient.getTransactionParams().do()

    // Get pool info from route
    const pool = route.pools[0]
    const poolAddress = pool.poolAddress
    const poolAppId = pool.appId

    if (!poolAddress || !poolAppId) {
      return NextResponse.json(
        { error: 'Invalid pool information in route' },
        { status: 400 }
      )
    }

    // Calculate minimum output with slippage
    const outputAmount = route.path?.[1]?.outputAmount || amount * 0.95 // Fallback estimate
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

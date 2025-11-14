/**
 * API Route: Prepare Add Liquidity Transactions
 * POST /api/pool/liquidity/prepare
 *
 * Builds unsigned transactions for adding liquidity to an existing pool
 * This includes opt-in to LP token if needed
 */

import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'
import { LiquidityPoolClient } from '@/lib/contracts/liquidity-pool-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      asset1Id,
      asset2Id,
      amount1,
      amount2,
      lpTokenId,
      userAddress,
    } = body

    console.log('Prepare add liquidity request:', {
      asset1Id,
      asset2Id,
      amount1,
      amount2,
      lpTokenId,
      userAddress,
    })

    // Validate inputs
    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      )
    }

    if (!lpTokenId) {
      return NextResponse.json(
        { error: 'LP token ID is required' },
        { status: 400 }
      )
    }

    if (asset1Id === undefined || asset2Id === undefined) {
      return NextResponse.json(
        { error: 'Both asset IDs are required' },
        { status: 400 }
      )
    }

    if (!amount1 || !amount2 || Number(amount1) <= 0 || Number(amount2) <= 0) {
      return NextResponse.json(
        { error: 'Both amounts must be positive' },
        { status: 400 }
      )
    }

    const algodClient = getAlgodClient()
    const network = (process.env.NEXT_PUBLIC_ALGORAND_NETWORK || process.env.ALGORAND_NETWORK || 'testnet') as 'testnet' | 'mainnet'

    // Initialize pool client
    const poolClient = new LiquidityPoolClient(algodClient, network)

    // Check if pool contract is deployed
    const isDeployed = await poolClient.isDeployed()
    if (!isDeployed) {
      return NextResponse.json(
        { error: 'Liquidity pool contract not deployed.' },
        { status: 500 }
      )
    }

    const suggestedParams = await algodClient.getTransactionParams().do()
    const poolAddress = poolClient.getPoolAddress()
    const transactions: algosdk.Transaction[] = []

    // Check if user is opted into LP token
    let needsOptIn = false
    try {
      const accountInfo = await algodClient.accountInformation(userAddress).do()
      const userAssets = new Set((accountInfo.assets || []).map((a: any) => Number(a['asset-id'])))
      needsOptIn = !userAssets.has(lpTokenId)
    } catch (error) {
      console.warn('Could not verify LP token opt-in status:', error)
      needsOptIn = true // Assume needs opt-in if we can't check
    }

    // Step 1: Opt-in to LP token if needed
    if (needsOptIn) {
      console.log('User needs to opt-in to LP token:', lpTokenId)
      const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: userAddress,
        receiver: userAddress,
        assetIndex: lpTokenId,
        amount: 0,
        suggestedParams,
      })
      transactions.push(optInTxn)
    }

    // Step 2: Add liquidity
    const addLiquidityTxns = await poolClient.buildAddLiquidityTxns({
      asset1Id,
      asset2Id,
      amount1: BigInt(amount1),
      amount2: BigInt(amount2),
      minLpTokens: 0n, // Can be adjusted for slippage protection
      userAddress,
    })
    transactions.push(...addLiquidityTxns)

    // Assign group ID to all transactions
    algosdk.assignGroupID(transactions)

    // Convert transactions to base64 for signing
    const txnsToSign = transactions.map(txn => ({
      txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64'),
    }))

    console.log('✅ Prepared', txnsToSign.length, 'transactions for adding liquidity')

    return NextResponse.json({
      success: true,
      txnsToSign,
      txnCount: txnsToSign.length,
      poolAddress,
      lpTokenId,
      needsOptIn,
      estimatedLiquidity: Math.sqrt(Number(amount1) * Number(amount2)),
    })

  } catch (error: any) {
    console.error('❌ Prepare add liquidity error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to prepare add liquidity transactions',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

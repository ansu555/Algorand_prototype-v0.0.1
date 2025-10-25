import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'

/**
 * POST /api/swap/opt-in-pool
 * Prepare a pool opt-in transaction
 */
export async function POST(request: NextRequest) {
  try {
    const { userAddress, poolAppId } = await request.json()

    if (!userAddress || !poolAppId) {
      return NextResponse.json(
        { error: 'Missing userAddress or poolAppId' },
        { status: 400 }
      )
    }

    const algodClient = getAlgodClient()
    const suggestedParams = await algodClient.getTransactionParams().do()

    // Create opt-in transaction
    const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
      sender: userAddress,
      appIndex: Number(poolAppId),
      suggestedParams,
    })

    // Convert to base64 for signing
    const txnToSign = {
      txn: Buffer.from(algosdk.encodeUnsignedTransaction(optInTxn)).toString('base64'),
    }

    console.log(`✅ Prepared pool opt-in transaction for app ${poolAppId}`)

    return NextResponse.json({
      success: true,
      txnToSign,
      poolAppId,
    })

  } catch (error: any) {
    console.error('❌ Pool opt-in preparation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to prepare pool opt-in',
      },
      { status: 500 }
    )
  }
}

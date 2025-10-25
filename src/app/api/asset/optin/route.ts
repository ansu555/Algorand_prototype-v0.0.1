/**
 * API Route: Asset Opt-In
 * POST /api/asset/optin
 * 
 * Creates an unsigned opt-in transaction for a user to opt into an ASA
 */

import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userAddress, assetId } = body

    // Validate inputs
    if (!userAddress || assetId === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters: userAddress and assetId' },
        { status: 400 }
      )
    }

    if (assetId === 0) {
      return NextResponse.json(
        { error: 'ALGO (asset ID 0) does not require opt-in' },
        { status: 400 }
      )
    }

    const algodClient = getAlgodClient()

    // Check if already opted in
    try {
      const accountInfo = await algodClient.accountInformation(userAddress).do()
      const assets = accountInfo.assets || []
      const isOptedIn = assets.some((asset: any) => asset['asset-id'] === assetId)
      
      if (isOptedIn) {
        return NextResponse.json(
          { 
            success: true,
            alreadyOptedIn: true,
            message: `Already opted into asset ${assetId}`
          }
        )
      }
    } catch (error) {
      console.error('Error checking opt-in status:', error)
      // Continue to create opt-in transaction anyway
    }

    // Get suggested params
    const suggestedParams = await algodClient.getTransactionParams().do()

    // Create opt-in transaction (0 amount asset transfer to self)
    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: userAddress,
      receiver: userAddress,
      assetIndex: assetId,
      amount: 0, // 0 amount = opt-in
      suggestedParams,
    })

    // Convert to base64 for signing
    const txnToSign = {
      txn: Buffer.from(algosdk.encodeUnsignedTransaction(optInTxn)).toString('base64'),
    }

    console.log(`✅ Prepared opt-in transaction for asset ${assetId}`)

    return NextResponse.json({
      success: true,
      txnToSign,
      assetId,
      message: `Opt-in transaction prepared for asset ${assetId}`
    })

  } catch (error: any) {
    console.error('❌ Opt-in error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to prepare opt-in transaction',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * API Route: Submit Swap Transactions
 * POST /api/swap/submit
 * 
 * Submits signed transactions to Algorand blockchain
 */

import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { signedTxns } = body

    if (!signedTxns || !Array.isArray(signedTxns) || signedTxns.length === 0) {
      return NextResponse.json(
        { error: 'No signed transactions provided' },
        { status: 400 }
      )
    }

    console.log('Submitting', signedTxns.length, 'signed transactions...')

    const algodClient = getAlgodClient()

    // Convert base64 signed transactions to Uint8Array
    const signedTxnBuffers = signedTxns.map((txn: string) =>
      new Uint8Array(Buffer.from(txn, 'base64'))
    )

    // Submit transaction group to the network
    const response = await algodClient.sendRawTransaction(signedTxnBuffers).do()
    const txId = response.txid

    console.log('📡 Transaction submitted with ID:', txId)

    // Wait for confirmation (up to 4 rounds ~3-4 seconds)
    console.log('⏳ Waiting for confirmation...')
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      txId,
      4
    )

    const confirmedRound = confirmedTxn.confirmedRound
    console.log('✅ Transaction confirmed in round:', confirmedRound)

    return NextResponse.json({
      success: true,
      txId,
      confirmedRound,
    })

  } catch (error: any) {
    console.error('❌ Submit swap error:', error)
    
    // Parse Algorand-specific errors
    let errorMessage = error.message || 'Failed to submit transaction'
    
    if (error.message?.includes('overspend')) {
      errorMessage = 'Insufficient balance for this transaction'
    } else if (error.message?.includes('below min')) {
      errorMessage = 'Amount is below minimum transaction amount'
    } else if (error.message?.includes('asset not opted in')) {
      errorMessage = 'You need to opt-in to this asset first'
    } else if (error.message?.includes('TransactionPool.Remember') || error.message?.includes('transaction pool')) {
      errorMessage = 'Transaction rejected by pool. Check your balance and try again.'
    } else if (error.message?.includes('logic eval error')) {
      errorMessage = 'Smart contract execution failed. Check slippage settings.'
    } else if (error.message?.includes('would result negative')) {
      errorMessage = 'Insufficient liquidity or amount too large'
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

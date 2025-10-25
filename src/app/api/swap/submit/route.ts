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
    // Filter out null values (transactions not signed by user)
    const signedTxnBuffers = signedTxns
      .filter((txn: string | null) => txn !== null)
      .map((txn: string) =>
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
    
    // Extract detailed error message
    let errorMessage = 'Transaction pool error - please try again'
    let errorDetails = ''
    
    if (error.message) {
      errorDetails = error.message
      
      // Parse common blockchain errors
      if (error.message.includes('underflow')) {
        errorMessage = 'Insufficient balance'
        errorDetails = 'You do not have enough of the input token to complete this swap'
      } else if (error.message.includes('not opted in')) {
        errorMessage = 'Asset opt-in required'
        errorDetails = error.message
      } else if (error.message.includes('overspend')) {
        errorMessage = 'Insufficient ALGO for fees'
        errorDetails = 'You need at least 0.001 ALGO to pay transaction fees'
      } else if (error.message.includes('logic eval error')) {
        errorMessage = 'Smart contract error'
        errorDetails = error.message
      }
    }
    
    console.error('📋 Error details:', errorDetails)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails || (process.env.NODE_ENV === 'development' ? error.stack : undefined),
      },
      { status: 500 }
    )
  }
}

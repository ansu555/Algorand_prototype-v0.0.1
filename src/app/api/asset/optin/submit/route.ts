/**
 * API Route: Submit Asset Opt-In Transaction
 * POST /api/asset/optin/submit
 * 
 * Submits a signed opt-in transaction to the blockchain
 */

import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { signedTxn } = body

    if (!signedTxn) {
      return NextResponse.json(
        { error: 'No signed transaction provided' },
        { status: 400 }
      )
    }

    console.log('Submitting opt-in transaction...')

    const algodClient = getAlgodClient()

    // Convert base64 signed transaction to Uint8Array
    const signedTxnBuffer = new Uint8Array(Buffer.from(signedTxn, 'base64'))

    // Submit transaction to the network
    const response = await algodClient.sendRawTransaction(signedTxnBuffer).do()
    const txId = response.txid

    console.log('📡 Opt-in transaction submitted with ID:', txId)

    // Wait for confirmation (up to 4 rounds)
    console.log('⏳ Waiting for confirmation...')
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      txId,
      4
    )

    const confirmedRound = confirmedTxn.confirmedRound
    console.log('✅ Opt-in confirmed in round:', confirmedRound)

    return NextResponse.json({
      success: true,
      txId,
      confirmedRound,
      message: 'Successfully opted into asset'
    })

  } catch (error: any) {
    console.error('❌ Submit opt-in error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit opt-in transaction',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

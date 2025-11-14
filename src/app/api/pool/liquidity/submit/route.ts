/**
 * API Route: Submit Add Liquidity Transactions
 * POST /api/pool/liquidity/submit
 *
 * Submits signed add liquidity transactions to Algorand blockchain
 */

import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'
import { createLog } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { signedTxns, userAddress, lpTokenId, amount1, amount2 } = body

    if (!signedTxns || !Array.isArray(signedTxns) || signedTxns.length === 0) {
      return NextResponse.json(
        { error: 'No signed transactions provided' },
        { status: 400 }
      )
    }

    console.log('Submitting', signedTxns.length, 'signed add liquidity transactions...')

    const algodClient = getAlgodClient()

    // Convert base64 signed transactions to Uint8Array
    const signedTxnBuffers = signedTxns.map((txn: string) =>
      new Uint8Array(Buffer.from(txn, 'base64'))
    )

    // Submit transaction group to the network
    const response = await algodClient.sendRawTransaction(signedTxnBuffers).do()
    const txId = response.txid

    console.log('📡 Add liquidity transaction submitted with ID:', txId)

    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...')
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      txId,
      4
    )

    const confirmedRound = confirmedTxn.confirmedRound
    console.log('✅ Add liquidity confirmed in round:', confirmedRound)

    // Extract LP tokens received from logs
    let lpTokensReceived = 0
    if (confirmedTxn.logs && confirmedTxn.logs.length > 0) {
      // Parse logs to find LP tokens minted
      // Log format: "LIQUIDITY_ADDED" + amount1 + amount2 + lpTokens
      console.log('Transaction logs:', confirmedTxn.logs)
    }

    // Store liquidity addition in database
    try {
      if (userAddress) {
        const logEntry = {
          id: (globalThis as any).crypto?.randomUUID
            ? (globalThis as any).crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
          ownerAddress: String(userAddress).toLowerCase(),
          action: 'add_liquidity',
          details: {
            txId,
            confirmedRound: Number(confirmedRound),
            lpTokenId,
            amount1,
            amount2,
            lpTokensReceived,
            timestamp: new Date().toISOString(),
            network: process.env.NEXT_PUBLIC_ALGORAND_NETWORK || process.env.ALGORAND_NETWORK || 'testnet',
          },
          status: 'confirmed',
          createdAt: new Date().toISOString(),
        }

        await createLog(logEntry)
        console.log('✅ Liquidity addition saved to database')
      }
    } catch (e) {
      console.error('❌ Error creating liquidity log:', e)
    }

    return NextResponse.json({
      success: true,
      txId,
      confirmedRound: Number(confirmedRound),
      lpTokensReceived,
      message: 'Liquidity added successfully!',
    })

  } catch (error: any) {
    console.error('❌ Submit add liquidity error:', error)

    // Parse Algorand-specific errors
    let errorMessage = error.message || 'Failed to add liquidity'

    if (error.message?.includes('overspend')) {
      errorMessage = 'Insufficient balance'
    } else if (error.message?.includes('must optin')) {
      errorMessage = 'You need to opt-in to the required assets first'
    } else if (error.message?.includes('logic eval error')) {
      errorMessage = 'Smart contract execution failed. Check your inputs.'
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        rawError: process.env.NODE_ENV === 'development' ? error.message : undefined,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

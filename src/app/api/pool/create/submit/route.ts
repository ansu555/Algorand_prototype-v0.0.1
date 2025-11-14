/**
 * API Route: Submit Pool Creation Transactions
 * POST /api/pool/create/submit
 *
 * Submits signed pool creation transactions to Algorand blockchain
 */

import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'
import { createLog } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { signedTxns, ownerAddress, poolMetadata } = body

    if (!signedTxns || !Array.isArray(signedTxns) || signedTxns.length === 0) {
      return NextResponse.json(
        { error: 'No signed transactions provided' },
        { status: 400 }
      )
    }

    console.log('Submitting', signedTxns.length, 'signed pool creation transactions...')

    const algodClient = getAlgodClient()

    // Convert base64 signed transactions to Uint8Array
    const signedTxnBuffers = signedTxns.map((txn: string) =>
      new Uint8Array(Buffer.from(txn, 'base64'))
    )

    // Submit transaction group to the network
    const response = await algodClient.sendRawTransaction(signedTxnBuffers).do()
    const txId = response.txid

    console.log('📡 Pool creation transaction submitted with ID:', txId)

    // Wait for confirmation (up to 4 rounds ~3-4 seconds)
    console.log('⏳ Waiting for confirmation...')
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      txId,
      4
    )

    const confirmedRound = confirmedTxn.confirmedRound
    console.log('✅ Pool creation confirmed in round:', confirmedRound)

    // Extract LP token ID from inner transactions
    let lpTokenId = 0
    const innerTxns = (confirmedTxn as any)['inner-txns'] || confirmedTxn.innerTxns
    if (innerTxns && innerTxns.length > 0) {
      console.log('🔍 Searching for LP token in', innerTxns.length, 'inner transactions')
      for (const innerTxn of innerTxns) {
        const assetIndex = innerTxn['asset-index'] || innerTxn.assetIndex || (innerTxn as any)['created-asset-index']
        if (assetIndex) {
          lpTokenId = assetIndex
          console.log('🎟️ LP Token created with ID:', lpTokenId)
          break
        }
      }
    }
    
    if (!lpTokenId) {
      console.warn('⚠️ LP Token ID not found in inner transactions')
      console.log('Confirmed transaction details:', JSON.stringify(confirmedTxn, null, 2))
    }

    // Store pool creation in database for tracking
    try {
      if (ownerAddress && poolMetadata) {
        console.log('💾 Attempting to store pool creation in database...')

        const logEntry = {
          id: (globalThis as any).crypto?.randomUUID
            ? (globalThis as any).crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
          ownerAddress: String(ownerAddress).toLowerCase(),
          action: 'pool_creation',
          details: {
            // Transaction details
            txId,
            confirmedRound: Number(confirmedRound),

            // Pool details
            asset1Id: poolMetadata.asset1Id,
            asset2Id: poolMetadata.asset2Id,
            amount1: poolMetadata.amount1,
            amount2: poolMetadata.amount2,
            feeBps: poolMetadata.feeBps,

            // LP Token details
            lpTokenId,
            lpTokenName: poolMetadata.lpTokenName,
            lpTokenUnit: poolMetadata.lpTokenUnit,

            // Pool address
            poolAddress: poolMetadata.poolAddress,

            // Metadata
            timestamp: new Date().toISOString(),
            network: process.env.NEXT_PUBLIC_ALGORAND_NETWORK || process.env.ALGORAND_NETWORK || 'testnet',
          },
          status: 'confirmed',
          createdAt: new Date().toISOString(),
        }

        console.log('💾 Saving pool creation log:', JSON.stringify(logEntry, null, 2))
        await createLog(logEntry)
        console.log('✅ Pool creation saved to database successfully!')
      } else {
        console.warn('⚠️ Missing ownerAddress or poolMetadata, skipping database save')
      }
    } catch (e) {
      console.error('❌ Error creating pool log:', e)
    }

    return NextResponse.json({
      success: true,
      txId,
      confirmedRound: Number(confirmedRound),
      lpTokenId,
      poolAddress: poolMetadata?.poolAddress,
      
      // Guide user to next steps
      message: lpTokenId 
        ? 'Pool and LP token created successfully! Next: Opt-in to the LP token and add initial liquidity.'
        : 'Pool created successfully!',
      nextSteps: lpTokenId ? [
        `1. Opt-in to LP token (Asset ID: ${lpTokenId})`,
        '2. Add initial liquidity to the pool'
      ] : [],
    })

  } catch (error: any) {
    console.error('❌ Submit pool creation error:', error)
    console.error('Error details:', {
      message: error.message,
      response: error.response?.body,
      status: error.status,
      type: error.constructor.name,
    })

    // Parse Algorand-specific errors
    let errorMessage = error.message || 'Failed to submit pool creation transaction'

    if (error.message?.includes('overspend')) {
      errorMessage = 'Insufficient balance for pool creation'
    } else if (error.message?.includes('below min')) {
      errorMessage = 'Amount is below minimum required'
    } else if (error.message?.includes('asset not opted in')) {
      errorMessage = 'You need to opt-in to the required assets first'
    } else if (error.message?.includes('logic eval error')) {
      errorMessage = 'Smart contract execution failed. Check your inputs.'
    } else if (error.message?.includes('already exists')) {
      errorMessage = 'A pool for this asset pair already exists'
    } else if (error.message?.includes('application does not exist')) {
      errorMessage = 'Pool contract not deployed. Please deploy the contract first.'
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

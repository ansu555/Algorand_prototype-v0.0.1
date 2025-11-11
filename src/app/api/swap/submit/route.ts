/**
 * API Route: Submit Swap Transactions
 * POST /api/swap/submit
 * 
 * Submits signed transactions to Algorand blockchain
 */

import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'
import { createLog } from '@/lib/db'

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
    
    // Store comprehensive swap data in database for per-wallet history
    try {
      const bodyJson = body || {}
      const ownerAddress = bodyJson.ownerAddress
      const meta = bodyJson.meta
      
      console.log('💾 Attempting to store swap in database...')
      console.log('Owner address:', ownerAddress)
      console.log('Meta data:', meta)
      
      if (ownerAddress && meta) {
        // Store complete swap metadata
        const logEntry = {
          id: (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          ownerAddress: String(ownerAddress).toLowerCase(),
          action: 'swap',
          details: {
            // Transaction details
            txId,
            confirmedRound: Number(confirmedRound),
            
            // From asset details
            fromAssetId: meta.fromAssetId,
            fromAssetName: meta.fromAssetName,
            fromAssetUnitName: meta.fromAssetUnitName,
            fromAssetDecimals: meta.fromAssetDecimals,
            fromAmount: meta.fromAmount,
            fromAmountBaseUnits: meta.fromAmountBaseUnits,
            
            // To asset details
            toAssetId: meta.toAssetId,
            toAssetName: meta.toAssetName,
            toAssetUnitName: meta.toAssetUnitName,
            toAssetDecimals: meta.toAssetDecimals,
            toAmount: meta.toAmount,
            toAmountEstimated: meta.toAmountEstimated,
            
            // Swap parameters
            minimumReceived: meta.minimumReceived,
            slippage: meta.slippage,
            
            // Route information
            route: meta.route,
            routePath: meta.routePath,
            priceImpact: meta.priceImpact,
            expectedPricePerUnit: meta.expectedPricePerUnit,
            
            // Metadata
            swapTimestamp: meta.timestamp,
            network: 'testnet', // or get from env
          },
          status: 'confirmed',
          createdAt: new Date().toISOString()
        }
        
        console.log('💾 Saving log entry:', JSON.stringify(logEntry, null, 2))
        await createLog(logEntry)
        console.log('✅ Swap saved to database successfully!')
      } else {
        console.warn('⚠️ Missing ownerAddress or meta, skipping database save')
      }
    } catch (e) {
      console.error('❌ Error creating swap log:', e)
    }

    return NextResponse.json({
      success: true,
      txId,
      confirmedRound: Number(confirmedRound), // FIX: Convert BigInt to Number
    })

  } catch (error: any) {
    console.error('❌ Submit swap error:', error)
    console.error('Error details:', {
      message: error.message,
      response: error.response?.body,
      status: error.status,
      type: error.constructor.name
    })
    
    // Parse Algorand-specific errors
    let errorMessage = error.message || 'Failed to submit transaction'
    let debugInfo = ''
    
    if (error.message?.includes('overspend')) {
      errorMessage = 'Insufficient balance for this transaction'
    } else if (error.message?.includes('below min')) {
      errorMessage = 'Amount is below minimum transaction amount'
    } else if (error.message?.includes('asset not opted in')) {
      errorMessage = 'You need to opt-in to this asset first'
    } else if (error.message?.includes('TransactionPool.Remember') || error.message?.includes('transaction pool')) {
      errorMessage = 'Transaction rejected by pool. This might be due to incorrect transaction structure for Tinyman V2.'
      debugInfo = 'Tinyman V2 requires the official SDK (@tinymanorg/tinyman-js-sdk) to build proper swap transactions.'
    } else if (error.message?.includes('logic eval error')) {
      errorMessage = 'Smart contract execution failed. Check slippage settings.'
    } else if (error.message?.includes('would result negative')) {
      errorMessage = 'Insufficient liquidity or amount too large'
    } else if (error.message?.includes('invalid ApplicationCall Txn')) {
      errorMessage = 'Invalid transaction structure for Tinyman V2 pool'
      debugInfo = 'Tinyman V2 requires specific ABI method calls. Manual transaction construction is not supported.'
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        debugInfo,
        rawError: process.env.NODE_ENV === 'development' ? error.message : undefined,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
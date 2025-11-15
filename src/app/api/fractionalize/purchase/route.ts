import { NextRequest, NextResponse } from 'next/server'
import { recordFractionPurchase, getFractionalizedAsset } from '@/lib/fractionalize/db'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asset_id, amount, buyer_address, signed_txns } = body
    
    if (!asset_id || !amount || !buyer_address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Get asset details
    const asset = getFractionalizedAsset(asset_id)
    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      )
    }
    
    if (asset.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Asset is not available for purchase' },
        { status: 400 }
      )
    }
    
    // Check availability
    const available = asset.total_fractions - asset.fractions_sold
    if (amount > available) {
      return NextResponse.json(
        { success: false, error: `Only ${available} fractions available` },
        { status: 400 }
      )
    }
    
    // Submit transactions to network
    const algodClient = getAlgodClient()
    
    try {
      // Decode and send signed transactions
      const decodedTxns = signed_txns.map((txn: string) =>
        new Uint8Array(Buffer.from(txn, 'base64'))
      )
      
      const { txId } = await algodClient.sendRawTransaction(decodedTxns).do()
      
      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4)
      const blockNumber = confirmedTxn['confirmed-round']
      
      // Record purchase in database
      const purchaseId = recordFractionPurchase(
        asset_id,
        buyer_address,
        amount,
        asset.fraction_price,
        txId,
        blockNumber
      )
      
      return NextResponse.json({
        success: true,
        data: {
          purchase_id: purchaseId,
          transaction_id: txId,
          block_number: blockNumber,
          amount_purchased: amount,
          total_paid: amount * asset.fraction_price,
        },
        message: 'Purchase successful',
      })
    } catch (txError: any) {
      console.error('Transaction error:', txError)
      return NextResponse.json(
        { success: false, error: `Transaction failed: ${txError.message}` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Purchase error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Get purchase quote
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('asset_id')
    const amount = searchParams.get('amount')
    
    if (!assetId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing asset_id or amount' },
        { status: 400 }
      )
    }
    
    const asset = getFractionalizedAsset(assetId)
    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      )
    }
    
    const numAmount = parseInt(amount)
    const available = asset.total_fractions - asset.fractions_sold
    
    if (numAmount > available) {
      return NextResponse.json(
        { success: false, error: `Only ${available} fractions available` },
        { status: 400 }
      )
    }
    
    const totalCost = numAmount * asset.fraction_price
    const totalCostAlgo = totalCost / 1_000_000
    
    return NextResponse.json({
      success: true,
      data: {
        amount: numAmount,
        price_per_fraction: asset.fraction_price,
        price_per_fraction_algo: asset.fraction_price / 1_000_000,
        total_cost: totalCost,
        total_cost_algo: totalCostAlgo,
        available_fractions: available,
        percentage_of_total: (numAmount / asset.total_fractions) * 100,
      },
    })
  } catch (error: any) {
    console.error('Quote error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

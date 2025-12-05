/**
 * API Route: Prepare Swap Transactions
 * POST /api/swap/prepare
 * 
 * Builds unsigned swap transactions using DEX SDKs (Tinyman V2, Pact)
 */

import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'
import { TinymanV2Client } from '@/lib/dex/tinyman-client'
import { PactClient } from '@/lib/dex/pact-client'
// @ts-ignore - Tinyman SDK imports
import { poolUtils, Swap, SwapType, SwapQuoteType, SupportedNetwork } from '@tinymanorg/tinyman-js-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      fromAssetId,
      toAssetId,
      amount,
      slippage,
      userAddress,
      route,
      minimumReceived,
    } = body

    console.log('Prepare swap request:', {
      fromAssetId,
      toAssetId,
      amount,
      slippage,
      userAddress,
      poolAddress: route?.pools?.[0]?.poolAddress
    })

    // Validate inputs
    if (!userAddress || !amount || fromAssetId === undefined || toAssetId === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    if (!route || !route.pools || route.pools.length === 0) {
      return NextResponse.json(
        { error: 'No route provided' },
        { status: 400 }
      )
    }

    const algodClient = getAlgodClient()
    
    // Check if user is opted into required assets
    try {
      const accountInfo = await algodClient.accountInformation(userAddress).do()
      
      // Check opt-in for non-ALGO assets
      const requiredAssets = [fromAssetId, toAssetId].filter(id => id !== 0)
      // FIX: Use 'assetId' (camelCase) not 'asset-id' (kebab-case)
      // algosdk returns assetId as BigInt, so convert to Number for comparison
      const userAssets = new Set((accountInfo.assets || []).map((a: any) => Number(a.assetId)))
      
      for (const assetId of requiredAssets) {
        if (!userAssets.has(assetId)) {
          return NextResponse.json(
            { error: `You need to opt-in to asset ${assetId} first` },
            { status: 400 }
          )
        }
      }
    } catch (error) {
      console.warn('Could not verify asset opt-ins:', error)
    }

    const suggestedParams = await algodClient.getTransactionParams().do()

    // Get pool info from route
  let poolAddress: string | undefined = route?.pools?.[0]?.poolAddress
  let poolAppId: number | undefined = route?.pools?.[0]?.appId
  const routeDex = route?.pools?.[0]?.dexName

    console.log('Using DEX:', routeDex)

    // Handle Tinyman V2 pools using official SDK
    if (routeDex === 'tinyman') {
      try {
        console.log('🔄 Using Tinyman V2 SDK for swap preparation...')
        
        // Get pool info using poolUtils
        const pool = await poolUtils.v2.getPoolInfo({
          network: 'testnet' as SupportedNetwork,
          client: algodClient,
          asset1ID: Number(fromAssetId),
          asset2ID: Number(toAssetId)
        })

        if (!pool) {
          throw new Error('Tinyman pool not found')
        }

        console.log('Pool found:', {
          address: pool.account.address().toString(),
          asset1: pool.asset1ID,
          asset2: pool.asset2ID
        })

        // Fetch asset decimals from the blockchain
        const getAssetDecimals = async (assetId: number): Promise<number> => {
          if (assetId === 0) return 6 // ALGO has 6 decimals
          try {
            const assetInfo = await algodClient.getAssetByID(assetId).do()
            return assetInfo.params.decimals || 0
          } catch (err) {
            console.warn(`Could not fetch decimals for asset ${assetId}, defaulting to 6`)
            return 6
          }
        }

        const fromDecimals = await getAssetDecimals(Number(fromAssetId))
        const toDecimals = await getAssetDecimals(Number(toAssetId))

        console.log('Asset decimals:', { fromDecimals, toDecimals })

        // Get swap quote using the direct quote method to ensure we get a DirectSwapQuote
        const directQuote = Swap.v2.getFixedInputDirectSwapQuote({
          pool,
          amount: BigInt(Math.floor(amount)),
          assetIn: { id: Number(fromAssetId), decimals: fromDecimals },
          assetOut: { id: Number(toAssetId), decimals: toDecimals }
        })

        console.log('Direct swap quote:', {
          assetInAmount: directQuote.assetInAmount.toString(),
          assetOutAmount: directQuote.assetOutAmount.toString(),
          rate: directQuote.rate,
          priceImpact: directQuote.priceImpact
        })

        // Wrap in the SwapQuote format expected by generateTxns
        const swapQuote: any = {
          type: SwapQuoteType.Direct,
          data: {
            quote: directQuote,
            pool
          }
        }

        // Generate swap transactions
        // Use a minimum slippage of 2% to handle TestNet liquidity fluctuations
        // TestNet pools often have very low liquidity and high price volatility
        const userSlippage = (slippage || 2.0) / 100
        const effectiveSlippage = Math.max(userSlippage, 0.02) // Minimum 2% on TestNet
        console.log('Using slippage:', effectiveSlippage, '(', effectiveSlippage * 100, '%)')
        
        const swapTxnGroup = await Swap.v2.generateTxns({
          client: algodClient,
          network: 'testnet',
          quote: swapQuote,
          swapType: SwapType.FixedInput,
          slippage: effectiveSlippage,
          initiatorAddr: userAddress
        })

        // Convert transactions to base64 for signing
        // swapTxnGroup is SignerTransaction[] - each has txn and signers properties
        const txnsToSign = swapTxnGroup.map((txnObj: any) => ({
          txn: Buffer.from(algosdk.encodeUnsignedTransaction(txnObj.txn)).toString('base64'),
        }))

        console.log('✅ Prepared', txnsToSign.length, 'Tinyman transactions for signing')

        return NextResponse.json({
          success: true,
          txnsToSign,
          txnCount: txnsToSign.length,
          dex: 'tinyman',
          poolAddress: pool.account.address().toString(), // Convert Address to string
          expectedOutput: swapQuote.data.quote.assetOutAmount.toString()
        })

      } catch (error: any) {
        console.error('Tinyman SDK error:', error)
        return NextResponse.json(
          {
            success: false,
            error: `Tinyman swap preparation failed: ${error.message}`,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          },
          { status: 500 }
        )
      }
    }

    // Handle Pact pools (manual transaction construction)
    if (routeDex === 'pact') {
      console.log('🔄 Using Pact manual transaction construction...')
      
      if (!poolAddress || !poolAppId) {
        // Try to discover pool from Pact
        const pactClient = new PactClient(algodClient, 'testnet')
        const match = await pactClient.getPool(fromAssetId, toAssetId)
        if (match) {
          poolAddress = match.poolAddress
          poolAppId = match.appId
        }
      }

      if (!poolAddress || !poolAppId) {
        return NextResponse.json(
          { error: 'Could not resolve pool info (address/appId) for this pair' },
          { status: 400 }
        )
      }

      // Calculate minimum output with slippage
      const outputAmount = (typeof minimumReceived === 'number' && minimumReceived > 0)
        ? minimumReceived
        : amount * 0.95 // Fallback estimate if not provided
      const slippageBps = Math.floor((slippage || 0.5) * 100) // Convert % to basis points
      const minOutput = Math.floor(outputAmount * (10000 - slippageBps) / 10000)

      console.log('Swap calculation:', {
        amount,
        outputAmount,
        slippageBps,
        minOutput
      })

      const transactions: algosdk.Transaction[] = []

      // Transaction 1: Transfer input asset to pool
      if (fromAssetId === 0) {
        // Swapping from ALGO - use payment transaction
        transactions.push(
          algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: userAddress,
            receiver: poolAddress,
            amount: Math.floor(amount),
            suggestedParams,
          })
        )
      } else {
        // Swapping from ASA - use asset transfer
        transactions.push(
          algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: userAddress,
            receiver: poolAddress,
            assetIndex: fromAssetId,
            amount: Math.floor(amount),
            suggestedParams,
          })
        )
      }

      // Transaction 2: Application call to Pact pool
      const appArgs = [
        new Uint8Array(Buffer.from('swap')), // Method name
        algosdk.encodeUint64(minOutput), // Minimum output amount
      ]

      const foreignAssets = [fromAssetId, toAssetId].filter(id => id !== 0)

      transactions.push(
        algosdk.makeApplicationCallTxnFromObject({
          sender: userAddress,
          appIndex: poolAppId,
          onComplete: algosdk.OnApplicationComplete.NoOpOC,
          appArgs,
          foreignAssets: foreignAssets.length > 0 ? foreignAssets : undefined,
          suggestedParams,
        })
      )

      // Assign group ID to make it an atomic transaction
      algosdk.assignGroupID(transactions)

      // Convert transactions to base64 for signing
      const txnsToSign = transactions.map(txn => ({
        txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64'),
      }))

      console.log('✅ Prepared', transactions.length, 'Pact transactions for signing')

      return NextResponse.json({
        success: true,
        txnsToSign,
        txnCount: transactions.length,
        dex: 'pact',
        poolAddress
      })
    }

    // Unknown DEX
    return NextResponse.json(
      { error: `Unsupported DEX: ${routeDex}` },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('❌ Prepare swap error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to prepare swap',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

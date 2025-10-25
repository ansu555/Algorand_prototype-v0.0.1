/**
 * API Route: Prepare Swap Transactions
 * POST /api/swap/prepare
 * 
 * Builds unsigned swap transactions using MultihopSwapRouter contract
 */

import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'
import { getContractAppId } from '@/lib/config/contracts'

// Load the contract ABI
const CONTRACT_ABI = {
  "name": "MultihopSwapRouter",
  "methods": [
    {
      "name": "execute_swap_2hop",
      "args": [
        { "type": "asset", "name": "input_asset" },
        { "type": "asset", "name": "intermediate_asset" },
        { "type": "asset", "name": "output_asset" },
        { "type": "application", "name": "pool1_app_id" },
        { "type": "application", "name": "pool2_app_id" },
        { "type": "uint64", "name": "min_output" },
        { "type": "account", "name": "receiver" }
      ],
      "returns": { "type": "uint64" }
    },
    {
      "name": "execute_swap_3hop",
      "args": [
        { "type": "asset", "name": "input_asset" },
        { "type": "asset", "name": "intermediate1_asset" },
        { "type": "asset", "name": "intermediate2_asset" },
        { "type": "asset", "name": "output_asset" },
        { "type": "application", "name": "pool1_app_id" },
        { "type": "application", "name": "pool2_app_id" },
        { "type": "application", "name": "pool3_app_id" },
        { "type": "uint64", "name": "min_output" },
        { "type": "account", "name": "receiver" }
      ],
      "returns": { "type": "uint64" }
    }
  ]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      fromAssetId,
      toAssetId,
      amount,
      slippage,
      userAddress,
      route
    } = body

    console.log('Prepare multi-hop swap:', {
      fromAssetId,
      toAssetId,
      amount,
      slippage,
      userAddress,
      numPools: route?.pools?.length,
      route: JSON.stringify(route, null, 2)
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
    const suggestedParams = await algodClient.getTransactionParams().do()

    // Get MultihopSwapRouter contract App ID
    const routerAppId = getContractAppId('testnet')
    
    if (routerAppId === 0) {
      return NextResponse.json(
        { error: 'MultihopSwapRouter contract not deployed' },
        { status: 500 }
      )
    }

    // Determine number of hops
    const numHops = route.pools.length
    
    if (numHops > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 hops supported' },
        { status: 400 }
      )
    }

    if (numHops < 2) {
      return NextResponse.json(
        { error: 'Multi-hop routing requires at least 2 pools. For single swaps, use direct DEX.' },
        { status: 400 }
      )
    }

    // Calculate minimum output with slippage
    const expectedOutput = route.amountOut || route.quote?.amountOut || amount * 0.95
    const slippageBps = Math.floor((slippage || 0.5) * 100)
    const minOutput = Math.floor(expectedOutput * (10000 - slippageBps) / 10000)

    console.log('Multi-hop swap:', {
      numHops,
      expectedOutput,
      minOutput,
      routerAppId
    })

    // Get contract address
    const routerAddress = algosdk.getApplicationAddress(routerAppId)

    const transactions: algosdk.Transaction[] = []

    // Transaction 1: Transfer input asset to MultihopSwapRouter contract
    if (fromAssetId === 0) {
      transactions.push(
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: userAddress,
          receiver: routerAddress,
          amount: Math.floor(amount),
          suggestedParams,
        })
      )
    } else {
      transactions.push(
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: userAddress,
          receiver: routerAddress,
          assetIndex: fromAssetId,
          amount: Math.floor(amount),
          suggestedParams,
        })
      )
    }

    // Transaction 2: Application call to MultihopSwapRouter
    let appCallTxn: algosdk.Transaction

    if (numHops === 2) {
      // 2-hop swap
      const pool1AppId = route.pools[0].appId
      const pool2AppId = route.pools[1].appId
      
      // Check if pool app IDs are available
      if (!pool1AppId || !pool2AppId) {
        console.error('Missing pool application IDs:', {
          pool1AppId,
          pool2AppId,
          pool1: {
            dexName: route.pools[0].dexName,
            poolId: route.pools[0].poolId,
            asset1: route.pools[0].asset1Id,
            asset2: route.pools[0].asset2Id,
          },
          pool2: {
            dexName: route.pools[1].dexName,
            poolId: route.pools[1].poolId,
            asset1: route.pools[1].asset1Id,
            asset2: route.pools[1].asset2Id,
          }
        })
        
        return NextResponse.json(
          {
            error: 'Pool application IDs not available',
            details: 'Tinyman V2 pool app IDs are being fetched. This may take a moment on first load. Please try again in a few seconds.',
            pools: route.pools.map((p: any) => ({
              dexName: p.dexName,
              poolId: p.poolId,
              hasAppId: !!p.appId
            }))
          },
          { status: 503 } // Service Unavailable - retry later
        )
      }
      
      // Extract intermediate asset ID from route
      let intermediateAssetId: number
      
      if (route.path && route.path.length > 1 && route.path[1].assetId !== undefined) {
        // Use path if available
        intermediateAssetId = Number(route.path[1].assetId)
      } else if (route.pools[0].asset1Id !== undefined && route.pools[0].asset2Id !== undefined) {
        // Fallback: determine from first pool
        intermediateAssetId = route.pools[0].asset2Id === fromAssetId 
          ? Number(route.pools[0].asset1Id) 
          : Number(route.pools[0].asset2Id)
      } else {
        // Last resort: use toAssetId as intermediate (same pool twice)
        console.warn('Could not determine intermediate asset, using output asset')
        intermediateAssetId = toAssetId
      }
      
      // Validate all IDs are numbers
      if (!Number.isInteger(fromAssetId)) {
        throw new Error(`Invalid fromAssetId: ${fromAssetId}`)
      }
      if (!Number.isInteger(intermediateAssetId)) {
        throw new Error(`Invalid intermediateAssetId: ${intermediateAssetId}. Route: ${JSON.stringify(route)}`)
      }
      if (!Number.isInteger(toAssetId)) {
        throw new Error(`Invalid toAssetId: ${toAssetId}`)
      }
      if (!Number.isInteger(pool1AppId)) {
        throw new Error(`Invalid pool1AppId: ${pool1AppId}`)
      }
      if (!Number.isInteger(pool2AppId)) {
        throw new Error(`Invalid pool2AppId: ${pool2AppId}`)
      }
      
      console.log('2-hop swap params:', { 
        fromAssetId, 
        intermediateAssetId, 
        toAssetId, 
        pool1AppId, 
        pool2AppId,
        minOutput,
        userAddress
      })
      
      const abiMethod = algosdk.ABIMethod.fromSignature("execute_swap_2hop(asset,asset,asset,application,application,uint64,account)uint64")
      const methodSelector = abiMethod.getSelector()
      
      const encodedArgs: Uint8Array[] = [methodSelector]
      encodedArgs.push(algosdk.encodeUint64(fromAssetId))
      encodedArgs.push(algosdk.encodeUint64(intermediateAssetId))
      encodedArgs.push(algosdk.encodeUint64(toAssetId))
      encodedArgs.push(algosdk.encodeUint64(pool1AppId))
      encodedArgs.push(algosdk.encodeUint64(pool2AppId))
      encodedArgs.push(algosdk.encodeUint64(minOutput))
      encodedArgs.push(algosdk.decodeAddress(userAddress).publicKey)
      
      const foreignAssets = [fromAssetId, intermediateAssetId, toAssetId].filter(id => id !== 0)
      const foreignApps = [pool1AppId, pool2AppId]
      
      appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: userAddress,
        appIndex: routerAppId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: encodedArgs,
        foreignAssets: foreignAssets.length > 0 ? foreignAssets : undefined,
        foreignApps,
        suggestedParams,
      })
      
    } else {
      // 3-hop swap
      const pool1AppId = route.pools[0].appId
      const pool2AppId = route.pools[1].appId
      const pool3AppId = route.pools[2].appId
      
      // Check if pool app IDs are available
      if (!pool1AppId || !pool2AppId || !pool3AppId) {
        console.error('Missing pool application IDs:', {
          pool1AppId,
          pool2AppId,
          pool3AppId,
          pools: route.pools.map((p: any, i: number) => ({
            index: i,
            dexName: p.dexName,
            poolId: p.poolId,
            hasAppId: !!p.appId
          }))
        })
        
        return NextResponse.json(
          {
            error: 'Pool application IDs not available',
            details: 'Tinyman V2 pool app IDs are being fetched. This may take a moment on first load. Please try again in a few seconds.',
            pools: route.pools.map((p: any) => ({
              dexName: p.dexName,
              poolId: p.poolId,
              hasAppId: !!p.appId
            }))
          },
          { status: 503 } // Service Unavailable - retry later
        )
      }
      
      let intermediate1AssetId: number
      let intermediate2AssetId: number
      
      if (route.path && route.path.length > 2) {
        intermediate1AssetId = Number(route.path[1].assetId)
        intermediate2AssetId = Number(route.path[2].assetId)
      } else if (route.pools[0].asset2Id && route.pools[1].asset2Id) {
        intermediate1AssetId = Number(route.pools[0].asset2Id)
        intermediate2AssetId = Number(route.pools[1].asset2Id)
      } else {
        throw new Error('Could not determine intermediate assets for 3-hop swap')
      }
      
      // Validate all IDs
      if (!Number.isInteger(intermediate1AssetId)) {
        throw new Error(`Invalid intermediate1AssetId: ${intermediate1AssetId}`)
      }
      if (!Number.isInteger(intermediate2AssetId)) {
        throw new Error(`Invalid intermediate2AssetId: ${intermediate2AssetId}`)
      }
      
      console.log('3-hop swap params:', { 
        fromAssetId, 
        intermediate1AssetId, 
        intermediate2AssetId, 
        toAssetId,
        pool1AppId,
        pool2AppId,
        pool3AppId
      })
      
      const abiMethod = algosdk.ABIMethod.fromSignature("execute_swap_3hop(asset,asset,asset,asset,application,application,application,uint64,account)uint64")
      const methodSelector = abiMethod.getSelector()
      
      const encodedArgs: Uint8Array[] = [methodSelector]
      encodedArgs.push(algosdk.encodeUint64(fromAssetId))
      encodedArgs.push(algosdk.encodeUint64(intermediate1AssetId))
      encodedArgs.push(algosdk.encodeUint64(intermediate2AssetId))
      encodedArgs.push(algosdk.encodeUint64(toAssetId))
      encodedArgs.push(algosdk.encodeUint64(pool1AppId))
      encodedArgs.push(algosdk.encodeUint64(pool2AppId))
      encodedArgs.push(algosdk.encodeUint64(pool3AppId))
      encodedArgs.push(algosdk.encodeUint64(minOutput))
      encodedArgs.push(algosdk.decodeAddress(userAddress).publicKey)
      
      const foreignAssets = [fromAssetId, intermediate1AssetId, intermediate2AssetId, toAssetId].filter(id => id !== 0)
      const foreignApps = [pool1AppId, pool2AppId, pool3AppId]
      
      appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: userAddress,
        appIndex: routerAppId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: encodedArgs,
        foreignAssets: foreignAssets.length > 0 ? foreignAssets : undefined,
        foreignApps,
        suggestedParams,
      })
    }

    transactions.push(appCallTxn)

    // Assign group ID to make it an atomic transaction
    algosdk.assignGroupID(transactions)

    // Convert transactions to base64 for signing
    const txnsToSign = transactions.map(txn => ({
      txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64'),
    }))

    console.log('✅ Prepared', transactions.length, 'transactions for signing')

    return NextResponse.json({
      success: true,
      txnsToSign,
      txnCount: transactions.length,
    })

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

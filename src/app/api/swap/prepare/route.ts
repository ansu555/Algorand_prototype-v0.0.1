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

    const algodClient = getAlgodClient()
    
    // Check if user is opted into the output asset (optional check - blockchain will reject if not)
    if (toAssetId !== 0) { // ALGO doesn't require opt-in
      try {
        const accountInfo = await algodClient.accountInformation(userAddress).do()
        const assets = accountInfo.assets || []
        // Fix: asset ID field is 'asset-id' in the response, not 'assetId'
        const assetIds = assets.map((a: any) => Number(a['asset-id'] || 0))
        const isOptedIn = assetIds.includes(Number(toAssetId))
        
        console.log('Asset opt-in check:', {
          userAddress,
          toAssetId: Number(toAssetId),
          userAssets: assetIds,
          totalAssets: assets.length,
          isOptedIn
        })
        
        if (!isOptedIn) {
          console.log(`⚠️  User not opted into asset ${toAssetId} - blockchain will reject`)
          // Don't block - let blockchain reject with proper error
          // return NextResponse.json(
          //   { 
          //     error: 'Asset opt-in required',
          //     details: `You must opt into asset ${toAssetId} before receiving it. Please opt in first using your wallet.`,
          //     assetId: toAssetId,
          //     requiresOptIn: true
          //   },
          //   { status: 400 }
          // )
        } else {
          console.log(`✅ User is opted into asset ${toAssetId}`)
        }
      } catch (error) {
        console.error('Error checking asset opt-in:', error)
        // Continue anyway - the blockchain will reject if not opted in
      }
    }

    if (!route || !route.pools || route.pools.length === 0) {
      return NextResponse.json(
        { error: 'No route provided' },
        { status: 400 }
      )
    }

    const suggestedParams = await algodClient.getTransactionParams().do()

    // Determine number of hops
    const numHops = route.pools.length
    
    // TEMPORARY: MultihopSwapRouter contract doesn't support ALGO as input yet
    // But single-hop swaps can use ALGO with direct Tinyman V2
    if (fromAssetId === 0 && numHops > 1) {
      return NextResponse.json(
        { 
          error: 'ALGO multi-hop swaps not supported yet',
          details: 'The MultihopSwapRouter contract currently only supports ASA-to-ASA swaps for multi-hop routes. ALGO → ASA single-hop swaps work fine. Please use a single-hop route or select an ASA as the input token.'
        },
        { status: 400 }
      )
    }
    
    // Handle single-hop (direct) swaps differently from multi-hop
    if (numHops === 1) {
      // Single-hop: Use direct Tinyman V2 swap (no router contract needed)
      console.log('Single-hop swap - using direct Tinyman V2')
      
      const pool = route.pools[0]
      if (!pool.appId) {
        return NextResponse.json(
          { error: 'Pool application ID not available' },
          { status: 503 }
        )
      }
      
      // Calculate minimum output with slippage
      const expectedOutput = route.amountOut || route.quote?.amountOut || amount * 0.95
      const slippageBps = Math.floor((slippage || 0.5) * 100)
      const minOutput = Math.floor(expectedOutput * (10000 - slippageBps) / 10000)
      
      console.log('Direct Tinyman V2 swap:', {
        fromAssetId,
        toAssetId,
        poolAppId: pool.appId,
        amount,
        minOutput
      })
      
      const transactions: algosdk.Transaction[] = []
      
      // Check if user is opted into the pool app
      let poolOptInTxn: algosdk.Transaction | null = null
      try {
        const accountInfo = await algodClient.accountInformation(userAddress).do()
        const isOptedIntoPool = accountInfo.appsLocalState?.some(
          (app: any) => app.id === pool.appId
        )
        
        if (!isOptedIntoPool) {
          console.log(`⚠️  User not opted into pool app ${pool.appId} - preparing opt-in transaction`)
          
          // Create pool opt-in transaction (separate from swap group)
          poolOptInTxn = algosdk.makeApplicationOptInTxnFromObject({
            sender: userAddress,
            appIndex: pool.appId,
            suggestedParams,
          })
        } else {
          console.log(`✅ User already opted into pool app ${pool.appId}`)
        }
      } catch (error) {
        console.error('Error checking pool opt-in:', error)
        // Continue - the blockchain will reject if not opted in
      }
      
      // Transaction: Asset transfer to pool
      if (fromAssetId === 0) {
        transactions.push(
          algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: userAddress,
            receiver: pool.poolAddress || '',
            amount: Math.floor(amount),
            suggestedParams,
          })
        )
      } else {
        transactions.push(
          algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: userAddress,
            receiver: pool.poolAddress || '',
            assetIndex: fromAssetId,
            amount: Math.floor(amount),
            suggestedParams,
          })
        )
      }
      
      // Transaction 2: Call pool's swap method
      // Tinyman V2 uses "swap" method with parameters
      const swapMethod = algosdk.ABIMethod.fromSignature("swap(string,uint64)uint64")
      const methodSelector = swapMethod.getSelector()
      
      // Determine swap mode based on which asset is being sold
      const swapMode = fromAssetId < toAssetId ? "fixed-input" : "fixed-output"
      
      const appArgs: Uint8Array[] = [methodSelector]
      // Encode swap mode as ABI string
      const modeBytes = new TextEncoder().encode(swapMode)
      const modeLength = new Uint8Array([0, modeBytes.length]) // ABI string length prefix
      appArgs.push(new Uint8Array([...modeLength, ...modeBytes]))
      appArgs.push(algosdk.encodeUint64(minOutput))
      
      const foreignAssets = [fromAssetId, toAssetId].filter(id => id !== 0)
      
      transactions.push(
        algosdk.makeApplicationCallTxnFromObject({
          sender: userAddress,
          appIndex: pool.appId,
          onComplete: algosdk.OnApplicationComplete.NoOpOC,
          appArgs,
          accounts: [userAddress], // Pool needs sender address to send output tokens
          foreignAssets: foreignAssets.length > 0 ? foreignAssets : undefined,
          suggestedParams,
        })
      )
      
      // Assign group ID to swap transactions
      algosdk.assignGroupID(transactions)
      
      // Convert swap transactions to base64 for signing
      const txnsToSign = transactions.map(txn => ({
        txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64'),
      }))
      
      // If pool opt-in is needed, include it as a separate transaction to sign first
      if (poolOptInTxn) {
        const optInTxnToSign = {
          txn: Buffer.from(algosdk.encodeUnsignedTransaction(poolOptInTxn)).toString('base64'),
        }
        
        console.log('✅ Prepared pool opt-in + direct swap:', 1, 'opt-in +', transactions.length, 'swap transactions')
        
        return NextResponse.json({
          success: true,
          requiresPoolOptIn: true,
          poolOptInTxn: optInTxnToSign,
          txnsToSign,
          txnCount: transactions.length,
          swapType: 'direct',
          message: 'Pool opt-in required. Please sign the opt-in transaction first, then the swap transactions.'
        })
      }
      
      console.log('✅ Prepared direct swap:', transactions.length, 'transactions')
      
      return NextResponse.json({
        success: true,
        txnsToSign,
        txnCount: transactions.length,
        swapType: 'direct',
      })
    }

    // Get MultihopSwapRouter contract App ID for multi-hop swaps
    const routerAppId = getContractAppId('testnet')
    
    if (routerAppId === 0) {
      return NextResponse.json(
        { error: 'MultihopSwapRouter contract not deployed' },
        { status: 500 }
      )
    }
    
    if (numHops > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 hops supported' },
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
      
      // Use correct ABI signature from contract (all uint64, not reference types)
      const abiMethod = algosdk.ABIMethod.fromSignature("execute_swap_2hop(uint64,uint64,uint64,uint64,uint64,uint64,address)uint64")
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
      
      // Use correct ABI signature from contract (all uint64, not reference types)
      const abiMethod = algosdk.ABIMethod.fromSignature("execute_swap_3hop(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,address)uint64")
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

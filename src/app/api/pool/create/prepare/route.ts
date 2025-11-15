/**
 * API Route: Prepare Pool Creation Transactions
 * POST /api/pool/create/prepare
 *
 * Builds unsigned transactions for creating a new liquidity pool
 */

import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'
import { LiquidityPoolClient } from '@/lib/contracts/liquidity-pool-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      asset1Id,
      asset2Id,
      amount1,
      amount2,
      feeBps,
      userAddress,
    } = body

    console.log('Prepare pool creation request:', {
      asset1Id,
      asset2Id,
      amount1,
      amount2,
      feeBps,
      userAddress,
    })

    // Validate inputs
    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      )
    }

    if (asset1Id === undefined || asset2Id === undefined) {
      return NextResponse.json(
        { error: 'Both asset IDs are required' },
        { status: 400 }
      )
    }

    if (asset1Id === asset2Id) {
      return NextResponse.json(
        { error: 'Asset IDs must be different' },
        { status: 400 }
      )
    }

    // TEMPORARY LIMITATION: Current contract version doesn't support ALGO pools
    // The add_liquidity method expects AssetTransferTransaction for both assets
    // but ALGO uses PaymentTransaction. This will be fixed in the next contract version.
    if (asset1Id === 0 || asset2Id === 0) {
      return NextResponse.json(
        { 
          error: 'ALGO pools are not supported in the current contract version',
          details: 'Please create a pool with two ASA tokens. ALGO support will be added in a future update.'
        },
        { status: 400 }
      )
    }

    if (!amount1 || !amount2 || Number(amount1) <= 0 || Number(amount2) <= 0) {
      return NextResponse.json(
        { error: 'Both amounts must be positive' },
        { status: 400 }
      )
    }

    if (feeBps === undefined || feeBps < 0 || feeBps > 1000) {
      return NextResponse.json(
        { error: 'Fee must be between 0 and 1000 basis points (0-10%)' },
        { status: 400 }
      )
    }

    const algodClient = getAlgodClient()
    const network = (process.env.NEXT_PUBLIC_ALGORAND_NETWORK || process.env.ALGORAND_NETWORK || 'testnet') as 'testnet' | 'mainnet'

    // Initialize pool client
    const poolClient = new LiquidityPoolClient(algodClient, network)

    // Check if pool contract is deployed
    const isDeployed = await poolClient.isDeployed()
    if (!isDeployed) {
      return NextResponse.json(
        { error: 'Liquidity pool contract not deployed. Please deploy the contract first.' },
        { status: 500 }
      )
    }

    // Check if user is opted into required assets
    try {
      const accountInfo = await algodClient.accountInformation(userAddress).do()

      // Check opt-in for non-ALGO assets
      const requiredAssets = [asset1Id, asset2Id].filter((id: number) => id !== 0)
      const userAssets = new Set((accountInfo.assets || []).map((a: any) => Number(a.assetId)))

      for (const assetId of requiredAssets) {
        if (!userAssets.has(assetId)) {
          return NextResponse.json(
            { error: `You need to opt-in to asset ${assetId} first` },
            { status: 400 }
          )
        }
      }

      // Check if user has sufficient balance
      for (const assetId of requiredAssets) {
        const assetHolding = (accountInfo.assets || []).find((a: any) => Number(a.assetId) === assetId)
        const amount = assetId === asset1Id ? Number(amount1) : Number(amount2)

        if (!assetHolding || Number(assetHolding.amount) < amount) {
          return NextResponse.json(
            { error: `Insufficient balance for asset ${assetId}` },
            { status: 400 }
          )
        }
      }

      // Check ALGO balance
      if (asset1Id === 0) {
        const minBalance = Number(amount1) + 1000000 // Include 1 ALGO for txn fees
        if (accountInfo.amount < minBalance) {
          return NextResponse.json(
            { error: 'Insufficient ALGO balance' },
            { status: 400 }
          )
        }
      } else if (asset2Id === 0) {
        const minBalance = Number(amount2) + 1000000 // Include 1 ALGO for txn fees
        if (accountInfo.amount < minBalance) {
          return NextResponse.json(
            { error: 'Insufficient ALGO balance' },
            { status: 400 }
          )
        }
      }
    } catch (error) {
      console.warn('Could not verify asset holdings:', error)
    }

    // Get pool address
    const poolAddress = poolClient.getPoolAddress()

    // Check if pool already exists for this asset pair
    try {
      const poolInfo = await poolClient.getPoolInfo()
      if (poolInfo && poolInfo.initialized) {
        // Check if it's the same asset pair
        if (
          (Number(poolInfo.asset1Id) === asset1Id && Number(poolInfo.asset2Id) === asset2Id) ||
          (Number(poolInfo.asset1Id) === asset2Id && Number(poolInfo.asset2Id) === asset1Id)
        ) {
          return NextResponse.json(
            {
              error: 'A pool for this asset pair already exists',
              existingPool: {
                asset1Id: Number(poolInfo.asset1Id),
                asset2Id: Number(poolInfo.asset2Id),
                poolAddress,
              }
            },
            { status: 400 }
          )
        }
      }
    } catch (error) {
      console.log('No existing pool found, proceeding with creation')
    }

    const suggestedParams = await algodClient.getTransactionParams().do()
    const transactions: algosdk.Transaction[] = []

    // Step 1: Create pool
    // NOTE: The create_pool method now returns a pool_id that we need for subsequent calls
    const createPoolTxns = await poolClient.buildCreatePoolTxns({
      asset1Id,
      asset2Id,
      feeBps,
      userAddress,
    })
    transactions.push(...createPoolTxns)

    // Step 2: Compute pool_id locally (same logic as contract)
    // The contract will return this from create_pool, but we can compute it ourselves
    const poolId = poolClient.computePoolId(asset1Id, asset2Id)
    console.log('Computed pool ID:', poolId)

    // Step 3: Fund the pool (minimum balance + box storage costs)
    // Pool needs: base min balance (0.1) + box storage (~0.0025 per box) + buffer
    // NEW: Box storage is cheaper than global state!
    const fundingAmount = 300000 // 0.3 ALGO (reduced from 0.5)
    const fundingTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: userAddress,
      receiver: poolAddress,
      amount: fundingAmount,
      suggestedParams,
    })
    transactions.push(fundingTxn)

    // Step 4: Create LP token (now requires pool_id)
    const asset1Info = asset1Id === 0
      ? { name: 'ALGO', unit: 'ALGO', decimals: 6 }
      : await (async () => {
          try {
            const info = await algodClient.getAssetByID(asset1Id).do()
            return {
              name: info.params.name || `Asset ${asset1Id}`,
              unit: info.params.unitName || (info.params as any)['unit-name'] || 'ASA',
              decimals: info.params.decimals || 0,
            }
          } catch {
            return { name: `Asset ${asset1Id}`, unit: 'ASA', decimals: 6 }
          }
        })()

    const asset2Info = asset2Id === 0
      ? { name: 'ALGO', unit: 'ALGO', decimals: 6 }
      : await (async () => {
          try {
            const info = await algodClient.getAssetByID(asset2Id).do()
            return {
              name: info.params.name || `Asset ${asset2Id}`,
              unit: info.params.unitName || (info.params as any)['unit-name'] || 'ASA',
              decimals: info.params.decimals || 0,
            }
          } catch {
            return { name: `Asset ${asset2Id}`, unit: 'ASA', decimals: 6 }
          }
        })()

    const lpTokenName = `${asset1Info.unit}-${asset2Info.unit} LP`
    const lpTokenUnit = `${asset1Info.unit}${asset2Info.unit}`
    const lpDecimals = Math.max(asset1Info.decimals, asset2Info.decimals)
    const lpTotalSupply = BigInt('18446744073709551615') // Max uint64

    const createLPTokenTxn = await poolClient.buildCreateLPTokenTxn(
      userAddress,
      poolId, // NEW: Required for multi-pool factory
      lpTotalSupply,
      lpDecimals,
      lpTokenName,
      lpTokenUnit
    )
    transactions.push(createLPTokenTxn)

    // NOTE: We CANNOT add liquidity in the same transaction group because:
    // 1. The LP token is created in transaction 3 (create_lp_token)
    // 2. The user needs to opt-in to the LP token before receiving it
    // 3. We can't opt-in to an asset that doesn't exist yet in the same atomic group
    // 
    // Solution: Split into two transaction groups:
    // Group 1 (this): Create pool + Fund pool + Create LP token
    // Group 2 (separate call): Opt-in to LP token + Add initial liquidity

    // Assign group ID to all transactions
    algosdk.assignGroupID(transactions)

    // Convert transactions to base64 for signing
    const txnsToSign = transactions.map(txn => ({
      txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64'),
    }))

    console.log('✅ Prepared', txnsToSign.length, 'transactions for pool creation')

    return NextResponse.json({
      success: true,
      txnsToSign,
      txnCount: txnsToSign.length,
      poolAddress,
      poolId, // NEW: Include pool ID for future add_liquidity calls
      lpTokenName,
      lpTokenUnit,
      estimatedLiquidity: Math.sqrt(Number(amount1) * Number(amount2)), // Rough estimate

      // Important: This is only STEP 1 of pool creation
      // After these transactions are confirmed, you need to:
      // 1. Get the LP token ID from the confirmed transaction
      // 2. Opt-in to the LP token
      // 3. Add initial liquidity (using the poolId)
      step: 'create_pool_and_token',
      nextStep: 'opt_in_and_add_liquidity',
      metadata: {
        asset1Id,
        asset2Id,
        amount1,
        amount2,
        feeBps,
        poolId, // NEW: Store for later use
      }
    })

  } catch (error: any) {
    console.error('❌ Prepare pool creation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to prepare pool creation',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

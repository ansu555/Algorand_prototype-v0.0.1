/**
 * API Route: List All Pools from Blockchain
 * GET /api/pool/list
 *
 * Fetches all liquidity pools from on-chain box storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAlgodClient } from '@/lib/algorand'

// Pool data structure from contract
interface PoolData {
  asset1_id: number
  asset2_id: number
  reserve1: bigint
  reserve2: bigint
  total_liquidity: bigint
  fee_bps: number
  lp_token_id: number
  initialized: boolean
}

interface PoolInfo extends PoolData {
  poolId: string // hex string
  poolAddress: string
}

/**
 * Decode pool data from box bytes
 * PoolData struct in contract:
 * - asset1_id: uint64 (8 bytes)
 * - asset2_id: uint64 (8 bytes)
 * - reserve1: uint64 (8 bytes)
 * - reserve2: uint64 (8 bytes)
 * - total_liquidity: uint64 (8 bytes)
 * - fee_bps: uint16 (2 bytes) <-- IMPORTANT: UInt16, not UInt64!
 * - lp_token_id: uint64 (8 bytes)
 * - initialized: bool (1 byte)
 * Total: 51 bytes
 */
function decodePoolData(boxData: Uint8Array): PoolData {
  const view = new DataView(boxData.buffer, boxData.byteOffset, boxData.byteLength)

  return {
    asset1_id: Number(view.getBigUint64(0, false)), // big-endian
    asset2_id: Number(view.getBigUint64(8, false)),
    reserve1: view.getBigUint64(16, false),
    reserve2: view.getBigUint64(24, false),
    total_liquidity: view.getBigUint64(32, false),
    fee_bps: view.getUint16(40, false), // UInt16 (2 bytes)
    lp_token_id: Number(view.getBigUint64(42, false)), // Offset 42
    initialized: boxData[50] !== 0, // Byte 50
  }
}

export async function GET(request: NextRequest) {
  try {
    const poolAppId = Number(process.env.NEXT_PUBLIC_POOL_APP_ID)

    if (!poolAppId) {
      return NextResponse.json(
        { error: 'Pool contract not configured' },
        { status: 500 }
      )
    }

    console.log('📦 Fetching all pools from contract:', poolAppId)

    const algodClient = getAlgodClient()

    // Get all boxes for the pool application
    const boxesResponse = await algodClient.getApplicationBoxes(poolAppId).do()
    const boxes = boxesResponse.boxes || []

    console.log(`Found ${boxes.length} pool(s) in box storage`)

    if (boxes.length === 0) {
      return NextResponse.json({
        success: true,
        pools: [],
        count: 0,
        message: 'No pools found on-chain',
      })
    }

    // Fetch and decode each pool's data
    const pools: any[] = []

    for (const box of boxes) {
      try {
        const boxName = box.name
        const poolIdHex = Buffer.from(boxName).toString('hex')

        console.log(`📖 Reading pool box: ${poolIdHex}`)

        // Get box data
        const boxData = await algodClient.getApplicationBoxByName(poolAppId, boxName).do()
        const poolData = decodePoolData(new Uint8Array(boxData.value))

        // Get pool address (application address for this pool)
        const poolAppAddress = process.env.NEXT_PUBLIC_POOL_APP_ADDRESS || ''

        // Fetch asset information for both assets
        let asset1Name = `Asset ${poolData.asset1_id}`
        let asset2Name = `Asset ${poolData.asset2_id}`
        let asset1Decimals = 6
        let asset2Decimals = 6

        try {
          const asset1Info = await algodClient.getAssetByID(poolData.asset1_id).do()
          asset1Name = asset1Info.params['unit-name'] || asset1Info.params.name || `Asset ${poolData.asset1_id}`
          asset1Decimals = asset1Info.params.decimals || 6
          console.log(`  Asset 1: ${asset1Name} (${poolData.asset1_id})`)
        } catch (e) {
          console.warn(`  Failed to fetch asset 1 info: ${poolData.asset1_id}`)
        }

        try {
          const asset2Info = await algodClient.getAssetByID(poolData.asset2_id).do()
          asset2Name = asset2Info.params['unit-name'] || asset2Info.params.name || `Asset ${poolData.asset2_id}`
          asset2Decimals = asset2Info.params.decimals || 6
          console.log(`  Asset 2: ${asset2Name} (${poolData.asset2_id})`)
        } catch (e) {
          console.warn(`  Failed to fetch asset 2 info: ${poolData.asset2_id}`)
        }

        pools.push({
          ...poolData,
          poolId: poolIdHex,
          poolAddress: poolAppAddress,
          asset1_name: asset1Name,
          asset2_name: asset2Name,
          asset1_decimals: asset1Decimals,
          asset2_decimals: asset2Decimals,
        })

        console.log(`✅ Pool ${poolIdHex}: ${asset1Name} / ${asset2Name}`)
      } catch (error) {
        console.error(`❌ Error reading pool box:`, error)
      }
    }

    // Convert BigInts to strings for JSON serialization
    const poolsJSON = pools.map(pool => ({
      ...pool,
      reserve1: pool.reserve1.toString(),
      reserve2: pool.reserve2.toString(),
      total_liquidity: pool.total_liquidity.toString(),
    }))

    return NextResponse.json({
      success: true,
      pools: poolsJSON,
      count: pools.length,
      contractId: poolAppId,
      network: process.env.NEXT_PUBLIC_ALGORAND_NETWORK || 'testnet',
    })

  } catch (error: any) {
    console.error('❌ Error fetching pools:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch pools from blockchain',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

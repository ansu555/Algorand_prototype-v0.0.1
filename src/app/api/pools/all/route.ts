/**
 * API Route: Fetch All Pools from All DEXs
 * GET /api/pools/all?network=testnet|mainnet
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAlgodClient } from '@/lib/algorand';
import { TinymanV2Client } from '@/lib/dex/tinyman-client';
import { PactClient } from '@/lib/dex/pact-client';
import { LiquidityPoolClient } from '@/lib/contracts/liquidity-pool-client';
import type { PoolInfo } from '@/lib/dex/types';

// Separate caches for testnet and mainnet
let cachedTestnetPools: {
  data: PoolInfo[];
  timestamp: number;
} | null = null;

let cachedMainnetPools: {
  data: PoolInfo[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 300 * 1000; // 5 minutes (to avoid Tinyman rate limits)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const network = (searchParams.get('network') || 'testnet') as 'testnet' | 'mainnet';

    // Validate network parameter
    if (network !== 'testnet' && network !== 'mainnet') {
      return NextResponse.json(
        { success: false, error: 'Invalid network parameter. Use "testnet" or "mainnet".' },
        { status: 400 }
      );
    }

    // Check cache based on network
    const cachedPools = network === 'testnet' ? cachedTestnetPools : cachedMainnetPools;
    const now = Date.now();
    
    if (cachedPools && now - cachedPools.timestamp < CACHE_TTL) {
      console.log(`✅ Returning cached ${network} pools`);
      
      // Convert BigInt values to strings for cached data
      const serializedCachedPools = cachedPools.data.map(pool => ({
        ...pool,
        reserve1: pool.reserve1.toString(),
        reserve2: pool.reserve2.toString(),
        totalLiquidity: pool.totalLiquidity.toString(),
      }));
      
      return NextResponse.json({
        success: true,
        pools: serializedCachedPools,
        network,
        cached: true,
        timestamp: cachedPools.timestamp,
      });
    }

    console.log(`🔄 Fetching fresh pool data from ${network}...`);

    // Initialize Algod client
    const algodClient = getAlgodClient();

    // Initialize DEX clients based on network
    const tinymanClient = new TinymanV2Client(algodClient, network);
    
    // Fetch pools based on network
    // Note: Pact only provides mainnet pools, so we skip Pact for testnet
    let tinymanPools: PoolInfo[] = [];
    let pactPools: PoolInfo[] = [];

    if (network === 'mainnet') {
      // Fetch both Tinyman and Pact pools for mainnet
      const pactClient = new PactClient(algodClient, 'mainnet');
      
      [tinymanPools, pactPools] = await Promise.all([
        tinymanClient.fetchPools().catch(err => {
          console.error('Tinyman fetch error:', err);
          return [];
        }),
        pactClient.fetchPools().catch(err => {
          console.error('Pact fetch error:', err);
          return [];
        }),
      ]);
    } else {
      // Only fetch Tinyman pools for testnet (Pact doesn't provide testnet pools)
      tinymanPools = await tinymanClient.fetchPools().catch(err => {
        console.error('Tinyman fetch error:', err);
        return [];
      });
    }

    // Combine all pools
    const allPools = [...tinymanPools, ...pactPools];

    // Fetch 10xswap pools directly from blockchain
    const poolClient = new LiquidityPoolClient(algodClient, network);
    const tenXSwapPools: PoolInfo[] = [];
    
    try {
      // Check if the pool contract is deployed
      const isDeployed = await poolClient.isDeployed();
      
      if (isDeployed) {
        console.log('🔍 Fetching 10xswap pool from blockchain...');
        
        // Get pool info from smart contract global state
        const poolInfo = await poolClient.getPoolInfo();
        
        if (poolInfo && poolInfo.initialized) {
          // Fetch asset information for both assets
          const asset1Id = Number(poolInfo.asset1Id);
          const asset2Id = Number(poolInfo.asset2Id);
          
          const [asset1Info, asset2Info] = await Promise.all([
            asset1Id === 0 
              ? Promise.resolve({ name: 'ALGO', unitName: 'ALGO', decimals: 6 })
              : algodClient.getAssetByID(asset1Id).do().then(info => ({
                  name: info.params.name || `Asset ${asset1Id}`,
                  unitName: info.params.unitName || (info.params as any)['unit-name'] || 'ASA',
                  decimals: info.params.decimals || 0
                })).catch(() => ({ name: `Asset ${asset1Id}`, unitName: 'ASA', decimals: 0 })),
            asset2Id === 0
              ? Promise.resolve({ name: 'ALGO', unitName: 'ALGO', decimals: 6 })
              : algodClient.getAssetByID(asset2Id).do().then(info => ({
                  name: info.params.name || `Asset ${asset2Id}`,
                  unitName: info.params.unitName || (info.params as any)['unit-name'] || 'ASA',
                  decimals: info.params.decimals || 0
                })).catch(() => ({ name: `Asset ${asset2Id}`, unitName: 'ASA', decimals: 0 }))
          ]);
          
          tenXSwapPools.push({
            poolId: `10xswap-${poolInfo.lpTokenId}`,
            poolAddress: poolClient.getPoolAddress(),
            asset1: {
              id: asset1Id,
              name: asset1Info.name,
              symbol: asset1Info.unitName,
              decimals: asset1Info.decimals,
            },
            asset2: {
              id: asset2Id,
              name: asset2Info.name,
              symbol: asset2Info.unitName,
              decimals: asset2Info.decimals,
            },
            reserve1: poolInfo.reserve1,
            reserve2: poolInfo.reserve2,
            totalLiquidity: poolInfo.totalLiquidity,
            fee: poolInfo.feeBps,
            dexName: '10xswap',
            lpTokenId: Number(poolInfo.lpTokenId),
          });
          
          console.log(`✅ Fetched 10xswap pool: ${asset1Info.unitName}/${asset2Info.unitName}`);
        } else {
          console.log('ℹ️ 10xswap pool contract exists but no pool initialized yet');
        }
      } else {
        console.log('ℹ️ 10xswap pool contract not deployed on', network);
      }
    } catch (err) {
      console.error('Error fetching 10xswap pool from blockchain:', err);
    }
    
    // Add 10xswap pools to the combined list
    allPools.push(...tenXSwapPools);

    console.log(`✅ Fetched ${allPools.length} total ${network} pools (Tinyman: ${tinymanPools.length}, Pact: ${pactPools.length}, 10xswap: ${tenXSwapPools.length})`);

    // Convert BigInt values to strings for JSON serialization
    const serializedPools = allPools.map(pool => ({
      ...pool,
      reserve1: pool.reserve1.toString(),
      reserve2: pool.reserve2.toString(),
      totalLiquidity: pool.totalLiquidity.toString(),
    }));

    // Update cache based on network
    if (network === 'testnet') {
      cachedTestnetPools = {
        data: allPools,
        timestamp: now,
      };
    } else {
      cachedMainnetPools = {
        data: allPools,
        timestamp: now,
      };
    }

    return NextResponse.json({
      success: true,
      pools: serializedPools,
      network,
      stats: {
        total: allPools.length,
        tinyman: tinymanPools.length,
        pact: pactPools.length,
        '10xswap': tenXSwapPools.length,
      },
      cached: false,
      timestamp: now,
    });
  } catch (error: any) {
    console.error('Error fetching pools:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch pools',
      },
      { status: 500 }
    );
  }
}

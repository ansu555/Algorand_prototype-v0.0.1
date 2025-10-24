/**
 * API Route: Fetch All Pools from All DEXs
 * GET /api/pools/all
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAlgodClient } from '@/lib/algorand';
import { TinymanV2Client } from '@/lib/dex/tinyman-client';
import { PactClient } from '@/lib/dex/pact-client';
import type { PoolInfo } from '@/lib/dex/types';

// Cache pools for 30 seconds
let cachedPools: {
  data: PoolInfo[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 30 * 1000; // 30 seconds

export async function GET(request: NextRequest) {
  try {
    // Check cache
    const now = Date.now();
    if (cachedPools && now - cachedPools.timestamp < CACHE_TTL) {
      console.log('✅ Returning cached pools');
      
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
        cached: true,
        timestamp: cachedPools.timestamp,
      });
    }

    console.log('🔄 Fetching fresh pool data from all DEXs...');

    // Initialize Algod client
    const algodClient = getAlgodClient();

    // Initialize DEX clients
    const tinymanClient = new TinymanV2Client(algodClient, 'testnet');
    const pactClient = new PactClient(algodClient, 'testnet');

    // Fetch pools from all DEXs in parallel
    const [tinymanPools, pactPools] = await Promise.all([
      tinymanClient.fetchPools().catch(err => {
        console.error('Tinyman fetch error:', err);
        return [];
      }),
      pactClient.fetchPools().catch(err => {
        console.error('Pact fetch error:', err);
        return [];
      }),
    ]);

    // Combine all pools
    const allPools = [...tinymanPools, ...pactPools];

    console.log(`✅ Fetched ${allPools.length} total pools (Tinyman: ${tinymanPools.length}, Pact: ${pactPools.length})`);

    // Convert BigInt values to strings for JSON serialization
    const serializedPools = allPools.map(pool => ({
      ...pool,
      reserve1: pool.reserve1.toString(),
      reserve2: pool.reserve2.toString(),
      totalLiquidity: pool.totalLiquidity.toString(),
    }));

    // Update cache
    cachedPools = {
      data: allPools,
      timestamp: now,
    };

    return NextResponse.json({
      success: true,
      pools: serializedPools,
      stats: {
        total: allPools.length,
        tinyman: tinymanPools.length,
        pact: pactPools.length,
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

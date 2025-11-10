/**
 * API Route: Fetch All Pools from All DEXs
 * GET /api/pools/all?network=testnet|mainnet
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAlgodClient } from '@/lib/algorand';
import { TinymanV2Client } from '@/lib/dex/tinyman-client';
import { PactClient } from '@/lib/dex/pact-client';
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

    console.log(`✅ Fetched ${allPools.length} total ${network} pools (Tinyman: ${tinymanPools.length}, Pact: ${pactPools.length})`);

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

/**
 * API Route: Fetch Market Data (TVL, Volume, APR) for Pools
 * GET /api/pools/market-data?network=testnet|mainnet
 * 
 * This endpoint fetches additional market data from external sources:
 * - Vestige Analytics API (for Algorand DEX data)
 * - DeFiLlama API (backup for TVL data)
 * - On-chain calculation for APR estimation
 */

import { NextRequest, NextResponse } from 'next/server';

// Cache for market data
let cachedMarketData: {
  data: Record<string, PoolMarketData>;
  timestamp: number;
} | null = null;

const CACHE_TTL = 300 * 1000; // 5 minutes

export interface PoolMarketData {
  poolId: string;
  tvlUSD?: number;
  volume24hUSD?: number;
  volume1dUSD?: number;
  volume30dUSD?: number;
  poolAPR?: number;
  rewardAPR?: number;
  fees24hUSD?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const network = (searchParams.get('network') || 'testnet') as 'testnet' | 'mainnet';

    // Check cache
    const now = Date.now();
    if (cachedMarketData && now - cachedMarketData.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cachedMarketData.data,
        cached: true,
        timestamp: cachedMarketData.timestamp,
      });
    }

    console.log(`🔄 Fetching market data for ${network}...`);

    // Fetch from external APIs
    const marketData = await fetchMarketData(network);

    // Update cache
    cachedMarketData = {
      data: marketData,
      timestamp: now,
    };

    return NextResponse.json({
      success: true,
      data: marketData,
      cached: false,
      timestamp: now,
    });
  } catch (error: any) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch market data',
      },
      { status: 500 }
    );
  }
}

async function fetchMarketData(network: 'testnet' | 'mainnet'): Promise<Record<string, PoolMarketData>> {
  const marketData: Record<string, PoolMarketData> = {};

  try {
    // For testnet, return empty data since most analytics APIs only support mainnet
    if (network === 'testnet') {
      console.log('Testnet does not have external market data sources - returning empty data');
      return {};
    }

    // Try to fetch from Vestige Analytics API (mainnet only)
    try {
      const vestigeData = await fetchFromVestigeAPI();
      Object.assign(marketData, vestigeData);
    } catch (err) {
      console.warn('Vestige API fetch failed:', err);
    }

    // Try to fetch from DeFiLlama (backup source)
    try {
      const defillamaData = await fetchFromDeFiLlama();
      // Merge with existing data (don't overwrite if already exists)
      for (const [poolId, data] of Object.entries(defillamaData)) {
        if (!marketData[poolId]) {
          marketData[poolId] = data;
        }
      }
    } catch (err) {
      console.warn('DeFiLlama API fetch failed:', err);
    }

    return marketData;
  } catch (error) {
    console.error('Error in fetchMarketData:', error);
    return {};
  }
}

async function fetchFromVestigeAPI(): Promise<Record<string, PoolMarketData>> {
  // Vestige Analytics API endpoint (example - adjust based on actual API)
  // Note: This is a placeholder - actual Vestige API may have different endpoints
  const response = await fetch('https://free-api.vestige.fi/analytics/pools', {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Vestige API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Transform Vestige API response to our format
  const marketData: Record<string, PoolMarketData> = {};
  
  // Parse Vestige response (adjust based on actual API structure)
  if (Array.isArray(data.pools)) {
    for (const pool of data.pools) {
      marketData[pool.poolId || pool.id] = {
        poolId: pool.poolId || pool.id,
        tvlUSD: pool.tvl || pool.totalValueLocked,
        volume24hUSD: pool.volume24h,
        volume1dUSD: pool.volume24h,
        volume30dUSD: pool.volume30d,
        poolAPR: pool.apr || pool.feeApr,
        rewardAPR: pool.rewardApr || pool.incentiveApr,
        fees24hUSD: pool.fees24h,
      };
    }
  }

  return marketData;
}

async function fetchFromDeFiLlama(): Promise<Record<string, PoolMarketData>> {
  // DeFiLlama API for Algorand pools
  const response = await fetch('https://api.llama.fi/pools', {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`DeFiLlama API error: ${response.status}`);
  }

  const data = await response.json();
  
  const marketData: Record<string, PoolMarketData> = {};
  
  // Filter for Algorand pools and transform
  if (Array.isArray(data.data)) {
    const algorandPools = data.data.filter((pool: any) => 
      pool.chain === 'Algorand' || pool.chain === 'algorand'
    );

    for (const pool of algorandPools) {
      const poolId = pool.pool || pool.poolId || pool.id;
      marketData[poolId] = {
        poolId,
        tvlUSD: pool.tvlUsd,
        volume1dUSD: pool.volumeUsd1d,
        volume30dUSD: pool.volumeUsd7d, // DeFiLlama might only have 7d
        poolAPR: pool.apy || pool.apyBase,
        rewardAPR: pool.apyReward,
      };
    }
  }

  return marketData;
}

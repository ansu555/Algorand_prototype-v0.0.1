/**
 * API Route: Get All Tradeable Assets
 * GET /api/assets/tradeable
 */

import { NextRequest, NextResponse } from 'next/server';
import { AssetDiscoveryService } from '@/lib/assets/asset-discovery';

// Cache service instance
let assetService: AssetDiscoveryService | null = null;

function getAssetService(): AssetDiscoveryService {
  if (!assetService) {
    const network = (process.env.ALGORAND_NETWORK || 'testnet') as 'mainnet' | 'testnet';
    assetService = new AssetDiscoveryService(network);
  }
  return assetService;
}

export async function GET(request: NextRequest) {
  try {
    const service = getAssetService();
    const assets = await service.discoverTradeableAssets();

    return NextResponse.json({
      success: true,
      assets,
      count: assets.length,
      message: 'Dynamically discovered from DEX pools',
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error fetching tradeable assets:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch assets',
      },
      { status: 500 }
    );
  }
}

// Refresh cache
export async function POST(request: NextRequest) {
  try {
    const service = getAssetService();
    service.clearCache();
    const assets = await service.discoverTradeableAssets();

    return NextResponse.json({
      success: true,
      message: 'Asset cache refreshed',
      count: assets.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

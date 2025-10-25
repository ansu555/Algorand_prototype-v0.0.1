/**
 * API Route: Search Assets by Name
 * GET /api/assets/search?q=ALGO&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { AssetDiscoveryService } from '@/lib/assets/asset-discovery';

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
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const service = getAssetService();
    const assets = await service.searchAssetsByName(query, limit);

    return NextResponse.json({
      success: true,
      query,
      assets,
      count: assets.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error(`Error searching assets:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to search assets',
      },
      { status: 500 }
    );
  }
}

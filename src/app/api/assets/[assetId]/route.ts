/**
 * API Route: Get Specific Asset Info
 * GET /api/assets/[assetId]
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

export async function GET(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const assetId = parseInt(params.assetId);

    if (isNaN(assetId) || assetId < 0) {
      return NextResponse.json(
        { error: 'Invalid asset ID' },
        { status: 400 }
      );
    }

    const service = getAssetService();
    const asset = await service.getAssetInfo(assetId);

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      asset,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error(`Error fetching asset:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch asset',
      },
      { status: 500 }
    );
  }
}

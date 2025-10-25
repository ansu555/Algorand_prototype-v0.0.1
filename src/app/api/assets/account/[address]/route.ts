/**
 * API Route: Get Assets for Account
 * GET /api/assets/account/[address]
 */

import { NextRequest, NextResponse } from 'next/server';
import algosdk from 'algosdk';
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
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;

    if (!algosdk.isValidAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid Algorand address' },
        { status: 400 }
      );
    }

    const service = getAssetService();
    const assets = await service.getAccountAssets(address);

    return NextResponse.json({
      success: true,
      address,
      assets,
      count: assets.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error(`Error fetching account assets:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch account assets',
      },
      { status: 500 }
    );
  }
}

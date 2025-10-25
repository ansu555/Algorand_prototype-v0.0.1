/**
 * API Route: Get Bulk Prices
 * POST /api/price/bulk
 * Body: { assetIds: [0, 10458941, 31566704] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { MultiSourcePriceFeed } from '@/lib/oracle/multi-source-price-feed';

let priceFeed: MultiSourcePriceFeed | null = null;

function getPriceFeed(): MultiSourcePriceFeed {
  if (!priceFeed) {
    const network = (process.env.ALGORAND_NETWORK || 'testnet') as 'mainnet' | 'testnet';
    priceFeed = new MultiSourcePriceFeed(network);
  }
  return priceFeed;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetIds } = body;

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: 'assetIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate all asset IDs
    const validAssetIds = assetIds.filter(id => Number.isInteger(id) && id >= 0);
    
    if (validAssetIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid asset IDs provided' },
        { status: 400 }
      );
    }

    const feed = getPriceFeed();
    const prices = await feed.getBulkPrices(validAssetIds);

    // Convert Map to object
    const pricesObj: Record<number, number> = {};
    prices.forEach((price, assetId) => {
      pricesObj[assetId] = price;
    });

    return NextResponse.json({
      success: true,
      prices: pricesObj,
      count: prices.size,
      timestamp: Date.now() / 1000,
    });
  } catch (error: any) {
    console.error('Bulk price API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch prices',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for cache stats
export async function GET(request: NextRequest) {
  try {
    const feed = getPriceFeed();
    const stats = feed.getCacheStats();

    return NextResponse.json({
      success: true,
      cache: stats,
      timestamp: Date.now() / 1000,
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

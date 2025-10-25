/**
 * API Route: Get Asset Price from Multiple Sources
 * GET /api/price/[assetId]
 * GET /api/price/[assetId]?detailed=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { MultiSourcePriceFeed } from '@/lib/oracle/multi-source-price-feed';

// Cache price feed instance
let priceFeed: MultiSourcePriceFeed | null = null;

function getPriceFeed(): MultiSourcePriceFeed {
  if (!priceFeed) {
    const network = (process.env.ALGORAND_NETWORK || 'testnet') as 'mainnet' | 'testnet';
    priceFeed = new MultiSourcePriceFeed(network);
  }
  return priceFeed;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const assetId = parseInt(params.assetId);
    const searchParams = request.nextUrl.searchParams;
    const detailed = searchParams.get('detailed') === 'true';

    if (isNaN(assetId)) {
      return NextResponse.json(
        { error: 'Invalid asset ID' },
        { status: 400 }
      );
    }

    const feed = getPriceFeed();

    if (detailed) {
      // Return detailed information with all sources
      const priceDetails = await feed.getPriceDetails(assetId);

      if (!priceDetails) {
        return NextResponse.json(
          { error: `No price data found for asset ${assetId}` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        asset: {
          id: priceDetails.assetId,
          symbol: priceDetails.symbol,
        },
        price: {
          average: priceDetails.averagePrice,
          weighted: priceDetails.weightedPrice,
          deviation: priceDetails.priceDeviation,
        },
        sources: priceDetails.prices.map(source => ({
          name: source.source,
          price: source.price,
          confidence: source.confidence,
          timestamp: source.timestamp,
        })),
        lastUpdate: priceDetails.lastUpdate,
        timestamp: Date.now() / 1000,
      });
    } else {
      // Return simple price
      const price = await feed.getAssetPrice(assetId);

      if (price === 0) {
        return NextResponse.json(
          { error: `No price data found for asset ${assetId}` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        assetId,
        price,
        timestamp: Date.now() / 1000,
      });
    }
  } catch (error: any) {
    console.error('Price API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch price',
      },
      { status: 500 }
    );
  }
}

// Refresh price endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const assetId = parseInt(params.assetId);

    if (isNaN(assetId)) {
      return NextResponse.json(
        { error: 'Invalid asset ID' },
        { status: 400 }
      );
    }

    const feed = getPriceFeed();
    const price = await feed.refreshPrice(assetId);

    return NextResponse.json({
      success: true,
      assetId,
      price,
      message: 'Price refreshed',
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

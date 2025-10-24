import { NextRequest, NextResponse } from 'next/server';
import { buildAlgorandAgent } from '@/lib/algorand';
import { dexPriceService } from '@/lib/dex-price-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assetId = params.id;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    const agent = await buildAlgorandAgent();
    
    // Get asset details for symbol
    const assetResponse = await agent.indexerClient
      .lookupAssetByID(parseInt(assetId))
      .do();

    if (!assetResponse.asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    const symbol = assetResponse.asset.params.unitName || 'UNKNOWN';
    
    // Get price history from DEX
    const priceHistory = await dexPriceService.getAssetPriceHistory(assetId, days);
    // Get transaction history for additional context
    const transactions = await agent.getAssetTransactions(assetId, 100);
    
    // Transform price history to match expected format
    const history = priceHistory.map(point => ({
      timestamp: point.timestamp,
      price: point.price.toString(),
      volume: point.volume.toString()
    }));

    // Calculate price change percentage
    let priceChangePct = 0;
    if (history.length > 1) {
      const firstPrice = parseFloat(history[0].price);
      const lastPrice = parseFloat(history[history.length - 1].price);
      if (firstPrice > 0) {
        priceChangePct = ((lastPrice - firstPrice) / firstPrice) * 100;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        history,
        priceChangePct,
        totalPoints: history.length,
        timeRange: {
          start: history[0]?.timestamp || 0,
          end: history[history.length - 1]?.timestamp || 0
        },
        asset: {
          id: assetId,
          symbol,
          name: assetResponse.asset.params.name || 'Unnamed Asset'
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching asset history:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

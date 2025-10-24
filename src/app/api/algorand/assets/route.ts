import { NextRequest, NextResponse } from 'next/server';
import { buildAlgorandAgent } from '@/lib/algorand';
import { dexPriceService } from '@/lib/dex-price-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const next = searchParams.get('next') || '';

    const agent = await buildAlgorandAgent();
    const asaData = await agent.getAllASAs(limit, next);

    // Enhance with price data from DEX
    const assetsWithPrices = await Promise.all(
      asaData.assets.map(async (asset) => {
        try {
          const priceData = await dexPriceService.getAssetPrice(asset.id, asset.symbol);
          const volume24h = await agent.getAssetVolume24h(asset.id);
          const holders = await agent.getAssetHolders(asset.id);

          return {
            ...asset,
            price: priceData.priceUSD.toString(),
            change: priceData.change24h.toString(),
            change1h: priceData.change1h.toString(),
            change7d: priceData.change7d.toString(),
            marketCap: priceData.marketCap.toString(),
            '24hVolume': volume24h.toString(),
            holders,
            liquidity: priceData.liquidity.toString(),
            source: priceData.source
          };
        } catch (error) {
          console.error(`Error fetching price for asset ${asset.id}:`, error);
          return {
            ...asset,
            price: '0',
            change: '0',
            change1h: '0',
            change7d: '0',
            marketCap: '0',
            '24hVolume': '0',
            holders: 0,
            liquidity: '0',
            source: 'unknown'
          };
        }
      })
    );

    // Sort by market cap (descending)
    assetsWithPrices.sort((a, b) => {
      const marketCapA = parseFloat(a.marketCap);
      const marketCapB = parseFloat(b.marketCap);
      return marketCapB - marketCapA;
    });

    // Add rank based on market cap
    const rankedAssets = assetsWithPrices.map((asset, index) => ({
      ...asset,
      rank: index + 1
    }));

    return NextResponse.json({
      success: true,
      data: {
        assets: rankedAssets,
        nextToken: asaData.nextToken,
        currentRound: asaData.currentRound,
        total: rankedAssets.length
      }
    });

  } catch (error: any) {
    console.error('Error fetching ASAs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { buildAlgorandAgent } from '@/lib/algorand';
import { dexPriceService } from '@/lib/dex-price-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assetId = params.id;

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    const agent = await buildAlgorandAgent();
    
    // Get asset details from Indexer
    const response = await agent.indexerClient
      .lookupAssetByID(parseInt(assetId))
      .do();

    if (!response.asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    const asset = response.asset;
    
    // Get price data from DEX
    const priceData = await dexPriceService.getAssetPrice(assetId, asset.params.unit_name || 'UNKNOWN');
    const volume24h = await agent.getAssetVolume24h(assetId);
    const holders = await agent.getAssetHolders(assetId);
    const transactions = await agent.getAssetTransactions(assetId, 10);

    const assetDetails = {
      id: asset.index.toString(),
      name: asset.params.name || 'Unnamed Asset',
      symbol: asset.params.unit_name || 'UNKNOWN',
      decimals: asset.params.decimals,
      totalSupply: asset.params.total,
      creator: asset.params.creator,
      manager: asset.params.manager,
      reserve: asset.params.reserve,
      freeze: asset.params.freeze,
      clawback: asset.params.clawback,
      defaultFrozen: asset.params.default_frozen,
      url: asset.params.url,
      createdAt: asset.created_at,
      destroyed: asset.deleted,
      // Price and market data
      price: priceData.priceUSD.toString(),
      change: priceData.change24h.toString(),
      change1h: priceData.change1h.toString(),
      change7d: priceData.change7d.toString(),
      marketCap: priceData.marketCap.toString(),
      '24hVolume': volume24h.toString(),
      holders,
      liquidity: priceData.liquidity.toString(),
      source: priceData.source,
      // Supply information
      supply: {
        circulating: asset.params.total?.toString() || '0',
        total: asset.params.total?.toString() || '0',
        max: asset.params.total?.toString() || '0'
      },
      // Recent transactions
      recentTransactions: transactions.slice(0, 5)
    };

    return NextResponse.json({
      success: true,
      data: assetDetails
    });

  } catch (error: any) {
    console.error('Error fetching asset details:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

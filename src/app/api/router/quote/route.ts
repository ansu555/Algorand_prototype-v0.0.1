/**
 * API Route: Get Best Swap Quote
 * GET /api/router/quote?assetIn=0&assetOut=31566704&amount=1000000
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAlgodClient } from '@/lib/algorand';
import { TinymanV2Client } from '@/lib/dex/tinyman-client';
import { SwapRouter } from '@/lib/routing/swap-router';
import { formatAssetAmount } from '@/lib/dex/utils';

// Cache the router instance
let routerInstance: SwapRouter | null = null;
let lastInitTime = 0;
const ROUTER_CACHE_TTL = 60000; // 1 minute

async function getRouter(): Promise<SwapRouter> {
  const now = Date.now();
  
  if (routerInstance && now - lastInitTime < ROUTER_CACHE_TTL) {
    return routerInstance;
  }

  console.log('Initializing new router instance...');
  const algodClient = getAlgodClient();
  
  // Initialize DEX clients
  const tinymanClient = new TinymanV2Client(algodClient, 'testnet');
  
  // Create router with all DEX clients
  const router = new SwapRouter([tinymanClient]);
  await router.initialize();
  
  routerInstance = router;
  lastInitTime = now;
  
  return router;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const assetInParam = searchParams.get('assetIn');
    const assetOutParam = searchParams.get('assetOut');
    const amountParam = searchParams.get('amount');
    const slippageParam = searchParams.get('slippage');
    const maxHopsParam = searchParams.get('maxHops');

    // Validate required parameters
    if (!assetInParam || !assetOutParam || !amountParam) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          required: ['assetIn', 'assetOut', 'amount'],
        },
        { status: 400 }
      );
    }

    const assetIn = parseInt(assetInParam);
    const assetOut = parseInt(assetOutParam);
    const amount = BigInt(amountParam);
    const slippageTolerance = slippageParam ? parseInt(slippageParam) : 50; // 0.5% default
    const maxHops = maxHopsParam ? parseInt(maxHopsParam) : 3;

    // Get router and find best route
    const router = await getRouter();
    const quote = await router.findBestRoute({
      assetIn,
      assetOut,
      amountIn: amount,
      slippageTolerance,
      maxHops,
    });

    // Format response
    const response = {
      success: true,
      quote: {
        amountIn: quote.amountIn.toString(),
        amountOut: quote.amountOut.toString(),
        amountInFormatted: formatAssetAmount(
          quote.amountIn,
          quote.route.path[0].decimals
        ),
        amountOutFormatted: formatAssetAmount(
          quote.amountOut,
          quote.route.path[quote.route.path.length - 1].decimals
        ),
        priceImpact: quote.priceImpact,
        fee: quote.fee.toString(),
        feeBps: quote.feeBps,
        minimumAmountOut: quote.minimumAmountOut.toString(),
        executionPrice: quote.executionPrice,
        inversePrice: quote.inversePrice,
        route: {
          path: quote.route.path.map((asset) => ({
            id: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            decimals: asset.decimals,
          })),
          dexes: quote.route.dexes,
          hops: quote.route.hops,
          pools: quote.route.pools.map((pool) => ({
            poolId: pool.poolId,
            dexName: pool.dexName,
            poolAddress: pool.poolAddress,
            appId: pool.appId,
          })),
        },
      },
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Quote API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get quote',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Optional: Refresh router cache
export async function POST(request: NextRequest) {
  try {
    const router = await getRouter();
    await router.refresh();
    
    return NextResponse.json({
      success: true,
      message: 'Router cache refreshed',
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

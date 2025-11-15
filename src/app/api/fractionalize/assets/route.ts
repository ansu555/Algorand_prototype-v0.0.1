import { NextRequest, NextResponse } from 'next/server'
import {
  getAllFractionalizedAssets,
  getFractionalizedAsset,
  getTopPerformingAssets,
  trackPageView,
} from '@/lib/fractionalize/db'
import type { AssetCategory } from '@/lib/fractionalize/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('id')
    const category = searchParams.get('category') as AssetCategory | null
    const status = searchParams.get('status')
    const creator = searchParams.get('creator')
    const action = searchParams.get('action')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    
    // Get single asset
    if (assetId) {
      const asset = getFractionalizedAsset(assetId)
      
      if (!asset) {
        return NextResponse.json(
          { success: false, error: 'Asset not found' },
          { status: 404 }
        )
      }
      
      // Track page view
      const visitor = searchParams.get('visitor')
      trackPageView(assetId, visitor === 'unique')
      
      return NextResponse.json({
        success: true,
        data: asset,
      })
    }
    
    // Get top performing assets
    if (action === 'top') {
      const topAssets = getTopPerformingAssets(limit || 10)
      return NextResponse.json({
        success: true,
        data: topAssets,
      })
    }
    
    // Get all assets with filters
    const assets = getAllFractionalizedAssets({
      category: category || undefined,
      status: status || undefined,
      creator: creator || undefined,
      limit,
      offset,
    })
    
    return NextResponse.json({
      success: true,
      data: assets,
      count: assets.length,
    })
  } catch (error: any) {
    console.error('Get assets error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

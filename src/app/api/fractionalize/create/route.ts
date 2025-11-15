import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { fractionalizeAsset } from '@/lib/fractionalize/core'
import type { FractionalizationConfig, ARC3Metadata, AssetCategory } from '@/lib/fractionalize/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      category,
      name,
      description,
      image_url,
      total_fractions,
      fraction_price,
      properties,
      creator_mnemonic, // In production, use wallet signing instead
    } = body
    
    // Validate required fields
    if (!category || !name || !description || !image_url || !total_fractions || !fraction_price) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Validate fractions
    if (total_fractions < 100 || total_fractions > 1_000_000) {
      return NextResponse.json(
        { success: false, error: 'Total fractions must be between 100 and 1,000,000' },
        { status: 400 }
      )
    }
    
    // Validate price
    if (fraction_price < 1_000_000) {
      return NextResponse.json(
        { success: false, error: 'Minimum fraction price is 1 ALGO' },
        { status: 400 }
      )
    }
    
    // Create creator account from mnemonic (for demo only)
    // In production, transactions should be signed client-side
    if (!creator_mnemonic) {
      return NextResponse.json(
        { success: false, error: 'Creator account required (use wallet signing in production)' },
        { status: 400 }
      )
    }
    
    const creatorAccount = algosdk.mnemonicToSecretKey(creator_mnemonic)
    
    // Build ARC-3 metadata
    const arc3Metadata: ARC3Metadata = {
      name,
      description,
      image: image_url,
      properties: {
        ...properties,
        created_at: new Date().toISOString(),
        category,
      },
    }
    
    // Build fractionalization config
    const config: FractionalizationConfig & {
      arc3Metadata: ARC3Metadata
      creatorAccount: algosdk.Account
    } = {
      nft_asset_id: 0, // Will be created
      total_fractions,
      fraction_price,
      creator: creatorAccount.addr,
      category: category as AssetCategory,
      metadata: {
        name,
        description,
        image_url,
      },
      arc3Metadata,
      creatorAccount,
    }
    
    // Execute fractionalization
    console.log('Starting fractionalization process...')
    const result = await fractionalizeAsset(config)
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        asset: result.fractional_asset,
        escrow_address: result.escrow_address,
        transaction_ids: result.transaction_ids,
      },
      message: 'Asset fractionalized successfully',
    })
  } catch (error: any) {
    console.error('Fractionalize error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fractionalize asset' },
      { status: 500 }
    )
  }
}

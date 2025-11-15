import { NextRequest, NextResponse } from 'next/server'
import { getUserFractionOwnership } from '@/lib/fractionalize/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('address')
    
    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: 'User address required' },
        { status: 400 }
      )
    }
    
    const portfolio = getUserFractionOwnership(userAddress)
    
    // Calculate total value
    const totalValue = portfolio.reduce((sum, item: any) => {
      return sum + (item.current_value || 0)
    }, 0)
    
    return NextResponse.json({
      success: true,
      data: {
        portfolio,
        stats: {
          total_assets: portfolio.length,
          total_value: totalValue,
          total_value_algo: totalValue / 1_000_000,
        },
      },
    })
  } catch (error: any) {
    console.error('Portfolio error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUserRewards, updateDailyStreak, trackUserAction } from '@/lib/rewards/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }
    
    const rewards = getOrCreateUserRewards(userId)
    
    // Update daily streak and track login
    const newStreak = updateDailyStreak(userId)
    trackUserAction(userId, 'login')
    
    const response = NextResponse.json({
      success: true,
      data: {
        ...rewards,
        streakDays: newStreak,
      },
      timestamp: Date.now()
    })
    
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    
    return response
  } catch (error: any) {
    console.error('Get rewards error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

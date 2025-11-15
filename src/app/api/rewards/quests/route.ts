import { NextRequest, NextResponse } from 'next/server'
import { getUserQuestProgress, getTimeUntilNextClaim } from '@/lib/rewards/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const questId = searchParams.get('questId')
    const action = searchParams.get('action')
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }
    
    // Handle time-until-next-claim action
    if (action === 'time-until-claim' && questId) {
      const timeRemaining = getTimeUntilNextClaim(userId, questId)
      return NextResponse.json({
        success: true,
        data: { timeRemaining },
        timestamp: Date.now()
      })
    }
    
    const quests = getUserQuestProgress(userId)
    
    const response = NextResponse.json({
      success: true,
      data: quests,
      timestamp: Date.now()
    })
    
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    
    return response
  } catch (error: any) {
    console.error('Get quests error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

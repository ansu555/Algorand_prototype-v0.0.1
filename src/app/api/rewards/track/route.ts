import { NextRequest, NextResponse } from 'next/server'
import { trackUserAction, getUserQuestProgress, getUserRewards } from '@/lib/rewards/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, actionType, metadata } = body
    
    if (!userId || !actionType) {
      return NextResponse.json({ success: false, error: 'userId and actionType are required' }, { status: 400 })
    }
    
    await trackUserAction(userId, actionType, metadata)

    // After tracking, return updated quest progress and rewards for immediate UI update
    const quests = await getUserQuestProgress(userId)
    const rewards = await getUserRewards(userId)

    return NextResponse.json({
      success: true,
      message: 'Action tracked successfully',
      data: {
        quests,
        rewards
      }
    })
  } catch (error: any) {
    console.error('Track action error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { claimQuestReward } from '@/lib/rewards/db'
import { PREDEFINED_QUESTS } from '@/lib/rewards/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, questId } = body
    
    if (!userId || !questId) {
      return NextResponse.json({ success: false, error: 'userId and questId are required' }, { status: 400 })
    }
    
    const quest = PREDEFINED_QUESTS.find(q => q.id === questId)
    const claimed = claimQuestReward(userId, questId)
    
    if (!claimed) {
      const errorMessage = quest?.type === 'daily' 
        ? 'Quest not completed or 24-hour cooldown active' 
        : 'Quest not completed or already claimed'
      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 })
    }
    
    // Add cache busting headers
    const response = NextResponse.json({
      success: true,
      message: 'Reward claimed successfully',
      timestamp: Date.now()
    })
    
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    
    return response
  } catch (error: any) {
    console.error('Claim reward error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

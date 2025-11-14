import { NextRequest, NextResponse } from 'next/server'
import { claimQuestReward } from '@/lib/rewards/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, questId } = body
    
    if (!userId || !questId) {
      return NextResponse.json({ success: false, error: 'userId and questId are required' }, { status: 400 })
    }
    
    const claimed = claimQuestReward(userId, questId)
    
    if (!claimed) {
      return NextResponse.json({ success: false, error: 'Quest not completed or already claimed' }, { status: 400 })
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

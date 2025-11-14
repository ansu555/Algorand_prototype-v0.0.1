import { NextRequest, NextResponse } from 'next/server'
import { trackUserAction } from '@/lib/rewards/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, actionType, metadata } = body
    
    if (!userId || !actionType) {
      return NextResponse.json({ success: false, error: 'userId and actionType are required' }, { status: 400 })
    }
    
    trackUserAction(userId, actionType, metadata)
    
    return NextResponse.json({
      success: true,
      message: 'Action tracked successfully'
    })
  } catch (error: any) {
    console.error('Track action error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

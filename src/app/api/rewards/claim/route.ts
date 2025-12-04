import { NextRequest, NextResponse } from 'next/server'
import { claimQuestReward, getUserQuestProgress, getUserRewards } from '@/lib/rewards/db'
import { PREDEFINED_QUESTS } from '@/lib/rewards/types'
import { 
  transferFromTreasury, 
  isOptedIn, 
  getXTokenAsaId,
  getStreakMultiplier 
} from '@/lib/xtoken'

// Feature flag for on-chain token distribution
const ENABLE_ONCHAIN_DISTRIBUTION = process.env.ENABLE_X_TOKEN_DISTRIBUTION === 'true'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, questId } = body
    
    if (!userId || !questId) {
      return NextResponse.json({ success: false, error: 'userId and questId are required' }, { status: 400 })
    }
    
    const quest = PREDEFINED_QUESTS.find(q => q.id === questId)
    const claimed = await claimQuestReward(userId, questId)
    
    if (!claimed) {
      const errorMessage = quest?.type === 'daily' 
        ? 'Quest not completed or 24-hour cooldown active' 
        : 'Quest not completed or already claimed'
      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 })
    }
    
    // Get updated user data
    const quests = await getUserQuestProgress(userId)
    const rewardsData = await getUserRewards(userId)
    
    // On-chain X Token distribution (if enabled and token is deployed)
    let onChainTxId: string | undefined
    let onChainError: string | undefined
    
    if (ENABLE_ONCHAIN_DISTRIBUTION && quest && getXTokenAsaId()) {
      try {
        // Check if user has opted into X Token
        const userOptedIn = await isOptedIn(userId)
        
        if (userOptedIn) {
          // Calculate reward with streak multiplier
          const streakMultiplier = getStreakMultiplier(rewardsData?.streakDays || 0)
          const rewardAmount = quest.reward * streakMultiplier
          
          // Transfer X tokens from treasury
          const transferResult = await transferFromTreasury(
            userId,
            rewardAmount,
            `Quest reward: ${quest.title}`
          )
          
          if (transferResult.success && transferResult.txId) {
            onChainTxId = transferResult.txId
            console.log(`✅ Distributed ${rewardAmount} X tokens to ${userId} (tx: ${onChainTxId})`)
          } else {
            onChainError = transferResult.error
            console.warn(`⚠️ On-chain distribution failed: ${transferResult.error}`)
          }
        } else {
          onChainError = 'User has not opted into X Token'
          console.log(`ℹ️ User ${userId} not opted into X Token, skipping on-chain distribution`)
        }
      } catch (err) {
        onChainError = err instanceof Error ? err.message : 'Unknown error'
        console.error('On-chain distribution error:', err)
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Reward claimed successfully',
      timestamp: Date.now(),
      data: {
        quests,
        rewards: rewardsData,
        // Include on-chain info if available
        onChain: onChainTxId ? {
          txId: onChainTxId,
          explorer: `https://testnet.algoexplorer.io/tx/${onChainTxId}`,
        } : undefined,
        onChainPending: !ENABLE_ONCHAIN_DISTRIBUTION || !getXTokenAsaId() 
          ? 'On-chain distribution pending token deployment'
          : onChainError 
            ? `Distribution pending: ${onChainError}`
            : undefined,
      }
    })
    
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    
    return response
  } catch (error: any) {
    console.error('Claim reward error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

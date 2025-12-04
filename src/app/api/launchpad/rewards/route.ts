import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/launchpad/db'

// Helper to get rewards database client
async function getRewardsClient() {
  const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DB_URL
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_DB_AUTH_TOKEN
  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set')
  }
  const mod: any = await import('@libsql/client')
  return mod.createClient({ url, authToken })
}

// Conversion rate: 1 launchpad point = 1 X token (100% conversion)
const POINTS_TO_X_TOKEN_RATE = 1

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userAddress, projectId } = body
    
    if (!userAddress || !projectId) {
      return NextResponse.json({ 
        success: false, 
        error: 'userAddress and projectId are required' 
      }, { status: 400 })
    }
    
    const launchpadClient = await getClient()
    
    // Get user's claimable points for this project
    const { rows } = await launchpadClient.execute({
      sql: `SELECT * FROM launchpad_points WHERE user_address = ? AND project_id = ?`,
      args: [userAddress, projectId]
    })
    
    const pointsRecord: any = rows[0]
    
    if (!pointsRecord) {
      return NextResponse.json({ 
        success: false, 
        error: 'No points found for this user/project' 
      }, { status: 404 })
    }
    
    const claimablePoints = Number(pointsRecord.points_balance) - Number(pointsRecord.total_claimed || 0)
    
    if (claimablePoints <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No points available to claim' 
      }, { status: 400 })
    }
    
    // Calculate X tokens to receive
    const xTokenAmount = claimablePoints * POINTS_TO_X_TOKEN_RATE
    
    // Add X tokens to user's rewards balance (database only, no blockchain transaction)
    const rewardsClient = await getRewardsClient()
    
    // Ensure user exists in rewards system
    await rewardsClient.execute({
      sql: `INSERT OR IGNORE INTO user_rewards (user_id, x_token_balance, total_earned, created_at, updated_at)
            VALUES (?, 0, 0, datetime('now'), datetime('now'))`,
      args: [userAddress]
    })
    
    // Update X token balance
    await rewardsClient.execute({
      sql: `UPDATE user_rewards 
            SET x_token_balance = x_token_balance + ?,
                total_earned = total_earned + ?,
                updated_at = datetime('now')
            WHERE user_id = ?`,
      args: [xTokenAmount, xTokenAmount, userAddress]
    })
    
    // Record transaction
    await rewardsClient.execute({
      sql: `INSERT INTO reward_transactions (id, user_id, type, amount, source, metadata, timestamp)
            VALUES (?, ?, 'earn', ?, 'launchpad', ?, datetime('now'))`,
      args: [
        `launchpad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userAddress,
        xTokenAmount,
        JSON.stringify({ projectId, pointsClaimed: claimablePoints })
      ]
    })
    
    // Update launchpad points (mark as claimed)
    await launchpadClient.execute({
      sql: `UPDATE launchpad_points 
            SET total_claimed = COALESCE(total_claimed, 0) + ?,
                last_claim_round = ?,
                updated_at = datetime('now')
            WHERE user_address = ? AND project_id = ?`,
      args: [claimablePoints.toString(), Date.now().toString(), userAddress, projectId]
    })
    
    // Insert claim record in launchpad database
    await launchpadClient.execute({
      sql: `INSERT INTO launchpad_claims (
              id, user_address, project_id, points_claimed, x_tokens_received, 
              transaction_id, claimed_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userAddress,
        projectId,
        claimablePoints.toString(),
        xTokenAmount.toString(),
        null // No on-chain transaction
      ]
    })

    const response = NextResponse.json({
      success: true,
      message: 'Rewards claimed successfully!',
      data: {
        pointsClaimed: claimablePoints,
        xTokensReceived: xTokenAmount,
        message: `${xTokenAmount} X tokens added to your rewards balance`
      }
    })
    
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    
    return response
  } catch (error: any) {
    console.error('Claim launchpad reward error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('userAddress')
    const projectId = searchParams.get('projectId')
    
    if (!userAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'userAddress is required' 
      }, { status: 400 })
    }
    
    const launchpadClient = await getClient()
    
    // Get all user's launchpad points
    let sql = `SELECT lp.*, p.token_name, p.token_symbol, p.logo_url
               FROM launchpad_points lp
               LEFT JOIN launch_projects p ON lp.project_id = p.id
               WHERE lp.user_address = ?`
    const args: any[] = [userAddress]
    
    if (projectId) {
      sql += ' AND lp.project_id = ?'
      args.push(projectId)
    }
    
    const { rows } = await launchpadClient.execute({ sql, args })
    
    // Calculate totals and claimable
    let totalPoints = 0
    let totalClaimable = 0
    let totalClaimed = 0
    
    const pointsByProject = rows.map((row: any) => {
      const balance = Number(row.points_balance || 0)
      const claimed = Number(row.total_claimed || 0)
      const claimable = balance - claimed
      
      totalPoints += balance
      totalClaimable += claimable
      totalClaimed += claimed
      
      return {
        projectId: row.project_id,
        tokenName: row.token_name,
        tokenSymbol: row.token_symbol,
        logoUrl: row.logo_url,
        totalPoints: balance,
        claimablePoints: claimable,
        claimedPoints: claimed,
        xTokensClaimable: claimable * POINTS_TO_X_TOKEN_RATE,
        updatedAt: row.updated_at
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        totalPoints,
        totalClaimable,
        totalClaimed,
        totalXTokensClaimable: totalClaimable * POINTS_TO_X_TOKEN_RATE,
        conversionRate: POINTS_TO_X_TOKEN_RATE,
        projects: pointsByProject
      }
    })
  } catch (error: any) {
    console.error('Get launchpad rewards error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

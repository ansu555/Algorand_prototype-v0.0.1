import { randomBytes } from 'crypto'
import type { UserRewards, RewardTransaction, Quest, QuestStatus } from './types'
import { calculateLevel, getStreakMultiplier, PREDEFINED_QUESTS } from './types'

// Lazy-load libsql client for Turso
let clientPromise: Promise<any> | null = null
async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DB_URL
      const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_DB_AUTH_TOKEN
      if (!url) {
        throw new Error('TURSO_DATABASE_URL is not set. Please configure Turso database in Vercel environment variables.')
      }
      const mod: any = await import('@libsql/client')
      return mod.createClient({ url, authToken })
    })()
  }
  return clientPromise
}

// Initialize database tables
let initPromise: Promise<void> | null = null
async function ensureInit() {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const client = await getClient()
    
    // Create user_rewards table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_rewards (
        user_id TEXT PRIMARY KEY,
        x_token_balance REAL NOT NULL DEFAULT 0,
        total_earned REAL NOT NULL DEFAULT 0,
        total_spent REAL NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        experience_points INTEGER NOT NULL DEFAULT 0,
        streak_days INTEGER NOT NULL DEFAULT 1,
        last_login_date TEXT NOT NULL,
        badges TEXT NOT NULL DEFAULT '[]',
        completed_quests TEXT NOT NULL DEFAULT '[]',
        referral_code TEXT UNIQUE NOT NULL,
        referred_by TEXT,
        referred_users TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    
    // Create reward_transactions table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS reward_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        quest_id TEXT,
        description TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_rewards(user_id)
      )
    `)
    
    // Create daily_streaks table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS daily_streaks (
        user_id TEXT PRIMARY KEY,
        current_streak INTEGER NOT NULL DEFAULT 1,
        longest_streak INTEGER NOT NULL DEFAULT 1,
        last_check_in TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_rewards(user_id)
      )
    `)
    
    // Create quest_progress table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS quest_progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        quest_id TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        target INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        started_at TEXT NOT NULL,
        completed_at TEXT,
        expires_at TEXT,
        FOREIGN KEY (user_id) REFERENCES user_rewards(user_id)
      )
    `)
  })()
  return initPromise
}

// Generate unique referral code
function generateReferralCode(userId: string): string {
  return userId.slice(0, 8).toUpperCase() + randomBytes(2).toString('hex').toUpperCase()
}

// User Rewards Functions
export async function getUserRewards(userId: string): Promise<UserRewards | null> {
  await ensureInit()
  const client = await getClient()
  const { rows } = await client.execute({
    sql: 'SELECT * FROM user_rewards WHERE user_id = ?',
    args: [userId]
  })
  
  const row: any = rows[0]
  if (!row) return null
  
  return {
    userId: row.user_id,
    xTokenBalance: row.x_token_balance,
    totalEarned: row.total_earned,
    totalSpent: row.total_spent,
    level: row.level,
    experiencePoints: row.experience_points,
    streakDays: row.streak_days,
    lastLoginDate: new Date(row.last_login_date),
    badges: JSON.parse(row.badges || '[]'),
    completedQuests: JSON.parse(row.completed_quests || '[]'),
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    referredUsers: JSON.parse(row.referred_users || '[]'),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function createUserRewards(userId: string, referredBy?: string): Promise<UserRewards> {
  await ensureInit()
  const client = await getClient()
  const referralCode = generateReferralCode(userId)
  const now = new Date().toISOString()
  
  await client.execute({
    sql: `INSERT INTO user_rewards (user_id, referral_code, referred_by, streak_days, last_login_date, created_at, updated_at)
          VALUES (?, ?, ?, 1, ?, ?, ?)`,
    args: [userId, referralCode, referredBy || null, now, now, now]
  })
  
  // Initialize daily streak
  await client.execute({
    sql: `INSERT INTO daily_streaks (user_id, current_streak, longest_streak, last_check_in)
          VALUES (?, 1, 1, ?)`,
    args: [userId, now]
  })
  
  // Give welcome bonus for connecting wallet
  await trackUserAction(userId, 'connect_wallet')
  
  const rewards = await getUserRewards(userId)
  return rewards!
}

export async function getOrCreateUserRewards(userId: string, referredBy?: string): Promise<UserRewards> {
  let rewards = await getUserRewards(userId)
  if (!rewards) {
    rewards = await createUserRewards(userId, referredBy)
  }
  return rewards
}

export async function updateXTokenBalance(userId: string, amount: number, type: 'earn' | 'spend', source: string, questId?: string): Promise<void> {
  await ensureInit()
  const client = await getClient()
  
  // Update balance
  const balanceChange = type === 'earn' ? amount : -amount
  const field = type === 'earn' ? 'total_earned' : 'total_spent'
  
  await client.execute({
    sql: `UPDATE user_rewards 
          SET x_token_balance = x_token_balance + ?,
              ${field} = ${field} + ?,
              experience_points = experience_points + ?,
              updated_at = ?
          WHERE user_id = ?`,
    args: [balanceChange, Math.abs(amount), type === 'earn' ? amount : 0, new Date().toISOString(), userId]
  })
  
  // Record transaction
  const txId = `tx_${Date.now()}_${randomBytes(4).toString('hex')}`
  await client.execute({
    sql: `INSERT INTO reward_transactions (id, user_id, type, amount, source, quest_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [txId, userId, type, amount, source, questId || null, new Date().toISOString()]
  })
  
    
  // Update level based on XP
  const rewards = await getUserRewards(userId)
  if (rewards) {
    const newLevel = calculateLevel(rewards.experiencePoints)
    if (newLevel !== rewards.level) {
      await client.execute({
        sql: 'UPDATE user_rewards SET level = ? WHERE user_id = ?',
        args: [newLevel, userId]
      })
    }
  }
}

// Quest Functions
export async function resetDailyQuests(userId: string): Promise<void> {
  await ensureInit()
  const client = await getClient()
  
  // Reset daily quests that were claimed more than 24 hours ago
  const result = await client.execute({
    sql: `UPDATE quest_progress 
          SET status = 'active', progress = 0, completed_at = NULL
          WHERE user_id = ? 
          AND quest_id IN ('daily_login')
          AND status = 'claimed'
          AND completed_at IS NOT NULL
          AND (julianday('now') - julianday(completed_at)) * 24 >= 24`,
    args: [userId]
  })
  
  if (result.rowsAffected > 0) {
    console.log(`[RESET] Reset ${result.rowsAffected} daily quests for user ${userId}`)
  }
}

export async function getUserQuestProgress(userId: string): Promise<Array<Quest & { progress: number; status: QuestStatus }>> {
  await ensureInit()
  const client = await getClient()
  
  // First, reset any daily quests that are ready
  await resetDailyQuests(userId)
  
  // Ensure all quest progress rows exist
  for (const quest of PREDEFINED_QUESTS) {
    const { rows: existing } = await client.execute({
      sql: 'SELECT quest_id FROM quest_progress WHERE user_id = ? AND quest_id = ?',
      args: [userId, quest.id]
    })
    
    if (existing.length === 0) {
      await client.execute({
        sql: 'INSERT INTO quest_progress (id, user_id, quest_id, progress, target, status, started_at) VALUES (?, ?, ?, 0, ?, "active", ?)',
        args: [`qp_${Date.now()}_${randomBytes(4).toString('hex')}`, userId, quest.id, quest.requirement.count, new Date().toISOString()]
      })
    }
  }
  
  const { rows: progressRows } = await client.execute({
    sql: 'SELECT quest_id, progress, status FROM quest_progress WHERE user_id = ?',
    args: [userId]
  })
  
  const progressMap = new Map<string, { progress: number; status: QuestStatus }>(
    progressRows.map((r: any) => [r.quest_id, { progress: r.progress, status: r.status as QuestStatus }])
  )
  
  return PREDEFINED_QUESTS.map(quest => {
    const userProgress = progressMap.get(quest.id) || { progress: 0, status: 'active' as QuestStatus }
    return {
      ...quest,
      progress: userProgress.progress,
      status: userProgress.status,
    }
  })
}

export async function trackUserAction(userId: string, actionType: string, metadata?: Record<string, any>): Promise<void> {
  await ensureInit()
  const client = await getClient()
  
  // Update daily streak BEFORE processing if it's a login action
  let shouldUpdateStreak = false
  if (actionType === 'login') {
    const today = new Date().toISOString().split('T')[0]
    const { rows: lastLoginRows } = await client.execute({
      sql: 'SELECT created_at FROM reward_transactions WHERE user_id = ? AND source = "login" ORDER BY created_at DESC LIMIT 1',
      args: [userId]
    })
    
    if (lastLoginRows.length > 0) {
      const lastLoginDate = new Date((lastLoginRows[0] as any).created_at).toISOString().split('T')[0]
      if (lastLoginDate === today) {
        // Already logged in today, skip everything
        return
      }
    }
    
    shouldUpdateStreak = true
  }
  
  // Update quest progress
  const relevantQuests = PREDEFINED_QUESTS.filter(q => q.requirement.action === actionType)
  
  for (const quest of relevantQuests) {
    // Get or create progress
    const { rows: progressRows } = await client.execute({
      sql: 'SELECT * FROM quest_progress WHERE user_id = ? AND quest_id = ?',
      args: [userId, quest.id]
    })
    
    let progressRow: any = progressRows[0]
    
    if (!progressRow) {
      await client.execute({
        sql: 'INSERT INTO quest_progress (id, user_id, quest_id, progress, target, status, started_at) VALUES (?, ?, ?, 1, ?, "active", ?)',
        args: [`qp_${Date.now()}_${randomBytes(4).toString('hex')}`, userId, quest.id, quest.requirement.count, new Date().toISOString()]
      })
      progressRow = { progress: 1, status: 'active' }
    } else {
      // For daily quests that have been completed, check if 24 hours have passed
      if (quest.type === 'daily' && progressRow.status === 'completed' && progressRow.completed_at) {
        const lastCompleteTime = new Date(progressRow.completed_at).getTime()
        const now = Date.now()
        const hoursSinceLastComplete = (now - lastCompleteTime) / (1000 * 60 * 60)
        
        // If 24 hours have passed, reset the quest
        if (hoursSinceLastComplete >= 24) {
          await client.execute({
            sql: 'UPDATE quest_progress SET progress = 1, status = "active", completed_at = NULL WHERE user_id = ? AND quest_id = ?',
            args: [userId, quest.id]
          })
          progressRow = { progress: 1, status: 'active' }
        }
      } else if (progressRow.status === 'active') {
        await client.execute({
          sql: 'UPDATE quest_progress SET progress = progress + 1 WHERE user_id = ? AND quest_id = ?',
          args: [userId, quest.id]
        })
        progressRow.progress += 1
      }
    }
    
    // Check if quest is completed
    if (progressRow.status === 'active' && progressRow.progress >= quest.requirement.count) {
      await client.execute({
        sql: 'UPDATE quest_progress SET status = "completed", completed_at = ? WHERE user_id = ? AND quest_id = ?',
        args: [new Date().toISOString(), userId, quest.id]
      })
    }
  }
  
  // Update streak after processing
  if (shouldUpdateStreak) {
    await updateDailyStreak(userId)
  }
}

export async function claimQuestReward(userId: string, questId: string): Promise<boolean> {
  await ensureInit()
  const client = await getClient()
  
  const quest = PREDEFINED_QUESTS.find(q => q.id === questId)
  if (!quest) return false
  
  // Check and update in atomic operation
  const { rows: progressRows } = await client.execute({
    sql: 'SELECT * FROM quest_progress WHERE user_id = ? AND quest_id = ? AND status = "completed"',
    args: [userId, questId]
  })
  
  if (progressRows.length === 0) return false
  
  // Immediately mark as claimed to prevent duplicate claims
  const updateResult = await client.execute({
    sql: 'UPDATE quest_progress SET status = "claimed", completed_at = ? WHERE user_id = ? AND quest_id = ? AND status = "completed"',
    args: [new Date().toISOString(), userId, questId]
  })
  
  // If no rows were updated, quest was already claimed
  if (updateResult.rowsAffected === 0) return false
  
  // Get streak multiplier
  const { rows: streakRows } = await client.execute({
    sql: 'SELECT current_streak FROM daily_streaks WHERE user_id = ?',
    args: [userId]
  })
  const currentStreak = streakRows[0] ? (streakRows[0] as any).current_streak : 0
  const multiplier = getStreakMultiplier(currentStreak)
  
  // Award tokens with multiplier
  const rewardAmount = quest.reward * multiplier
  await updateXTokenBalance(userId, rewardAmount, 'earn', 'quest', questId)
  
  // Update completed quests list
  const rewards = await getUserRewards(userId)
  if (rewards) {
    const completedQuests = [...rewards.completedQuests, questId]
    await client.execute({
      sql: 'UPDATE user_rewards SET completed_quests = ?, updated_at = ? WHERE user_id = ?',
      args: [JSON.stringify(completedQuests), new Date().toISOString(), userId]
    })
  }
  
  return true
}

// Get time until next claim is available (in milliseconds)
export async function getTimeUntilNextClaim(userId: string, questId: string): Promise<number | null> {
  await ensureInit()
  const client = await getClient()
  
  const quest = PREDEFINED_QUESTS.find(q => q.id === questId)
  if (!quest || quest.type !== 'daily') return null
  
  const { rows: lastClaimRows } = await client.execute({
    sql: 'SELECT completed_at FROM quest_progress WHERE user_id = ? AND quest_id = ? AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1',
    args: [userId, questId]
  })
  
  if (lastClaimRows.length === 0) return 0 // Never claimed, available now
  
  const lastClaimTime = new Date((lastClaimRows[0] as any).completed_at).getTime()
  const now = Date.now()
  const timeElapsed = now - lastClaimTime
  const cooldownTime = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  
  const timeRemaining = cooldownTime - timeElapsed
  
  return timeRemaining > 0 ? timeRemaining : 0
}

// Streak Functions
export async function updateDailyStreak(userId: string): Promise<number> {
  await ensureInit()
  const client = await getClient()
  
  const { rows: streakRows } = await client.execute({
    sql: 'SELECT * FROM daily_streaks WHERE user_id = ?',
    args: [userId]
  })
  
  const streak: any = streakRows[0]
  
  if (!streak) {
    await client.execute({
      sql: 'INSERT INTO daily_streaks (user_id, current_streak, longest_streak, last_check_in) VALUES (?, 1, 1, ?)',
      args: [userId, new Date().toISOString()]
    })
    return 1
  }
  
  const lastCheckIn = new Date(streak.last_check_in)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24))
  
  let newStreak = streak.current_streak
  
  if (daysDiff === 0) {
    // Already checked in today
    return newStreak
  } else if (daysDiff === 1) {
    // Consecutive day
    newStreak += 1
  } else {
    // Streak broken
    newStreak = 1
  }
  
  const longestStreak = Math.max(newStreak, streak.longest_streak)
  
  await client.execute({
    sql: 'UPDATE daily_streaks SET current_streak = ?, longest_streak = ?, last_check_in = ? WHERE user_id = ?',
    args: [newStreak, longestStreak, now.toISOString(), userId]
  })
  
  await client.execute({
    sql: 'UPDATE user_rewards SET streak_days = ?, updated_at = ? WHERE user_id = ?',
    args: [newStreak, new Date().toISOString(), userId]
  })
  
  return newStreak
}

// Referral Functions
export async function addReferral(referrerId: string, newUserId: string): Promise<void> {
  await ensureInit()
  const client = await getClient()
  
  // Get current referred users list
  const rewards = await getUserRewards(referrerId)
  if (rewards) {
    const referredUsers = [...rewards.referredUsers, newUserId]
    await client.execute({
      sql: 'UPDATE user_rewards SET referred_users = ?, updated_at = ? WHERE user_id = ?',
      args: [JSON.stringify(referredUsers), new Date().toISOString(), referrerId]
    })
  }
  
  // Give referral bonus
  await updateXTokenBalance(referrerId, 50, 'earn', 'referral')
}

// Leaderboard Functions
export async function getLeaderboard(category: 'xp' | 'tokens' | 'streak' = 'xp', limit: number = 10): Promise<any[]> {
  await ensureInit()
  const client = await getClient()
  
  let orderBy = 'experience_points'
  if (category === 'tokens') orderBy = 'x_token_balance'
  if (category === 'streak') orderBy = 'streak_days'
  
  const { rows } = await client.execute({
    sql: `SELECT user_id, ${orderBy} as value FROM user_rewards ORDER BY ${orderBy} DESC LIMIT ?`,
    args: [limit]
  })
  
  return rows.map((row: any, index: number) => ({
    user_id: row.user_id,
    value: row.value,
    rank: index + 1
  }))
}

export async function getRewardTransactions(userId: string, limit: number = 50): Promise<RewardTransaction[]> {
  await ensureInit()
  const client = await getClient()
  
  const { rows } = await client.execute({
    sql: 'SELECT * FROM reward_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    args: [userId, limit]
  })
  
  return rows.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: row.amount,
    source: row.source,
    questId: row.quest_id,
    metadata: row.description ? JSON.parse(row.description) : undefined,
    timestamp: new Date(row.created_at),
  }))
}

export async function closeDatabase() {
  if (clientPromise) {
    const client = await clientPromise
    client.close()
    clientPromise = null
    initPromise = null
  }
}

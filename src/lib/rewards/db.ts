import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { randomBytes } from 'crypto'
import type { UserRewards, RewardTransaction, Quest, QuestStatus } from './types'
import { calculateLevel, getStreakMultiplier, PREDEFINED_QUESTS } from './types'

const dbPath = path.join(process.cwd(), 'data', 'rewards.sqlite')

// Ensure data directory exists
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

let db: Database.Database | null = null

function getDB(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    initializeDatabase()
  }
  return db
}

function initializeDatabase() {
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'rewards', 'schema.sql')
  
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    db!.exec(schema)
  }
}

// Generate unique referral code
function generateReferralCode(userId: string): string {
  return userId.slice(0, 8).toUpperCase() + randomBytes(2).toString('hex').toUpperCase()
}

// User Rewards Functions
export function getUserRewards(userId: string): UserRewards | null {
  const database = getDB()
  const row = database.prepare('SELECT * FROM user_rewards WHERE user_id = ?').get(userId) as any
  
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

export function createUserRewards(userId: string, referredBy?: string): UserRewards {
  const database = getDB()
  const referralCode = generateReferralCode(userId)
  
  database.prepare(`
    INSERT INTO user_rewards (user_id, referral_code, referred_by)
    VALUES (?, ?, ?)
  `).run(userId, referralCode, referredBy || null)
  
  // Initialize daily streak
  database.prepare(`
    INSERT INTO daily_streaks (user_id, current_streak, last_check_in)
    VALUES (?, 0, ?)
  `).run(userId, new Date().toISOString())
  
  // Give welcome bonus for connecting wallet
  trackUserAction(userId, 'connect_wallet')
  
  return getUserRewards(userId)!
}

export function getOrCreateUserRewards(userId: string, referredBy?: string): UserRewards {
  let rewards = getUserRewards(userId)
  if (!rewards) {
    rewards = createUserRewards(userId, referredBy)
  }
  return rewards
}

export function updateXTokenBalance(userId: string, amount: number, type: 'earn' | 'spend', source: string, questId?: string): void {
  const database = getDB()
  
  database.transaction(() => {
    // Update balance
    const balanceChange = type === 'earn' ? amount : -amount
    const field = type === 'earn' ? 'total_earned' : 'total_spent'
    
    database.prepare(`
      UPDATE user_rewards 
      SET x_token_balance = x_token_balance + ?,
          ${field} = ${field} + ?,
          experience_points = experience_points + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(balanceChange, Math.abs(amount), type === 'earn' ? amount : 0, userId)
    
    // Record transaction
    const txId = `tx_${Date.now()}_${randomBytes(4).toString('hex')}`
    database.prepare(`
      INSERT INTO reward_transactions (id, user_id, type, amount, source, quest_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(txId, userId, type, amount, source, questId || null)
    
    // Update level based on XP
    const rewards = getUserRewards(userId)
    if (rewards) {
      const newLevel = calculateLevel(rewards.experiencePoints)
      if (newLevel !== rewards.level) {
        database.prepare('UPDATE user_rewards SET level = ? WHERE user_id = ?').run(newLevel, userId)
      }
    }
  })()
}

// Quest Functions
export function resetDailyQuests(userId: string): void {
  const database = getDB()
  
  // Reset daily quests that were claimed more than 24 hours ago
  const result = database.prepare(`
    UPDATE quest_progress 
    SET status = 'active', progress = 0, completed_at = NULL, claimed_at = NULL
    WHERE user_id = ? 
    AND quest_id IN (SELECT id FROM (SELECT ? as id) WHERE id IN ('daily_login'))
    AND status = 'claimed'
    AND claimed_at IS NOT NULL
    AND (julianday('now') - julianday(claimed_at)) * 24 >= 24
  `).run(userId, 'daily_login')
  
  if (result.changes > 0) {
    console.log(`[RESET] Reset ${result.changes} daily quests for user ${userId}`)
  }
}

export function getUserQuestProgress(userId: string): Array<Quest & { progress: number; status: QuestStatus }> {
  const database = getDB()
  
  // First, reset any daily quests that are ready
  resetDailyQuests(userId)
  
  database.transaction(() => {
    // Ensure all quest progress rows exist
    for (const quest of PREDEFINED_QUESTS) {
      const existing = database.prepare(`
        SELECT quest_id FROM quest_progress WHERE user_id = ? AND quest_id = ?
      `).get(userId, quest.id)
      
      if (!existing) {
        database.prepare(`
          INSERT INTO quest_progress (user_id, quest_id, progress, status)
          VALUES (?, ?, 0, 'active')
        `).run(userId, quest.id)
      }
    }
  })()
  
  const progressRows = database.prepare(`
    SELECT quest_id, progress, status FROM quest_progress WHERE user_id = ?
  `).all(userId) as any[]
  
  const progressMap = new Map(progressRows.map(r => [r.quest_id, { progress: r.progress, status: r.status }]))
  
  return PREDEFINED_QUESTS.map(quest => {
    const userProgress = progressMap.get(quest.id) || { progress: 0, status: 'active' }
    return {
      ...quest,
      progress: userProgress.progress,
      status: userProgress.status as QuestStatus,
    }
  })
}

export function trackUserAction(userId: string, actionType: string, metadata?: Record<string, any>): void {
  const database = getDB()
  
  // Update daily streak BEFORE the transaction if it's a login action
  let shouldUpdateStreak = false
  if (actionType === 'login') {
    const today = new Date().toISOString().split('T')[0]
    const lastLogin = database.prepare(`
      SELECT timestamp FROM user_actions 
      WHERE user_id = ? AND action_type = 'login' 
      ORDER BY timestamp DESC LIMIT 1
    `).get(userId) as any
    
    if (lastLogin) {
      const lastLoginDate = new Date(lastLogin.timestamp).toISOString().split('T')[0]
      if (lastLoginDate === today) {
        // Already logged in today, skip everything
        return
      }
    }
    
    shouldUpdateStreak = true
  }
  
  database.transaction(() => {
    // Log the action
    database.prepare(`
      INSERT INTO user_actions (user_id, action_type, metadata)
      VALUES (?, ?, ?)
    `).run(userId, actionType, metadata ? JSON.stringify(metadata) : null)
    
    // Update quest progress
    const relevantQuests = PREDEFINED_QUESTS.filter(q => q.requirement.action === actionType)
    
    for (const quest of relevantQuests) {
      // Get or create progress
      let progressRow = database.prepare(`
        SELECT * FROM quest_progress WHERE user_id = ? AND quest_id = ?
      `).get(userId, quest.id) as any
      
      if (!progressRow) {
        database.prepare(`
          INSERT INTO quest_progress (user_id, quest_id, progress, status)
          VALUES (?, ?, 1, 'active')
        `).run(userId, quest.id)
        progressRow = { progress: 1, status: 'active' }
      } else {
        // For daily quests that have been claimed, check if 24 hours have passed
        if (quest.type === 'daily' && progressRow.status === 'claimed' && progressRow.claimed_at) {
          const lastClaimTime = new Date(progressRow.claimed_at).getTime()
          const now = Date.now()
          const hoursSinceLastClaim = (now - lastClaimTime) / (1000 * 60 * 60)
          
          // If 24 hours have passed, reset the quest
          if (hoursSinceLastClaim >= 24) {
            database.prepare(`
              UPDATE quest_progress 
              SET progress = 1, status = 'active', completed_at = NULL, claimed_at = NULL
              WHERE user_id = ? AND quest_id = ?
            `).run(userId, quest.id)
            progressRow = { progress: 1, status: 'active' }
          }
        } else if (progressRow.status === 'active') {
          database.prepare(`
            UPDATE quest_progress SET progress = progress + 1 WHERE user_id = ? AND quest_id = ?
          `).run(userId, quest.id)
          progressRow.progress += 1
        }
      }
      
      // Check if quest is completed
      if (progressRow.status === 'active' && progressRow.progress >= quest.requirement.count) {
        database.prepare(`
          UPDATE quest_progress 
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
          WHERE user_id = ? AND quest_id = ?
        `).run(userId, quest.id)
      }
    }
  })()
  
  // Update streak after transaction completes
  if (shouldUpdateStreak) {
    updateDailyStreak(userId)
  }
}

export function claimQuestReward(userId: string, questId: string): boolean {
  const database = getDB()
  
  const quest = PREDEFINED_QUESTS.find(q => q.id === questId)
  if (!quest) return false
  
  // Use transaction to prevent race conditions
  const result = database.transaction(() => {
    // Check and update in a single atomic operation
    const progressRow = database.prepare(`
      SELECT * FROM quest_progress WHERE user_id = ? AND quest_id = ? AND status = 'completed'
    `).get(userId, questId) as any
    
    if (!progressRow) return false
    
    // Immediately mark as claimed to prevent duplicate claims
    const updateResult = database.prepare(`
      UPDATE quest_progress SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND quest_id = ? AND status = 'completed'
    `).run(userId, questId)
    
    // If no rows were updated, quest was already claimed
    if (updateResult.changes === 0) return false
    
    // Get streak multiplier
    const streak = database.prepare('SELECT multiplier FROM daily_streaks WHERE user_id = ?').get(userId) as any
    const multiplier = streak?.multiplier || 1
    
    // Award tokens with multiplier
    const rewardAmount = quest.reward * multiplier
    updateXTokenBalance(userId, rewardAmount, 'earn', 'quest', questId)
    
    // Update completed quests
    database.prepare(`
      UPDATE user_rewards 
      SET completed_quests = json_insert(
        COALESCE(completed_quests, '[]'),
        '$[#]',
        ?
      )
      WHERE user_id = ?
    `).run(questId, userId)
    
    return true
  })()
  
  return result
}

// Get time until next claim is available (in milliseconds)
export function getTimeUntilNextClaim(userId: string, questId: string): number | null {
  const database = getDB()
  
  const quest = PREDEFINED_QUESTS.find(q => q.id === questId)
  if (!quest || quest.type !== 'daily') return null
  
  const lastClaim = database.prepare(`
    SELECT claimed_at FROM quest_progress 
    WHERE user_id = ? AND quest_id = ? AND claimed_at IS NOT NULL
    ORDER BY claimed_at DESC LIMIT 1
  `).get(userId, questId) as any
  
  if (!lastClaim) return 0 // Never claimed, available now
  
  const lastClaimTime = new Date(lastClaim.claimed_at).getTime()
  const now = Date.now()
  const timeElapsed = now - lastClaimTime
  const cooldownTime = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  
  const timeRemaining = cooldownTime - timeElapsed
  
  return timeRemaining > 0 ? timeRemaining : 0
}

// Streak Functions
export function updateDailyStreak(userId: string): number {
  const database = getDB()
  
  const streak = database.prepare('SELECT * FROM daily_streaks WHERE user_id = ?').get(userId) as any
  
  if (!streak) {
    database.prepare(`
      INSERT INTO daily_streaks (user_id, current_streak, last_check_in)
      VALUES (?, 1, ?)
    `).run(userId, new Date().toISOString())
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
  const multiplier = getStreakMultiplier(newStreak)
  
  database.prepare(`
    UPDATE daily_streaks 
    SET current_streak = ?, longest_streak = ?, last_check_in = ?, multiplier = ?
    WHERE user_id = ?
  `).run(newStreak, longestStreak, now.toISOString(), multiplier, userId)
  
  database.prepare(`
    UPDATE user_rewards SET streak_days = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?
  `).run(newStreak, userId)
  
  return newStreak
}

// Referral Functions
export function addReferral(referrerId: string, newUserId: string): void {
  const database = getDB()
  
  database.transaction(() => {
    // Add to referrer's list
    database.prepare(`
      UPDATE user_rewards 
      SET referred_users = json_insert(
        COALESCE(referred_users, '[]'),
        '$[#]',
        ?
      )
      WHERE user_id = ?
    `).run(newUserId, referrerId)
    
    // Give referral bonus
    updateXTokenBalance(referrerId, 50, 'earn', 'referral')
  })()
}

// Leaderboard Functions
export function getLeaderboard(category: string, period: string, limit: number = 10): any[] {
  const database = getDB()
  
  return database.prepare(`
    SELECT user_id, value, rank
    FROM leaderboard_cache
    WHERE category = ? AND period = ?
    ORDER BY rank ASC
    LIMIT ?
  `).all(category, period, limit)
}

export function getRewardTransactions(userId: string, limit: number = 50): RewardTransaction[] {
  const database = getDB()
  
  const rows = database.prepare(`
    SELECT * FROM reward_transactions
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(userId, limit) as any[]
  
  return rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: row.amount,
    source: row.source,
    questId: row.quest_id,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    timestamp: new Date(row.timestamp),
  }))
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}

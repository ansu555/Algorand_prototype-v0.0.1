// X Token Rewards System Types

export type QuestType = 'daily' | 'weekly' | 'milestone' | 'achievement' | 'social'
export type QuestStatus = 'active' | 'completed' | 'claimed' | 'expired'
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Quest {
  id: string
  title: string
  description: string
  type: QuestType
  category: 'trading' | 'liquidity' | 'agent' | 'social' | 'onboarding'
  requirement: {
    action: string // 'swap', 'add_liquidity', 'create_rule', etc.
    count: number
    metadata?: Record<string, any> // Additional conditions
  }
  reward: number // X tokens
  icon: string
  progress?: number
  status?: QuestStatus
  expiresAt?: Date
  createdAt: Date
}

export interface UserRewards {
  userId: string // wallet address
  xTokenBalance: number
  totalEarned: number
  totalSpent: number
  level: number
  experiencePoints: number
  streakDays: number
  lastLoginDate: Date
  badges: string[]
  completedQuests: string[]
  referralCode: string
  referredBy?: string
  referredUsers: string[]
  createdAt: Date
  updatedAt: Date
}

export interface RewardTransaction {
  id: string
  userId: string
  type: 'earn' | 'spend' | 'claim'
  amount: number
  source: string // 'quest', 'streak', 'referral', 'mystery_box', etc.
  questId?: string
  metadata?: Record<string, any>
  timestamp: Date
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  rarity: BadgeRarity
  requirement: {
    type: string
    value: number
  }
  reward: number // Bonus X tokens
  multiplier?: number // Permanent boost percentage
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  username?: string
  value: number // Volume, swaps, etc.
  xTokensEarned: number
  badge?: string
}

export interface Streak {
  userId: string
  currentStreak: number
  longestStreak: number
  lastCheckIn: Date
  multiplier: number
}

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000, // Levels 1-10
  15000, 20000, 26000, 33000, 41000, 50000, 60000, 71000, 83000, 96000, // Levels 11-20
  110000, 125000, 141000, 158000, 176000, 195000, 215000, 236000, 258000, 281000, // Levels 21-30
]

export function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1
    }
  }
  return 1
}

export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 3
  if (streakDays >= 14) return 2
  if (streakDays >= 7) return 1.5
  return 1
}

export const PREDEFINED_QUESTS: Quest[] = [
  // Onboarding Quests
  {
    id: 'first_wallet_connect',
    title: 'Connect Your Wallet',
    description: 'Connect your Algorand wallet to get started',
    type: 'milestone',
    category: 'onboarding',
    requirement: { action: 'connect_wallet', count: 1 },
    reward: 10,
    icon: '🔗',
    createdAt: new Date(),
  },
  {
    id: 'first_swap',
    title: 'First Swap',
    description: 'Complete your first token swap',
    type: 'milestone',
    category: 'trading',
    requirement: { action: 'swap', count: 1 },
    reward: 25,
    icon: '🔄',
    createdAt: new Date(),
  },
  {
    id: 'swap_5_times',
    title: 'Getting Started',
    description: 'Complete 5 successful swaps',
    type: 'milestone',
    category: 'trading',
    requirement: { action: 'swap', count: 5 },
    reward: 50,
    icon: '⚡',
    createdAt: new Date(),
  },
  {
    id: 'swap_25_times',
    title: 'Active Trader',
    description: 'Complete 25 successful swaps',
    type: 'milestone',
    category: 'trading',
    requirement: { action: 'swap', count: 25 },
    reward: 150,
    icon: '🔥',
    createdAt: new Date(),
  },
  {
    id: 'swap_100_times',
    title: 'Master Trader',
    description: 'Complete 100 successful swaps',
    type: 'milestone',
    category: 'trading',
    requirement: { action: 'swap', count: 100 },
    reward: 500,
    icon: '💎',
    createdAt: new Date(),
  },
  // Liquidity Quests
  {
    id: 'first_liquidity',
    title: 'Liquidity Provider',
    description: 'Add liquidity to your first pool',
    type: 'milestone',
    category: 'liquidity',
    requirement: { action: 'add_liquidity', count: 1 },
    reward: 40,
    icon: '💧',
    createdAt: new Date(),
  },
  // Agent Quests
  {
    id: 'first_rule',
    title: 'Automation Begins',
    description: 'Create your first Auto-Pilot trading rule',
    type: 'milestone',
    category: 'agent',
    requirement: { action: 'create_rule', count: 1 },
    reward: 30,
    icon: '🤖',
    createdAt: new Date(),
  },
  {
    id: 'execute_10_rules',
    title: 'Automation Expert',
    description: 'Execute 10 Auto-Pilot trades successfully',
    type: 'milestone',
    category: 'agent',
    requirement: { action: 'execute_rule', count: 10 },
    reward: 75,
    icon: '🎯',
    createdAt: new Date(),
  },
  // Daily Quests
  {
    id: 'daily_login',
    title: 'Daily Check-in',
    description: 'Login daily to claim your reward',
    type: 'daily',
    category: 'onboarding',
    requirement: { action: 'login', count: 1 },
    reward: 5,
    icon: '🌅',
    createdAt: new Date(),
  },
]

export const BADGES: Badge[] = [
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined in the first month of launch',
    icon: '🥇',
    rarity: 'legendary',
    requirement: { type: 'join_date', value: 30 },
    reward: 500,
    multiplier: 10,
  },
  {
    id: 'diamond_hands',
    name: 'Diamond Hands',
    description: 'Provided liquidity for 90+ days',
    icon: '💎',
    rarity: 'epic',
    requirement: { type: 'lp_days', value: 90 },
    reward: 1000,
    multiplier: 5,
  },
  {
    id: 'whale_watcher',
    name: 'Whale Watcher',
    description: 'Trading volume exceeds $50,000',
    icon: '🐋',
    rarity: 'epic',
    requirement: { type: 'trading_volume', value: 50000 },
    reward: 2500,
  },
  {
    id: 'master_trader',
    name: 'Master Trader',
    description: 'Completed 500+ successful swaps',
    icon: '🏆',
    rarity: 'rare',
    requirement: { type: 'swap_count', value: 500 },
    reward: 1500,
  },
  {
    id: 'automation_expert',
    name: 'Automation Expert',
    description: 'Executed 50+ Auto-Pilot trades',
    icon: '🤖',
    rarity: 'rare',
    requirement: { type: 'agent_executions', value: 50 },
    reward: 800,
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Referred 10+ friends',
    icon: '🦋',
    rarity: 'rare',
    requirement: { type: 'referral_count', value: 10 },
    reward: 1000,
    multiplier: 2,
  },
]

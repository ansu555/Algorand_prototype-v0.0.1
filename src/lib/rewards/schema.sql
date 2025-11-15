-- X Token Rewards System Database Schema

-- User Rewards Table
CREATE TABLE IF NOT EXISTS user_rewards (
  user_id TEXT PRIMARY KEY,
  x_token_balance REAL DEFAULT 0,
  total_earned REAL DEFAULT 0,
  total_spent REAL DEFAULT 0,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_login_date TEXT,
  badges TEXT, -- JSON array of badge IDs
  completed_quests TEXT, -- JSON array of quest IDs
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  referred_users TEXT, -- JSON array of user IDs
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Reward Transactions Table
CREATE TABLE IF NOT EXISTS reward_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'earn', 'spend', 'claim'
  amount REAL NOT NULL,
  source TEXT NOT NULL, -- 'quest', 'streak', 'referral', etc.
  quest_id TEXT,
  metadata TEXT, -- JSON for additional data
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_rewards(user_id)
);

-- Quest Progress Table
CREATE TABLE IF NOT EXISTS quest_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'claimed'
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  claimed_at TEXT,
  UNIQUE(user_id, quest_id),
  FOREIGN KEY (user_id) REFERENCES user_rewards(user_id)
);

-- Daily Streaks Table
CREATE TABLE IF NOT EXISTS daily_streaks (
  user_id TEXT PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_check_in TEXT,
  multiplier REAL DEFAULT 1.0,
  FOREIGN KEY (user_id) REFERENCES user_rewards(user_id)
);

-- Leaderboard Cache Table (for performance)
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
  category TEXT NOT NULL, -- 'trading_volume', 'swap_count', 'lp_provided', 'referrals'
  user_id TEXT NOT NULL,
  value REAL NOT NULL,
  rank INTEGER,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(period, category, user_id)
);

-- User Actions Log (for quest tracking)
CREATE TABLE IF NOT EXISTS user_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'swap', 'add_liquidity', 'create_rule', etc.
  metadata TEXT, -- JSON for additional context
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_rewards(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reward_transactions_user ON reward_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_timestamp ON reward_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_quest_progress_user ON quest_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_status ON quest_progress(status);
CREATE INDEX IF NOT EXISTS idx_user_actions_user ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_type ON user_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_user_actions_timestamp ON user_actions(timestamp);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_period_category ON leaderboard_cache(period, category);

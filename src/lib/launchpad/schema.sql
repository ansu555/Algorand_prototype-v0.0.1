-- WaveBreak Launchpad Database Schema

-- Launch Projects Table
CREATE TABLE IF NOT EXISTS launch_projects (
  id TEXT PRIMARY KEY,
  creator_address TEXT NOT NULL,
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_decimals INTEGER DEFAULT 6,
  total_supply BIGINT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  twitter_url TEXT, 
  telegram_url TEXT,
  
  -- ASA Information
  asa_id BIGINT,
  app_id BIGINT,
  config_tx_id TEXT,       -- Configuration transaction ID
  bootstrap_tx_id TEXT,    -- Bootstrap transaction ID
  funding_tx_id TEXT,      -- Initial funding transaction ID
  
  -- Bonding Curve Config
  curve_type TEXT DEFAULT 'sigmoid', -- 'linear', 'exponential', 'sigmoid'
  base_price BIGINT NOT NULL, -- Starting price in microALGO
  max_price BIGINT NOT NULL, -- Maximum price in microALGO
  bonding_target BIGINT NOT NULL, -- Target ALGO to raise
  tokens_for_sale BIGINT NOT NULL, -- Tokens available in bonding curve
  
  -- Sale State
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'graduated', 'cancelled'
  tokens_sold BIGINT DEFAULT 0,
  algo_raised BIGINT DEFAULT 0,
  participant_count INTEGER DEFAULT 0,
  launch_round BIGINT,
  graduation_round BIGINT,
  
  -- Liquidity Config
  liquidity_percentage INTEGER DEFAULT 80, -- % of raised ALGO for liquidity
  lp_lock_duration BIGINT DEFAULT 15552000, -- Blocks (~6 months)
  dex_platform TEXT DEFAULT 'tinyman', -- 'tinyman', 'pact', 'folks'

  -- Security Config
  max_buy_per_tx BIGINT, -- Max tokens per transaction
  max_buy_per_user BIGINT, -- Max tokens per user
  cooldown_blocks BIGINT DEFAULT 10, -- Blocks between purchases
  
  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  launched_at TEXT,
  graduated_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Token Purchases Table
CREATE TABLE IF NOT EXISTS token_purchases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  buyer_address TEXT NOT NULL,
  tokens_amount BIGINT NOT NULL,
  algo_paid BIGINT NOT NULL,
  price_per_token BIGINT NOT NULL, -- Price at time of purchase
  points_earned BIGINT NOT NULL, -- Early buyer bonus points
  transaction_id TEXT NOT NULL,
  block_round BIGINT NOT NULL,
  blockchain_confirmed INTEGER DEFAULT 0, -- 0 = pending, 1 = confirmed on-chain
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- User Points Table (for rewards)
CREATE TABLE IF NOT EXISTS launchpad_points (
  user_address TEXT NOT NULL,
  project_id TEXT NOT NULL,
  points_balance BIGINT DEFAULT 0,
  total_earned BIGINT DEFAULT 0,
  total_claimed BIGINT DEFAULT 0,
  last_claim_round BIGINT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_address, project_id),
  FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Daily Rewards Claims Table
CREATE TABLE IF NOT EXISTS launchpad_claims (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  project_id TEXT NOT NULL,
  claim_day INTEGER NOT NULL, -- Day number since graduation
  points_used BIGINT NOT NULL,
  algo_claimed BIGINT NOT NULL,
  transaction_id TEXT,
  block_round BIGINT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Liquidity Pool Info Table
CREATE TABLE IF NOT EXISTS launchpad_liquidity (
  project_id TEXT PRIMARY KEY,
  pool_address TEXT,
  pool_app_id BIGINT,
  lp_token_id BIGINT,
  lp_tokens_minted BIGINT,
  lp_tokens_locked BIGINT,
  lock_expiry_round BIGINT,
  algo_deposited BIGINT,
  tokens_deposited BIGINT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Anti-Bot Tracking Table
CREATE TABLE IF NOT EXISTS launchpad_antibot (
  user_address TEXT NOT NULL,
  project_id TEXT NOT NULL,
  purchase_count INTEGER DEFAULT 0,
  last_purchase_round BIGINT,
  total_tokens_bought BIGINT DEFAULT 0,
  flagged_as_bot INTEGER DEFAULT 0, -- 0 = clean, 1 = suspicious
  whale_penalty INTEGER DEFAULT 0, -- 0 = no penalty, 1 = penalty applied
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_address, project_id),
  FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Project Metrics Table (for analytics)
CREATE TABLE IF NOT EXISTS launchpad_metrics (
  project_id TEXT PRIMARY KEY,
  unique_buyers INTEGER DEFAULT 0,
  avg_purchase_size BIGINT DEFAULT 0,
  median_purchase_size BIGINT DEFAULT 0,
  largest_purchase BIGINT DEFAULT 0,
  smallest_purchase BIGINT DEFAULT 0,
  price_at_25_percent BIGINT,
  price_at_50_percent BIGINT,
  price_at_75_percent BIGINT,
  price_at_100_percent BIGINT,
  total_points_distributed BIGINT DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Whitelist Table (optional pre-sale access)
CREATE TABLE IF NOT EXISTS launchpad_whitelist (
  project_id TEXT NOT NULL,
  user_address TEXT NOT NULL,
  allocation_limit BIGINT, -- Max tokens they can buy
  added_by TEXT NOT NULL, -- Admin who added them
  added_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_address),
  FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_launch_projects_status ON launch_projects(status);
CREATE INDEX IF NOT EXISTS idx_launch_projects_creator ON launch_projects(creator_address);
CREATE INDEX IF NOT EXISTS idx_token_purchases_project ON token_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_buyer ON token_purchases(buyer_address);
CREATE INDEX IF NOT EXISTS idx_token_purchases_timestamp ON token_purchases(timestamp);
CREATE INDEX IF NOT EXISTS idx_launchpad_points_user ON launchpad_points(user_address);
CREATE INDEX IF NOT EXISTS idx_launchpad_claims_user_project ON launchpad_claims(user_address, project_id);
CREATE INDEX IF NOT EXISTS idx_antibot_user ON launchpad_antibot(user_address);

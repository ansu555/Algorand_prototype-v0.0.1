-- WaveBreak Launchpad Database Schema
-- This schema defines all tables for the token launchpad functionality

-- Launch Projects table - stores all launched token projects
CREATE TABLE IF NOT EXISTS launch_projects (
    id TEXT PRIMARY KEY,
    creator_address TEXT NOT NULL,
    token_name TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    token_decimals INTEGER NOT NULL DEFAULT 6,
    total_supply TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    twitter_url TEXT,
    telegram_url TEXT,
    
    -- ASA Information
    asa_id TEXT,
    app_id TEXT,
    config_tx_id TEXT,
    bootstrap_tx_id TEXT,
    funding_tx_id TEXT,
    
    -- Bonding Curve Config
    curve_type TEXT NOT NULL DEFAULT 'linear',
    base_price TEXT NOT NULL,
    max_price TEXT NOT NULL,
    bonding_target TEXT NOT NULL,
    tokens_for_sale TEXT NOT NULL,
    
    -- Sale State
    status TEXT NOT NULL DEFAULT 'pending',
    tokens_sold TEXT NOT NULL DEFAULT '0',
    algo_raised TEXT NOT NULL DEFAULT '0',
    participant_count INTEGER NOT NULL DEFAULT 0,
    launch_round TEXT,
    graduation_round TEXT,
    
    -- Liquidity Config
    liquidity_percentage INTEGER NOT NULL DEFAULT 80,
    lp_lock_duration TEXT NOT NULL DEFAULT '0',
    dex_platform TEXT NOT NULL DEFAULT 'tinyman',
    
    -- Security Config
    max_buy_per_tx TEXT,
    max_buy_per_user TEXT,
    cooldown_blocks TEXT,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    launched_at TEXT,
    graduated_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Token Purchases table - records all token purchases
CREATE TABLE IF NOT EXISTS token_purchases (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    buyer_address TEXT NOT NULL,
    tokens_amount TEXT NOT NULL,
    algo_paid TEXT NOT NULL,
    price_per_token TEXT NOT NULL,
    points_earned TEXT NOT NULL DEFAULT '0',
    transaction_id TEXT NOT NULL,
    block_round TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Launchpad Points table - tracks user points for each project
CREATE TABLE IF NOT EXISTS launchpad_points (
    user_address TEXT NOT NULL,
    project_id TEXT NOT NULL,
    points_balance TEXT NOT NULL DEFAULT '0',
    total_earned TEXT NOT NULL DEFAULT '0',
    total_claimed TEXT NOT NULL DEFAULT '0',
    last_claim_round TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_address, project_id),
    FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Launchpad Claims table - records X token reward claims
CREATE TABLE IF NOT EXISTS launchpad_claims (
    id TEXT PRIMARY KEY,
    user_address TEXT NOT NULL,
    project_id TEXT NOT NULL,
    points_claimed TEXT NOT NULL DEFAULT '0',
    x_tokens_received TEXT NOT NULL DEFAULT '0',
    transaction_id TEXT,
    claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Launchpad Liquidity table - tracks LP info after graduation
CREATE TABLE IF NOT EXISTS launchpad_liquidity (
    project_id TEXT PRIMARY KEY,
    pool_address TEXT,
    pool_app_id TEXT,
    lp_token_id TEXT,
    lp_tokens_minted TEXT,
    lp_tokens_locked TEXT,
    lock_expiry_round TEXT,
    algo_deposited TEXT,
    tokens_deposited TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Anti-Bot Records table - tracks bot detection data
CREATE TABLE IF NOT EXISTS antibot_records (
    user_address TEXT NOT NULL,
    project_id TEXT NOT NULL,
    purchase_count INTEGER NOT NULL DEFAULT 0,
    last_purchase_round TEXT,
    total_tokens_bought TEXT NOT NULL DEFAULT '0',
    flagged_as_bot INTEGER NOT NULL DEFAULT 0,
    whale_penalty INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_address, project_id),
    FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Launchpad Metrics table - aggregated project metrics
CREATE TABLE IF NOT EXISTS launchpad_metrics (
    project_id TEXT PRIMARY KEY,
    unique_buyers INTEGER NOT NULL DEFAULT 0,
    avg_purchase_size TEXT NOT NULL DEFAULT '0',
    median_purchase_size TEXT NOT NULL DEFAULT '0',
    largest_purchase TEXT NOT NULL DEFAULT '0',
    smallest_purchase TEXT NOT NULL DEFAULT '0',
    price_at_25_percent TEXT,
    price_at_50_percent TEXT,
    price_at_75_percent TEXT,
    price_at_100_percent TEXT,
    total_points_distributed TEXT NOT NULL DEFAULT '0',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Whitelist Entries table - for presale whitelisting
CREATE TABLE IF NOT EXISTS whitelist_entries (
    project_id TEXT NOT NULL,
    user_address TEXT NOT NULL,
    allocation_limit TEXT,
    added_by TEXT NOT NULL,
    added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (project_id, user_address),
    FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Price History table - for charting historical prices
CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    price TEXT NOT NULL,
    volume TEXT NOT NULL DEFAULT '0',
    tokens_sold TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES launch_projects(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_purchases_project ON token_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_buyer ON token_purchases(buyer_address);
CREATE INDEX IF NOT EXISTS idx_token_purchases_timestamp ON token_purchases(timestamp);
CREATE INDEX IF NOT EXISTS idx_launchpad_points_user ON launchpad_points(user_address);
CREATE INDEX IF NOT EXISTS idx_launchpad_claims_user ON launchpad_claims(user_address);
CREATE INDEX IF NOT EXISTS idx_launchpad_claims_project ON launchpad_claims(project_id);
CREATE INDEX IF NOT EXISTS idx_price_history_project ON price_history(project_id);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_launch_projects_status ON launch_projects(status);
CREATE INDEX IF NOT EXISTS idx_launch_projects_creator ON launch_projects(creator_address);

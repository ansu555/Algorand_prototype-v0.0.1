-- Fractionalization Database Schema
-- Stores data for NFT fractionalization system (ARC-3 -> ARC-20)

-- Table: fractionalized_assets
-- Stores information about assets that have been fractionalized
CREATE TABLE IF NOT EXISTS fractionalized_assets (
  id TEXT PRIMARY KEY, -- UUID
  original_asset_id INTEGER NOT NULL UNIQUE, -- Original ARC-3 NFT ASA ID
  fractional_token_id INTEGER, -- New ARC-20 token ASA ID (NULL until created)
  escrow_address TEXT, -- Smart contract address holding NFT (NULL until deployed)
  escrow_app_id INTEGER, -- Application ID of escrow contract
  
  -- Asset details
  category TEXT NOT NULL CHECK(category IN ('art', 'realestate', 'vc', 'carbon', 'collectible')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  metadata_url TEXT NOT NULL, -- IPFS URL to full ARC-3 metadata
  metadata_hash TEXT, -- SHA-256 hash of metadata for verification
  
  -- Fractionalization configuration
  total_fractions INTEGER NOT NULL CHECK(total_fractions >= 100),
  fraction_price INTEGER NOT NULL CHECK(fraction_price > 0), -- In microAlgos
  fractions_sold INTEGER DEFAULT 0 CHECK(fractions_sold >= 0),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'fully_sold', 'redeemed', 'cancelled')),
  
  -- Owner information
  creator_address TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at TEXT, -- When fractionalization went live
  completed_at TEXT, -- When fully sold or redeemed
  
  -- Financial tracking
  total_raised INTEGER DEFAULT 0, -- Total microAlgos raised from sales
  valuation INTEGER NOT NULL, -- Original asset valuation in microAlgos
  
  -- Transaction IDs
  nft_creation_txid TEXT, -- NFT minting transaction
  escrow_deploy_txid TEXT, -- Escrow contract deployment
  fraction_creation_txid TEXT, -- Fractional token creation
  
  -- Additional metadata (JSON)
  properties TEXT, -- JSON string for category-specific properties
  
  UNIQUE(original_asset_id)
);

-- Table: fraction_purchases
-- Records all purchases of fractional tokens
CREATE TABLE IF NOT EXISTS fraction_purchases (
  id TEXT PRIMARY KEY, -- UUID
  asset_id TEXT NOT NULL REFERENCES fractionalized_assets(id) ON DELETE CASCADE,
  buyer_address TEXT NOT NULL,
  
  -- Purchase details
  amount INTEGER NOT NULL CHECK(amount > 0), -- Number of fractions purchased
  price_per_fraction INTEGER NOT NULL,
  total_paid INTEGER NOT NULL, -- Total microAlgos paid
  
  -- Transaction info
  transaction_id TEXT NOT NULL UNIQUE,
  block_number INTEGER,
  purchased_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Additional data
  notes TEXT, -- Optional purchase notes
  
  INDEX idx_purchases_asset (asset_id),
  INDEX idx_purchases_buyer (buyer_address),
  INDEX idx_purchases_date (purchased_at DESC)
);

-- Table: fraction_ownership
-- Current ownership state of fractional tokens
CREATE TABLE IF NOT EXISTS fraction_ownership (
  asset_id TEXT NOT NULL REFERENCES fractionalized_assets(id) ON DELETE CASCADE,
  owner_address TEXT NOT NULL,
  
  -- Ownership details
  fraction_amount INTEGER NOT NULL CHECK(fraction_amount > 0),
  percentage REAL NOT NULL CHECK(percentage > 0 AND percentage <= 100),
  
  -- Tracking
  first_acquired_at TEXT NOT NULL,
  last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (asset_id, owner_address),
  INDEX idx_ownership_asset (asset_id),
  INDEX idx_ownership_owner (owner_address)
);

-- Table: escrow_transactions
-- Logs all interactions with escrow contracts
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id TEXT PRIMARY KEY, -- UUID
  asset_id TEXT NOT NULL REFERENCES fractionalized_assets(id) ON DELETE CASCADE,
  escrow_address TEXT NOT NULL,
  
  -- Transaction details
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('lock_nft', 'distribute_fraction', 'purchase', 'redeem', 'withdraw')),
  transaction_id TEXT NOT NULL UNIQUE,
  from_address TEXT NOT NULL,
  to_address TEXT,
  
  -- Amounts
  amount INTEGER, -- Amount transferred (tokens or microAlgos)
  asset_id_transferred INTEGER, -- ASA ID if asset transfer
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'failed')),
  confirmed_at TEXT,
  block_number INTEGER,
  
  -- Metadata
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  
  INDEX idx_escrow_txns_asset (asset_id),
  INDEX idx_escrow_txns_type (transaction_type),
  INDEX idx_escrow_txns_date (created_at DESC)
);

-- Table: redemption_requests
-- Tracks requests to redeem the original NFT
CREATE TABLE IF NOT EXISTS redemption_requests (
  id TEXT PRIMARY KEY, -- UUID
  asset_id TEXT NOT NULL REFERENCES fractionalized_assets(id) ON DELETE CASCADE,
  requester_address TEXT NOT NULL,
  
  -- Redemption details
  fraction_tokens_owned INTEGER NOT NULL,
  total_fractions_required INTEGER NOT NULL,
  meets_requirements INTEGER NOT NULL CHECK(meets_requirements IN (0, 1)), -- Boolean
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'completed', 'rejected')),
  
  -- Transaction IDs
  approval_txid TEXT,
  redemption_txid TEXT,
  
  -- Timestamps
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT,
  completed_at TEXT,
  
  -- Notes
  notes TEXT,
  
  INDEX idx_redemptions_asset (asset_id),
  INDEX idx_redemptions_requester (requester_address),
  INDEX idx_redemptions_status (status)
);

-- Table: ipfs_metadata
-- Cache of IPFS metadata for faster access
CREATE TABLE IF NOT EXISTS ipfs_metadata (
  ipfs_hash TEXT PRIMARY KEY, -- IPFS CID
  content TEXT NOT NULL, -- JSON metadata content
  content_type TEXT NOT NULL, -- 'arc3' or 'arc20'
  file_size INTEGER,
  
  -- Verification
  sha256_hash TEXT,
  verified INTEGER DEFAULT 0 CHECK(verified IN (0, 1)),
  
  -- Tracking
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_accessed TEXT,
  access_count INTEGER DEFAULT 0,
  
  INDEX idx_ipfs_type (content_type),
  INDEX idx_ipfs_verified (verified)
);

-- Table: fractionalize_analytics
-- Analytics and metrics for fractionalized assets
CREATE TABLE IF NOT EXISTS fractionalize_analytics (
  asset_id TEXT PRIMARY KEY REFERENCES fractionalized_assets(id) ON DELETE CASCADE,
  
  -- Traffic metrics
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  
  -- Engagement
  fraction_inquiries INTEGER DEFAULT 0,
  purchase_conversions INTEGER DEFAULT 0,
  conversion_rate REAL DEFAULT 0,
  
  -- Financial metrics
  average_purchase_size REAL DEFAULT 0,
  total_transaction_volume INTEGER DEFAULT 0,
  
  -- Time metrics
  time_to_first_sale INTEGER, -- Seconds from activation to first sale
  time_to_fully_sold INTEGER, -- Seconds from activation to fully sold
  
  -- Rankings
  popularity_score REAL DEFAULT 0,
  trending_score REAL DEFAULT 0,
  
  -- Tracking
  last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_category ON fractionalized_assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_status ON fractionalized_assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_creator ON fractionalized_assets(creator_address);
CREATE INDEX IF NOT EXISTS idx_assets_created ON fractionalized_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_fractional_token ON fractionalized_assets(fractional_token_id);

-- Create views for common queries

-- View: active_fractionalizations
CREATE VIEW IF NOT EXISTS active_fractionalizations AS
SELECT 
  fa.*,
  (fa.fractions_sold * 100.0 / fa.total_fractions) as sold_percentage,
  (fa.total_fractions - fa.fractions_sold) as fractions_available,
  COUNT(DISTINCT fp.buyer_address) as unique_buyers,
  COUNT(fp.id) as total_transactions
FROM fractionalized_assets fa
LEFT JOIN fraction_purchases fp ON fa.id = fp.asset_id
WHERE fa.status = 'active'
GROUP BY fa.id;

-- View: user_portfolio
CREATE VIEW IF NOT EXISTS user_fractionalized_portfolio AS
SELECT 
  fo.owner_address,
  fo.asset_id,
  fa.name,
  fa.category,
  fa.image_url,
  fo.fraction_amount,
  fo.percentage,
  (fo.fraction_amount * fa.fraction_price) as current_value,
  fa.status,
  fo.first_acquired_at
FROM fraction_ownership fo
JOIN fractionalized_assets fa ON fo.asset_id = fa.id
ORDER BY fo.owner_address, fo.first_acquired_at DESC;

-- View: top_performing_assets
CREATE VIEW IF NOT EXISTS top_performing_assets AS
SELECT 
  fa.*,
  fan.page_views,
  fan.purchase_conversions,
  fan.conversion_rate,
  (fa.fractions_sold * 100.0 / fa.total_fractions) as sold_percentage
FROM fractionalized_assets fa
LEFT JOIN fractionalize_analytics fan ON fa.id = fan.asset_id
WHERE fa.status IN ('active', 'fully_sold')
ORDER BY fan.popularity_score DESC, fa.fractions_sold DESC
LIMIT 50;

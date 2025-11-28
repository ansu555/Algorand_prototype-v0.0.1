-- Create agent_wallets table for storing user's agent wallets
CREATE TABLE IF NOT EXISTS agent_wallets (
    id TEXT PRIMARY KEY,
    userAddress TEXT NOT NULL UNIQUE,
    agentAddress TEXT NOT NULL,
    encryptedMnemonic TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    lastUsedAt TEXT
);

-- Create index for faster lookups by user address
CREATE INDEX IF NOT EXISTS idx_agent_wallets_userAddress ON agent_wallets(userAddress);

-- Create agent_wallet_stats table for tracking agent wallet statistics
CREATE TABLE IF NOT EXISTS agent_wallet_stats (
    id TEXT PRIMARY KEY,
    userAddress TEXT NOT NULL UNIQUE,
    totalDeposits TEXT DEFAULT '0',
    totalWithdrawals TEXT DEFAULT '0',
    totalSwaps INTEGER DEFAULT 0,
    totalTradesExecuted INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

-- Create index for stats lookups
CREATE INDEX IF NOT EXISTS idx_agent_wallet_stats_userAddress ON agent_wallet_stats(userAddress);

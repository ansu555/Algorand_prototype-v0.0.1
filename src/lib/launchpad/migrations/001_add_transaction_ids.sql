-- Migration: Add transaction ID columns to launch_projects table
-- Date: 2025-11-28
-- This migration adds columns for storing blockchain transaction IDs

ALTER TABLE launch_projects ADD COLUMN config_tx_id TEXT;
ALTER TABLE launch_projects ADD COLUMN bootstrap_tx_id TEXT;
ALTER TABLE launch_projects ADD COLUMN funding_tx_id TEXT;

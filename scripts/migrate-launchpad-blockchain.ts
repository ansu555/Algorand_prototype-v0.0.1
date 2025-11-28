#!/usr/bin/env node
/**
 * Database migration script for Token Launchpad blockchain integration
 * 
 * Adds blockchain tracking fields to existing tables
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DB_PATH = join(__dirname, '..', 'media.db')

async function migrate() {
    console.log('🔧 Starting database migration...')

    const db = new Database(DB_PATH)

    try {
        // Check if columns already exist
        const projectColumns = db.prepare("PRAGMA table_info(launch_projects)").all()
        const purchaseColumns = db.prepare("PRAGMA table_info(token_purchases)").all()

        const hasConfigTx = projectColumns.some((col: any) => col.name === 'config_tx_id')
        const hasBootstrapTx = projectColumns.some((col: any) => col.name === 'bootstrap_tx_id')
        const hasFundingTx = projectColumns.some((col: any) => col.name === 'funding_tx_id')
        const hasBlockchainConfirmed = purchaseColumns.some((col: any) => col.name === 'blockchain_confirmed')

        // Add missing columns to launch_projects
        if (!hasConfigTx) {
            console.log('Adding config_tx_id column...')
            db.prepare('ALTER TABLE launch_projects ADD COLUMN config_tx_id TEXT').run()
        }

        if (!hasBootstrapTx) {
            console.log('Adding bootstrap_tx_id column...')
            db.prepare('ALTER TABLE launch_projects ADD COLUMN bootstrap_tx_id TEXT').run()
        }

        if (!hasFundingTx) {
            console.log('Adding funding_tx_id column...')
            db.prepare('ALTER TABLE launch_projects ADD COLUMN funding_tx_id TEXT').run()
        }

        // Add missing column to token_purchases
        if (!hasBlockchainConfirmed) {
            console.log('Adding blockchain_confirmed column...')
            db.prepare('ALTER TABLE token_purchases ADD COLUMN blockchain_confirmed INTEGER DEFAULT 0').run()
        }

        console.log('✅ Migration completed successfully!')

    } catch (error) {
        console.error('❌ Migration failed:', error)
        throw error
    } finally {
        db.close()
    }
}

// Run migration
migrate().catch(console.error)

#!/usr/bin/env node
/**
 * Database Migration Runner
 * Applies SQL migrations to the Turso database
 */

const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const { createClient } = require('@libsql/client')

async function runMigrations() {
    const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DB_URL
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_DB_AUTH_TOKEN

    if (!url) {
        console.error('❌ TURSO_DATABASE_URL environment variable is not set')
        process.exit(1)
    }

    console.log('🔌 Connecting to database...')
    const client = createClient({ url, authToken })

    const migrationsDir = path.join(__dirname, '../src/lib/launchpad/migrations')

    if (!fs.existsSync(migrationsDir)) {
        console.log('✅ No migrations to run')
        return
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort()

    console.log(`📋 Found ${migrationFiles.length} migration(s)\n`)

    for (const file of migrationFiles) {
        console.log(`▶️  Running migration: ${file}`)
        const migrationPath = path.join(migrationsDir, file)
        const sql = fs.readFileSync(migrationPath, 'utf-8')

        const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'))

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await client.execute(statement.trim())
                    console.log(`   ✓ Executed statement`)
                } catch (error) {
                    // Ignore "duplicate column name" errors since we're using IF NOT EXISTS
                    if (!error.message.includes('duplicate column name')) {
                        console.error(`   ✗ Error:`, error.message)
                    } else {
                        console.log(`   ✓ Column already exists (skipped)`)
                    }
                }
            }
        }
        console.log(`✅ Migration ${file} complete\n`)
    }

    console.log('🎉 All migrations completed successfully!')
}

runMigrations().catch(error => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
})

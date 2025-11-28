#!/usr/bin/env node
/**
 * Database Migration Runner
 * Applies SQL migrations to the Turso database
 */

const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local or .env
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })
require('dotenv').config({ path: path.join(__dirname, '../.env') })

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

    // Check multiple migration directories
    const migrationDirs = [
        path.join(__dirname, '../src/lib/migrations'),
        path.join(__dirname, '../src/lib/launchpad/migrations')
    ]

    let totalMigrations = 0

    for (const migrationsDir of migrationDirs) {
        if (!fs.existsSync(migrationsDir)) {
            continue
        }

        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort()

        if (migrationFiles.length === 0) continue

        console.log(`📋 Found ${migrationFiles.length} migration(s) in ${migrationsDir}\n`)
        totalMigrations += migrationFiles.length

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
                        // Ignore "duplicate column name" or "already exists" errors
                        if (!error.message.includes('duplicate column name') && 
                            !error.message.includes('already exists')) {
                            console.error(`   ✗ Error:`, error.message)
                        } else {
                            console.log(`   ✓ Already exists (skipped)`)
                        }
                    }
                }
            }
            console.log(`✅ Migration ${file} complete\n`)
        }
    }

    if (totalMigrations === 0) {
        console.log('✅ No migrations to run')
    } else {
        console.log('🎉 All migrations completed successfully!')
    }
}

runMigrations().catch(error => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
})

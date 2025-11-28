#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const { createClient } = require('@libsql/client')

async function checkSchema() {
    const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DB_URL
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_DB_AUTH_TOKEN

    if (!url) {
        console.error('❌ TURSO_DATABASE_URL not set')
        process.exit(1)
    }

    console.log('🔌 Connecting to database...\n')
    const client = createClient({ url, authToken })

    // Get table info
    const result = await client.execute("PRAGMA table_info(launch_projects)")

    console.log('📊 Current columns in launch_projects table:\n')
    console.log('Column Name'.padEnd(30), 'Type'.padEnd(15), 'Not Null')
    console.log('-'.repeat(60))

    for (const row of result.rows) {
        console.log(
            String(row.name).padEnd(30),
            String(row.type).padEnd(15),
            row.notnull ? 'YES' : 'NO'
        )
    }


    console.log('\n' + '='.repeat(60))

    // Check for all needed columns
    const columnNames = result.rows.map(r => r.name)
    const neededColumns = [
        { name: 'config_tx_id', type: 'TEXT' },
        { name: 'bootstrap_tx_id', type: 'TEXT' },
        { name: 'funding_tx_id', type: 'TEXT' },
        { name: 'max_buy_per_tx', type: 'BIGINT' },
        { name: 'max_buy_per_user', type: 'BIGINT' },
        { name: 'cooldown_blocks', type: 'BIGINT' }
    ]

    console.log('\n🔍 Checking for required columns:\n')
    const missingColumns = []

    for (const col of neededColumns) {
        const exists = columnNames.includes(col.name)
        console.log(`  ${exists ? '✅' : '❌'} ${col.name}`)
        if (!exists) {
            missingColumns.push(col)
        }
    }

    if (missingColumns.length > 0) {
        console.log(`\n⚠️  Found ${missingColumns.length} missing column(s)! Running ALTER TABLE...\n`)

        for (const col of missingColumns) {
            try {
                await client.execute(`ALTER TABLE launch_projects ADD COLUMN ${col.name} ${col.type}`)
                console.log(`  ✅ Added column: ${col.name} (${col.type})`)
            } catch (error) {
                console.error(`  ❌ Failed to add ${col.name}:`, error.message)
            }
        }

        console.log('\n✅ Migration complete! Restart your Next.js server.')
    } else {
        console.log('\n✅ All required columns exist!')
    }
}

checkSchema().catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
})

const { createClient } = require('@libsql/client');
require('dotenv').config();

async function main() {
    const url = process.env.TURSO_DATABASE_URL || 'file:./data/launchpad.sqlite';
    console.log('Using database:', url);
    
    const client = createClient({ 
        url,
        authToken: process.env.TURSO_AUTH_TOKEN || undefined
    });
    
    // Check projects and their logo_url
    const { rows } = await client.execute('SELECT id, token_name, logo_url FROM launch_projects ORDER BY created_at DESC LIMIT 10');
    console.log('Projects with logo URLs:');
    rows.forEach(row => {
        console.log(`- ${row.token_name}: ${row.logo_url}`);
    });
}

main().catch(console.error);

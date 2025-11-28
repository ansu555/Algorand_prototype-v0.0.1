const { createClient } = require('@libsql/client');

async function main() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL || 'file:local.db',
        authToken: process.env.TURSO_AUTH_TOKEN
    });

    const { rows } = await client.execute('SELECT id, token_name, logo_url FROM launch_projects ORDER BY created_at DESC LIMIT 5');
    console.log(JSON.stringify(rows, null, 2));
}

main().catch(console.error);

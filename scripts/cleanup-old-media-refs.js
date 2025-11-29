/**
 * Clean up old media database references in launch_projects
 */
const { createClient } = require('@libsql/client');
require('dotenv').config();

async function main() {
    console.log('🧹 Cleaning up old media database references...\n');

    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
        console.error('❌ Missing Turso credentials');
        return;
    }

    const client = createClient({ url, authToken });

    // Find projects with old /api/launchpad/media/ URLs
    const { rows } = await client.execute(`
        SELECT id, token_name, logo_url 
        FROM launch_projects 
        WHERE logo_url LIKE '/api/launchpad/media/%'
    `);

    if (rows.length === 0) {
        console.log('✅ No old media references found');
        return;
    }

    console.log(`Found ${rows.length} project(s) with old media references:\n`);
    rows.forEach(row => {
        console.log(`- ${row.token_name}: ${row.logo_url}`);
    });

    console.log('\n🔄 Setting logo_url to NULL for these projects...');

    // Update all projects to set logo_url to NULL where it references old media
    await client.execute(`
        UPDATE launch_projects 
        SET logo_url = NULL 
        WHERE logo_url LIKE '/api/launchpad/media/%'
    `);

    console.log('✅ Updated successfully!');
    console.log('\nℹ️  These projects will now show without logos.');
    console.log('   Users can re-upload logos if needed.');
}

main().catch(console.error);

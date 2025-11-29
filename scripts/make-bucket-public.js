/**
 * Make Supabase Storage Bucket Public
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function main() {
    console.log('🔓 Making Supabase bucket public...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'launchpad-logos';

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in .env');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📋 Bucket:', bucket);
    console.log();

    // Update bucket to be public
    console.log('🔄 Updating bucket to public...');
    const { data, error } = await supabase.storage.updateBucket(bucket, {
        public: true
    });

    if (error) {
        console.error('❌ Error updating bucket:', error);
        console.log('\n⚠️  Manual steps required:');
        console.log('1. Go to: https://supabase.com/dashboard/project/_/storage/buckets');
        console.log(`2. Find the "${bucket}" bucket`);
        console.log('3. Click the three dots menu (⋮)');
        console.log('4. Select "Edit bucket"');
        console.log('5. Toggle "Public bucket" to ON');
        console.log('6. Click "Save"');
        return;
    }

    console.log('✅ Bucket is now public!');
    console.log('   Bucket name:', data.name);
    console.log('   Public:', data.public);
    console.log('\n✨ Done! You can now upload and access images.');
}

main().catch(console.error);

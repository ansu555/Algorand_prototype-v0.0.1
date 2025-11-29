/**
 * Test Supabase Storage Configuration
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function main() {
    console.log('🧪 Testing Supabase Storage Configuration\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'launchpad-logos';

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in .env');
        return;
    }

    console.log('📋 Configuration:');
    console.log('   URL:', supabaseUrl);
    console.log('   Bucket:', bucket);
    console.log();

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test 1: Check if bucket exists
    console.log('1️⃣ Checking if bucket exists...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
        console.error('❌ Error listing buckets:', bucketsError);
        return;
    }

    const bucketExists = buckets.find(b => b.name === bucket);
    if (bucketExists) {
        console.log(`✅ Bucket "${bucket}" exists`);
        console.log('   Public:', bucketExists.public);
        console.log('   ID:', bucketExists.id);
    } else {
        console.error(`❌ Bucket "${bucket}" not found`);
        console.log('   Available buckets:', buckets.map(b => b.name).join(', '));
        return;
    }
    console.log();

    // Test 2: List files in bucket
    console.log('2️⃣ Listing files in bucket...');
    const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list('logos', {
            limit: 10,
            sortBy: { column: 'created_at', order: 'desc' }
        });

    if (listError) {
        console.error('❌ Error listing files:', listError);
    } else {
        console.log(`✅ Found ${files.length} file(s)`);
        files.forEach(file => {
            console.log(`   - ${file.name} (${(file.metadata?.size / 1024).toFixed(2)} KB)`);
        });
    }
    console.log();

    // Test 3: Test public URL generation
    console.log('3️⃣ Testing public URL generation...');
    if (files && files.length > 0) {
        const testFile = files[0];
        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(`logos/${testFile.name}`);
        
        console.log('✅ Sample public URL:', data.publicUrl);
        
        // Test if URL is accessible
        console.log('4️⃣ Testing URL accessibility...');
        try {
            const response = await fetch(data.publicUrl);
            console.log(`   Status: ${response.status} ${response.statusText}`);
            if (response.ok) {
                console.log('✅ URL is accessible!');
            } else {
                console.log('⚠️  URL returned error - bucket might not be public');
            }
        } catch (error) {
            console.error('❌ Error fetching URL:', error.message);
        }
    } else {
        console.log('ℹ️  No files to test');
    }

    console.log('\n✨ Test complete!');
}

main().catch(console.error);

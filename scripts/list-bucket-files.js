/**
 * List all files in Supabase bucket with full paths
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function listAllFiles(supabase, bucket, prefix = '', allFiles = []) {
    const { data: items, error } = await supabase.storage
        .from(bucket)
        .list(prefix, { limit: 100 });

    if (error) {
        console.error('Error:', error);
        return allFiles;
    }

    for (const item of items) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        
        if (item.id === null) {
            // It's a folder, recurse into it
            await listAllFiles(supabase, bucket, fullPath, allFiles);
        } else {
            // It's a file
            allFiles.push({
                name: item.name,
                path: fullPath,
                size: item.metadata?.size || 0,
                created: item.created_at
            });
        }
    }

    return allFiles;
}

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'launchpad-logos';

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📂 Listing all files in bucket:', bucket);
    console.log();

    const files = await listAllFiles(supabase, bucket);

    if (files.length === 0) {
        console.log('ℹ️  No files found in bucket');
    } else {
        console.log(`Found ${files.length} file(s):\n`);
        files.forEach((file, i) => {
            console.log(`${i + 1}. ${file.path}`);
            console.log(`   Size: ${(file.size / 1024).toFixed(2)} KB`);
            console.log(`   Created: ${file.created}`);
            
            const { data } = supabase.storage.from(bucket).getPublicUrl(file.path);
            console.log(`   URL: ${data.publicUrl}`);
            console.log();
        });
    }
}

main().catch(console.error);

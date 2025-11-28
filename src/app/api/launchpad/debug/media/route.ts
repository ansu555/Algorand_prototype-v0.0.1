import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { getMedia } from '@/lib/launchpad/media-db'

export async function GET() {
    try {
        // Check main DB for logo_url
        const mainClient = createClient({
            url: process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DB_URL || 'file:local.db',
            authToken: process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_DB_AUTH_TOKEN
        })

        const { rows: projects } = await mainClient.execute('SELECT id, token_name, logo_url FROM launch_projects ORDER BY created_at DESC LIMIT 5')

        // Check media DB
        const mediaClient = createClient({ url: process.env.MEDIA_DATABASE_URL || 'file:media.db' })

        // Check if table exists
        try {
            await mediaClient.execute('SELECT 1 FROM media_files LIMIT 1')
        } catch (e) {
            return NextResponse.json({
                success: false,
                error: 'Media table does not exist',
                projects
            })
        }

        const { rows: mediaFiles } = await mediaClient.execute('SELECT id, mime_type, length(data) as size FROM media_files LIMIT 5')

        return NextResponse.json({
            success: true,
            projects,
            mediaFiles
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message })
    }
}

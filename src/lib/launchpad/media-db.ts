import { createClient } from '@libsql/client'
import { randomBytes } from 'crypto'

// Use a local file for media storage by default
const MEDIA_DB_URL = process.env.MEDIA_DATABASE_URL || 'file:media.db'

let clientPromise: Promise<any> | null = null

async function getClient() {
    if (!clientPromise) {
        clientPromise = (async () => {
            return createClient({ url: MEDIA_DB_URL })
        })()
    }
    return clientPromise
}

// Initialize media table
let initPromise: Promise<void> | null = null
async function ensureInit() {
    if (initPromise) return initPromise
    initPromise = (async () => {
        const client = await getClient()
        await client.execute(`
      CREATE TABLE IF NOT EXISTS media_files (
        id TEXT PRIMARY KEY,
        mime_type TEXT NOT NULL,
        data TEXT NOT NULL, -- Storing as base64 string for compatibility
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    })()
    return initPromise
}

export async function storeMedia(mimeType: string, base64Data: string): Promise<string> {
    await ensureInit()
    const client = await getClient()
    const id = `media_${Date.now()}_${randomBytes(4).toString('hex')}`

    await client.execute({
        sql: 'INSERT INTO media_files (id, mime_type, data) VALUES (?, ?, ?)',
        args: [id, mimeType, base64Data]
    })

    return id
}

export async function getMedia(id: string): Promise<{ mimeType: string; data: string } | null> {
    await ensureInit()
    const client = await getClient()

    const { rows } = await client.execute({
        sql: 'SELECT mime_type, data FROM media_files WHERE id = ?',
        args: [id]
    })

    if (rows.length === 0) return null

    return {
        mimeType: rows[0].mime_type as string,
        data: rows[0].data as string
    }
}

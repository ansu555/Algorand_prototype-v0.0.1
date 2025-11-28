import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'launchpad-logos'

const mimeExtensions: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg'
}

// POST /api/launchpad/upload - Upload token logo and return base64 data
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only PNG, JPEG, SVG, and WebP are allowed' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const extension = mimeExtensions[file.type] || file.name?.split('.').pop()?.toLowerCase() || 'bin'
        const objectName = `logos/${new Date().toISOString().split('T')[0]}/${randomUUID()}.${extension}`
        const encodedObjectPath = objectName
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/')
        const uploadUrl = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(SUPABASE_BUCKET)}/${encodedObjectPath}`

        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': file.type,
            'x-upsert': 'false',
          },
          body: file,
        })

        if (!uploadResponse.ok) {
          const errorBody = await uploadResponse.text().catch(() => 'Unknown error')
          throw new Error(`Supabase upload failed (${uploadResponse.status}): ${errorBody}`)
        }

        const publicUrl = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${encodeURIComponent(SUPABASE_BUCKET)}/${encodedObjectPath}`

        return NextResponse.json({
          success: true,
          logoUrl: publicUrl,
        })
      } catch (cloudError: any) {
        console.error('Supabase upload error, falling back to local storage:', cloudError)
        // Continue to local fallback
      }
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Data = buffer.toString('base64')

    // Store in separate media database
    const { storeMedia } = await import('@/lib/launchpad/media-db')
    const mediaId = await storeMedia(file.type, base64Data)

    // Return the URL to serve the image
    const logoUrl = `/api/launchpad/media/${mediaId}`

    return NextResponse.json({
      success: true,
      logoUrl,
      // We no longer return raw data to keep payload small
      // logoData: base64Data, 
      // logoMimeType: file.type
    })
  } catch (error: any) {
    console.error('Error uploading logo:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload logo' },
      { status: 500 }
    )
  }
}

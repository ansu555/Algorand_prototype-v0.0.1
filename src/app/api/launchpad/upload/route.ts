import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin, getPublicUrl } from '@/lib/supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']

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

    // Upload to Supabase Storage
    try {
      const extension = mimeExtensions[file.type] || file.name?.split('.').pop()?.toLowerCase() || 'bin'
      const fileName = `${Date.now()}-${randomUUID()}.${extension}`
      const filePath = `${new Date().toISOString().split('T')[0]}/${fileName}`

      // Convert File to ArrayBuffer for Supabase
      const arrayBuffer = await file.arrayBuffer()

      const { data, error } = await supabaseAdmin.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Supabase upload error:', error)
        throw error
      }

      // Get public URL
      const publicUrl = getPublicUrl(SUPABASE_BUCKET, filePath)

      return NextResponse.json({
        success: true,
        logoUrl: publicUrl,
      })
    } catch (cloudError: any) {
      console.error('Supabase upload failed, falling back to local storage:', cloudError)
      // Continue to local fallback
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

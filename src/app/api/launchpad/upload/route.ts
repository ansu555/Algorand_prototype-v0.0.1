import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'logos')
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }
}

// POST /api/launchpad/upload - Upload token logo
export async function POST(req: NextRequest) {
  try {
    await ensureUploadDir()

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

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'png'
    const filename = `${randomUUID()}.${ext}`
    const filepath = join(UPLOAD_DIR, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Return the public path
    const logoPath = `/uploads/logos/${filename}`

    return NextResponse.json({
      success: true,
      logoPath
    })
  } catch (error: any) {
    console.error('Error uploading logo:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload logo' },
      { status: 500 }
    )
  }
}

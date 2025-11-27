import { NextRequest, NextResponse } from 'next/server'
import { getMedia } from '@/lib/launchpad/media-db'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const media = await getMedia(params.id)

        if (!media) {
            return new NextResponse('Media not found', { status: 404 })
        }

        // Convert base64 back to buffer
        const buffer = Buffer.from(media.data, 'base64')

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': media.mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        })
    } catch (error) {
        console.error('Error serving media:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

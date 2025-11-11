import { NextRequest, NextResponse } from 'next/server'
import { getLogs } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    console.log('📖 Fetching swaps for address:', address)

    if (!address) {
      return NextResponse.json({ success: false, error: 'Missing address parameter' }, { status: 400 })
    }

    // Normalize address to lowercase for DB
    const owner = String(address).toLowerCase()
    console.log('📖 Normalized address:', owner)

    const logs = await getLogs(owner)
    console.log('📖 Total logs fetched:', logs.length)

    // Filter only swap actions
    const swaps = logs.filter((l) => l.action === 'swap')
    console.log('📖 Swaps filtered:', swaps.length)
    console.log('📖 Swap data:', JSON.stringify(swaps, null, 2))

    return NextResponse.json({ success: true, data: swaps })
  } catch (error: any) {
    console.error('❌ Error fetching swaps:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch swaps' }, { status: 500 })
  }
}

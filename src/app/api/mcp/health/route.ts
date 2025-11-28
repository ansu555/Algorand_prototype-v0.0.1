import { NextRequest, NextResponse } from 'next/server'

/**
 * Health Check API
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    service: 'MCP Analytics (Serverless)',
    version: '2.0.0',
  })
}

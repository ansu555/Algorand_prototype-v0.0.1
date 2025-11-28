// MCP Analytics Client - Server-side
// Use this from Next.js server components or API routes

import { analyzeCoin as analyzeCore } from '@/lib/mcp'
import type { AnalysisRequest, AnalysisResponse } from '@/lib/mcp/types'

export type { AnalysisRequest, AnalysisResponse }

type MCPConfig = {  
  baseUrl?: string
  apiKey?: string
}

/**
 * Health check - now checks the serverless API
 */
export async function mcpHealth(): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch('/api/mcp/health', {
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) }
  }
}

/**
 * Analyze coin - calls the serverless analytics engine directly
 */
export async function analyzeCoin(req: AnalysisRequest): Promise<AnalysisResponse> {
  try {
    const body = {
      coin: req.coin,
      horizonDays: req.horizonDays ?? 30,
      granularity: req.granularity ?? '1d',
      tasks: req.tasks ?? ['analysis', 'prediction', 'strategy', 'charts'],
      chartType: req.chartType ?? 'line',
    }

    // Call via API route (works on both dev and production)
    const res = await fetch('/api/mcp/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `Analysis failed ${res.status}: ${text}` }
    }
    
    const json = await res.json().catch((e) => {
      return { ok: false, error: `Failed to parse JSON: ${e?.message}` }
    })
    
    return json
  } catch (e: any) {
    if (e?.message?.includes('fetch failed') || e?.code === 'ECONNREFUSED') {
      return { 
        ok: false, 
        error: `Cannot connect to MCP API. Make sure your Next.js server is running.` 
      }
    }
    return { ok: false, error: e?.message || String(e) }
  }
}




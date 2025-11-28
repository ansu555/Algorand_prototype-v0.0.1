import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/launchpad/db'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')

    if (!projectId) {
        return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 })
    }

    try {
        const client = await getClient()

        // 1. Get Project Info (for base price and creation time)
        const { rows: projectRows } = await client.execute({
            sql: 'SELECT base_price, created_at, token_symbol FROM launch_projects WHERE id = ?',
            args: [projectId]
        })

        const project: any = projectRows[0]

        if (!project) {
            return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
        }

        // 2. Get Purchase History
        const { rows: purchases } = await client.execute({
            sql: 'SELECT price_per_token, tokens_amount, timestamp FROM token_purchases WHERE project_id = ? ORDER BY timestamp ASC',
            args: [projectId]
        })

        // 3. Format Data for Chart
        // Start with the base price at creation time
        const chartData = [
            {
                timestamp: new Date(project.created_at).getTime(),
                price: Number(project.base_price) / 1_000_000, // Convert to ALGO
                volume: 0,
                date: new Date(project.created_at).toLocaleDateString() + ' ' + new Date(project.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ]

        // Add purchase points
        purchases.forEach((p: any) => {
            const price = Number(p.price_per_token) / 1_000_000
            const date = new Date(p.timestamp)

            chartData.push({
                timestamp: date.getTime(),
                price: price,
                volume: Number(p.tokens_amount) / 1_000_000, // Token volume
                date: date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })
        })

        return NextResponse.json({
            success: true,
            data: chartData,
            symbol: project.token_symbol
        })

    } catch (error) {
        console.error('Failed to fetch chart data:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

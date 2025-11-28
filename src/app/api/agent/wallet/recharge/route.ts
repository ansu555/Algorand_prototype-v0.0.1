import { NextResponse } from 'next/server'
import { buildUserAgentWallet } from '@/lib/agent-wallet'
import algosdk from 'algosdk'

export const runtime = 'nodejs'

/**
 * POST /api/agent/wallet/recharge
 * Transfer ALGO from user's connected wallet to their agent wallet
 */
export async function POST(req: Request) {
  try {
    const { userAddress, amount } = await req.json()
    
    if (!userAddress || !amount) {
      return NextResponse.json(
        { success: false, message: 'Missing userAddress or amount' },
        { status: 400 }
      )
    }
    
    if (!algosdk.isValidAddress(userAddress)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user address' },
        { status: 400 }
      )
    }
    
    const numAmount = parseFloat(amount)
    if (!(numAmount > 0)) {
      return NextResponse.json(
        { success: false, message: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }
    
    // Check if database is configured
    const dbUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DB_URL
    if (!dbUrl) {
      return NextResponse.json({
        success: false,
        message: 'Database not configured. Please set TURSO_DATABASE_URL in environment variables.',
      }, { status: 500 })
    }
    
    // Get or create agent wallet for this user
    const agent = await buildUserAgentWallet(userAddress)
    const agentAddress = agent.address
    
    // Get current balance
    const accountInfo = await agent.getAccountInfo()
    const newBalance = accountInfo.algoBalance
    
    return NextResponse.json({
      success: true,
      data: {
        agentAddress,
        newBalance: newBalance.toFixed(6),
        message: `Agent wallet ready. Send ${numAmount} ALGO to: ${agentAddress}`,
        // Note: Actual transfer must be done from user's connected wallet via client-side
        // This endpoint just returns the agent wallet address for the transfer
      }
    })
  } catch (error: any) {
    console.error('Agent wallet recharge error:', error?.message || error)
    console.error('Stack:', error?.stack)
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to process recharge'
    
    if (error.message?.includes('TURSO_DATABASE_URL')) {
      errorMessage = 'Database not configured. Please set TURSO_DATABASE_URL in environment variables.'
    } else if (error.message?.includes('no such table')) {
      errorMessage = 'Database tables not initialized. Please run migrations: npm run migrate'
    } else if (error.message?.includes('Failed to decrypt stored agent wallet mnemonic')) {
      errorMessage = 'Failed to decrypt stored agent wallet mnemonic. Check AGENT_WALLET_ENCRYPTION_KEY and ensure migrations/DB is intact. If you rotated encryption keys, you may need to recreate agent wallets.'
    } else if (error.message?.includes('SQLITE_ERROR')) {
      errorMessage = 'Database error. Please check database configuration.'
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    )
  }
}

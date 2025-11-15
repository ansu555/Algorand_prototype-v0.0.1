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
        { success: false, error: 'Missing userAddress or amount' },
        { status: 400 }
      )
    }
    
    if (!algosdk.isValidAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user address' },
        { status: 400 }
      )
    }
    
    const numAmount = parseFloat(amount)
    if (!(numAmount > 0)) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      )
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
    console.error('Agent wallet recharge error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process recharge' },
      { status: 500 }
    )
  }
}

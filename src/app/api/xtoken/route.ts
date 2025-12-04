import { NextRequest, NextResponse } from 'next/server'
import { 
  getXTokenBalance, 
  getXTokenInfo, 
  isOptedIn,
  buildOptInTransaction,
  getXTokenAsaId,
  formatXTokenAmount,
  X_TOKEN_CONFIG,
} from '@/lib/xtoken'

/**
 * X Token API
 * ===========
 * 
 * GET /api/xtoken?address=<wallet_address>
 *   Returns X Token balance and info for an address
 * 
 * GET /api/xtoken?info=true
 *   Returns X Token asset information
 * 
 * POST /api/xtoken/opt-in
 *   Returns unsigned opt-in transaction for signing
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get('address')
    const infoOnly = searchParams.get('info') === 'true'
    
    // Get token info
    if (infoOnly) {
      const asaId = getXTokenAsaId()
      
      if (!asaId) {
        return NextResponse.json({
          success: true,
          deployed: false,
          config: {
            name: X_TOKEN_CONFIG.name,
            symbol: X_TOKEN_CONFIG.symbol,
            decimals: X_TOKEN_CONFIG.decimals,
            totalSupply: X_TOKEN_CONFIG.initialSupply,
          },
          message: 'X Token not yet deployed. Run: npx ts-node scripts/deploy-x-token.ts',
        })
      }
      
      const tokenInfo = await getXTokenInfo()
      
      return NextResponse.json({
        success: true,
        deployed: true,
        asaId,
        info: tokenInfo,
        explorer: `https://testnet.algoexplorer.io/asset/${asaId}`,
      })
    }
    
    // Get balance for address
    if (!address) {
      return NextResponse.json({
        success: false,
        error: 'Address parameter required. Use ?address=<wallet_address> or ?info=true',
      }, { status: 400 })
    }
    
    const asaId = getXTokenAsaId()
    
    if (!asaId) {
      return NextResponse.json({
        success: true,
        deployed: false,
        address,
        balance: 0,
        formattedBalance: formatXTokenAmount(0),
        isOptedIn: false,
        message: 'X Token not yet deployed',
      })
    }
    
    const balance = await getXTokenBalance(address)
    
    return NextResponse.json({
      success: true,
      deployed: true,
      address,
      asaId,
      balance: balance.balance,
      formattedBalance: formatXTokenAmount(balance.balance),
      baseUnits: balance.baseUnits.toString(),
      isOptedIn: balance.isOptedIn,
      optInRequired: !balance.isOptedIn,
    })
  } catch (error: any) {
    console.error('X Token API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, address } = body
    
    if (!address) {
      return NextResponse.json({
        success: false,
        error: 'Address is required',
      }, { status: 400 })
    }
    
    const asaId = getXTokenAsaId()
    
    if (!asaId) {
      return NextResponse.json({
        success: false,
        error: 'X Token not yet deployed',
      }, { status: 400 })
    }
    
    if (action === 'check-opt-in') {
      const optedIn = await isOptedIn(address)
      return NextResponse.json({
        success: true,
        address,
        asaId,
        isOptedIn: optedIn,
      })
    }
    
    if (action === 'build-opt-in') {
      // Check if already opted in
      const alreadyOptedIn = await isOptedIn(address)
      if (alreadyOptedIn) {
        return NextResponse.json({
          success: false,
          error: 'Address already opted into X Token',
        }, { status: 400 })
      }
      
      const txnBytes = await buildOptInTransaction(address)
      
      if (!txnBytes) {
        return NextResponse.json({
          success: false,
          error: 'Failed to build opt-in transaction',
        }, { status: 500 })
      }
      
      // Return base64 encoded transaction for wallet signing
      const txnBase64 = Buffer.from(txnBytes).toString('base64')
      
      return NextResponse.json({
        success: true,
        action: 'opt-in',
        address,
        asaId,
        transaction: txnBase64,
        instructions: 'Sign this transaction with your wallet to opt into X Token',
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: check-opt-in, build-opt-in',
    }, { status: 400 })
  } catch (error: any) {
    console.error('X Token API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}

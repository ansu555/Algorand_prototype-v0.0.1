import { NextRequest, NextResponse } from 'next/server'
import { buildAlgorandAgent } from '@/lib/algorand'

export async function POST(request: NextRequest) {
  try {
    const { action, params } = await request.json()
    
    const agent = await buildAlgorandAgent()
    
    switch (action) {
      case 'getAddress':
        const address = await agent.getAddress()
        return NextResponse.json({ success: true, data: address })
        
      case 'getBalance':
        const balance = await agent.getBalance(params?.assetId)
        return NextResponse.json({ success: true, data: balance })
        
      case 'transfer':
        const transferResult = await agent.transfer(params)
        return NextResponse.json({ success: true, data: transferResult })
        
      case 'atomicSwap':
        const swapResult = await agent.atomicSwap(params)
        return NextResponse.json({ success: true, data: swapResult })
        
      case 'getPortfolio':
        const portfolio = await agent.getPortfolio()
        return NextResponse.json({ success: true, data: portfolio })
        
      case 'getAssetPrice':
        const price = await agent.getAssetPrice(params?.symbol)
        return NextResponse.json({ success: true, data: price })
        
      case 'getTransactionHistory':
        const history = await agent.getTransactionHistory(params?.limit)
        return NextResponse.json({ success: true, data: history })
        
      case 'getNetworkInfo':
        const networkInfo = agent.getNetworkInfo()
        return NextResponse.json({ success: true, data: networkInfo })
        
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Algorand API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const agent = await buildAlgorandAgent()
    const networkInfo = agent.getNetworkInfo()
    const address = await agent.getAddress()
    
    return NextResponse.json({
      success: true,
      data: {
        network: networkInfo,
        address,
        supportedAssets: Object.keys(agent.assets)
      }
    })
  } catch (error: any) {
    console.error('Algorand API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

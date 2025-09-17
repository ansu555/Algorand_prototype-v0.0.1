import { NextResponse } from "next/server"
import { getAgent } from "@/lib/agent"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    // Better JSON parsing with error handling
    let body: { action: string; params?: any; address?: string }
    try {
      const text = await req.text()
      if (!text || text.trim() === '') {
        body = { action: '' }
      } else {
        body = JSON.parse(text)
      }
    } catch (jsonError) {
      return NextResponse.json({ 
        ok: false, 
        error: "Invalid JSON in request body",
        details: jsonError instanceof Error ? jsonError.message : "Unknown JSON error"
      }, { status: 400 })
    }
    
    const { action, params, address } = body
    
    if (!action) {
      return NextResponse.json({ ok: false, error: "Action parameter is required" }, { status: 400 })
    }

    const agent = await getAgent()
    
    switch (action) {
      case 'GetAddress': {
        try {
          const data = await agent.getAddress()
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          console.error('GetAddress error:', e)
          return NextResponse.json({ 
            ok: false, 
            error: `GetAddress failed: ${e.message}`,
            details: e.stack
          }, { status: 500 })
        }
      }

      case 'GetBalance': {
        try {
          const data = await agent.getBalance(params?.tokenAddress)
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }
      }

      case 'GetTokenDetails': {
        try {
          // For now, return basic token info
          const data = {
            symbol: params?.symbol || 'ALGO',
            decimals: 6,
            name: 'Algorand'
          }
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }
      }

      case 'SendTransaction': {
        try {
          if (!params?.to || !params?.amount) {
            return NextResponse.json({ ok: false, error: 'to and amount are required' }, { status: 400 })
          }
          const data = await agent.transfer({
            to: params.to,
            amount: params.amount,
            assetId: params.assetId,
            note: params.note
          })
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }
      }

      case 'SmartSwap': {
        try {
          if (!params?.assetInSymbol || !params?.assetOutSymbol || !params?.amountIn) {
            return NextResponse.json({ ok: false, error: 'assetInSymbol, assetOutSymbol, and amountIn are required' }, { status: 400 })
          }
          const data = await agent.atomicSwap({
            assetInSymbol: params.assetInSymbol,
            assetOutSymbol: params.assetOutSymbol,
            amountIn: params.amountIn
          })
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }
      }

      case 'CustomSwap': {
        try {
          if (!params?.tokenInSymbol || !params?.tokenOutSymbol || !params?.amount) {
            return NextResponse.json({ ok: false, error: 'tokenInSymbol, tokenOutSymbol, amount required' }, { status: 400 })
          }
          const data = await agent.atomicSwap({
            assetInSymbol: params.tokenInSymbol,
            assetOutSymbol: params.tokenOutSymbol,
            amountIn: params.amount
          })
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }
      }

      case 'getMarketData':
        try {
          const data = await agent.getAssetPrice(params?.symbol || 'ALGO')
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }

      case 'getTokenPrice':
        try {
          if (!params?.symbol) {
            return NextResponse.json({ ok: false, error: "Symbol parameter is required" }, { status: 400 })
          }
          const data = await agent.getAssetPrice(params.symbol)
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }

      case 'getGasEstimate':
        try {
          const data = { gasPrice: 0.001, gasLimit: 21000 } // Algorand doesn't use gas
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }

      case 'getTransactionHistory':
        try {
          const data = await agent.getTransactionHistory(address as any)
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }

      case 'getPortfolioOverview':
        try {
          const data = await agent.getPortfolio()
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }

      case 'getAddress':
        try {
          const data = await agent.getAddress()
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }

      case 'getBalance':
        try {
          const data = await agent.getBalance(params?.tokenAddress)
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }

      default:
        return NextResponse.json({ 
          ok: false, 
          error: `Unknown action: ${action}`,
          availableActions: [
            'GetAddress', 'GetBalance', 'GetTokenDetails', 'SendTransaction', 'SmartSwap', 'CustomSwap',
            'getMarketData', 'getTokenPrice', 'getGasEstimate', 'getTransactionHistory', 
            'getPortfolioOverview', 'getAddress', 'getBalance'
          ]
        }, { status: 400 })
    }
  } catch (e: any) {
    const msg = e?.message || "Agent action error"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Agent Actions API",
    availableActions: [
      'GetAddress', 'GetBalance', 'GetTokenDetails', 'SendTransaction', 'SmartSwap', 'CustomSwap',
      'getMarketData', 'getTokenPrice', 'getGasEstimate', 'getTransactionHistory', 
      'getPortfolioOverview', 'getAddress', 'getBalance'
    ],
    usage: "POST with { action: 'actionName', params: {...} }"
  })
}
import { NextResponse } from "next/server"
import { getAgent } from "@/lib/agent"
import { AgentkitToolkit } from "@0xgasless/agentkit"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { 
      action: string; 
      params?: any;
      address?: string;
    }
    
    const { action, params, address } = body
    
    if (!action) {
      return NextResponse.json({ ok: false, error: "Action parameter is required" }, { status: 400 })
    }

    const agent = await getAgent()
    const toolkit = new AgentkitToolkit(agent.agentkit as any)
    const tools = toolkit.getTools()
    const findTool = (...names: string[]) => tools.find((t: any) => names.some(n => (t?.name || '').toLowerCase() === n.toLowerCase()))
    
    switch (action) {
      // ==== 0xGasless Actions via Toolkit ====
      case 'GetAddress': {
        try {
          const tool = findTool('GetAddress', 'get_address', 'address')
          if (tool) {
            const data = await (tool as any).invoke(params || {})
            return NextResponse.json({ ok: true, data })
          }
          // Fallback to internal
          const data = await agent.getAddress()
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }
      }

      case 'GetBalance': {
        try {
          const tool = findTool('GetBalance', 'get_balance', 'balance')
          if (tool) {
            const data = await (tool as any).invoke(params || {})
            return NextResponse.json({ ok: true, data })
          }
          // Fallback: support single tokenAddress or none
          const data = await agent.getBalance(params?.tokenAddress)
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }
      }

      case 'GetTokenDetails': {
        try {
          const tool = findTool('GetTokenDetails', 'get_token_details', 'token_details')
          if (tool) {
            const data = await (tool as any).invoke(params || {})
            return NextResponse.json({ ok: true, data })
          }
          return NextResponse.json({ ok: false, error: 'GetTokenDetails tool not available' }, { status: 400 })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }
      }

      case 'SendTransaction': {
        try {
          const tool = findTool('SendTransaction', 'send_transaction', 'send')
          if (tool) {
            const data = await (tool as any).invoke(params || {})
            return NextResponse.json({ ok: true, data })
          }
          return NextResponse.json({ ok: false, error: 'SendTransaction tool not available' }, { status: 400 })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }
      }

      case 'SmartSwap': {
        try {
          const tool = findTool('SmartSwap', 'smart_swap', 'swap')
          if (tool) {
            const data = await (tool as any).invoke(params || {})
            return NextResponse.json({ ok: true, data })
          }
          // If on Fuji, prefer customSwap first
          try {
            const outCustom = await (agent as any).customSwap({
              tokenInSymbol: params?.tokenInSymbol,
              tokenOutSymbol: params?.tokenOutSymbol,
              amount: params?.amount,
              slippageBps: params?.slippageBps,
              wait: params?.wait ?? true,
            })
            return NextResponse.json({ ok: true, data: outCustom, route: 'custom' })
          } catch (eCustom: any) {
            // Fallback to legacy smartSwap (non-Fuji chains or if custom not configured)
            const out = await agent.smartSwap({
              tokenInSymbol: params?.tokenInSymbol,
              tokenOutSymbol: params?.tokenOutSymbol,
              amount: params?.amount,
              slippage: params?.slippage,
              wait: params?.wait ?? true,
            })
            return NextResponse.json({ ok: true, data: out, route: 'legacy', customError: eCustom?.message })
          }
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }
      }

      case 'CustomSwap': {
        try {
          if (!params?.tokenInSymbol || !params?.tokenOutSymbol || !params?.amount) {
            return NextResponse.json({ ok: false, error: 'tokenInSymbol, tokenOutSymbol, amount required' }, { status: 400 })
          }
          const out = await (agent as any).customSwap({
            tokenInSymbol: params.tokenInSymbol,
            tokenOutSymbol: params.tokenOutSymbol,
            amount: params.amount,
            slippageBps: params.slippageBps ?? 100,
            wait: params.wait ?? true,
          })
          return NextResponse.json({ ok: true, data: out })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }
      }

      case 'getMarketData':
        try {
          const data = await agent.getMarketData(params?.symbol)
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }

      case 'getTokenPrice':
        try {
          if (!params?.symbol) {
            return NextResponse.json({ ok: false, error: "Symbol parameter is required" }, { status: 400 })
          }
          const data = await agent.getTokenPrice(params.symbol)
          return NextResponse.json({ ok: true, data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
        }

      case 'getGasEstimate':
        try {
          const data = await agent.getGasEstimate()
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
          const data = await agent.getPortfolioOverview()
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
      'getMarketData', 'CustomSwap', 'SmartSwap',
            'getTokenPrice', 
            'getGasEstimate',
            'getTransactionHistory',
            'getPortfolioOverview',
            'getAddress',
    'getBalance',
    // 0xGasless Actions
    'GetAddress', 'GetBalance', 'GetTokenDetails', 'SendTransaction', 'SmartSwap', 'CustomSwap'
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
    'getMarketData', 'CustomSwap', 'SmartSwap',
      'getTokenPrice',
      'getGasEstimate', 
      'getTransactionHistory',
      'getPortfolioOverview',
      'getAddress',
  'getBalance',
  // 0xGasless Actions
  'GetAddress', 'GetBalance', 'GetTokenDetails', 'SendTransaction', 'SmartSwap', 'CustomSwap'
    ],
    usage: "POST with { action: 'actionName', params: {...} }"
  })
}

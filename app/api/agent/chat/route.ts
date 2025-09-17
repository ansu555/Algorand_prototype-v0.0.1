import { NextResponse } from "next/server"
import { getAgent } from "@/lib/agent"

export const runtime = "nodejs"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  threadId?: string
  walletAddress?: string
  chainId?: number
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as ChatRequest
    const { messages, threadId, walletAddress, chainId } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: "Messages array is required" 
      }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json({ 
        ok: false, 
        error: "Last message must be from user" 
      }, { status: 400 })
    }

    const userQuery = lastMessage.content.toLowerCase().trim()
    
    try {
      const agent = await getAgent()
      let response = ""

      // Simple command parsing for common queries
      if (userQuery.includes("address") || userQuery.includes("wallet")) {
        const address = await agent.getAddress()
        response = `Your Algorand address is: \`${address}\``
      } else if (userQuery.includes("balance") || userQuery.includes("algo")) {
        const balance = await agent.getBalance()
        response = `Your ALGO balance is: \`${balance} ALGO\``
      } else if (userQuery.includes("portfolio") || userQuery.includes("holdings")) {
        const portfolio = await agent.getPortfolio()
        response = `**Portfolio Overview:**\n` +
          `Address: \`${portfolio.address}\`\n` +
          `Total Value: $${portfolio.totalValueUSD.toFixed(2)} USD\n\n` +
          `**Assets:**\n` +
          portfolio.assets.map(asset => 
            `• ${asset.symbol}: ${asset.balance} ($${asset.valueUSD.toFixed(2)})`
          ).join('\n')
      } else if (userQuery.includes("price") && (userQuery.includes("algo") || userQuery.includes("usdc"))) {
        const symbol = userQuery.includes("algo") ? "ALGO" : "USDC"
        const price = await agent.getAssetPrice(symbol)
        response = `${symbol} Price: $${price.price} (24h change: ${price.change24h?.toFixed(2) || 'N/A'}%)`
      } else if (userQuery.includes("swap") || userQuery.includes("trade")) {
        // Extract swap parameters from the query
        const swapMatch = userQuery.match(/(\d+(?:\.\d+)?)\s*(algo|usdc)\s*to\s*(algo|usdc)/i)
        if (swapMatch) {
          const [, amount, fromAsset, toAsset] = swapMatch
          const result = await agent.atomicSwap({
            assetInSymbol: fromAsset.toUpperCase(),
            assetOutSymbol: toAsset.toUpperCase(),
            amountIn: amount
          })
          response = `✅ Swap completed!\n` +
            `Transaction ID: \`${result.txId}\`\n` +
            `Swapped: ${result.details.amountIn} ${result.details.assetInSymbol} → ${result.details.amountOut} ${result.details.assetOutSymbol}\n` +
            `Price Impact: ${result.details.priceImpact}%\n` +
            `Fee: ${result.details.fee} ${result.details.assetInSymbol}`
        } else {
          response = `To swap, use format: "swap 1 ALGO to USDC" or "swap 5 USDC to ALGO"`
        }
      } else if (userQuery.includes("transfer") || userQuery.includes("send")) {
        response = `To transfer ALGO, use the transfer function. For now, you can use the API directly with the SendTransaction action.`
      } else if (userQuery.includes("help") || userQuery.includes("commands")) {
        response = `**Available Commands:**\n` +
          `• "what's my address?" - Get your wallet address\n` +
          `• "check my balance" - Check ALGO balance\n` +
          `• "show my portfolio" - View portfolio overview\n` +
          `• "price of ALGO" - Get ALGO price\n` +
          `• "swap 1 ALGO to USDC" - Execute a swap\n` +
          `• "transfer ALGO" - Get transfer instructions\n` +
          `• "help" - Show this help message`
      } else {
        // Default response for unrecognized queries
        response = `I can help you with:\n` +
          `• Checking your address and balance\n` +
          `• Viewing your portfolio\n` +
          `• Getting asset prices\n` +
          `• Executing swaps (ALGO ↔ USDC)\n` +
          `• Transferring assets\n\n` +
          `Try asking: "what's my address?" or "check my balance"`
      }

      return NextResponse.json({
        ok: true,
        content: response,
        threadId: threadId || `thread_${Date.now()}`
      })

    } catch (agentError: any) {
      console.error('Agent error:', agentError)
      return NextResponse.json({
        ok: false,
        error: `Agent error: ${agentError.message}`,
        threadId: threadId || `thread_${Date.now()}`
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json({
      ok: false,
      error: `Chat error: ${error.message}`,
      threadId: `thread_${Date.now()}`
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Chat API is working",
    usage: "POST with { messages: [{ role: 'user', content: 'your message' }] }"
  })
}

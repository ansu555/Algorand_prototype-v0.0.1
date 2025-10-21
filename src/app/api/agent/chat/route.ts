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

// Enhanced NLP Intent Recognition
interface Intent {
  type: 'address' | 'balance' | 'portfolio' | 'price' | 'swap' | 'transfer' | 'help' | 'top' | 'unknown'
  confidence: number
  entities: {
    amount?: number
    fromAsset?: string
    toAsset?: string
    targetAsset?: string
    recipient?: string
    count?: number
  }
}

// Natural Language Understanding Functions
function extractIntent(userQuery: string): Intent {
  const query = userQuery.toLowerCase().trim()
  
  // Address-related patterns
  const addressPatterns = [
    /(?:what|show|tell|give).*(?:my|the).*(?:address|wallet|account)/,
    /(?:where|how).*(?:is|can).*(?:my|the).*(?:address|wallet)/,
    /(?:i|i'm|i am).*(?:looking|want).*(?:for|to see).*(?:my|the).*(?:address|wallet)/,
    /(?:address|wallet).*(?:please|now)/
  ]
  
  // Balance-related patterns
  const balancePatterns = [
    /(?:what|how much|show|tell|give).*(?:my|the).*(?:balance|algo|funds|money)/,
    /(?:how much).*(?:algo|money|funds).*(?:do i have|i have|i got)/,
    /(?:check|see|view).*(?:my|the).*(?:balance|algo|funds)/,
    /(?:balance|algo|funds).*(?:please|now|check)/
  ]
  
  // Portfolio-related patterns
  const portfolioPatterns = [
    /(?:show|tell|give|view|see).*(?:my|the).*(?:portfolio|holdings|assets|investments)/,
    /(?:what|how).*(?:is|are).*(?:my|the).*(?:portfolio|holdings|assets)/,
    /(?:portfolio|holdings|assets).*(?:please|now|overview)/
  ]
  
  // Price-related patterns
  const pricePatterns = [
    /(?:what|how much|show|tell|give).*(?:is|the).*(?:price|value|cost).*(?:of|for)/,
    /(?:price|value|cost).*(?:of|for).*(?:algo|usdc|bitcoin|ethereum)/,
    /(?:how much).*(?:is|does).*(?:algo|usdc|bitcoin|ethereum).*(?:cost|worth)/
  ]

  // Top coins patterns
  const topPatterns = [
    /top\s+(\d+)\s+coins/,
    /top\s+coins/,
    /best\s+(\d+)?\s*coins/,
  ]
  
  // Swap-related patterns
  const swapPatterns = [
    /(?:swap|trade|exchange|convert).*(?:\d+(?:\.\d+)?).*(?:algo|usdc|bitcoin|ethereum).*(?:to|for|into).*(?:algo|usdc|bitcoin|ethereum)/,
    /(?:i|i want|i need|i'd like).*(?:to|to).*(?:swap|trade|exchange|convert)/,
    /(?:can you|please).*(?:swap|trade|exchange|convert)/,
    /(?:convert|exchange).*(?:\d+(?:\.\d+)?).*(?:algo|usdc)/
  ]
  
  // Transfer-related patterns (include past tense and swap phrasing)
  const transferPatterns = [
    /(?:send|sent|transfer|give|gave|swap).*?(?:\d+(?:\.\d+)?).*?(?:algo|usdc).*?(?:to|to the address)\s+([A-Z0-9]{58})/,
    /(?:i|i want|i need|i'd like).*(?:to|to).*(?:send|transfer|give|swap).*?(?:\d+(?:\.\d+)?).*?(?:algo|usdc).*?(?:to|to the address)\s+([A-Z0-9]{58})/,
    /(?:can you|please).*(?:send|transfer|give|swap).*?(?:\d+(?:\.\d+)?).*?(?:algo|usdc).*?(?:to|to the address)\s+([A-Z0-9]{58})/
  ]
  
  // Help-related patterns
  const helpPatterns = [
    /(?:help|what can you do|commands|options|menu)/,
    /(?:how|what).*(?:do|can).*(?:you|i).*(?:do|help)/
  ]
  
  // Check patterns and extract entities (order matters - more specific first)
  
  // Transfer patterns first (most specific)
  if (transferPatterns.some(pattern => pattern.test(query))) {
    // Extract transfer details with improved regex for all patterns
    const patterns = [
      /(?:send|sent|transfer|give|gave|swap)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:to|to the address)\s+([A-Z0-9]{58})/,
      /(?:i|i want|i need|i'd like).*(?:to|to).*(?:send|transfer|give|swap)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:to|to the address)\s+([A-Z0-9]{58})/,
      /(?:can you|please).*(?:send|transfer|give|swap)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:to|to the address)\s+([A-Z0-9]{58})/
    ]
    
    for (const pattern of patterns) {
      const match = query.match(pattern)
      if (match) {
        const amount = parseFloat(match[1])
        const asset = match[2].toUpperCase()
        const recipient = match[3]
        return { 
          type: 'transfer', 
          confidence: 0.9, 
          entities: { amount, fromAsset: asset, recipient } 
        }
      }
    }
    
    // Fallback for partial matches
    const partialMatch = query.match(/(?:send|sent|transfer|give|gave|swap)\s+(\d+(?:\.\d+)?)\s+(\w+)/)
    if (partialMatch) {
      const amount = parseFloat(partialMatch[1])
      const asset = partialMatch[2].toUpperCase()
      return { 
        type: 'transfer', 
        confidence: 0.7, 
        entities: { amount, fromAsset: asset } 
      }
    }
    
    return { type: 'transfer', confidence: 0.7, entities: {} }
  }
  
  // Top coins
  for (const p of topPatterns) {
    const m = query.match(p)
    if (m) {
      const count = m[1] ? Math.max(1, Math.min(50, parseInt(m[1], 10))) : 5
      return { type: 'top', confidence: 0.9, entities: { count } }
    }
  }

  // Swap patterns
  if (swapPatterns.some(pattern => pattern.test(query))) {
    // Extract swap details
    const swapMatch = query.match(/(?:swap|trade|exchange|convert)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:to|for|into)\s+(\w+)|(\d+(?:\.\d+)?)\s+(\w+)\s+(?:to|for|into)\s+(\w+)/)
    if (swapMatch) {
      const amount = parseFloat(swapMatch[1] || swapMatch[4])
      const fromAsset = (swapMatch[2] || swapMatch[5]).toUpperCase()
      const toAsset = (swapMatch[3] || swapMatch[6]).toUpperCase()
      return { 
        type: 'swap', 
        confidence: 0.9, 
        entities: { amount, fromAsset, toAsset } 
      }
    }
    return { type: 'swap', confidence: 0.7, entities: {} }
  }
  
  if (addressPatterns.some(pattern => pattern.test(query))) {
    return { type: 'address', confidence: 0.9, entities: {} }
  }
  
  if (balancePatterns.some(pattern => pattern.test(query))) {
    return { type: 'balance', confidence: 0.9, entities: {} }
  }
  
  if (portfolioPatterns.some(pattern => pattern.test(query))) {
    return { type: 'portfolio', confidence: 0.9, entities: {} }
  }
  
  if (pricePatterns.some(pattern => pattern.test(query))) {
    // Extract asset name
    const assetMatch = query.match(/(?:price|value|cost).*(?:of|for)\s+(\w+)|(\w+).*(?:price|value|cost)/)
    const targetAsset = assetMatch ? (assetMatch[1] || assetMatch[2]) : 'algo'
    return { 
      type: 'price', 
      confidence: 0.8, 
      entities: { targetAsset: targetAsset.toUpperCase() } 
    }
  }
  
  if (helpPatterns.some(pattern => pattern.test(query))) {
    return { type: 'help', confidence: 0.9, entities: {} }
  }
  
  // Fuzzy matching for common variations
  if (query.includes('address') || query.includes('wallet')) {
    return { type: 'address', confidence: 0.6, entities: {} }
  }
  
  if (query.includes('balance') || query.includes('algo') || query.includes('funds')) {
    return { type: 'balance', confidence: 0.6, entities: {} }
  }
  
  if (query.includes('portfolio') || query.includes('holdings') || query.includes('assets')) {
    return { type: 'portfolio', confidence: 0.6, entities: {} }
  }
  
  if (query.includes('price') || query.includes('value') || query.includes('cost')) {
    return { type: 'price', confidence: 0.6, entities: { targetAsset: 'ALGO' } }
  }
  
  if (query.includes('swap') || query.includes('trade') || query.includes('exchange')) {
    return { type: 'swap', confidence: 0.6, entities: {} }
  }
  
  return { type: 'unknown', confidence: 0.0, entities: {} }
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

    const userQuery = lastMessage.content.trim()
    
    try {
      const agent = await getAgent()
      const intent = extractIntent(userQuery)
      let response = ""

      console.log('Intent detected:', intent)

      switch (intent.type) {
        case 'top': {
          const count = intent.entities.count || 5
          const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${count}&page=1&sparkline=false&price_change_percentage=24h`
          const res = await fetch(url)
          if (!res.ok) {
            throw new Error(`Failed to fetch top coins: ${res.status}`)
          }
          const data = await res.json() as Array<{ name: string; symbol: string; current_price: number; price_change_percentage_24h?: number }>
          const lines = data.map((c, i) => `${i + 1}. ${c.name} (${c.symbol.toUpperCase()}): $${c.current_price.toLocaleString(undefined, { maximumFractionDigits: 4 })}${typeof c.price_change_percentage_24h === 'number' ? ` (${c.price_change_percentage_24h.toFixed(2)}% 24h)` : ''}`)
          response = `Top ${count} coins by market cap:\n` + lines.join('\n')
          break
        }
        case 'address': {
          const address = await agent.getAddress()
          response = `Your Algorand address is: \`${address}\``
          break
        }
        
        case 'balance': {
          const balance = await agent.getBalance()
          response = `Your ALGO balance is: \`${balance} ALGO\``
          break
        }
        
        case 'portfolio': {
          const portfolio = await agent.getPortfolio()
          response = `**Portfolio Overview:**\n` +
            `Address: \`${portfolio.address}\`\n` +
            `Total Value: $${portfolio.totalValueUSD.toFixed(2)} USD\n\n` +
            `**Assets:**\n` +
            portfolio.assets.map(asset => 
              `• ${asset.symbol}: ${asset.balance} ($${asset.valueUSD.toFixed(2)})`
            ).join('\n')
          break
        }
        
        case 'price': {
          const symbol = intent.entities.targetAsset || 'ALGO'
          const price = await agent.getAssetPrice(symbol)
          response = `${symbol} Price: $${price.price} (24h change: ${price.change24h?.toFixed(2) || 'N/A'}%)`
          break
        }
        
        case 'swap': {
          if (intent.entities.amount && intent.entities.fromAsset && intent.entities.toAsset) {
            const result = await agent.atomicSwap({
              assetInSymbol: intent.entities.fromAsset,
              assetOutSymbol: intent.entities.toAsset,
              amountIn: intent.entities.amount.toString()
            })
            response = `✅ Swap completed!\n` +
              `Transaction ID: \`${result.txId}\`\n` +
              `Swapped: ${result.details.amountIn} ${result.details.assetInSymbol} → ${result.details.amountOut} ${result.details.assetOutSymbol}\n` +
              `Price Impact: ${result.details.priceImpact}%\n` +
              `Fee: ${result.details.fee} ${result.details.assetInSymbol}`
          } else {
            response = `I can help you swap tokens! Try saying something like:\n` +
              `• "Swap 1 ALGO to USDC"\n` +
              `• "Convert 5 USDC to ALGO"\n` +
              `• "Exchange 2 ALGO for USDC"`
          }
          break
        }
        
        case 'transfer': {
          if (intent.entities.amount && intent.entities.fromAsset && intent.entities.recipient) {
            try {
              // Execute real transfer
              const assetId = intent.entities.fromAsset === 'ALGO' ? 0 : 
                             intent.entities.fromAsset === 'USDC' ? 10458941 : undefined
              
              const result = await agent.transfer({
                to: intent.entities.recipient,
                amount: intent.entities.amount.toString(),
                assetId: assetId,
                note: `Transfer via 10xSwap Chat`
              })
              
              response = `✅ Transfer completed!\n` +
                `Transaction ID: \`${result.txId}\`\n` +
                `Sent: ${intent.entities.amount} ${intent.entities.fromAsset}\n` +
                `To: \`${intent.entities.recipient}\`\n` +
                `Network: Algorand Testnet\n\n` +
                `View on Explorer: https://testnet.algoexplorer.io/tx/${result.txId}`
            } catch (error: any) {
              response = `❌ Transfer failed: ${error.message}\n\n` +
                `Please check:\n` +
                `• Recipient address is valid\n` +
                `• You have sufficient balance\n` +
                `• Amount is correct`
            }
          } else {
            response = `I can help you transfer tokens! Try saying something like:\n` +
              `• "Send 1 ALGO to OA57DAFKUMATT3WK3DPJP7XZEFIXHRN7DAWR72YTOKYECVI3AOP2VYJQIE"\n` +
              `• "Transfer 5 USDC to [recipient address]"\n` +
              `• "Send 0.1 ALGO to [wallet address]"`
          }
          break
        }
        
        case 'help': {
          response = `**I can help you with:**\n\n` +
            `**Account Info:**\n` +
            `• "What's my address?" - Get your wallet address\n` +
            `• "How much ALGO do I have?" - Check your balance\n` +
            `• "Show my portfolio" - View all your assets\n\n` +
            `**Trading:**\n` +
            `• "What's the price of ALGO?" - Get current prices\n` +
            `• "Swap 1 ALGO to USDC" - Execute a swap\n` +
            `• "Convert 5 USDC to ALGO" - Trade tokens\n\n` +
            `**Transfers:**\n` +
            `• "Send 1 ALGO to [address]" - Transfer tokens\n\n` +
            `**Just ask naturally!** I understand various ways of asking the same thing.`
          break
        }
        
        default: {
          // For unknown intents, provide helpful suggestions
          response = `I understand you're asking about something, but I'm not sure exactly what. ` +
            `Here are some things I can help you with:\n\n` +
            `• **Account**: "What's my address?", "How much do I have?"\n` +
            `• **Trading**: "What's the price of ALGO?", "Swap 1 ALGO to USDC"\n` +
            `• **Portfolio**: "Show my holdings", "What assets do I have?"\n\n` +
            `Try rephrasing your question, or say "help" for more options!`
          break
        }
      }

      return NextResponse.json({
        ok: true,
        content: response,
        threadId: threadId || `thread_${Date.now()}`,
        intent: intent.type,
        confidence: intent.confidence
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

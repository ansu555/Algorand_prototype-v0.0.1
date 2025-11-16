import { NextRequest, NextResponse } from 'next/server'
import { buildUserAgentWallet } from '@/lib/agent-wallet'
import algosdk from 'algosdk'

export const runtime = 'nodejs'
export const maxDuration = 60

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

type ChatRequest = {
  messages: Message[]
  userWalletAddress?: string
}

/**
 * Enhanced AI Chatbot with Transaction Support
 * 
 * Supports:
 * - Token analysis (via MCP)
 * - Balance queries
 * - Portfolio viewing
 * - Sending transactions to any Algorand address
 * - General conversation
 */

// Simple pattern matching for transaction requests
function parseTransactionIntent(message: string): {
  action: 'send' | 'transfer' | null
  amount?: number
  asset?: string
  recipient?: string
} | null {
  const lower = message.toLowerCase()
  
  // Match: "send X ALGO to ADDRESS" or "transfer X USDC to ADDRESS"
  const sendPattern = /(?:send|transfer)\s+([\d.]+)\s+(\w+)\s+to\s+([A-Z2-7]{58})/i
  const match = message.match(sendPattern)
  
  if (match) {
    const [, amountStr, asset, recipient] = match
    const amount = parseFloat(amountStr)
    
    if (amount > 0 && algosdk.isValidAddress(recipient)) {
      return {
        action: lower.includes('send') ? 'send' : 'transfer',
        amount,
        asset: asset.toUpperCase(),
        recipient
      }
    }
  }
  
  return null
}

// Simple pattern for balance queries
function parseBalanceIntent(message: string): { action: 'balance'; asset?: string } | null {
  const lower = message.toLowerCase()
  
  if (lower.includes('balance') || lower.includes('balances')) {
    // Check if they're asking for a specific asset
    const assetMatch = message.match(/\b(algo|usdc|usdt|dai)\b/i)
    return {
      action: 'balance',
      asset: assetMatch ? assetMatch[1].toUpperCase() : undefined
    }
  }
  
  return null
}

// Simple pattern for portfolio
function parsePortfolioIntent(message: string): { action: 'portfolio' } | null {
  const lower = message.toLowerCase()
  
  if (lower.includes('portfolio') || lower.includes('holdings') || lower.includes('assets')) {
    return { action: 'portfolio' }
  }
  
  return null
}

// Simple pattern for address
function parseAddressIntent(message: string): { action: 'address' } | null {
  const lower = message.toLowerCase()
  
  if (lower.includes('my address') || lower.includes('wallet address')) {
    return { action: 'address' }
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest
    const { messages, userWalletAddress } = body
    
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Messages array is required' },
        { status: 400 }
      )
    }
    
    // Get last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUserMessage) {
      return NextResponse.json(
        { ok: false, error: 'No user message found' },
        { status: 400 }
      )
    }
    
    const userText = lastUserMessage.content.trim()
    
    // Check for address query
    const addressIntent = parseAddressIntent(userText)
    if (addressIntent) {
      if (!userWalletAddress) {
        return NextResponse.json({
          ok: true,
          message: '❌ Please connect your wallet first to view your address.'
        })
      }
      
      return NextResponse.json({
        ok: true,
        message: `📍 **Your Algorand Address:**\n\n${userWalletAddress}\n\nYou can use this address to receive ALGO and ASA tokens. View it on [AlgoExplorer](https://testnet.algoexplorer.io/address/${userWalletAddress}).`
      })
    }
    
    // Check for balance query
    const balanceIntent = parseBalanceIntent(userText)
    if (balanceIntent) {
      if (!userWalletAddress) {
        return NextResponse.json({
          ok: true,
          message: '❌ Please connect your wallet first to check your balance.'
        })
      }
      
      try {
        const agent = await buildUserAgentWallet(userWalletAddress)
        const accountInfo = await agent.getAccountInfo()
        
        let message = `💰 **Your Balance:**\n\n**ALGO:** ${accountInfo.algoBalance.toFixed(4)} ALGO`
        
        if (accountInfo.assets && accountInfo.assets.length > 0) {
          message += '\n\n**Assets:**'
          for (const asset of accountInfo.assets.slice(0, 10)) {
            message += `\n• ${asset.symbol}: ${asset.balance} (ID: ${asset.assetId})`
          }
          if (accountInfo.assets.length > 10) {
            message += `\n\n_...and ${accountInfo.assets.length - 10} more assets_`
          }
        } else {
          message += '\n\nNo ASA tokens found.'
        }
        
        return NextResponse.json({
          ok: true,
          message
        })
      } catch (error: any) {
        console.error('Balance query error:', error)
        return NextResponse.json({
          ok: true,
          message: `❌ Error fetching balance: ${error.message}`
        })
      }
    }
    
    // Check for portfolio query
    const portfolioIntent = parsePortfolioIntent(userText)
    if (portfolioIntent) {
      if (!userWalletAddress) {
        return NextResponse.json({
          ok: true,
          message: '❌ Please connect your wallet first to view your portfolio.'
        })
      }
      
      try {
        const agent = await buildUserAgentWallet(userWalletAddress)
        const accountInfo = await agent.getAccountInfo()
        
        let message = `📊 **Your Portfolio:**\n\n**ALGO:** ${accountInfo.algoBalance.toFixed(4)} ALGO`
        message += `\n**Available:** ${accountInfo.availableBalance.toFixed(4)} ALGO`
        message += `\n**Total Assets:** ${accountInfo.totalAssets}`
        
        if (accountInfo.assets && accountInfo.assets.length > 0) {
          message += '\n\n**Assets:**'
          for (const asset of accountInfo.assets.slice(0, 10)) {
            message += `\n• ${asset.symbol}: ${asset.balance} (ID: ${asset.assetId})`
          }
          if (accountInfo.assets.length > 10) {
            message += `\n\n_...and ${accountInfo.assets.length - 10} more assets_`
          }
        }
        
        return NextResponse.json({
          ok: true,
          message
        })
      } catch (error: any) {
        console.error('Portfolio query error:', error)
        return NextResponse.json({
          ok: true,
          message: `❌ Error fetching portfolio: ${error.message}`
        })
      }
    }
    
    // Check for transaction intent
    const txIntent = parseTransactionIntent(userText)
    if (txIntent && txIntent.action) {
      if (!userWalletAddress) {
        return NextResponse.json({
          ok: true,
          message: '❌ Please connect your wallet first to send transactions.'
        })
      }
      
      const { amount, asset, recipient } = txIntent
      
      try {
        const agent = await buildUserAgentWallet(userWalletAddress)
        
        // Determine asset ID - Algorand ecosystem only
        let assetId: number = 0
        if (asset === 'ALGO') {
          assetId = 0
        } else {
          // Algorand testnet ASA tokens
          const assetMap: Record<string, number> = {
            'USDC': 10458941,  // USDC on Algorand testnet
            'USDT': 67396430,  // USDT on Algorand testnet
            'ALFG': 70283957,  // ALFG on Algorand testnet
          }
          assetId = assetMap[asset!] || 0
          
          if (assetId === 0 && asset !== 'ALGO') {
            return NextResponse.json({
              ok: true,
              message: `❌ **Unsupported Asset: ${asset}**\n\nI can only send:\n• ALGO\n• USDC (ID: 10458941)\n• USDT (ID: 67396430)\n• ALFG (ID: 70283957)\n\nPlease use one of these supported assets.`
            })
          }
        }
        
        // Execute transfer
        const result = await agent.transfer({
          to: recipient!,
          amount: amount!,
          assetId,
          note: `Sent via 10xSwap AI Chatbot`
        })
        
        const explorerUrl = `https://testnet.algoexplorer.io/tx/${result.txId}`
        
        return NextResponse.json({
          ok: true,
          message: `✅ **Transaction Successful!**\n\n**Sent:** ${amount} ${asset}\n**To:** ${recipient}\n\n**Transaction ID:** ${result.txId}\n\n[View on Explorer](${explorerUrl})`
        })
      } catch (error: any) {
        console.error('Transaction error:', error)
        return NextResponse.json({
          ok: true,
          message: `❌ **Transaction Failed**\n\n${error.message}\n\nPlease check:\n• Sufficient balance\n• Valid recipient address\n• Asset opt-in status`
        })
      }
    }
    
    // Check for token analysis or price queries
    const wantsAnalysis = /\b(analyz[e]?|analysis|insight|forecast|prediction)\b/i.test(userText)
    const wantsPrice = /\b(price|cost|value|worth)\b/i.test(userText)
    
    // Extract token symbol - support Algorand ecosystem only
    const tokenMatch = userText.match(/\b(algo|algorand|usdc|usdt|opul|planets|gard|gobtc|goeth|defly|yldy)\b/i)
    
    if ((wantsAnalysis || wantsPrice) && tokenMatch) {
      // Use internal MCP analytics API (serverless)
      try {
        const token = tokenMatch[1].toLowerCase()
        // Map Algorand ecosystem tokens
        const tokenMap: Record<string, string> = {
          'algo': 'algorand',
          'usdc': 'usd-coin',
          'usdt': 'tether'
        }
        const coinId = tokenMap[token] || token
        
        // Import the analytics engine directly (no fetch needed!)
        const { analyzeCoin } = await import('@/lib/mcp')
        
        const data = await analyzeCoin({
          coin: coinId,
          horizonDays: 30,
          tasks: wantsAnalysis ? ['analysis', 'prediction', 'strategy', 'charts'] : ['analysis'],
          chartType: wantsAnalysis ? 'candlestick' : 'line'
        })
        
        if (data.ok) {
          if (wantsPrice && !wantsAnalysis) {
            // Just show price info
            return NextResponse.json({
              ok: true,
              message: `💰 **${token.toUpperCase()} Price:**\n\n${data.summary || 'Price data retrieved. Check MCP for details.'}`
            })
          }
          
          // Full analysis
          let message = `📊 **${token.toUpperCase()} Analysis:**\n\n`
          
          if (data.summary) {
            message += `${data.summary}\n\n`
          }
          
          if (data.insights && Array.isArray(data.insights)) {
            message += '**Key Insights:**\n'
            data.insights.slice(0, 3).forEach((insight: string) => {
              message += `• ${insight}\n`
            })
            message += '\n'
          }
          
          if (data.predictions && Array.isArray(data.predictions) && data.predictions.length > 0) {
            message += '**Price Forecast:**\n'
            data.predictions.slice(0, 2).forEach((pred: any) => {
              message += `• ${pred.date}: $${pred.price} (${Math.round(pred.probability * 100)}% confidence)\n`
            })
            message += '\n'
          }
          
          if (data.charts && Array.isArray(data.charts)) {
            message += '**📈 Charts:**\n\n'
            data.charts.forEach((chart: any) => {
              // Charts are now returned as base64 data URLs - embed directly
              message += `![${chart.title}](${chart.url})\n\n`
            })
          }
          
          return NextResponse.json({
            ok: true,
            message: message.trim()
          })
        } else {
          // Analysis failed
          return NextResponse.json({
            ok: true,
            message: `❌ ${data.error || 'Analysis failed'}\n\n${data.suggestion || 'Try another cryptocurrency or check the logs.'}`
          })
        }
      } catch (error: any) {
        console.error('MCP analysis error:', error)
        return NextResponse.json({
          ok: true,
          message: `❌ Could not analyze ${tokenMatch[1].toUpperCase()}. ${error.message || 'Unknown error'}\n\nTry: "what's my balance?" or "send 1 ALGO to [address]"`
        })
      }
    }
    
    // General conversation fallback
    const generalResponses: Record<string, string> = {
      'hello': '👋 Hi! I can help you with:\n• ALGO & Algorand ASA token analysis\n• Balance checks\n• Portfolio viewing\n• Sending ALGO/USDC/USDT/ALFG to any address\n\nTry asking: "analyze ALGO" or "what\'s my balance?"',
      'hi': '👋 Hello! I\'m your 10xSwap AI assistant for Algorand. How can I help you today?',
      'help': '🤖 **Available Commands:**\n\n• "what\'s my address?" - View your wallet address\n• "check my balance" - See your ALGO and ASA balances\n• "show my portfolio" - View all holdings\n• "send X ALGO to [address]" - Transfer ALGO/USDC/USDT/ALFG\n• "analyze ALGO" or "ALGO analysis" - Get detailed Algorand analysis with price predictions\n• "price of USDC" - Check token price\n\n**Supported Assets:**\n• ALGO (native)\n• USDC (ID: 10458941)\n• USDT (ID: 67396430)\n• ALFG (ID: 70283957)\n\nJust ask naturally!',
    }
    
    const lowerText = userText.toLowerCase()
    for (const [key, response] of Object.entries(generalResponses)) {
      if (lowerText.includes(key)) {
        return NextResponse.json({
          ok: true,
          message: response
        })
      }
    }
    
    // Default helpful response
    return NextResponse.json({
      ok: true,
      message: '🤔 I can help you with Algorand ecosystem queries: balance checks, portfolio viewing, ALGO analysis, and sending transactions.\n\nTry asking:\n• "analyze ALGO" - Get detailed market analysis with predictions\n• "what\'s my balance?" - Check your wallet balance\n• "show my portfolio" - View all your assets\n• "send 1 ALGO to [address]" - Transfer tokens\n\n**Supported assets:** ALGO, USDC, USDT, ALFG'
    })
    
  } catch (error: any) {
    console.error('❌ Chatbot error:', error)
    
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'An error occurred',
        suggestion: 'Please try again or rephrase your question.'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for API documentation
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/chatbot',
    description: 'AI Chatbot for Algorand Ecosystem - Transaction & Analysis Support',
    features: [
      'Natural conversation',
      'Algorand & ASA token analysis',
      'Balance and portfolio checks',
      'Send ALGO/USDC/USDT to any Algorand address',
      'Real-time blockchain interaction'
    ],
    supportedAssets: [
      { symbol: 'ALGO', id: 0, name: 'Algorand (native)' },
      { symbol: 'USDC', id: 10458941, name: 'USD Coin' },
      { symbol: 'USDT', id: 67396430, name: 'Tether' },
      { symbol: 'ALFG', id: 70283957, name: 'ALFG Token' }
    ],
    usage: {
      method: 'POST',
      body: {
        messages: [
          { role: 'user', content: 'Your message here' }
        ],
        userWalletAddress: 'OPTIONAL_ALGORAND_ADDRESS'
      }
    },
    examples: [
      { description: 'Check balance', message: 'what\'s my balance?' },
      { description: 'View address', message: 'show my address' },
      { description: 'Send ALGO', message: 'send 1 ALGO to ABC123...' },
      { description: 'Send USDC', message: 'transfer 5 USDC to XYZ...' },
      { description: 'Analyze ALGO (short)', message: 'analyze ALGO' },
      { description: 'ALGO analysis', message: 'ALGO analysis' },
      { description: 'Analyze Algorand', message: 'analyze Algorand' },
      { description: 'Get help', message: 'help' }
    ]
  })
}

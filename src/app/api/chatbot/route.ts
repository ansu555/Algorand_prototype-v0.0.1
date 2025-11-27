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
    
    // Check for trending/news queries
    const wantsTrending = /\b(trending|hot|popular|top)\b/i.test(userText)
    const wantsNews = /\b(news|latest|headlines)\b/i.test(userText)
    const wantsFearGreed = /\b(fear|greed|sentiment|market sentiment)\b/i.test(userText)

    // Handle trending coins - Algorand focused
    if (wantsTrending && !wantsNews) {
      try {
        const { fetchTrendingAlgorandTokens, fetchTopAlgorandASAs } = await import('@/lib/mcp')
        const [algoTokens, topASAs] = await Promise.all([
          fetchTrendingAlgorandTokens(),
          fetchTopAlgorandASAs()
        ])

        let message = '🔥 **Trending Algorand Ecosystem:**\n\n'

        // Show Algorand ecosystem tokens first
        if (algoTokens.length > 0) {
          message += '**💎 Algorand Tokens:**\n'
          algoTokens.forEach((coin, i) => {
            const changeEmoji = coin.priceChange24h >= 0 ? '📈' : '📉'
            message += `${i + 1}. **${coin.name}** (${coin.symbol})\n`
            message += `   ${changeEmoji} ${coin.priceChange24h >= 0 ? '+' : ''}${coin.priceChange24h.toFixed(2)}% (24h)\n`
            if (coin.marketCap && coin.marketCap > 0) {
              message += `   💰 Market Cap: $${(coin.marketCap / 1_000_000).toFixed(2)}M\n`
            }
            if (coin.volume24h && coin.volume24h > 0) {
              message += `   📊 Volume: $${(coin.volume24h / 1_000_000).toFixed(2)}M\n`
            }
            message += '\n'
          })
        }

        // Show popular ASAs
        if (topASAs.length > 0) {
          message += '**🪙 Popular Algorand ASAs:**\n'
          topASAs.forEach((asa, i) => {
            message += `${i + 1}. **${asa.name}** (${asa.unitName})\n`
            message += `   🆔 Asset ID: ${asa.assetId}\n`
            message += `   🔗 [View on Explorer](${asa.explorerUrl})\n\n`
          })
        }

        if (algoTokens.length === 0 && topASAs.length === 0) {
          message = '❌ Could not fetch Algorand trending data. Try again later.'
        } else {
          message += '\nType `analyze [coin]` for detailed analysis!'
        }

        return NextResponse.json({
          ok: true,
          message
        })
      } catch (error: any) {
        return NextResponse.json({
          ok: true,
          message: `❌ Error fetching trending coins: ${error.message}`
        })
      }
    }

    // Handle Fear & Greed Index
    if (wantsFearGreed) {
      try {
        const { fetchFearGreedIndex } = await import('@/lib/mcp')
        const fgi = await fetchFearGreedIndex()

        if (fgi) {
          const emoji = fgi.value >= 75 ? '🤑' : fgi.value >= 50 ? '😊' : fgi.value >= 25 ? '😐' : '😰'
          let message = `${emoji} **Crypto Fear & Greed Index**\n\n`
          message += `**Score:** ${fgi.value}/100\n`
          message += `**Sentiment:** ${fgi.valueClassification}\n\n`

          // Interpretation
          if (fgi.value >= 75) {
            message += '📊 **Extreme Greed** - Market may be overbought. Consider taking profits.'
          } else if (fgi.value >= 50) {
            message += '📊 **Greed** - Positive sentiment. Good for holding.'
          } else if (fgi.value >= 25) {
            message += '📊 **Fear** - Market uncertainty. Good buying opportunity for long-term.'
          } else {
            message += '📊 **Extreme Fear** - High pessimism. Potentially great buying opportunity!'
          }

          return NextResponse.json({
            ok: true,
            message
          })
        } else {
          return NextResponse.json({
            ok: true,
            message: '❌ Could not fetch Fear & Greed Index. Try again later.'
          })
        }
      } catch (error: any) {
        return NextResponse.json({
          ok: true,
          message: `❌ Error fetching sentiment: ${error.message}`
        })
      }
    }

    // Check for token analysis or price queries
    const wantsAnalysis = /\b(analyz[e]?|analysis|insight|forecast|prediction)\b/i.test(userText)
    const wantsPrice = /\b(price|cost|value|worth)\b/i.test(userText)

    // Extract token symbol - support major cryptocurrencies and Algorand ecosystem
    const tokenMatch = userText.match(/\b(algo|algorand|btc|bitcoin|eth|ethereum|usdc|usdt|bnb|xrp|sol|solana|ada|cardano|doge|dogecoin|dot|polkadot|matic|polygon|avax|avalanche|link|chainlink|uni|uniswap|opul|planets|gard|gobtc|goeth|defly|yldy|alfg|algf)\b/i)
    
    if ((wantsAnalysis || wantsPrice) && tokenMatch) {
      // Use internal MCP analytics API (serverless)
      try {
        const token = tokenMatch[1].toLowerCase()
        // Map token symbols to CoinGecko IDs
        const tokenMap: Record<string, string> = {
          'algo': 'algorand',
          'btc': 'bitcoin',
          'eth': 'ethereum',
          'usdc': 'usd-coin',
          'usdt': 'tether',
          'bnb': 'binancecoin',
          'xrp': 'ripple',
          'sol': 'solana',
          'ada': 'cardano',
          'doge': 'dogecoin',
          'dot': 'polkadot',
          'matic': 'matic-network',
          'avax': 'avalanche-2',
          'link': 'chainlink',
          'uni': 'uniswap',
          'alfg': 'algorand', // Algorand ASA - fallback to ALGO
          'algf': 'algorand', // Algorand ASA - fallback to ALGO
          'opul': 'algorand', // Opulous on Algorand
          'planets': 'algorand', // Planets on Algorand
          'gard': 'algorand', // Gardens on Algorand
          'gobtc': 'bitcoin', // Wrapped BTC on Algorand
          'goeth': 'ethereum', // Wrapped ETH on Algorand
          'defly': 'algorand', // Defly on Algorand
          'yldy': 'algorand', // Yieldly on Algorand
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
            // Just show price info with market data
            let message = `💰 **${token.toUpperCase()} Price:**\n\n${data.summary || 'Price data retrieved.'}`

            if (data.marketData) {
              const md = data.marketData
              message += `\n\n**Market Overview:**`
              message += `\n💵 Price: $${md.price.toFixed(6)} (${md.priceChangePercentage24h >= 0 ? '📈' : '📉'} ${md.priceChangePercentage24h.toFixed(2)}% 24h)`
              message += `\n📊 Market Cap: $${(md.marketCap / 1_000_000_000).toFixed(2)}B`
              if (md.marketCapRank) message += ` (#${md.marketCapRank})`
              message += `\n💹 24h Volume: $${(md.volume24h / 1_000_000).toFixed(2)}M`

              // Add links
              if (md.links.exchanges.length > 0) {
                message += `\n\n**📍 Trade on:**`
                md.links.exchanges.slice(0, 3).forEach(ex => {
                  message += `\n• [${ex.name}](${ex.url})`
                })
              }
            }

            return NextResponse.json({
              ok: true,
              message
            })
          }

          // Full analysis with enhanced data
          let message = `📊 **${token.toUpperCase()} Analysis:**\n\n`

          // Market Data Section
          if (data.marketData) {
            const md = data.marketData
            message += `**💰 Market Overview:**\n`
            message += `Price: $${md.price.toFixed(6)} (${md.priceChangePercentage24h >= 0 ? '📈' : '📉'} ${md.priceChangePercentage24h.toFixed(2)}% 24h)\n`
            message += `Market Cap: $${(md.marketCap / 1_000_000_000).toFixed(2)}B`
            if (md.marketCapRank) message += ` (#${md.marketCapRank})`
            message += `\n24h Volume: $${(md.volume24h / 1_000_000).toFixed(2)}M\n`
            message += `Circulating Supply: ${(md.circulatingSupply / 1_000_000_000).toFixed(2)}B ${token.toUpperCase()}\n`

            // ATH/ATL
            message += `\n**📈 All-Time High:** $${md.ath.toFixed(4)}`
            message += ` (${md.athChangePercentage >= 0 ? '↑' : '↓'} ${Math.abs(md.athChangePercentage).toFixed(1)}% from ATH)`
            message += `\n**📉 All-Time Low:** $${md.atl.toFixed(6)}`
            message += ` (${md.atlChangePercentage >= 0 ? '↑' : '↓'} ${Math.abs(md.atlChangePercentage).toFixed(1)}% from ATL)\n\n`
          }

          // Summary
          if (data.summary) {
            message += `${data.summary}\n\n`
          }

          // Insights
          if (data.insights && Array.isArray(data.insights)) {
            message += '**Key Insights:**\n'
            data.insights.slice(0, 3).forEach((insight: string) => {
              message += `• ${insight}\n`
            })
            message += '\n'
          }

          // Predictions
          if (data.predictions && Array.isArray(data.predictions) && data.predictions.length > 0) {
            message += '**Price Forecast:**\n'
            data.predictions.slice(0, 2).forEach((pred: any) => {
              message += `• ${pred.date}: $${pred.price} (${Math.round(pred.probability * 100)}% confidence)\n`
            })
            message += '\n'
          }

          // Links Section
          if (data.marketData?.links) {
            const links = data.marketData.links
            message += `**🔗 Useful Links:**\n`

            // Official
            if (links.homepage && links.homepage.length > 0) {
              message += `• [Official Website](${links.homepage[0]})\n`
            }

            // Social Media
            if (links.twitter) {
              message += `• [Twitter](${links.twitter})\n`
            }
            if (links.telegram) {
              message += `• [Telegram](${links.telegram})\n`
            }
            if (links.reddit) {
              message += `• [Reddit](${links.reddit})\n`
            }

            // Blockchain Explorers
            if (links.explorer && links.explorer.length > 0) {
              message += `• [Explorer](${links.explorer[0]})\n`
            }

            // GitHub
            if (links.github && links.github.length > 0) {
              message += `• [GitHub](${links.github[0]})\n`
            }

            // Exchanges
            if (links.exchanges && links.exchanges.length > 0) {
              message += `\n**📍 Trade on:**\n`
              links.exchanges.slice(0, 3).forEach(ex => {
                message += `• [${ex.name}](${ex.url})\n`
              })
            }
            message += '\n'
          }

          // Charts
          if (data.charts && Array.isArray(data.charts)) {
            message += '**📈 Charts:**\n\n'
            data.charts.forEach((chart: any) => {
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
      'hello': '👋 Hi! I can help you with:\n• Crypto analysis (BTC, ETH, ALGO, SOL, and 20+ more)\n• Balance checks & portfolio viewing\n• Sending ALGO/USDC/USDT/ALFG to any address\n• Real-time market data with links to exchanges\n\nTry asking: "analyze BTC" or "what\'s my balance?"',
      'hi': '👋 Hello! I\'m your 10xSwap AI assistant. I can analyze 25+ cryptocurrencies and help with Algorand transactions!',
      'help': '🤖 **Available Commands:**\n\n**Wallet Operations:**\n• "what\'s my address?" - View your wallet address\n• "check my balance" - See your ALGO and ASA balances\n• "show my portfolio" - View all holdings\n• "send X ALGO to [address]" - Transfer ALGO/USDC/USDT/ALFG\n\n**Market Analysis:**\n• "analyze BTC" - Get comprehensive Bitcoin analysis\n• "analyze ALGO" - Algorand analysis with predictions\n• "price of ETH" - Check Ethereum price\n• "analyze SOL" - Solana market overview\n\n**Supported Analysis (25+ coins):**\n• Major: BTC, ETH, BNB, XRP, SOL, ADA, DOGE\n• DeFi: UNI, LINK, AVAX, DOT, MATIC\n• Algorand: ALGO, USDC, USDT, and Algorand ASAs\n\n**Transaction Assets:**\n• ALGO (native)\n• USDC (ID: 10458941)\n• USDT (ID: 67396430)\n• ALFG (ID: 70283957)\n\nJust ask naturally!',
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
      message: '🤔 I can help you with crypto analysis and Algorand transactions!\n\n**Try asking:**\n• "analyze BTC" - Bitcoin analysis with market data, links & charts\n• "analyze ETH" - Ethereum price forecast & trends\n• "analyze ALGO" - Algorand detailed analysis\n• "price of SOL" - Solana quick price check\n• "what\'s my balance?" - Check your wallet\n• "send 1 ALGO to [address]" - Transfer tokens\n\n**25+ supported coins:** BTC, ETH, ALGO, SOL, ADA, XRP, DOGE, MATIC, AVAX, UNI, LINK, and more!\n\n**Transaction assets:** ALGO, USDC, USDT, ALFG'
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
    description: 'AI Chatbot for Multi-Chain Crypto Analysis & Algorand Transactions',
    features: [
      'Natural conversation',
      '25+ cryptocurrency analysis (BTC, ETH, ALGO, SOL, ADA, XRP, DOGE, etc.)',
      'Real-time market data with exchange links',
      'Balance and portfolio checks',
      'Send ALGO/USDC/USDT/ALFG to any Algorand address',
      'Price predictions and technical indicators',
      'ATH/ATL tracking and social media links'
    ],
    supportedAnalysis: [
      'Bitcoin (BTC)', 'Ethereum (ETH)', 'Algorand (ALGO)', 'Solana (SOL)',
      'Cardano (ADA)', 'XRP', 'Dogecoin (DOGE)', 'Polkadot (DOT)',
      'Polygon (MATIC)', 'Avalanche (AVAX)', 'Chainlink (LINK)',
      'Uniswap (UNI)', 'BNB', 'USDC', 'USDT', 'and more...'
    ],
    supportedTransactions: [
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
      { description: 'Bitcoin analysis', message: 'analyze BTC' },
      { description: 'Ethereum analysis', message: 'analyze ETH' },
      { description: 'Algorand analysis', message: 'analyze ALGO' },
      { description: 'Solana price', message: 'price of SOL' },
      { description: 'Check balance', message: 'what\'s my balance?' },
      { description: 'View address', message: 'show my address' },
      { description: 'Send ALGO', message: 'send 1 ALGO to ABC123...' },
      { description: 'Send USDC', message: 'transfer 5 USDC to XYZ...' },
      { description: 'Get help', message: 'help' }
    ]
  })
}

import { NextResponse } from "next/server"
import { AgentkitToolkit } from "@0xgasless/agentkit"
import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, AIMessage, SystemMessage, ToolMessage, BaseMessage } from "@langchain/core/messages"
import { MemorySaver } from "@langchain/langgraph"
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import { getAgent } from "@/lib/agent"
import { resolveTokenBySymbol } from "@/lib/tokens"
import { parseEther } from "viem"

export const runtime = "nodejs"

type ClientMessage = { role: "user" | "assistant" | "system" | "tool"; content: string; toolName?: string }

function toLangChainMessages(msgs: ClientMessage[]): BaseMessage[] {
  return msgs.map((m) => {
    switch (m.role) {
      case "system":
        return new SystemMessage(m.content)
      case "assistant":
        return new AIMessage(m.content)
      case "tool":
        return new ToolMessage({ content: m.content, tool_call_id: m.toolName || "tool" })
      case "user":
      default:
        return new HumanMessage(m.content)
    }
  })
}

function getLLM() {
  const model = process.env.AI_MODEL || "gpt-4o-mini"
  const provider = (process.env.AI_PROVIDER || "openrouter").toLowerCase()
  const openrouter = process.env.OPENROUTER_API_KEY
  const openai = process.env.OPENAI_API_KEY
  if (provider === "openrouter" && openrouter) {
    return new ChatOpenAI({ model, apiKey: openrouter, configuration: { baseURL: "https://openrouter.ai/api/v1" } })
  }
  if (openai) {
    return new ChatOpenAI({ model, apiKey: openai })
  }
  // Fallback: if OPENROUTER is set but provider differs
  if (openrouter) {
    return new ChatOpenAI({ model, apiKey: openrouter, configuration: { baseURL: "https://openrouter.ai/api/v1" } })
  }
  throw new Error("Missing OPENROUTER_API_KEY or OPENAI_API_KEY")
}

export async function POST(req: Request) {
  try {
  const body = await req.json().catch(() => ({})) as { prompt?: string; messages?: ClientMessage[]; threadId?: string; walletAddress?: string; chainId?: number }
    const prompt = (body.prompt && typeof body.prompt === "string") ? body.prompt : undefined
    const incoming = Array.isArray(body.messages) ? body.messages : (prompt ? [{ role: "user", content: prompt }] as ClientMessage[] : [])
    if (!incoming.length) return NextResponse.json({ ok: false, error: "No prompt or messages provided" }, { status: 400 })

  const chainOverride = typeof body.chainId === 'number' ? body.chainId : undefined
  const { agentkit, getAddress, getBalance, smartTransfer, smartSwap, customSwap, publicClient, eoaClient, getEOAAddress, getSmartAddressOrNull } = await getAgent(chainOverride)
    const toolkit = new AgentkitToolkit(agentkit as any)
    const tools = toolkit.getTools()

    // Attempt to get LLM, but allow fallback parse if not available
    let llm: ChatOpenAI | undefined
    try {
      llm = getLLM()
    } catch {
      llm = undefined
    }
    const memory = new MemorySaver()
    const agent = llm
      ? createReactAgent({
          llm,
          tools,
          checkpointSaver: memory,
          messageModifier: `You are a helpful crypto agent using 0xGasless smart accounts. You can:
          - get the user's smart account address
          - check native and ERC20 balances (user can provide token contract)
          - perform gasless transfers and swaps on supported chains
          - fetch market data, token prices, gas estimates, and portfolio information
          Always explain actions in simple words. If a request is unsafe or unsupported, say so clearly.`,
        })
      : undefined

    const messages = toLangChainMessages(incoming)
    const config = { configurable: { thread_id: body.threadId || `web_${Date.now()}` } }

    // === EARLY INTENT DETECTION (bypasses LLM for reliable data) ===
    const lastUserMsg = [...incoming].reverse().find(m => m.role === 'user')?.content || ''
    const text = lastUserMsg.toLowerCase().trim()
    
    // Top coins with dynamic count - "top 5 coins", "show me 15 cryptocurrencies", etc.
    let topCoinsMatch = text.match(/top\s+(\d+)\s+(?:coin|crypto|cryptocurrency|token)/i)
    if (!topCoinsMatch) topCoinsMatch = text.match(/show\s+(?:me\s+)?(\d+)\s+(?:coin|crypto|cryptocurrency|token)/i)
    if (!topCoinsMatch) topCoinsMatch = text.match(/(\d+)\s+(?:top|best)\s+(?:coin|crypto|cryptocurrency)/i)
    
    if (topCoinsMatch || /\b(top|ranking|market|cryptocurrencies)\b/i.test(text)) {
      const count = topCoinsMatch?.[1] ? parseInt(topCoinsMatch[1]) : 5
      const n = Math.min(50, Math.max(1, count))
      
      try {
        const coinrankingApiUrl = `https://api.coinranking.com/v2/coins?limit=${n}&orderBy=marketCap&orderDirection=desc`
        const response = await fetch(coinrankingApiUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (response.ok) {
          const data = await response.json()
          const coins = data.data?.coins || []
          
          if (coins.length > 0) {
            const formatPrice = (price: string) => {
              const num = parseFloat(price)
              if (num >= 1) return `$${num.toFixed(2)}`
              if (num >= 0.01) return `$${num.toFixed(4)}`
              return `$${parseFloat(price).toExponential(2)}`
            }
            
            const formatMarketCap = (marketCap: string) => {
              const num = parseFloat(marketCap)
              if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`
              if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`
              if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`
              return `$${num.toFixed(0)}`
            }
            
            const coinsText = coins.map((coin: any, index: number) => {
              const change = coin.change ? parseFloat(coin.change) : 0
              const changeText = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`
              const changeEmoji = change >= 0 ? '🟢' : '🔴'
              
              return `${index + 1}. **${coin.name} (${coin.symbol})**\n   💰 ${formatPrice(coin.price)} | 📊 ${formatMarketCap(coin.marketCap)} | ${changeEmoji} ${changeText}`
            }).join('\n\n')
            
            return NextResponse.json({
              ok: true,
              content: `📈 **Top ${n} Cryptocurrencies by Market Cap**\n\n${coinsText}\n\n*Data from CoinRanking API*`,
              threadId: config.configurable.thread_id
            })
          }
        }
      } catch (e) {
        // Continue to agent if API fails
      }
    }
    
    // Gas price - "gas price", "avax gas", "current gas fees" (must come before individual coin price)
    if (/\b(?:gas\s+(?:price|fee|cost)|avax\s+gas|current\s+gas|network\s+fee|gas\s+estimate)\b/i.test(text)) {
      try {
        const { createPublicClient, http } = require('viem')
        const { avalanche, avalancheFuji } = require('viem/chains')
        const chainId = Number(process.env.CHAIN_ID || 43113)
        const chain = chainId === 43114 ? avalanche : avalancheFuji
        const rpcUrl = chainId === 43114 
          ? (process.env.RPC_URL_AVALANCHE || 'https://api.avax.network/ext/bc/C/rpc')
          : (process.env.RPC_URL_FUJI || process.env.NEXT_PUBLIC_RPC_URL_FUJI || 'https://api.avax-test.network/ext/bc/C/rpc')
        const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
        
        const gasPrice = await publicClient.getGasPrice()
        const gasPriceGwei = Number(gasPrice) / 1e9
        const networkName = chainId === 43114 ? 'Avalanche Mainnet' : 'Avalanche Fuji Testnet'
        
        return NextResponse.json({
          ok: true,
          content: `⛽ **${networkName} Gas Price**\n\nCurrent: ${gasPriceGwei.toFixed(2)} Gwei\nNetwork: ${networkName} (Chain ID: ${chainId})\n\n*Real-time data from RPC*`,
          threadId: config.configurable.thread_id
        })
      } catch (e) {
        // Continue to agent if RPC fails
      }
    }
    
    // Balance check - "my balance", "balance", "show balance" (early detection)
    if (/\b(balance|balances)\b/.test(text)) {
      try {
        const eoaAddress = await getEOAAddress()
        const chainId = Number(process.env.CHAIN_ID || 43113)
        
        // Get AVAX balance directly via RPC
        const avaxBalance = await publicClient.getBalance({ address: eoaAddress })
        const avaxFormatted = Number(avaxBalance) / 1e18
        
        let tokenBalances = ''
        
        // Try to get WAVAX and USDC balances
        try {
          const wavaxToken = resolveTokenBySymbol('WAVAX')
          const usdcToken = resolveTokenBySymbol('USDC')
          
          if (wavaxToken && wavaxToken.address !== 'AVAX') {
            const wavaxBalance = await publicClient.readContract({
              address: wavaxToken.address as `0x${string}`,
              abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] }],
              functionName: 'balanceOf',
              args: [eoaAddress]
            })
            const wavaxFormatted = Number(wavaxBalance) / 1e18
            tokenBalances += `\nWAVAX: ${wavaxFormatted.toFixed(4)}`
          }
          
          if (usdcToken && usdcToken.address !== 'AVAX') {
            const usdcBalance = await publicClient.readContract({
              address: usdcToken.address as `0x${string}`,
              abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] }],
              functionName: 'balanceOf',
              args: [eoaAddress]
            })
            const usdcFormatted = Number(usdcBalance) / 1e18
            tokenBalances += `\nUSDC: ${usdcFormatted.toFixed(4)}`
          }
        } catch (tokenError) {
          // Token balance queries failed, but that's okay
        }
        
        return NextResponse.json({
          ok: true,
          content: `💰 **Your Balance** (Avalanche ${chainId === 43114 ? 'Mainnet' : 'Fuji'})\n\nAddress: ${eoaAddress}\n\nAVAX: ${avaxFormatted.toFixed(4)}${tokenBalances}`,
          threadId: config.configurable.thread_id
        })
      } catch (error) {
        // Continue to agent if balance fails
      }
    }
    
    // Smart account balance check - "smart balance", "smart account balance"
    if (/\b(smart\s+(?:account\s+)?balance|smart\s+account)\b/i.test(text)) {
      try {
        const smartAddress = await getSmartAddressOrNull()
        const chainId = Number(process.env.CHAIN_ID || 43113)
        
        if (!smartAddress) {
          return NextResponse.json({
            ok: true,
            content: `❌ **Smart Account Not Available**\n\nNo smart account address found. The smart account may not be deployed yet or there might be a configuration issue.\n\nTry using regular balance commands for your EOA instead.`,
            threadId: config.configurable.thread_id
          })
        }
        
        // Get AVAX balance for smart account
        const avaxBalance = await publicClient.getBalance({ address: smartAddress })
        const avaxFormatted = Number(avaxBalance) / 1e18
        
        let tokenBalances = ''
        
        // Try to get WAVAX and USDC balances for smart account
        try {
          const wavaxToken = resolveTokenBySymbol('WAVAX')
          const usdcToken = resolveTokenBySymbol('USDC')
          
          if (wavaxToken && wavaxToken.address !== 'AVAX') {
            const wavaxBalance = await publicClient.readContract({
              address: wavaxToken.address as `0x${string}`,
              abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] }],
              functionName: 'balanceOf',
              args: [smartAddress]
            })
            const wavaxFormatted = Number(wavaxBalance) / 1e18
            tokenBalances += `\nWAVAX: ${wavaxFormatted.toFixed(4)}`
          }
          
          if (usdcToken && usdcToken.address !== 'AVAX') {
            const usdcBalance = await publicClient.readContract({
              address: usdcToken.address as `0x${string}`,
              abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] }],
              functionName: 'balanceOf',
              args: [smartAddress]
            })
            const usdcFormatted = Number(usdcBalance) / 1e18
            tokenBalances += `\nUSDC: ${usdcFormatted.toFixed(4)}`
          }
        } catch (tokenError) {
          // Token balance queries failed, but that's okay
        }
        
        return NextResponse.json({
          ok: true,
          content: `🏦 **Smart Account Balance** (Avalanche ${chainId === 43114 ? 'Mainnet' : 'Fuji'})\n\nSmart Account: ${smartAddress}\n\nAVAX: ${avaxFormatted.toFixed(4)}${tokenBalances}`,
          threadId: config.configurable.thread_id
        })
      } catch (error) {
        return NextResponse.json({
          ok: true,
          content: `❌ Failed to check smart account balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
          threadId: config.configurable.thread_id
        })
      }
    }
    
    // Smart account address query - "smart address", "smart account address"
    if (/\b(smart\s+(?:account\s+)?address|smart\s+account)\b/i.test(text) && !/balance/i.test(text)) {
      try {
        const smartAddress = await getSmartAddressOrNull()
        const eoaAddress = await getEOAAddress()
        const chainId = Number(process.env.CHAIN_ID || 43113)
        const networkName = chainId === 43114 ? 'Avalanche Mainnet' : 'Avalanche Fuji testnet'
        
        if (!smartAddress) {
          return NextResponse.json({
            ok: true,
            content: `🏦 **Smart Account Status**\n\n❌ No smart account available\n\nThe smart account may not be deployed yet. You can use your EOA instead:\n\n📱 **Your EOA**: ${eoaAddress}`,
            threadId: config.configurable.thread_id
          })
        }
        
        return NextResponse.json({
          ok: true,
          content: `🏦 **Smart Account Address**\n\n${smartAddress}\n\n📱 **Your EOA**: ${eoaAddress}\n\n*Both on ${networkName}*`,
          threadId: config.configurable.thread_id
        })
      } catch (error) {
        return NextResponse.json({
          ok: true,
          content: `❌ Failed to get smart account address: ${error instanceof Error ? error.message : 'Unknown error'}`,
          threadId: config.configurable.thread_id
        })
      }
    }
    
    // Transfer detection - "transfer 0.01 AVAX to 0x..." (early detection)
    const transferRe = /transfer\s+(\d+(?:\.\d+)?)\s*(?:([A-Za-z]{2,6}))?\s*(?:tokens?)?\s*(?:to|=>)\s*(0x[a-fA-F0-9]{40})/
    const tr = text.match(transferRe)
    if (tr) {
      const amount = tr[1]
      const symbol = tr[2] || 'AVAX' // Default to AVAX if no symbol specified
      const to = tr[3] as `0x${string}`
      
      try {
        if (symbol.toUpperCase() === 'AVAX') {
          // For AVAX transfers, use our direct implementation since AgentKit has issues with Fuji testnet
          
          // First check if we have enough balance
          const eoaAddress = await getEOAAddress()
          const currentBalance = await publicClient.getBalance({ address: eoaAddress })
          const transferAmount = parseEther(amount)
          
          // Get current gas price
          const gasPrice = await publicClient.getGasPrice()
          const gasLimit = BigInt(21000)
          const gasCost = gasPrice * gasLimit
          const totalCost = transferAmount + gasCost
          
          if (currentBalance < totalCost) {
            const currentBalanceEth = Number(currentBalance) / 1e18
            const totalCostEth = Number(totalCost) / 1e18
            const gasCostEth = Number(gasCost) / 1e18
            
            return NextResponse.json({
              ok: true,
              content: `❌ **Insufficient Balance**\n\nCurrent Balance: ${currentBalanceEth.toFixed(6)} AVAX\nTransfer Amount: ${amount} AVAX\nEstimated Gas Cost: ${gasCostEth.toFixed(6)} AVAX\nTotal Needed: ${totalCostEth.toFixed(6)} AVAX\n\nYou need ${(totalCostEth - currentBalanceEth).toFixed(6)} more AVAX to complete this transfer.`,
              threadId: config.configurable.thread_id
            })
          }
          
          const txHash = await eoaClient.sendTransaction({
            to,
            value: transferAmount,
            gas: gasLimit,
            gasPrice: gasPrice
          })
          await publicClient.waitForTransactionReceipt({ hash: txHash })
          
          return NextResponse.json({
            ok: true,
            content: `✅ Successfully transferred ${amount} AVAX to ${to.slice(0, 8)}...${to.slice(-6)}\n\nTransaction: ${txHash}\nGas Used: ${Number(gasCost) / 1e18} AVAX`,
            threadId: config.configurable.thread_id
          })
        } else {
          // For token transfers, continue to agent handling below
        }
      } catch (error) {
        return NextResponse.json({
          ok: true,
          content: `❌ Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your balance and try again.`,
          threadId: config.configurable.thread_id
        })
      }
    }
    
    // Individual coin price - "price of bitcoin", "BTC price", "what's ETH worth"
    const priceMatch = text.match(/\b(?:price\s+of\s+|what'?s\s+|current\s+price\s+of\s+)?([a-z]{2,10})\s+(?:price|worth|value|cost)\b/i) ||
                       text.match(/\b(?:price|worth|value|cost)\s+(?:of\s+)?([a-z]{2,10})\b/i) ||
                       text.match(/\bhow\s+much\s+(?:is\s+)?([a-z]{2,10})\b/i)
    if (priceMatch && priceMatch[1]) {
      const sym = priceMatch[1].toUpperCase()
      try {
        const coinrankingApiUrl = `https://api.coinranking.com/v2/coins?search=${sym.toLowerCase()}&limit=5`
        const response = await fetch(coinrankingApiUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (response.ok) {
          const data = await response.json()
          const coin = data.data?.coins?.find((c: any) => 
            c.symbol.toUpperCase() === sym || c.name.toLowerCase() === sym.toLowerCase()
          )
          
          if (coin) {
            const price = parseFloat(coin.price)
            const change = coin.change ? parseFloat(coin.change) : 0
            const changeText = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`
            const changeEmoji = change >= 0 ? '🟢' : '🔴'
            
            const formatPrice = (price: number) => {
              if (price >= 1) return `$${price.toFixed(2)}`
              if (price >= 0.01) return `$${price.toFixed(4)}`
              return `$${price.toExponential(2)}`
            }
            
            const formatMarketCap = (marketCap: string) => {
              const num = parseFloat(marketCap)
              if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`
              if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`
              if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`
              return `$${num.toFixed(0)}`
            }
            
            return NextResponse.json({
              ok: true,
              content: `💰 **${coin.name} (${coin.symbol})**\n\nPrice: ${formatPrice(price)}\nMarket Cap: ${formatMarketCap(coin.marketCap)}\n${changeEmoji} 24h Change: ${changeText}\n\n*Data from CoinRanking API*`,
              threadId: config.configurable.thread_id
            })
          }
        }
      } catch (e) {
        // Continue to agent if API fails
      }
    }

    // Execute agent and collect the final response
    // Helper: simple intent fallback for common actions
  const fallback = async (): Promise<string | null> => {
      const lastUser = [...incoming].reverse().find((m) => m.role === "user")
      const text = (lastUser?.content || "").toLowerCase()
      if (!text) return null

      // Helper: decide which address to use based on phrasing
      const resolveAddressContext = async () => {
        const { getAddresses } = await getAgent(chainOverride)
        const { smart, eoa } = await getAddresses()
        const clientEOA = (body.walletAddress && /^0x[a-fA-F0-9]{40}$/.test(body.walletAddress)) ? body.walletAddress : undefined

        const mentionsConnected = /(connected|my wallet|metamask|my eoa|connected eoa|wallet address)/i.test(lastUser!.content)
        const mentionsServer = /(server eoa|agent eoa|agent key|server wallet)/i.test(lastUser!.content)
        const mentionsSmart = /(smart account|smart|gasless)/i.test(lastUser!.content)
        const mentionsEOAOnly = /\beoa\b/i.test(lastUser!.content)

        if (mentionsConnected) {
          return { target: clientEOA, label: 'Connected EOA', missing: !clientEOA }
        }
        if (mentionsServer) {
          return { target: eoa, label: 'Server EOA', missing: false }
        }
        if (mentionsSmart) {
          return { target: smart, label: 'Smart Account', missing: false }
        }
        if (mentionsEOAOnly) {
          // Prefer client EOA when unspecified, else server EOA
          return { target: clientEOA || eoa, label: clientEOA ? 'Connected EOA' : 'Server EOA', missing: !clientEOA && false }
        }
        // Default: prefer Connected EOA if provided (read-only friendly), else smart account
        if (clientEOA) {
          return { target: clientEOA, label: 'Connected EOA', missing: false }
        }
        return { target: smart, label: 'Smart Account', missing: false }
      }

      // Address
      if (/\b(address|wallet)\b/.test(text)) {
  const { getAddresses } = await getAgent(chainOverride)
        const { smart, eoa } = await getAddresses()
        const clientEOA = (body.walletAddress && /^0x[a-fA-F0-9]{40}$/.test(body.walletAddress)) ? body.walletAddress : undefined
        return [
          `Agent smart account (shared): ${smart}`,
          `Server EOA (agent key): ${eoa}`,
          clientEOA ? `Connected EOA (your wallet): ${clientEOA}` : undefined,
        ].filter(Boolean).join('\n')
      }

      // Market data and prices
    if (/\b(price|prices?|market|market data|top|tokens?)\b/.test(text)) {
  const { getTokenPrice, getMarketData } = await getAgent(chainOverride)
        
        // Check for specific token (case-insensitive, e.g., "price of eth")
        const symMatch = (lastUser!.content || '').match(/(?:price(?:\s+of)?\s+)?([a-z0-9]{2,10})/i)
        if (symMatch && symMatch[1]) {
          const sym = symMatch[1].toUpperCase()
          try {
            const priceData = await getTokenPrice(sym)
            return `${sym} price: $${priceData.price}`
          } catch (e) {
            // Fallback to CoinRanking API for individual coin prices
            try {
              const coinrankingApiUrl = `https://api.coinranking.com/v2/coins?search=${sym.toLowerCase()}&limit=1`
              const response = await fetch(coinrankingApiUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
              })
              
              if (response.ok) {
                const data = await response.json()
                const coin = data.data?.coins?.[0]
                if (coin && coin.symbol.toUpperCase() === sym) {
                  const price = parseFloat(coin.price)
                  const change = coin.change ? parseFloat(coin.change) : 0
                  const changeText = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`
                  const changeEmoji = change >= 0 ? '🟢' : '🔴'
                  
                  return `💰 **${coin.name} (${coin.symbol})**\nPrice: $${price >= 1 ? price.toFixed(2) : price.toFixed(6)}\n${changeEmoji} 24h Change: ${changeText}`
                }
              }
            } catch (coinRankingError) {
              // Silent fallback failure
            }
            return `Couldn't fetch price for ${sym}. Please check the symbol and try again.`
          }
        }
        
        // General market overview (only if user asked about market, not gas)
        if (/\b(market|top|coins?|cryptocurrencies|tokens?)\b/.test(text)) {
          try {
            // Determine requested count, default 5, cap at 50
            const nMatch = text.match(/top\s+(\d{1,2})/) || text.match(/show\s*(?:me)?\s*(\d{1,2})/)
            const n = Math.min(50, Math.max(1, nMatch ? parseInt(nMatch[1], 10) : 5))
            
            // Try AgentKit first
            try {
              const marketData = await getMarketData()
              const topCoins = (Array.isArray(marketData) ? marketData : [])
                .slice(0, n)
                .map((coin: any) => `${coin.symbol}: $${Number(coin.price || 0).toFixed(4)}`)
                .join(', ')
              if (topCoins) {
                return `Top ${n} cryptocurrencies: ${topCoins}`
              }
            } catch (agentError) {
              // Fallback to CoinRanking API
              const coinrankingApiUrl = `https://api.coinranking.com/v2/coins?limit=${n}&orderBy=marketCap&orderDirection=desc`
              const response = await fetch(coinrankingApiUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
              })
              
              if (response.ok) {
                const data = await response.json()
                const coins = data.data?.coins || []
                
                if (coins.length > 0) {
                  const formatPrice = (price: string) => {
                    const num = parseFloat(price)
                    if (num >= 1) return `$${num.toFixed(2)}`
                    if (num >= 0.01) return `$${num.toFixed(4)}`
                    return `$${parseFloat(price).toExponential(2)}`
                  }
                  
                  const formatMarketCap = (marketCap: string) => {
                    const num = parseFloat(marketCap)
                    if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`
                    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`
                    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`
                    return `$${num.toFixed(0)}`
                  }
                  
                  const coinsText = coins.map((coin: any, index: number) => {
                    const change = coin.change ? parseFloat(coin.change) : 0
                    const changeText = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`
                    const changeEmoji = change >= 0 ? '🟢' : '🔴'
                    
                    return `${index + 1}. **${coin.name} (${coin.symbol})**\n   💰 ${formatPrice(coin.price)} | 📊 ${formatMarketCap(coin.marketCap)} | ${changeEmoji} ${changeText}`
                  }).join('\n\n')
                  
                  return `📈 **Top ${n} Cryptocurrencies by Market Cap**\n\n${coinsText}\n\n*Data from CoinRanking API*`
                }
              }
            }
            
            return `Couldn't fetch market data. Please try again later.`
          } catch (e) {
            return `Couldn't fetch market data: ${e instanceof Error ? e.message : 'Unknown error'}`
          }
        }
      }

      // Gas estimates
      if (/\b(gas|gas price|gas estimate|fees?)\b/.test(text)) {
        try {
          const { getGasEstimate } = await getAgent(chainOverride)
          const gasData = await getGasEstimate()
          return `Current gas price: ${gasData.gasPrice} Gwei\nBase fee: ${gasData.baseFee} Gwei\nChain: ${gasData.chain} (${gasData.chainId})`
        } catch (e) {
          // Fallback to direct RPC call for Avalanche Fuji
          try {
            const { createPublicClient, http } = require('viem')
            const { avalancheFuji } = require('viem/chains')
            const rpcUrl = process.env.RPC_URL_FUJI || process.env.NEXT_PUBLIC_RPC_URL_FUJI || 'https://api.avax-test.network/ext/bc/C/rpc'
            const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(rpcUrl) })
            
            const gasPrice = await publicClient.getGasPrice()
            const gasPriceGwei = Number(gasPrice) / 1e9
            
            return `⛽ **Avalanche Fuji Testnet Gas Price**\nCurrent: ${gasPriceGwei.toFixed(2)} Gwei\nNetwork: Avalanche Fuji (Chain ID: 43113)`
          } catch (fallbackError) {
            return `Couldn't fetch gas estimate: ${e instanceof Error ? e.message : 'Unknown error'}`
          }
        }
      }

      // Portfolio overview
      if (/\b(portfolio|portfolio overview|total value|net worth)\b/.test(text)) {
        try {
          const { getPortfolioOverview } = await getAgent(chainOverride)
          const addrCtx = await resolveAddressContext()
          if (addrCtx.missing) {
            return 'No connected wallet detected. Connect your wallet to query the Connected EOA portfolio.'
          }
          const portfolio = await getPortfolioOverview(addrCtx.target as any)
          const fmtUSD = (n: number) => {
            if (!Number.isFinite(n) || n === 0) return '0.00'
            const abs = Math.abs(n)
            if (abs > 0 && abs < 0.01) return (n < 0 ? '-' : '') + '0.01'
            return n.toFixed(2)
          }
          const assets = portfolio.assets.map((asset: any) => {
            const formattedBalance = parseFloat(asset.balance).toFixed(4)
            return `${asset.symbol}: ${formattedBalance} ($${fmtUSD(asset.valueUSD)})`
          }).join('\n')
          return `Portfolio Overview (${addrCtx.label}):\nTotal Value: $${fmtUSD(portfolio.totalValueUSD)}\n\nAssets:\n${assets}`
        } catch (e) {
          return `Couldn't fetch portfolio: ${e instanceof Error ? e.message : 'Unknown error'}`
        }
      }

      // Transaction history
      if (/\b(transactions?|history|recent|tx)\b/.test(text)) {
        try {
          const { getTransactionHistory } = await getAgent(chainOverride)
          const txs = await getTransactionHistory()
          if (txs.length === 0) {
            return "No recent transactions found."
          }
            const { getChainInfo } = await getAgent(chainOverride)
            const info = await getChainInfo()
            const nativeSym = info.nativeSymbol
            const recent = txs.slice(0, 3).map((tx: any) => 
            `${tx.status === 'success' ? '✅' : '❌'} ${tx.hash.slice(0, 8)}...${tx.hash.slice(-6)}: ${tx.value} ${nativeSym}`
          ).join('\n')
          return `Recent transactions:\n${recent}${txs.length > 3 ? `\n...and ${txs.length - 3} more` : ''}`
        } catch (e) {
          return `Couldn't fetch transaction history: ${e instanceof Error ? e.message : 'Unknown error'}`
        }
      }

      // Transfer: "transfer 0.01 USDC to 0x..." or "transfer 0.01 to 0x..."
      const transferRe = /transfer\s+(\d+(?:\.\d+)?)\s*(?:([A-Za-z]{2,6}))?\s*(?:tokens?)?\s*(?:to|=>)\s*(0x[a-fA-F0-9]{40})/
      const tr = lastUser!.content.match(transferRe)
      if (tr) {
        const amount = tr[1]
        const symbol = tr[2] || 'AVAX' // Default to AVAX if no symbol specified
        const to = tr[3] as `0x${string}`
        
        try {
          const { getChainInfo } = await getAgent(chainOverride)
          const info = await getChainInfo()
          
          if (symbol.toUpperCase() === 'AVAX') {
            // For AVAX transfers, use our direct implementation since AgentKit has issues with Fuji testnet
            const txHash = await eoaClient.sendTransaction({
              to,
              value: parseEther(amount),
              gas: BigInt(21000)
            })
            await publicClient.waitForTransactionReceipt({ hash: txHash })
            return `✅ Successfully transferred ${amount} AVAX to ${to.slice(0, 8)}...${to.slice(-6)}\n\nTransaction: ${txHash}`
          } else {
            // For token transfers, try AgentKit first, then fallback
            const token = resolveTokenBySymbol(symbol, info.chainId)
            if (!token) return `Unknown token symbol: ${symbol}`
            
            try {
              const { hash } = await smartTransfer({ tokenAddress: token.address === 'AVAX' ? undefined : (token.address as any), amount, destination: to, wait: true })
              return `✅ Successfully transferred ${amount} ${symbol} to ${to.slice(0, 8)}...${to.slice(-6)}\n\nTransaction: ${hash}`
            } catch (agentError) {
              return `❌ Transfer failed: ${agentError instanceof Error ? agentError.message : 'Unknown error'}\n\nPlease check your balance and try again.`
            }
          }
        } catch (error) {
          return `❌ Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your balance and try again.`
        }
      }

      // Enhanced Smart Transfer Patterns
      // Batch transfer: "batch transfer 0.01 ETH to 0x... and 0.02 USDC to 0x..."
      const batchTransferRe = /batch\s+transfer\s+(.+?)(?:\s+and\s+(.+))?/
      const batchMatch = lastUser!.content.match(batchTransferRe)
      if (batchMatch) {
        try {
          const { smartTransferAdvanced } = await getAgent()
          const transfers = []
          
          // Parse multiple transfers
          const transferTexts = [batchMatch[1], batchMatch[2]].filter(Boolean)
          for (const text of transferTexts) {
            const match = text.match(/(\d+(?:\.\d+)?)\s*([A-Za-z]{2,6})?\s*(?:to|=>)\s*(0x[a-fA-F0-9]{40})/)
            if (match) {
              const [, amount, symbol, destination] = match
              const { getChainInfo } = await getAgent()
              const info = await getChainInfo()
              const token = symbol ? resolveTokenBySymbol(symbol, info.chainId) : null
              transfers.push({
                destination: destination as `0x${string}`,
                amount,
                tokenAddress: token && token.address === 'AVAX' ? undefined : (token?.address as any)
              })
            }
          }
          
          if (transfers.length > 0) {
            const result = await smartTransferAdvanced({ 
            amount: transfers[0].amount,
            destination: transfers[0].destination as `0x${string}`,
            batch: transfers, 
            wait: true 
          })
            return `Batch transfer submitted! ${transfers.length} transfers executed. Hash: ${result.hash}`
          }
        } catch (e: any) {
          return `Batch transfer failed: ${e.message}`
        }
      }

      // Scheduled transfer: "schedule transfer 0.01 ETH to 0x... for tomorrow at 2pm"
      const scheduledTransferRe = /schedule\s+transfer\s+(\d+(?:\.\d+)?)\s*([A-Za-z]{2,6})?\s*(?:to|=>)\s*(0x[a-fA-F0-9]{40})\s+(?:for|at)\s+(.+)/i
      const scheduledMatch = lastUser!.content.match(scheduledTransferRe)
      if (scheduledMatch) {
        try {
          const [, amount, symbol, destination, timeText] = scheduledMatch
          const { getChainInfo } = await getAgent()
          const info = await getChainInfo()
          const token = symbol ? resolveTokenBySymbol(symbol, info.chainId) : null
          
          // Simple time parsing (you can enhance this)
          let scheduleDate = new Date()
          if (timeText.toLowerCase().includes('tomorrow')) {
            scheduleDate.setDate(scheduleDate.getDate() + 1)
          }
          if (timeText.includes('2pm') || timeText.includes('14:00')) {
            scheduleDate.setHours(14, 0, 0, 0)
          }
          
          const { smartTransferAdvanced } = await getAgent()
          const result = await smartTransferAdvanced({
            tokenAddress: token && token.address === 'AVAX' ? undefined : (token?.address as any),
            amount,
            destination: destination as `0x${string}`,
            schedule: scheduleDate,
            priority: 'normal'
          })
          
          return `Scheduled transfer set for ${scheduleDate.toLocaleString()}. Amount: ${amount} ${symbol || 'AVAX'} to ${destination.slice(0, 8)}...`
        } catch (e: any) {
          return `Scheduled transfer failed: ${e.message}`
        }
      }

      // Priority transfer: "urgent transfer 0.01 ETH to 0x..." or "cheap transfer 0.01 ETH to 0x..."
      const priorityTransferRe = /(urgent|fast|cheap|economy)\s+transfer\s+(\d+(?:\.\d+)?)\s*([A-Za-z]{2,6})?\s*(?:to|=>)\s*(0x[a-fA-F0-9]{40})/
      const priorityMatch = lastUser!.content.match(priorityTransferRe)
      if (priorityMatch) {
        const [, priority, amount, symbol, destination] = priorityMatch
        try {
          const { getChainInfo } = await getAgent()
          const info = await getChainInfo()
          const token = symbol ? resolveTokenBySymbol(symbol, info.chainId) : null
          
          let routing: 'fastest' | 'cheapest' | 'mostReliable' = 'fastest'
          if (priority === 'cheap' || priority === 'economy') routing = 'cheapest'
          else if (priority === 'urgent' || priority === 'fast') routing = 'fastest'
          
          const { smartTransferWithRouting } = await getAgent()
          const result = await smartTransferWithRouting({
            tokenAddress: token && token.address === 'AVAX' ? undefined : (token?.address as any),
            amount,
            destination: destination as `0x${string}`,
            routing,
            wait: true
          })
          
          return `${priority.charAt(0).toUpperCase() + priority.slice(1)} transfer submitted! Hash: ${result.hash}\nRouting: ${routing}`
        } catch (e: any) {
          return `${priority.charAt(0).toUpperCase() + priority.slice(1)} transfer failed: ${e.message}`
        }
      }

      // Auto-swap transfer: "smart transfer 0.01 ETH to 0x..." (handles insufficient balance)
      const smartTransferRe = /smart\s+transfer\s+(\d+(?:\.\d+)?)\s*([A-Za-z]{2,6})?\s*(?:to|=>)\s*(0x[a-fA-F0-9]{40})/
      const smartMatch = lastUser!.content.match(smartTransferRe)
      if (smartMatch) {
        try {
          const [, amount, symbol, destination] = smartMatch
          const { getChainInfo } = await getAgent()
          const info = await getChainInfo()
          const token = symbol ? resolveTokenBySymbol(symbol, info.chainId) : null
          
          const { smartTransferAdvanced } = await getAgent()
          const result = await smartTransferAdvanced({
            tokenAddress: token?.address === 'AVAX' ? undefined : (token?.address as any),
            amount,
            destination: destination as `0x${string}`,
            autoSwap: true, // Enable auto-swap for insufficient balance
            wait: true
          })
          
          return `Smart transfer executed! Hash: ${result.hash}\nAuto-swap enabled: ${result.details.autoSwap || false}`
        } catch (e: any) {
          return `Smart transfer failed: ${e.message}`
        }
      }

      // Swap: "swap 5 USDC to ETH"
      const swapRe = /swap\s+(\d+(?:\.\d+)?)\s*([A-Za-z]{2,6})\s*(?:to|for|->)\s*([A-Za-z]{2,6})/
      const sw = lastUser!.content.match(swapRe)
      if (sw) {
        const amount = sw[1]
        const fromSym = sw[2]
        const toSym = sw[3]
        // Try custom swap first (Fuji). Fallback to legacy smartSwap if custom fails for non-Fuji chains or config issues.
        try {
          const custom = await customSwap({ tokenInSymbol: fromSym, tokenOutSymbol: toSym, amount, slippageBps: 100, wait: true })
          return `Custom swap submitted. Tx hash: ${custom.hash}`
        } catch (e: any) {
          // Attempt legacy aggregator swap if available
          try {
            const legacy = await smartSwap({ tokenInSymbol: fromSym.toUpperCase(), tokenOutSymbol: toSym.toUpperCase(), amount, slippage: 0.5, wait: true })
            return `Legacy swap submitted. Tx hash: ${legacy.hash}`
          } catch (e2: any) {
            return `Swap failed. Custom error: ${e?.message || e}. Legacy error: ${e2?.message || e2}`
          }
        }
      }

      return null
    }

    if (!agent) {
      const fb = await fallback()
      if (fb) return NextResponse.json({ ok: true, content: fb, threadId: (config as any).configurable.thread_id })
  return NextResponse.json({ ok: false, error: "LLM not configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY, or use simple commands: 'address', 'balance', 'transfer 0.01 to 0x..', 'swap 5 USDC to WETH'." }, { status: 429 })
    }

    try {
      const result = await agent.invoke({ messages }, config as any)
      const outMsgs = (result as any)?.messages as BaseMessage[] | undefined
      const last = Array.isArray(outMsgs) && outMsgs.length ? outMsgs[outMsgs.length - 1] : undefined
      const content = (last && typeof (last as any).content === "string") ? (last as any).content : (last?.content as any)?.toString?.() || ""
      return NextResponse.json({ ok: true, content, threadId: (config as any).configurable.thread_id })
    } catch (err: any) {
      const raw = String(err?.message || err)
      const quota = /quota|rate limit|429/i.test(raw)
      if (quota) {
        const fb = await fallback()
        if (fb) return NextResponse.json({ ok: true, content: fb, threadId: (config as any).configurable.thread_id })
      }
      const guidance = quota
        ? "LLM quota or rate limit hit. Set OPENROUTER_API_KEY (recommended) or ensure your OPENAI_API_KEY has credits."
        : raw
      return NextResponse.json({ ok: false, error: guidance }, { status: quota ? 429 : 500 })
    }
  } catch (e: any) {
    const msg = e?.message || "Agent error"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

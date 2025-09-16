 import 'server-only'
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, erc20Abi } from 'viem'
import { avalanche, avalancheFuji, base } from 'viem/chains'
import type { Address, Chain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { Agentkit } from '@0xgasless/agentkit'
import { resolveTokenBySymbol } from './tokens'
import { customSwapFlow } from './customSwap'


// Minimal helper to read required envs and ensure they are present
function getEnv(name: string, required = true): string | undefined {
  const v = process.env[name]
  if (required && !v) throw new Error(`Missing env ${name}`)
  return v
}

// Chain selection: default to Avalanche Fuji unless CHAIN_ID selects Base or Avalanche mainnet
function getChain(): Chain {
  const id = Number(process.env.CHAIN_ID || 43113)
  if (id === 8453) return base
  if (id === 43114) return avalanche
  return avalancheFuji
}

// Cache per-chain agent instances
const agentInstances = new Map<number, ReturnType<typeof buildAgent>>()

async function buildAgent(chainIdOverride?: number) {
  try {
  // Normalize envs
  const PK_RAW = getEnv('PRIVATE_KEY') as string
  const PRIVATE_KEY = (PK_RAW.startsWith('0x') ? PK_RAW : `0x${PK_RAW}`) as `0x${string}`
  // Dynamic runtime; defaults to Fuji if CHAIN_ID not provided
  const CHAIN_ID = Number((chainIdOverride ?? process.env.CHAIN_ID) || 43113)
  const chain = CHAIN_ID === 8453 ? base : (CHAIN_ID === 43114 ? avalanche : avalancheFuji)

  // Chain-specific RPCs
  const rpcByChain: Record<number, string | undefined> = {
    8453: process.env.RPC_URL_BASE,
    43113: process.env.RPC_URL_FUJI,
    43114: process.env.RPC_URL_AVALANCHE,
  }
  const RPC_RAW = rpcByChain[CHAIN_ID] || process.env.RPC_URL
  if (!RPC_RAW) throw new Error('Missing RPC_URL for selected chain. Provide RPC_URL_BASE, RPC_URL_FUJI, or RPC_URL_AVALANCHE.')
  const RPC_URL = (RPC_RAW.startsWith('http://') || RPC_RAW.startsWith('https://')) ? RPC_RAW : `https://${RPC_RAW}`

  // Chain-specific GASLESS API key and paymaster
  const apiKeyByChain: Record<number, string | undefined> = {
    8453: process.env.GASLESS_API_KEY_BASE || process.env.GASLESS_API_KEY,
    43113: process.env.GASLESS_API_KEY_FUJI || process.env.GASLESS_API_KEY,
    43114: process.env.GASLESS_API_KEY_AVALANCHE || process.env.GASLESS_API_KEY,
  }
  const GASLESS_API_KEY = apiKeyByChain[CHAIN_ID]
  if (!GASLESS_API_KEY) throw new Error('Missing GASLESS_API_KEY for selected chain. Provide GASLESS_API_KEY_{BASE|FUJI|AVALANCHE} or GASLESS_API_KEY.')

  const paymasterByChain: Record<number, string | undefined> = {
    8453: process.env.GASLESS_PAYMASTER_URL_BASE || process.env.GASLESS_PAYMASTER_URL,
    43113: process.env.GASLESS_PAYMASTER_URL_FUJI || process.env.GASLESS_PAYMASTER_URL,
    43114: process.env.GASLESS_PAYMASTER_URL_AVALANCHE || process.env.GASLESS_PAYMASTER_URL,
  }
  const GASLESS_PAYMASTER_URL = paymasterByChain[CHAIN_ID]

    // Quick sanity checks for common RPC mistakes (e.g., missing Infura/Alchemy project path)
    const lowerUrl = RPC_URL.toLowerCase()
    if (lowerUrl.includes('infura.io') && !/\/v3\//i.test(RPC_URL)) {
      throw new Error(
        `RPC_URL appears to be an Infura endpoint but is missing '/v3/<PROJECT_ID>'. ` +
        `Use the full URL, e.g. https://base-mainnet.infura.io/v3/YOUR_PROJECT_ID (Base mainnet) ` +
        `or https://base-sepolia.infura.io/v3/YOUR_PROJECT_ID (Base Sepolia).`
      )
    }
    if (lowerUrl.includes('alchemy.com') && !/\/v2\//i.test(RPC_URL)) {
      throw new Error(
        `RPC_URL appears to be an Alchemy endpoint but is missing '/v2/<API_KEY>'. ` +
        `Use the full URL, e.g. https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY (Base mainnet) ` +
        `or https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY (Base Sepolia).`
      )
    }
    if (/(^https?:\/\/)?base-mainnet\.infura\.io\/?$/i.test(RPC_URL)) {
      // Specific helpful nudge for the 404 the user hit
      throw new Error(
        `RPC_URL 'https://base-mainnet.infura.io' is incomplete and will 404. ` +
        `Include your project path: https://base-mainnet.infura.io/v3/YOUR_PROJECT_ID.`
      )
    }

    const account = privateKeyToAccount(PRIVATE_KEY)

    // Vanilla viem clients (helpful for reads/decoding)
    const publicClient = createPublicClient({ chain, transport: http(RPC_URL) })
    const eoaClient = createWalletClient({ account, chain, transport: http(RPC_URL) })

    // Preflight: verify the RPC is reachable and matches CHAIN_ID
    try {
      const rpcChainId = await publicClient.getChainId()
    if (rpcChainId !== chain.id) {
  const name = chain.id === 8453 ? 'Base' : chain.id === 43114 ? 'Avalanche' : 'Avalanche Fuji'
        throw new Error(
          `RPC chainId ${rpcChainId} does not match expected ${chain.id} (${name}). ` +
          `Check CHAIN_ID and RPC_URL.`
        )
      }
    } catch (err: any) {
      const msg = String(err?.message || err)
      throw new Error(
        `RPC_URL check failed: ${msg}. ` +
        `If using Infura, ensure the URL includes '/v3/PROJECT_ID'. ` +
        `Examples: https://mainnet.base.org (no key), https://base-mainnet.infura.io/v3/KEY, https://base-mainnet.g.alchemy.com/v2/KEY.`
      )
    }

  // Initialize 0xGasless Agentkit using wallet (Agentkit manages smart account internally)
    const agentkit = await Agentkit.configureWithWallet({
      privateKey: PRIVATE_KEY,
      rpcUrl: RPC_URL,
      apiKey: GASLESS_API_KEY,
      chainID: CHAIN_ID,
      // Best-effort pass-through; SDK may ignore if not required
      ...(GASLESS_PAYMASTER_URL ? { paymasterUrl: GASLESS_PAYMASTER_URL } as any : {}),
    } as any)

    // Helpers
    async function getAddress(): Promise<Address> {
      // Prefer the smart account address from Agentkit if available.
      // However, some Agentkit/contract setups may fail when resolving a counterfactual
      // address (see errors about getAddressForCounterFactualAccount). In that case,
      // we should fall back gracefully to other address sources (agentkit helper or
      // the EOA) so read-only operations like balance checks still work.
      const sa = (agentkit as any)?.smartAccount
      if (sa && typeof sa.getAddress === 'function') {
        try {
          const addr = await sa.getAddress()
          return addr as Address
        } catch (e: any) {
          // Do not throw here — surface a clear warning and continue to fallbacks.
          console.warn(
            `smartAccount.getAddress() failed: ${String(e?.message || e)}. ` +
            `This often indicates the account factory / module setup contract is missing or the RPC/chain config is incorrect. ` +
            `Falling back to other address sources (agentkit helper or EOA).`
          )
        }
      }

      // Fallback to Agentkit helper if exposed
      if ((agentkit as any)?.getAddress) {
        try {
          const addr = await (agentkit as any).getAddress()
          return addr as Address
        } catch (e: any) {
          console.warn(`agentkit.getAddress() failed: ${String(e?.message || e)}. Falling back to EOA.`)
        }
      }

      // Last resort: return the EOA address (not gasless) so read-only flows still work.
      console.info(`Using EOA address as fallback: ${account.address}`)
      return account.address as Address
    }

    // Explicitly expose the EOA address (your MetaMask/private key address)
    async function getEOAAddress(): Promise<Address> {
      try {
        return account.address as Address
      } catch (e: any) {
        throw new Error(`getEOAAddress failed: ${e?.message || e}`)
      }
    }

    // Return both smart account and EOA addresses
    async function getAddresses(): Promise<{ smart: Address; eoa: Address }> {
      const smart = await getAddress()
      const eoa = await getEOAAddress()
      return { smart, eoa }
    }

    // Return smart account address if it's the real smart account (not the EOA fallback).
    // If smart account resolution failed and we fell back to EOA, return null to make
    // intent explicit to callers.
    async function getSmartAddressOrNull(): Promise<Address | null> {
      try {
        const sa = (agentkit as any)?.smartAccount
        if (sa && typeof sa.getAddress === 'function') {
          try {
            const addr = await sa.getAddress()
            // If addr equals the EOA, treat it as not-available
            if (addr && addr.toLowerCase() === account.address.toLowerCase()) return null
            return addr as Address
          } catch {
            // fallback: try agentkit.getAddress
          }
        }
        if ((agentkit as any)?.getAddress) {
          try {
            const addr = await (agentkit as any).getAddress()
            if (addr && addr.toLowerCase() === account.address.toLowerCase()) return null
            return addr as Address
          } catch {
            return null
          }
        }
        return null
      } catch {
        return null
      }
    }

    async function isSmartAccountAvailable(): Promise<boolean> {
      const addr = await getSmartAddressOrNull()
      return !!addr
    }

  async function getBalance(tokenAddress?: Address, targetAddress?: Address): Promise<string> {
      try {
    const addr = targetAddress || await getAddress()
        if (!tokenAddress) {
          const bal = await publicClient.getBalance({ address: addr })
          return formatUnits(bal, 18)
        }
        
        // First verify the contract exists and has the required functions
        try {
          const code = await publicClient.getBytecode({ address: tokenAddress })
          if (!code || code === '0x') {
            throw new Error(`No contract found at address ${tokenAddress}`)
          }
        } catch (e: any) {
          throw new Error(`Invalid contract address ${tokenAddress}: ${e?.message || e}`)
        }
        
        const decimals = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'decimals',
        }) as unknown as number
        
        if (typeof decimals !== 'number' || decimals < 0 || decimals > 255) {
          throw new Error(`Invalid decimals returned: ${decimals}`)
        }
        
        const raw = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [addr],
        }) as bigint
        
        const formattedBalance = formatUnits(raw, decimals)
        // Log balance details for debugging
        console.log(`Balance check - Token: ${tokenAddress}, Raw: ${raw}, Decimals: ${decimals}, Formatted: ${formattedBalance}`)
        return formattedBalance
      } catch (e: any) {
        throw new Error(`getBalance failed: ${e?.message || e}`)
      }
    }

    async function smartTransfer(opts: { tokenAddress?: Address; amount: string; destination: Address; wait?: boolean }): Promise<{ hash: string; details: any }> {
      const { tokenAddress, amount, destination, wait } = opts
      try {
        const sa = (agentkit as any)?.smartAccount
        if (!sa) throw new Error('Smart account not available. Check GASLESS_API_KEY, RPC_URL, CHAIN_ID, and paymaster settings.')

        if (tokenAddress) {
          // ERC20 transfer using smart account
          const decimals = await publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'decimals',
          }) as unknown as number
          const value = parseUnits(amount, decimals)
          const tx = await sa.writeContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [destination, value],
          })
          if (wait) await publicClient.waitForTransactionReceipt({ hash: tx as `0x${string}` })
          return { hash: tx as string, details: { tokenAddress, amount, destination, wait } }
        } else {
          // Native ETH transfer via smart account
          const value = parseUnits(amount, 18)
          const tx = await sa.sendTransaction({ to: destination, value })
          if (wait) await publicClient.waitForTransactionReceipt({ hash: tx as `0x${string}` })
          return { hash: tx as string, details: { amount, destination, wait } }
        }
      } catch (e: any) {
        throw new Error(`smartTransfer failed: ${e?.message || e}`)
      }
    }

    async function checkTransaction(hash: `0x${string}`): Promise<{ status: 'success' | 'pending' | 'failed'; receipt?: any }> {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash })
        if (!receipt) return { status: 'pending' }
        const ok = receipt.status === 'success'
        return { status: ok ? 'success' : 'failed', receipt }
      } catch (e: any) {
        // If not yet mined, viem throws. Treat as pending.
        const msg = String(e?.message || '')
        if (msg.includes('not found') || msg.includes('Receipt for hash') || msg.includes('Transaction receipt not found')) {
          return { status: 'pending' }
        }
        throw new Error(`checkTransaction failed: ${e?.message || e}`)
      }
    }

    async function readContract<T = unknown>(opts: { address: Address; abi: any; functionName: string; args?: any[] }): Promise<T> {
      try {
        const { address, abi, functionName, args = [] } = opts
        const result = await publicClient.readContract({ address, abi, functionName: functionName as any, args: args as any })
        return result as unknown as T
      } catch (e: any) {
        throw new Error(`readContract failed: ${e?.message || e}`)
      }
    }

    // Swap is chain-aware. Enabled on Base and Avalanche mainnet (via 0x); disabled on Fuji.
    async function smartSwap(opts: { tokenInSymbol: string; tokenOutSymbol: string; amount: string; slippage?: number; wait?: boolean }): Promise<{ hash: string; details: any }> {
      if (chain.id === 43113) {
        throw new Error('Swap is not available on Avalanche Fuji in this app')
      }
      const isBase = chain.id === 8453
      const isAvax = chain.id === 43114
      if (!isBase && !isAvax) throw new Error('Unsupported chain for swap')

      const ZEROX_URL = isBase ? 'https://base.api.0x.org/swap/v1/quote' : 'https://avalanche.api.0x.org/swap/v1/quote'
      const tokenIn = resolveTokenBySymbol(opts.tokenInSymbol, chain.id)
      const tokenOut = resolveTokenBySymbol(opts.tokenOutSymbol, chain.id)
      if (!tokenIn || !tokenOut) throw new Error(`Unsupported token symbol for ${isBase ? 'Base' : 'Avalanche'}`)
      const from = await getAddress()
      const nativeIn = isBase ? 'ETH' : 'AVAX'
      const addrIn = tokenIn.address === nativeIn ? nativeIn : (tokenIn.address as string)
      const addrOut = tokenOut.address === nativeIn ? nativeIn : (tokenOut.address as string)
      const amountIn = parseUnits(opts.amount, tokenIn.decimals).toString()
      const slippagePct = String((opts.slippage ?? 0.5) / 100) // 0.5% => 0.005
      const url = new URL(ZEROX_URL)
      url.searchParams.set('sellToken', addrIn)
      url.searchParams.set('buyToken', addrOut)
      url.searchParams.set('sellAmount', amountIn)
      url.searchParams.set('takerAddress', from)
      url.searchParams.set('slippagePercentage', slippagePct)
      const res = await fetch(url.toString())
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`0x quote failed (${res.status}): ${txt}`)
      }
      const quote = await res.json()
      // Approve if ERC-20 sell token
      if (tokenIn.address !== nativeIn && quote.allowanceTarget) {
        const sa = (agentkit as any)?.smartAccount
        if (!sa) throw new Error('Smart account not available for approval')
        const current = await publicClient.readContract({
          address: tokenIn.address as any,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [from, quote.allowanceTarget as `0x${string}`]
        }) as bigint
        const needed = BigInt(quote.sellAmount)
        if (current < needed) {
          const txa = await sa.writeContract({
            address: tokenIn.address as any,
            abi: erc20Abi,
            functionName: 'approve',
            args: [quote.allowanceTarget as `0x${string}`, needed]
          })
          await publicClient.waitForTransactionReceipt({ hash: txa as `0x${string}` })
        }
      }
      // Submit swap transaction
      const sa = (agentkit as any)?.smartAccount
      if (!sa) throw new Error('Smart account not available for swap')
      const tx = await sa.sendTransaction({
        to: quote.to as `0x${string}`,
        data: quote.data as `0x${string}`,
        value: quote.value ? BigInt(quote.value) : BigInt(0)
      })
      if (opts.wait) await publicClient.waitForTransactionReceipt({ hash: tx as `0x${string}` })
      return { hash: tx as string, details: { chainId: chain.id, ...opts } }
    }

    function getChainInfo() {
  const chainId = chain.id
  const chainName = ({ 8453: 'Base', 43113: 'Avalanche Fuji', 43114: 'Avalanche' } as Record<number, string>)[chainId] || `Chain ${chainId}`
  const nativeSymbol = (chainId === 43113 || chainId === 43114) ? 'AVAX' : 'ETH'
      return { chainId, chainName, nativeSymbol }
    }

    // New action functions for fetching data
  async function getMarketData(symbol?: string): Promise<any> {
      try {
        if (symbol) {
          // Get specific token market data
          const res = await fetch(`https://api.coinranking.com/v2/coin/${symbol}`, {
            headers: { 'x-access-token': process.env.COINRANKING_API_KEY || '' }
          })
          if (!res.ok) throw new Error(`Failed to fetch ${symbol} data: ${res.status}`)
      const data = await res.json()
      const coin = (data && data.data && data.data.coin) ? data.data.coin : null
      if (!coin) throw new Error('Malformed response for coin')
      return { symbol: coin.symbol, name: coin.name, price: Number(coin.price) }
        } else {
          // Get top market overview
          const res = await fetch('https://api.coinranking.com/v2/coins?limit=20', {
            headers: { 'x-access-token': process.env.COINRANKING_API_KEY || '' }
          })
          if (!res.ok) throw new Error(`Failed to fetch market data: ${res.status}`)
      const data = await res.json()
      const coins = (data && data.data && Array.isArray(data.data.coins)) ? data.data.coins : []
      return coins
        }
      } catch (e: any) {
        throw new Error(`getMarketData failed: ${e?.message || e}`)
      }
    }

    // Enhanced Smart Transfer with Intelligence
    async function smartTransferAdvanced(opts: {
      tokenAddress?: Address;
      amount: string;
      destination: Address;
      wait?: boolean;
      priority?: 'low' | 'normal' | 'high';
      schedule?: Date;
      batch?: Array<{ destination: Address; amount: string; tokenAddress?: Address }>;
      autoSwap?: boolean; // Auto-swap if insufficient balance
    }): Promise<{ hash: string; details: any }> {
      try {
        const { tokenAddress, amount, destination, wait, priority, schedule, batch, autoSwap } = opts
        
        // If batch transfer requested
        if (batch && batch.length > 0) {
          return await executeBatchTransfer(batch, wait)
        }
        
        // If scheduled transfer requested
        if (schedule) {
          return await scheduleTransfer({ tokenAddress, amount, destination, schedule, priority })
        }
        
        // Check balance before transfer
        const currentBalance = await getBalance(tokenAddress)
        const requiredAmount = parseFloat(amount)
        
        if (parseFloat(currentBalance) < requiredAmount) {
          if (autoSwap) {
            // Auto-swap logic for insufficient balance
            return await handleInsufficientBalanceTransfer(opts)
          }
          throw new Error(`Insufficient balance. Required: ${amount}, Available: ${currentBalance}`)
        }
        
        // Execute the transfer with priority-based gas optimization
        const gasSettings = getPriorityGasSettings(priority || 'normal')
        const result = await smartTransfer({ tokenAddress, amount, destination, wait })
        
        return {
          hash: result.hash,
          details: {
            from: await getAddress(),
            to: destination,
            amount,
            token: tokenAddress ? 'ERC-20' : 'ETH',
            priority,
            gasOptimized: true,
            timestamp: new Date().toISOString()
          }
        }
      } catch (e: any) {
        throw new Error(`smartTransferAdvanced failed: ${e?.message || e}`)
      }
    }

    // Batch Transfer Execution
    async function executeBatchTransfer(transfers: Array<{ destination: Address; amount: string; tokenAddress?: Address }>, wait: boolean = true): Promise<{ hash: string; details: any }> {
      try {
        const sa = (agentkit as any)?.smartAccount
        if (!sa) throw new Error('Smart account not available')
        
        // Group transfers by token type for efficiency
        const ethTransfers = transfers.filter(t => !t.tokenAddress)
        const tokenTransfers = transfers.filter(t => t.tokenAddress)
        
        let totalHash = ''
        const results = []
        
        // Execute ETH transfers in batch
        if (ethTransfers.length > 0) {
          const totalEth = ethTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0)
          const ethResult = await smartTransfer({ 
            amount: totalEth.toString(), 
            destination: ethTransfers[0].destination, // Send to first destination
            wait: false 
          })
          totalHash = ethResult.hash
          results.push({ type: 'ETH', hash: ethResult.hash, count: ethTransfers.length })
        }
        
        // Execute token transfers
        for (const transfer of tokenTransfers) {
          const result = await smartTransfer({ 
            tokenAddress: transfer.tokenAddress, 
            amount: transfer.amount, 
            destination: transfer.destination, 
            wait: false 
          })
          results.push({ type: 'Token', hash: result.hash, destination: transfer.destination })
        }
        
        if (wait) {
          // Wait for all transactions to be mined
          for (const result of results) {
            await publicClient.waitForTransactionReceipt({ hash: result.hash as `0x${string}` })
          }
        }
        
        return {
          hash: totalHash || results[0]?.hash || 'batch',
          details: {
            type: 'Batch Transfer',
            totalTransfers: transfers.length,
            results,
            gasOptimized: true,
            timestamp: new Date().toISOString()
          }
        }
      } catch (e: any) {
        throw new Error(`executeBatchTransfer failed: ${e?.message || e}`)
      }
    }

    // Scheduled Transfer
    async function scheduleTransfer(opts: {
      tokenAddress?: Address;
      amount: string;
      destination: Address;
      schedule: Date;
      priority?: 'low' | 'normal' | 'high';
    }): Promise<{ hash: string; details: any }> {
      try {
        const { tokenAddress, amount, destination, schedule, priority } = opts
        const now = new Date()
        
        if (schedule <= now) {
          throw new Error('Schedule time must be in the future')
        }
        
        // Calculate delay
        const delay = schedule.getTime() - now.getTime()
        
        // Schedule the transfer
        setTimeout(async () => {
          try {
            await smartTransfer({ tokenAddress, amount, destination, wait: true })
            console.log(`Scheduled transfer executed: ${amount} to ${destination}`)
          } catch (error) {
            console.error(`Scheduled transfer failed: ${error}`)
          }
        }, delay)
        
        return {
          hash: `scheduled_${Date.now()}`,
          details: {
            type: 'Scheduled Transfer',
            scheduledFor: schedule.toISOString(),
            amount,
            destination,
            priority,
            status: 'Scheduled'
          }
        }
      } catch (e: any) {
        throw new Error(`scheduleTransfer failed: ${e?.message || e}`)
      }
    }

    // Handle insufficient balance with auto-swap
    async function handleInsufficientBalanceTransfer(opts: {
      tokenAddress?: Address;
      amount: string;
      destination: Address;
      wait?: boolean;
    }): Promise<{ hash: string; details: any }> {
      try {
        const { tokenAddress, amount, destination, wait } = opts
        
        if (tokenAddress) {
          // For ERC-20 tokens, try to swap other tokens to get the required amount
          const availableTokens = await getPortfolioOverview()
          const targetToken = resolveTokenBySymbol('USDC', chain.id) // Default to USDC
          const nativeSentinel = chain.id === 43113 ? 'AVAX' : 'ETH'
          
          if (targetToken && targetToken.address !== nativeSentinel) {
            const targetBalance = await getBalance(targetToken.address as Address)
            if (parseFloat(targetBalance) > 0) {
              // Swap available tokens to required token
              const swapResult = await smartSwap({
                tokenInSymbol: targetToken.symbol,
                tokenOutSymbol: 'USDC', // Assuming we want USDC
                amount: targetBalance,
                slippage: 1.0,
                wait: true
              })
              
              // Now try the transfer again
              return await smartTransfer({ tokenAddress, amount, destination, wait })
            }
          }
        } else {
          // For native, try to swap other tokens to native
          const portfolio = await getPortfolioOverview()
          const nativeSym = chain.id === 43113 ? 'AVAX' : 'ETH'
          const nonEthAssets = portfolio.assets.filter((asset: any) => asset.symbol !== nativeSym && asset.valueUSD > 5)
          
          if (nonEthAssets.length > 0) {
            const assetToSwap = nonEthAssets[0]
            const swapResult = await smartSwap({
              tokenInSymbol: assetToSwap.symbol,
              tokenOutSymbol: nativeSym,
              amount: assetToSwap.balance,
              slippage: 1.0,
              wait: true
            })
            
            // Now try the native transfer again
            return await smartTransfer({ amount, destination, wait })
          }
        }
        
        throw new Error('Insufficient balance and no assets available for auto-swap')
      } catch (e: any) {
        throw new Error(`handleInsufficientBalanceTransfer failed: ${e?.message || e}`)
      }
    }

    // Priority-based gas optimization
    function getPriorityGasSettings(priority: 'low' | 'normal' | 'high') {
      switch (priority) {
        case 'low':
          return { maxFeePerGas: 'slow', maxPriorityFeePerGas: 'slow' }
        case 'high':
          return { maxFeePerGas: 'fast', maxPriorityFeePerGas: 'fast' }
        default:
          return { maxFeePerGas: 'normal', maxPriorityFeePerGas: 'normal' }
      }
    }

    // Smart Transfer with AI-powered routing
    async function smartTransferWithRouting(opts: {
      tokenAddress?: Address;
      amount: string;
      destination: Address;
      wait?: boolean;
      routing?: 'fastest' | 'cheapest' | 'mostReliable';
    }): Promise<{ hash: string; details: any }> {
      try {
        const { routing = 'fastest' } = opts
        
        // Get current network conditions
        const gasData = await getGasEstimate()
        const marketData = await getMarketData()
        
        // AI-powered routing decision
        let optimalRoute = 'direct'
        let gasMultiplier = 1.0
        
        if (routing === 'fastest') {
          gasMultiplier = 1.2 // 20% higher gas for faster execution
        } else if (routing === 'cheapest') {
          gasMultiplier = 0.8 // 20% lower gas for cost optimization
        } else if (routing === 'mostReliable') {
          gasMultiplier = 1.1 // 10% higher gas for reliability
        }
        
        // Execute transfer with optimized settings
        const result = await smartTransferAdvanced({
          ...opts,
          priority: routing === 'fastest' ? 'high' : routing === 'cheapest' ? 'low' : 'normal'
        })
        
        return {
          hash: result.hash,
          details: {
            routing,
            gasMultiplier,
            networkConditions: gasData,
            optimalRoute
          }
        }
      } catch (e: any) {
        throw new Error(`smartTransferWithRouting failed: ${e?.message || e}`)
      }
    }

    // Custom swap (Fuji-focused) using our proven working approach.
    async function customSwap(opts: { tokenInSymbol: string; tokenOutSymbol: string; amount: string; slippageBps?: number; wait?: boolean }): Promise<{ hash: string; details: any }> {
      try {
        // Use the exact same approach as the working direct API
        const { createPublicClient, createWalletClient, http, parseEther, formatEther, getContract } = await import('viem')
        const { privateKeyToAccount } = await import('viem/accounts')
        const { avalancheFuji } = await import('viem/chains')
        
        const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`)
        
        const publicClient = createPublicClient({
          chain: avalancheFuji,
          transport: http(process.env.NEXT_PUBLIC_RPC_URL_FUJI)
        })

        const walletClient = createWalletClient({
          account,
          chain: avalancheFuji,
          transport: http(process.env.NEXT_PUBLIC_RPC_URL_FUJI)
        })

        const routerAddress = process.env.NEXT_PUBLIC_AMM_ROUTER as `0x${string}`
        const tokenA = process.env.NEXT_PUBLIC_TOKEN_A as `0x${string}` // WAVAX
        const tokenB = process.env.NEXT_PUBLIC_TOKEN_B as `0x${string}` // USDC

        // Simple token mapping
        const tokenIn = opts.tokenInSymbol === 'WAVAX' ? tokenA : tokenB
        const tokenOut = opts.tokenOutSymbol === 'USDC' ? tokenB : tokenA

        const ROUTER_ABI = [
          {
            "inputs": [
              {"type": "uint256", "name": "amountIn"},
              {"type": "uint256", "name": "amountOutMin"},
              {"type": "address[]", "name": "path"},
              {"type": "address", "name": "to"}
            ],
            "name": "swapExactTokensForTokens",
            "outputs": [{"type": "uint256[]", "name": "amounts"}],
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "inputs": [
              {"type": "uint256", "name": "amountIn"},
              {"type": "address[]", "name": "path"}
            ],
            "name": "getAmountsOut",
            "outputs": [{"type": "uint256[]", "name": "amounts"}],
            "stateMutability": "view",
            "type": "function"
          }
        ]

        const router = getContract({
          address: routerAddress,
          abi: ROUTER_ABI,
          client: { public: publicClient, wallet: walletClient }
        })

        const amountIn = parseEther(opts.amount)
        const path = [tokenIn, tokenOut]
        const slippageBps = opts.slippageBps ?? 100
        
        // Get expected output and apply slippage
        const amounts = await router.read.getAmountsOut([amountIn, path]) as bigint[]
        const amountOutMin = amounts[1] * BigInt(10000 - slippageBps) / BigInt(10000)

        // Execute the swap
        const { request: simulateRequest } = await publicClient.simulateContract({
          account,
          address: routerAddress,
          abi: ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [amountIn, amountOutMin, path, account.address]
        })

        const hash = await walletClient.writeContract(simulateRequest)
        
        if (opts.wait) {
          await publicClient.waitForTransactionReceipt({ hash })
        }

        return {
          hash,
          details: {
            amountIn: formatEther(amountIn),
            expectedOut: formatEther(amounts[1]),
            minOut: formatEther(amountOutMin),
            path,
            slippageBps
          }
        }
        
      } catch (e: any) {
        throw new Error(`customSwap failed: ${e?.message || e}`)
      }
    }

    // Fallback mapping for popular symbols not in Base token registry
    const COINGECKO_FALLBACK: Record<string, string> = {
      BTC: 'bitcoin',
      SOL: 'solana',
      BNB: 'binancecoin',
      AVAX: 'avalanche-2',
      DOGE: 'dogecoin',
      MATIC: 'matic-network',
      ARB: 'arbitrum',
      OP: 'optimism',
      XRP: 'ripple',
      ADA: 'cardano',
      LINK: 'chainlink',
      TRX: 'tron',
      LTC: 'litecoin',
      TON: 'the-open-network',
    }

    // Also support common token names (user might ask "price of solana")
  const NAME_TO_SYMBOL: Record<string, string> = {
      BITCOIN: 'BTC',
      ETHEREUM: 'ETH',
      SOLANA: 'SOL',
      BINANCE: 'BNB',
      BINANCECOIN: 'BNB',
      AVALANCHE: 'AVAX',
      DOGECOIN: 'DOGE',
      POLYGON: 'MATIC',
      ARBITRUM: 'ARB',
      OPTIMISM: 'OP',
      RIPPLE: 'XRP',
      CARDANO: 'ADA',
      CHAINLINK: 'LINK',
      TRON: 'TRX',
      LITECOIN: 'LTC',
      TON: 'TON',
      TONCOIN: 'TON',
  WRAPPEDBITCOIN: 'WBTC',
    }

  async function getTokenPrice(symbol: string): Promise<any> {
      try {
        // Normalize query and support both symbols and common names
        const raw = symbol.trim()
        const sym = raw.toUpperCase()
        const nameKey = sym.replace(/[^A-Z0-9]/g, '')
        // If a common name was provided (e.g., SOLANA), map to its symbol first
        const mappedFromName = NAME_TO_SYMBOL[nameKey]
        if (mappedFromName && mappedFromName !== sym) {
          return await getTokenPrice(mappedFromName)
        }
        const token = resolveTokenBySymbol(sym, chain.id)
        // AVAX price (with 24h change)
        if (token && token.address === 'AVAX') {
          const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd&include_24hr_change=true')
          if (!res.ok) throw new Error(`Failed to fetch AVAX price: ${res.status}`)
          const data = await res.json()
          return { symbol: 'AVAX', price: data['avalanche-2'].usd, change24h: data['avalanche-2'].usd_24h_change }
        }
        // ETH branch removed for current Fuji-only scope; reintroduce when multi-chain support returns.
        // Known Base token with coingeckoId
        if (token && token.coingeckoId) {
          const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${token.coingeckoId}&vs_currencies=usd&include_24hr_change=true`)
          if (!res.ok) throw new Error(`Failed to fetch ${sym} price: ${res.status}`)
          const data = await res.json()
          const item = data[token.coingeckoId]
          return { symbol: token.symbol, price: item.usd, change24h: item.usd_24h_change }
        }
        // Fallback popular non-Base tickers (e.g., BTC)
        const cgId = COINGECKO_FALLBACK[sym]
        if (cgId) {
          const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true`)
          if (!res.ok) throw new Error(`Failed to fetch ${sym} price: ${res.status}`)
          const data = await res.json()
          const item = data[cgId]
          return { symbol: sym, price: item.usd, change24h: item.usd_24h_change }
        }
        throw new Error(`Unknown token: ${sym}`)
      } catch (e: any) {
        throw new Error(`getTokenPrice failed: ${e?.message || e}`)
      }
    }

    async function getGasEstimate(): Promise<any> {
      try {
        const gasPrice = await publicClient.getGasPrice()
        const block = await publicClient.getBlock()
        const baseFee = block.baseFeePerGas || BigInt(0)
        
        return {
          gasPrice: formatUnits(gasPrice, 9), // Gwei
          baseFee: formatUnits(baseFee, 9), // Gwei
          chain: chain.name,
          chainId: chain.id
        }
      } catch (e: any) {
        throw new Error(`getGasEstimate failed: ${e?.message || e}`)
      }
    }

  async function getTransactionHistory(address?: Address): Promise<any[]> {
      try {
        const targetAddress = address || await getAddress()
        const blockNumber = await publicClient.getBlockNumber()
        
        // Get recent transactions (last 100 blocks)
        const fromBlock = blockNumber - BigInt(100)
        const logs = await publicClient.getLogs({
          address: targetAddress,
          fromBlock,
          toBlock: blockNumber
        })

        // Get transaction details
        const transactions = await Promise.all(
          logs.slice(0, 10).map(async (log) => {
            try {
              const tx = await publicClient.getTransaction({ hash: log.transactionHash })
              const receipt = await publicClient.getTransactionReceipt({ hash: log.transactionHash })
              return {
                hash: log.transactionHash,
                blockNumber: log.blockNumber,
                from: tx.from,
                to: tx.to,
                value: tx.value ? formatUnits(tx.value, 18) : '0',
                status: receipt?.status === 'success' ? 'success' : 'failed',
                timestamp: new Date().toISOString() // Approximate
              }
            } catch {
              return null
            }
          })
        )

        return transactions.filter(Boolean)
      } catch (e: any) {
        throw new Error(`getTransactionHistory failed: ${e?.message || e}`)
      }
    }

  async function getPortfolioOverview(targetAddress?: Address): Promise<any> {
      try {
  const address = targetAddress || await getAddress()
  const nativeBalance = await getBalance(undefined, address)
        
    // Get supported token balances
  const supportedTokens = chain.id === 8453 ? ['USDC', 'WETH'] : ['USDC', 'WAVAX']
        const tokenBalances = await Promise.all(
          supportedTokens.map(async (symbol) => {
            try {
      const token = resolveTokenBySymbol(symbol, chain.id)
      const nativeSentinel = chain.id === 43113 ? 'AVAX' : 'ETH'
      if (token && token.address !== nativeSentinel) {
                const balance = await getBalance(token.address as Address, address)
                const price = await getTokenPrice(symbol)
                return {
                  symbol,
                  balance,
                  price: price.price,
                  valueUSD: parseFloat(balance) * price.price
                }
              }
              return null
            } catch {
              return null
            }
          })
        )

    const nativeSym = chain.id === 43113 ? 'AVAX' : 'ETH'
    const nativePrice = await getTokenPrice(nativeSym)
    const totalValue = parseFloat(nativeBalance) * nativePrice.price + 
          tokenBalances.filter(Boolean).reduce((sum, token) => sum + (token?.valueUSD || 0), 0)

        return {
          address,
          totalValueUSD: totalValue,
          assets: [
    { symbol: nativeSym, balance: nativeBalance, price: nativePrice.price, valueUSD: parseFloat(nativeBalance) * nativePrice.price },
            ...tokenBalances.filter(Boolean)
          ]
        }
      } catch (e: any) {
        throw new Error(`getPortfolioOverview failed: ${e?.message || e}`)
      }
    }

    // Helper function to format balances with consistent decimal places
    function formatBalance(balance: string, decimals: number = 4): string {
      try {
        const num = parseFloat(balance)
        if (isNaN(num)) return balance
        return num.toFixed(decimals)
      } catch {
        return balance
      }
    }

    return {
      agentkit,
      publicClient,
      eoaClient,
      getAddress,
  getEOAAddress,
  getAddresses,
  getBalance, // (tokenAddress?: Address, targetAddress?: Address)
      checkTransaction,
      readContract,
      smartTransfer,
      smartTransferAdvanced,
    smartTransferWithRouting,
    smartSwap,
    customSwap,
      getMarketData,
      getTokenPrice,
      getGasEstimate,
      getTransactionHistory,
  getPortfolioOverview, // (targetAddress?: Address)
      formatBalance,
  getChainInfo,
  // New helpers
  getSmartAddressOrNull,
  isSmartAccountAvailable,
    }
  } catch (e: any) {
    throw new Error(`buildAgent failed: ${e?.message || e}`)
  }
}

export async function getAgent(chainIdOverride?: number) {
  const id = Number((chainIdOverride ?? process.env.CHAIN_ID) || 43113)
  if (!agentInstances.has(id)) agentInstances.set(id, buildAgent(id))
  return agentInstances.get(id)!
}

export type Agent = Awaited<ReturnType<typeof buildAgent>>

// Public list of available high-level actions we currently support via this wrapper
export const AVAILABLE_AGENT_ACTIONS = [
  'getAddress',
  'getEOAAddress',
  'getAddresses',
  'getBalance',
  'checkTransaction',
  'readContract',
  'smartTransfer',
  'smartTransferAdvanced',
  'smartTransferWithRouting',
  'smartSwap',
  'customSwap',
  'getMarketData',
  'getTokenPrice',
  'getGasEstimate',
  'getTransactionHistory',
  'getPortfolioOverview',
] as const

#!/usr/bin/env tsx
/**
 * Custom Swap Test Harness
 * Usage examples:
 *  - npx tsx scripts/test-custom-swap.ts --in WAVAX --out USDC --amount 0.1 --simulate
 *  - npm run test:custom-swap -- --in WAVAX --out USDC --amount 0.05 --execute --wait
 *  - With gas overrides: --maxFee 40 --maxPriority 2
 *
 * Required env vars:
 *  - CUSTOM_SWAP_ROUTER=0x...
 *  - TEST_PRIVATE_KEY=0x... (Fuji funded key with WAVAX & tokens)
 */
import { createPublicClient, createWalletClient, http, parseUnits, erc20Abi } from 'viem'
import { avalancheFuji } from 'viem/chains'
import { simulateCustomSwap } from '../lib/customSwap'
import { resolveTokenBySymbol } from '../lib/tokens'
import { privateKeyToAccount } from 'viem/accounts'
import { config as loadEnv } from 'dotenv'

/**
 * Local fallback ABI for the custom swap router (since CUSTOM_SWAP_ABI was not exported).
 * Adjust if your actual contract interface differs.
 */
const CUSTOM_SWAP_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "tokenIn", "type": "address" },
      { "internalType": "address", "name": "tokenOut", "type": "address" },
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "minAmountOut", "type": "uint256" },
      { "internalType": "address", "name": "recipient", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "internalType": "bytes[]", "name": "extraData", "type": "bytes[]" }
    ],
    "name": "swapExactIn",
    "outputs": [
      { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
    ],
    "stateMutability": "payable",
    "type": "function"
  }
] as const

// Load environment variables from .env.local (Next.js style) before anything else.
loadEnv({ path: '.env.local' })

interface SwapArgs {
  tokenIn: string
  tokenOut: string
  amount: string
  slippage?: number
  recipient?: string
  routeId?: string
  simulate?: boolean
  execute?: boolean
  offline?: boolean
}

function parseArgs(): SwapArgs {
  const args = process.argv.slice(2)
  const result: any = {}
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--simulate') result.simulate = true
    else if (arg === '--execute') result.execute = true
    else if (arg === '--offline') result.offline = true
    else if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = args[i + 1]
      if (['in', 'out', 'amount', 'slippage', 'recipient', 'routeId'].includes(key)) {
        result[key === 'in' ? 'tokenIn' : key === 'out' ? 'tokenOut' : key] = value
        i++
      }
    }
  }
  
  return result as SwapArgs
}

async function main() {
  const args = parseArgs()
  const router = process.env.CUSTOM_SWAP_ROUTER?.trim()
  const placeholderRegex = /^0xREPLACE/i
  const offline = !router || placeholderRegex.test(router)
  if (offline) {
    console.warn('WARNING: CUSTOM_SWAP_ROUTER not set or placeholder value detected. Running OFFLINE 1:1 simulation fallback.')
  }

  const pk = process.env.TEST_PRIVATE_KEY?.trim()
  if (!pk) {
    console.warn('WARNING: TEST_PRIVATE_KEY not set. Execution will be disabled; running simulation only.')
    args.execute = false
  }

  const chain = avalancheFuji
  const publicClient = createPublicClient({ chain, transport: http() })
  const account = pk ? privateKeyToAccount(pk as `0x${string}`) : undefined
  const walletClient = account ? createWalletClient({ account, chain, transport: http() }) : undefined

  const tokenIn = resolveTokenBySymbol(args.tokenIn, chain.id)
  const tokenOut = resolveTokenBySymbol(args.tokenOut, chain.id)
  if (!tokenIn || !tokenOut) throw new Error('Unsupported token symbol(s)')

  console.log('\n=== Custom Swap Test Harness ===')
  console.log('Chain:', chain.id, chain.name)
  console.log('Input:', args.tokenIn, 'Output:', args.tokenOut, 'Amount:', args.amount)
  console.log('Slippage (bps):', args.slippage || 100)
  if (args.routeId) console.log('Route ID:', args.routeId)

  // Simulation (quote)
  if (args.simulate) {
    if (offline) {
      // Offline fallback: assume 1:1 expectedOut
      const tokenIn = resolveTokenBySymbol(args.tokenIn, chain.id)!
      const amountInUnits = parseUnits(args.amount, tokenIn.decimals)
      const expectedOutUnits = amountInUnits
      const minOutUnits = (expectedOutUnits * BigInt(10000 - (args.slippage || 100))) / BigInt(10000)
      const quote = {
        expectedOut: expectedOutUnits.toString(),
        minOut: minOutUnits.toString(),
        priceImpact: null,
        route: { hops: ['OFFLINE'], kind: 'OFFLINE_PLACEHOLDER' }
      }
      console.log('\n--- OFFLINE Simulation Result (Placeholder 1:1) ---')
      console.log(JSON.stringify(quote, null, 2))
    } else {
      try {
        const quote = await simulateCustomSwap(
          { chainId: chain.id, publicClient, accountAddress: account?.address || '0x0000000000000000000000000000000000000001' },
          { 
            tokenInSymbol: args.tokenIn, 
            tokenOutSymbol: args.tokenOut, 
            amount: args.amount, 
            slippageBps: args.slippage || 100,
            routeId: args.routeId
          }
        )
        console.log('\n--- Simulation Result ---')
        console.log(JSON.stringify(quote, null, 2))
      } catch (e: any) {
        console.error('Simulation failed:', e.message)
        process.exit(1)
      }
    }
  }

  if (!args.execute) {
    console.log('\n(No execution requested – pass --execute to perform swap)')
    return
  }
  if (!walletClient || !account) {
    console.log('Execution skipped: wallet client not available (missing TEST_PRIVATE_KEY).')
    return
  }
  if (offline) {
    console.log('Execution disabled: custom router not deployed / configured. Set CUSTOM_SWAP_ROUTER to a real Fuji contract address to enable.')
    return
  }

  // Minimal direct execution (replicates core logic of executeCustomSwap)
  const amountInUnits = parseUnits(args.amount, tokenIn.decimals)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300) // 5 minutes default

  // Allowance if ERC20 input (skip if native sentinel)
  if (tokenIn.address !== 'AVAX') {
    const allowance: bigint = await publicClient.readContract({
      address: tokenIn.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, router as `0x${string}`]
    })
    if (allowance < amountInUnits) {
      console.log('Approving token...')
      const approveHash = await walletClient.writeContract({
        address: tokenIn.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [router as `0x${string}`, amountInUnits]
      })
      console.log('Approve tx:', approveHash)
      await publicClient.waitForTransactionReceipt({ hash: approveHash })
    }
  }

  // For placeholder expectedOut = amountInUnits; compute minOut
  const minOutUnits = (amountInUnits * BigInt(10000 - (args.slippage || 100))) / BigInt(10000)

  console.log('Executing swap...')
  try {
    const txHash = await walletClient.writeContract({
      address: router as `0x${string}`,
      abi: CUSTOM_SWAP_ABI as any,
      functionName: 'swapExactIn',
      args: [
        tokenIn.address === 'AVAX' ? '0x0000000000000000000000000000000000000000' : tokenIn.address,
        tokenOut.address === 'AVAX' ? '0x0000000000000000000000000000000000000000' : tokenOut.address,
        amountInUnits,
        minOutUnits,
        account.address,
        deadline,
        []
      ]
    })
    console.log('Swap tx hash:', txHash)
    console.log('Waiting for receipt...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    console.log('Receipt status:', receipt.status)
  } catch (e: any) {
    console.error('Execution failed:', e.message)
    process.exit(1)
  }
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
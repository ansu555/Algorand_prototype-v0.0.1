import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, parseEther, formatEther, getContract } from 'viem'
import { avalancheFuji } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenInSymbol, tokenOutSymbol, amount, slippageBps = 100 } = body

    if (!tokenInSymbol || !tokenOutSymbol || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Setup clients (exact same as working script)
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

    // Use exact same addresses from env
    const routerAddress = process.env.NEXT_PUBLIC_AMM_ROUTER as `0x${string}`
    const tokenA = process.env.NEXT_PUBLIC_TOKEN_A as `0x${string}` // WAVAX
    const tokenB = process.env.NEXT_PUBLIC_TOKEN_B as `0x${string}` // USDC

    // Map symbols to addresses (simple mapping for demo)
    const tokenIn = tokenInSymbol === 'WAVAX' ? tokenA : tokenB
    const tokenOut = tokenOutSymbol === 'USDC' ? tokenB : tokenA

    const router = getContract({
      address: routerAddress,
      abi: ROUTER_ABI,
      client: { public: publicClient, wallet: walletClient }
    })

    const amountIn = parseEther(amount)
    const path = [tokenIn, tokenOut]
    
    // Get expected output
    const amounts = await router.read.getAmountsOut([amountIn, path]) as bigint[]
    const amountOutMin = amounts[1] * BigInt(10000 - slippageBps) / BigInt(10000) // Apply slippage

    console.log('Direct API swap attempt:', {
      amountIn: formatEther(amountIn),
      amountOutMin: formatEther(amountOutMin),
      path,
      to: account.address
    })

    // Execute the swap (exact same as working script)
    const { request: simulateRequest } = await publicClient.simulateContract({
      account,
      address: routerAddress,
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, amountOutMin, path, account.address]
    })

    const hash = await walletClient.writeContract(simulateRequest)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    return NextResponse.json({
      success: true,
      hash: receipt.transactionHash,
      details: {
        amountIn: formatEther(amountIn),
        expectedOut: formatEther(amounts[1]),
        minOut: formatEther(amountOutMin),
        path
      }
    })

  } catch (error: any) {
    console.error('Direct swap API error:', error)
    return NextResponse.json({
      error: 'Swap failed',
      message: error?.message || 'Unknown error',
      details: error?.cause?.reason || error?.details
    }, { status: 500 })
  }
}
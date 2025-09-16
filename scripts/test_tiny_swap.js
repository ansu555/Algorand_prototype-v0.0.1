#!/usr/bin/env node
/**
 * Test a very small swap to identify the issue
 */

require('dotenv').config({ path: './.env.local' })
const { createPublicClient, createWalletClient, http, parseEther, formatEther, getContract } = require('viem')
const { avalancheFuji } = require('viem/chains')
const { privateKeyToAccount } = require('viem/accounts')

const ROUTER_ABI = [
  {
    "inputs": [
      {"type": "uint256", "name": "amountIn"},
      {"type": "uint256", "name": "amountOutMin"},
      {"type": "address[]", "name": "path"},
      {"type": "address", "name": "to"},
      {"type": "uint256", "name": "deadline"}
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

async function main() {
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

  const routerAddress = process.env.NEXT_PUBLIC_AMM_ROUTER
  const tokenA = process.env.NEXT_PUBLIC_TOKEN_A // WAVAX
  const tokenB = process.env.NEXT_PUBLIC_TOKEN_B // USDC

  const router = getContract({
    address: routerAddress,
    abi: ROUTER_ABI,
    client: { public: publicClient, wallet: walletClient }
  })

  console.log('Testing with tiny amount: 0.001 WAVAX')
  const amountIn = parseEther('0.001') // Very small amount
  const path = [tokenA, tokenB]
  
  try {
    // Get expected output
    const amounts = await router.read.getAmountsOut([amountIn, path])
    console.log('Expected amounts:', amounts.map(a => formatEther(a)))
    
    const amountOutMin = amounts[1] * 99n / 100n // 1% slippage
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300) // 5 minutes
    
    console.log('Attempting swap...')
    console.log('AmountIn:', formatEther(amountIn))
    console.log('AmountOutMin:', formatEther(amountOutMin))
    console.log('Path:', path)
    console.log('To:', account.address)
    console.log('Deadline:', deadline.toString())

    // Try the swap
    const { request } = await publicClient.simulateContract({
      account,
      address: routerAddress,
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, amountOutMin, path, account.address, deadline]
    })

    console.log('✅ Simulation successful, executing...')
    const hash = await walletClient.writeContract(request)
    console.log('Transaction hash:', hash)
    
    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log('✅ Swap successful!', receipt.transactionHash)

  } catch (error) {
    console.error('❌ Swap failed:', error.message)
    if (error.cause?.reason) {
      console.error('Reason:', error.cause.reason)
    }
    if (error.details) {
      console.error('Details:', error.details)
    }
  }
}

main().catch(console.error)
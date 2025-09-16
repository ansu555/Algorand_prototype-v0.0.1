#!/usr/bin/env node
/**
 * Debug the router contract by testing each step
 */

require('dotenv').config({ path: './.env.local' })
const { createPublicClient, createWalletClient, http, parseEther, formatEther, getContract } = require('viem')
const { avalancheFuji } = require('viem/chains')
const { privateKeyToAccount } = require('viem/accounts')

const ROUTER_ABI = [
  {
    "inputs": [
      {"type": "uint256", "name": "amountIn"},
      {"type": "address[]", "name": "path"}
    ],
    "name": "getAmountsOut",
    "outputs": [{"type": "uint256[]", "name": "amounts"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "factory",
    "outputs": [{"type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "WETH",
    "outputs": [{"type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
]

const ERC20_ABI = [
  {
    "inputs": [{"type": "address"}, {"type": "uint256"}],
    "name": "transfer",
    "outputs": [{"type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"type": "address"}, {"type": "address"}],
    "name": "allowance",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"type": "address"}],
    "name": "balanceOf",
    "outputs": [{"type": "uint256"}],
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

  console.log('=== Router Contract Debug ===')
  console.log('Router:', routerAddress)
  console.log('Account:', account.address)

  const router = getContract({
    address: routerAddress,
    abi: ROUTER_ABI,
    client: publicClient
  })

  try {
    // Check router configuration
    const [factory, weth] = await Promise.all([
      router.read.factory(),
      router.read.WETH()
    ])
    
    console.log('Factory:', factory)
    console.log('WETH:', weth)
    console.log('Expected factory:', process.env.NEXT_PUBLIC_AMM_FACTORY)
    
    if (factory.toLowerCase() !== process.env.NEXT_PUBLIC_AMM_FACTORY.toLowerCase()) {
      console.log('❌ Router points to wrong factory!')
      return
    }

    // Test getAmountsOut
    const amountIn = parseEther('0.001')
    const path = [tokenA, tokenB]
    
    console.log('\n=== Testing getAmountsOut ===')
    const amounts = await router.read.getAmountsOut([amountIn, path])
    console.log('Amounts:', amounts.map(a => formatEther(a)))
    
    if (amounts[1] === 0n) {
      console.log('❌ getAmountsOut returns 0 - no liquidity or invalid path')
      return
    }

    // Check token balances and allowances
    console.log('\n=== Checking Token Status ===')
    const tokenAContract = getContract({
      address: tokenA,
      abi: ERC20_ABI,
      client: publicClient
    })

    const [balance, allowance] = await Promise.all([
      tokenAContract.read.balanceOf([account.address]),
      tokenAContract.read.allowance([account.address, routerAddress])
    ])

    console.log('WAVAX balance:', formatEther(balance))
    console.log('WAVAX allowance:', formatEther(allowance))

    if (balance < amountIn) {
      console.log('❌ Insufficient balance')
      return
    }

    if (allowance < amountIn) {
      console.log('❌ Insufficient allowance')
      return
    }

    console.log('✅ All checks passed - issue is in the swap execution itself')

    // Try a direct transfer to router first
    console.log('\n=== Testing Direct Transfer ===')
    try {
      const { request } = await publicClient.simulateContract({
        account,
        address: tokenA,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [routerAddress, parseEther('0.001')]
      })
      console.log('✅ Direct transfer simulation works')
    } catch (error) {
      console.log('❌ Direct transfer fails:', error.message)
    }

  } catch (error) {
    console.error('❌ Router debug failed:', error.message)
  }
}

main().catch(console.error)
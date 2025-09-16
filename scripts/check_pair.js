#!/usr/bin/env node
/**
 * Check if trading pair exists and has liquidity
 */

require('dotenv').config({ path: './.env.local' })
const { createPublicClient, createWalletClient, http, parseEther, formatEther, getContract } = require('viem')
const { avalancheFuji } = require('viem/chains')
const { privateKeyToAccount } = require('viem/accounts')

const FACTORY_ABI = [
  {
    "inputs": [{"type": "address"}, {"type": "address"}],
    "name": "getPair",
    "outputs": [{"type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
]

const PAIR_ABI = [
  {
    "inputs": [],
    "name": "getReserves",
    "outputs": [
      {"type": "uint112", "name": "_reserve0"},
      {"type": "uint112", "name": "_reserve1"},
      {"type": "uint32", "name": "_blockTimestampLast"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token0",
    "outputs": [{"type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token1",
    "outputs": [{"type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
]

async function main() {
  const client = createPublicClient({
    chain: avalancheFuji,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL_FUJI)
  })

  const factoryAddress = process.env.NEXT_PUBLIC_AMM_FACTORY
  const tokenA = process.env.NEXT_PUBLIC_TOKEN_A // WAVAX
  const tokenB = process.env.NEXT_PUBLIC_TOKEN_B // USDC

  console.log('Factory:', factoryAddress)
  console.log('Token A (WAVAX):', tokenA)
  console.log('Token B (USDC):', tokenB)

  // Get pair address
  const factory = getContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    client
  })

  try {
    const pairAddress = await factory.read.getPair([tokenA, tokenB])
    console.log('Pair address:', pairAddress)

    if (pairAddress === '0x0000000000000000000000000000000000000000') {
      console.log('❌ No pair exists! Need to create liquidity pool first')
      return
    }

    // Check pair reserves
    const pair = getContract({
      address: pairAddress,
      abi: PAIR_ABI,
      client
    })

    const [token0, token1, reserves] = await Promise.all([
      pair.read.token0(),
      pair.read.token1(),
      pair.read.getReserves()
    ])

    console.log('Token0:', token0)
    console.log('Token1:', token1)
    console.log('Reserves:', reserves)
    
    const [reserve0, reserve1] = reserves
    console.log('Reserve0:', formatEther(reserve0), tokenA === token0 ? 'WAVAX' : 'USDC')
    console.log('Reserve1:', formatEther(reserve1), tokenA === token1 ? 'WAVAX' : 'USDC')

    if (reserve0 === 0n || reserve1 === 0n) {
      console.log('❌ Pair exists but has no liquidity!')
    } else {
      console.log('✅ Pair has liquidity')
    }

  } catch (error) {
    console.error('Error checking pair:', error.message)
  }
}

main().catch(console.error)
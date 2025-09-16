import { NextRequest, NextResponse } from 'next/server'
import { Address, createPublicClient, createWalletClient, http } from 'viem'
import { avalancheFuji } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { executeCustomSwap, type CustomSwapParams } from '../../../../lib/customSwap'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      tokenIn, 
      tokenOut, 
      amount, 
      slippage = 100,
      routeId,
      wait = false,
      recipient,
      deadline,
      deadlineSecondsFromNow,
      privateTx = false,
      maxFeePerGasGwei,
      maxPriorityFeePerGasGwei
    } = body

    // Validate required fields
    if (!tokenIn || !tokenOut || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenIn, tokenOut, amount' },
        { status: 400 }
      )
    }

    // Validate amount is positive
    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      )
    }

    // Setup viem clients for Avalanche Fuji
    const chainId = 43113
    const chain = avalancheFuji
    const rpcUrl = process.env.RPC_URL_FUJI || process.env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc'
    
    const publicClient = createPublicClient({ 
      chain, 
      transport: http(rpcUrl) 
    })

    // Get private key and create account
    const privateKeyRaw = process.env.PRIVATE_KEY || process.env.TEST_PRIVATE_KEY
    if (!privateKeyRaw) {
      return NextResponse.json(
        { error: 'Private key not configured' },
        { status: 500 }
      )
    }

    const privateKey = (privateKeyRaw.startsWith('0x') ? privateKeyRaw : `0x${privateKeyRaw}`) as `0x${string}`
    const account = privateKeyToAccount(privateKey)
    
    const smartAccount = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl)
    })

    // Build swap parameters
    const swapParams: CustomSwapParams = {
      tokenInSymbol: tokenIn,
      tokenOutSymbol: tokenOut,
      amount: amount.toString(),
      slippageBps: slippage,
      wait,
      recipient: recipient as Address | undefined,
      routeId, // This is the key addition for routeId support
      deadline,
      deadlineSecondsFromNow,
      privateTx,
      maxFeePerGasGwei,
      maxPriorityFeePerGasGwei
    }

    // Execute the swap
    const result = await executeCustomSwap(
      {
        chainId,
        publicClient,
        smartAccount,
        accountAddress: account.address
      },
      swapParams
    )

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      details: result.details,
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('Swap execution error:', error)
    
    // Return structured error based on error type
    if (error.code) {
      return NextResponse.json(
        { 
          error: 'Swap execution failed', 
          code: error.code,
          message: error.message,
          details: error.data
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
import { createPublicClient, createWalletClient, http, parseUnits, Address } from 'viem'
import { avalancheFuji } from 'viem/chains'
import RouterAbi from '@/app/abis/Router.json'
import { getAmmAddresses } from './config'

export interface QuoteResult {
  amounts: bigint[]
  path: string[]
}

export function getPublicClient(rpcUrl?: string) {
  return createPublicClient({
    chain: avalancheFuji,
    transport: http(rpcUrl || process.env.NEXT_PUBLIC_RPC_URL_FUJI || 'https://api.avax-test.network/ext/bc/C/rpc')
  })
}

export async function getAmountsOut(amountIn: string, path: string[], rpcUrl?: string): Promise<QuoteResult> {
  const client = getPublicClient(rpcUrl)
  const amt = parseUnits(amountIn, 18) // assumes 18 decimals; adapt per token meta if needed
  const amounts = await client.readContract({
    address: getAmmAddresses().router as Address,
    abi: RouterAbi as any,
    functionName: 'getAmountsOut',
    args: [amt, path as Address[]]
  }) as bigint[]
  return { amounts, path }
}

export interface SwapExactInParams {
  account: any
  amountIn: bigint
  amountOutMin: bigint
  path: string[]
  to: string
}

export async function swapExactTokensForTokens(p: SwapExactInParams, rpcUrl?: string) {
  const client = getPublicClient(rpcUrl)
  // write via provided account (smart account or wallet client wrapper)
  const hash = await p.account.writeContract({
    address: getAmmAddresses().router as Address,
    abi: RouterAbi as any,
    functionName: 'swapExactTokensForTokens',
    args: [p.amountIn, p.amountOutMin, p.path as Address[], p.to as Address]
  })
  await client.waitForTransactionReceipt({ hash })
  return hash
}

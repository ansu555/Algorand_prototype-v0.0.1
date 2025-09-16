(async()=>{
  const fs = require('fs')
  const path = require('path')
  const envPath = path.join(process.cwd(), '.env.local')
  let env = {}
  try {
    const raw = fs.readFileSync(envPath, 'utf8')
    raw.split(/\n/).forEach(l => {
      const m = l.trim()
      if (!m || m.startsWith('#')) return
      const i = m.indexOf('=')
      if (i === -1) return
      const k = m.substring(0, i).trim()
      const v = m.substring(i + 1).trim()
      env[k] = v
    })
  } catch (e) {
    console.error('read env error', e.message || e)
    process.exit(1)
  }

  const { createPublicClient, http } = require('viem')
  const { avalancheFuji } = require('viem/chains')
  const { privateKeyToAccount } = require('viem/accounts')
  // Minimal ERC20 ABI for balanceOf and allowance
  const erc20Abi = [
    { "type": "function", "name": "balanceOf", "inputs": [{ "name": "account", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
    { "type": "function", "name": "allowance", "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" }
  ]

  const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(env.RPC_URL_FUJI || env.NEXT_PUBLIC_RPC_URL_FUJI || env.RPC_URL) })
  const account = privateKeyToAccount(env.PRIVATE_KEY.startsWith('0x') ? env.PRIVATE_KEY : '0x' + env.PRIVATE_KEY)
  const router = env.NEXT_PUBLIC_AMM_ROUTER
  const WAVAX = env.NEXT_PUBLIC_TOKEN_A
  const USDC = env.NEXT_PUBLIC_TOKEN_B

  console.log('Account:', account.address)
  console.log('Router:', router)
  console.log('WAVAX:', WAVAX)
  console.log('USDC:', USDC)

  try {
    const balWAVAX = await publicClient.readContract({ address: WAVAX, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] })
    console.log('WAVAX balance:', balWAVAX.toString())
    const balUSDC = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] })
    console.log('USDC balance:', balUSDC.toString())
    const allowance = await publicClient.readContract({ address: WAVAX, abi: erc20Abi, functionName: 'allowance', args: [account.address, router] })
    console.log('WAVAX allowance for router:', allowance.toString())
  } catch (e) {
    console.error('Token check error:', e.message || e)
  }
})()

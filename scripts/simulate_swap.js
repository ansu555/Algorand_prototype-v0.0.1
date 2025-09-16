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

  const { createPublicClient, http, parseUnits } = require('viem')
  const { avalancheFuji } = require('viem/chains')
  const RouterAbi = require('../app/abis/Router.json')

  const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(env.RPC_URL_FUJI || env.NEXT_PUBLIC_RPC_URL_FUJI || env.RPC_URL) })
  const router = env.NEXT_PUBLIC_AMM_ROUTER
  const WAVAX = env.NEXT_PUBLIC_TOKEN_A
  const USDC = env.NEXT_PUBLIC_TOKEN_B

  const amount = parseUnits('0.1', 18)
  const swapPath = [WAVAX, USDC]

  try {
  const out = await publicClient.readContract({ address: router, abi: RouterAbi, functionName: 'getAmountsOut', args: [amount, swapPath] })
  console.log('getAmountsOut for 0.1 WAVAX to USDC:', out.map(x => x.toString()))
  } catch (e) {
    console.error('getAmountsOut error:', e.message || e)
  }
})()

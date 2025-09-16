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

  const RPC = env.RPC_URL_FUJI || env.NEXT_PUBLIC_RPC_URL_FUJI || env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc'
  const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(RPC) })

  const router = (env.CUSTOM_SWAP_ROUTER || env.NEXT_PUBLIC_AMM_ROUTER || '').trim()
  console.log('RPC:', RPC)
  console.log('Router env var:', router || '<empty>')

  if (router) {
    try {
      const code = await publicClient.getBytecode({ address: router })
      console.log('Router bytecode length:', code.length)
      console.log('Router has code?', !!(code && code !== '0x'))
    } catch (e) {
      console.error('getCode error:', e.message || e)
    }
  } else {
    console.log('No router configured via CUSTOM_SWAP_ROUTER or NEXT_PUBLIC_AMM_ROUTER')
  }

  const pk = env.PRIVATE_KEY || env.TEST_PRIVATE_KEY
  if (!pk) {
    console.log('No PRIVATE_KEY in env')
    process.exit(0)
  }
  const privateKey = pk.startsWith('0x') ? pk : '0x' + pk
  const account = privateKeyToAccount(privateKey)
  console.log('Derived account address:', account.address)

  try {
    const bal = await publicClient.getBalance({ address: account.address })
    console.log('AVAX balance (wei):', bal.toString())
  } catch (e) {
    console.error('getBalance error:', e.message || e)
  }
})()

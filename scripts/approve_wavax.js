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

  const { createPublicClient, createWalletClient, http, parseUnits } = require('viem')
  const { avalancheFuji } = require('viem/chains')
  const { privateKeyToAccount } = require('viem/accounts')
  
  // Minimal ERC20 ABI for approve
  const erc20Abi = [
    { "type": "function", "name": "approve", "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "nonpayable" }
  ]

  const RPC = env.RPC_URL_FUJI || env.NEXT_PUBLIC_RPC_URL_FUJI || env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc'
  const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(RPC) })
  
  const privateKey = env.PRIVATE_KEY.startsWith('0x') ? env.PRIVATE_KEY : '0x' + env.PRIVATE_KEY
  const account = privateKeyToAccount(privateKey)
  const walletClient = createWalletClient({
    account,
    chain: avalancheFuji,
    transport: http(RPC)
  })

  const router = env.NEXT_PUBLIC_AMM_ROUTER
  const WAVAX = env.NEXT_PUBLIC_TOKEN_A

  console.log('Account:', account.address)
  console.log('Router:', router)
  console.log('WAVAX:', WAVAX)

  try {
    // Approve router to spend a large amount of WAVAX
    console.log('Approving router to spend WAVAX...')
    const approveTx = await walletClient.writeContract({
      address: WAVAX,
      abi: erc20Abi,
      functionName: 'approve',
      args: [router, parseUnits('1000000', 18)] // Approve 1M WAVAX
    })
    console.log('Approve tx:', approveTx)

    console.log('Waiting for transaction to confirm...')
    await publicClient.waitForTransactionReceipt({ hash: approveTx })
    
    console.log('WAVAX approval successful!')
    
  } catch (e) {
    console.error('Approval error:', e.message || e)
  }
})()
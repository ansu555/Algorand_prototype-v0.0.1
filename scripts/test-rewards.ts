import fetch from 'node-fetch'

const BASE = 'http://localhost:3000'
const USER = process.env.TEST_USER || 'OA57DAFKUMATT3WK3DPJP7XZEFIXHRN7DAWR72YTOKYECVI3AOP2VYJQIE'

async function track(action: string, meta?: object) {
  const res = await fetch(`${BASE}/api/rewards/track`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({ userId: USER, actionType: action, metadata: meta })
  })
  console.log(action, res.status)
  console.log(await res.json())
}

async function claim(questId: string) {
  const res = await fetch(`${BASE}/api/rewards/claim`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({ userId: USER, questId })
  })
  console.log('claim', questId, res.status)
  console.log(await res.json())
}

;(async () => {
  await track('login')
  await track('swap', { pair: 'USDC-ALGO', amount: 1 })
  await track('swap', { pair: 'USDC-ALGO', amount: 1 })
  await track('add_liquidity', { pool: 'USDC-ALGO', amount: 10 })

  // Attempt to claim a simple quest (first_swap)
  await claim('first_swap')
})()

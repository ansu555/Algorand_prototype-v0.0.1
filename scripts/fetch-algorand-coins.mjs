// Simple test script to fetch CoinGecko coin list and filter Algorand-platform tokens
// Run with: node scripts/fetch-algorand-coins.mjs

(async function main() {
  try {
    const url = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true'
    const res = await fetch(url)
    if (!res.ok) {
      console.error('CoinGecko API error', res.status, res.statusText)
      process.exit(1)
    }

    const data = await res.json()

    const alg = data.filter((c) => c.platforms && Object.keys(c.platforms).some(k => k.toLowerCase() === 'algorand' && c.platforms[k]))

    console.log(`Found ${alg.length} Algorand assets on CoinGecko`)
    console.log('Sample (first 20):')
    console.log(alg.slice(0, 20).map(a => ({ id: a.id, symbol: a.symbol, name: a.name, algorand_platform: a.platforms?.algorand })))
  } catch (err) {
    console.error('Error fetching Algorand assets:', err)
    process.exit(1)
  }
})()

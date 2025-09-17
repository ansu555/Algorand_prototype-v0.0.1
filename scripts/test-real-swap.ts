import algosdk from 'algosdk'
import { PactRealSwap } from '../lib/pact-real-swap'

// Test real swap on Algorand testnet
async function testRealSwap() {
  try {
    console.log('🚀 Testing Real ALGO to USDC Swap on Testnet...\n')

    // Algorand testnet configuration
    const algodToken = ''
    const algodServer = 'https://testnet-api.algonode.cloud'
    const algodPort = 443

    // Initialize Algorand client
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort)

    // Get account from mnemonic (you need to set this in your .env.local)
    const mnemonic = process.env.ALGORAND_MNEMONIC
    if (!mnemonic) {
      throw new Error('ALGORAND_MNEMONIC not found in environment variables')
    }

    const account = algosdk.mnemonicToSecretKey(mnemonic)
    console.log(`📝 Account Address: ${account.addr}`)

    // Initialize Pact swap
    const pactSwap = new PactRealSwap(algodClient, account, 'testnet')

    // Check if opted into USDC
    console.log('🔍 Checking USDC opt-in status...')
    const isOptedIn = await pactSwap.isOptedIntoUSDC()
    console.log(`USDC Opt-in Status: ${isOptedIn ? '✅ Opted in' : '❌ Not opted in'}`)

    if (!isOptedIn) {
      console.log('📝 Opting into USDC...')
      const optInTxId = await pactSwap.optIntoUSDC()
      console.log(`✅ USDC Opt-in Transaction: ${optInTxId}`)
    }

    // Get quote for 0.1 ALGO
    console.log('\n💰 Getting quote for 0.1 ALGO to USDC...')
    const quote = await pactSwap.getQuote(0.1, 'ALGO')
    console.log(`Quote: 0.1 ALGO → ${quote.amountOut.toFixed(6)} USDC`)
    console.log(`Fee: ${(quote.fee * 100).toFixed(2)}%`)
    console.log(`Price Impact: ${quote.priceImpact.toFixed(2)}%`)

    // Execute real swap
    console.log('\n🔄 Executing real swap...')
    const swapResult = await pactSwap.swapAlgoToUsdc(0.1)
    
    console.log('\n✅ REAL SWAP COMPLETED!')
    console.log(`📊 Transaction Hash: ${swapResult.txId}`)
    console.log(`💱 Swapped: ${swapResult.details.amountIn} ALGO → ${swapResult.details.amountOut.toFixed(6)} USDC`)
    console.log(`🏊 Pool ID: ${swapResult.details.poolId}`)
    console.log(`💰 Fee: ${(swapResult.details.fee * 100).toFixed(2)}%`)
    console.log(`🌐 Network: ${swapResult.details.network}`)

    // Verify transaction on Algorand Explorer
    console.log(`\n🔍 View on Algorand Explorer:`)
    console.log(`https://testnet.algoexplorer.io/tx/${swapResult.txId}`)

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testRealSwap()

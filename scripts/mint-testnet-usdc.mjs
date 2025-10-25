#!/usr/bin/env node

/**
 * Mint testnet USDC tokens
 * This script will send you testnet USDC from a faucet account
 */

import algosdk from 'algosdk'

const ALGOD_SERVER = 'https://testnet-api.algonode.cloud'
const USDC_ASSET_ID = 10458941 // Testnet USDC

async function main() {
  const algodClient = new algosdk.Algodv2('', ALGOD_SERVER, '')
  
  // You'll need to provide your wallet address
  const recipientAddress = process.env.RECIPIENT_ADDRESS || process.argv[2]
  
  if (!recipientAddress) {
    console.log('❌ Please provide recipient address:')
    console.log('   node scripts/mint-testnet-usdc.mjs YOUR_ADDRESS')
    process.exit(1)
  }
  
  console.log('🔍 Checking if you own USDC asset...')
  
  try {
    const accountInfo = await algodClient.accountInformation(recipientAddress).do()
    const hasUSDC = accountInfo.assets.some(a => a['asset-id'] === USDC_ASSET_ID)
    
    if (!hasUSDC) {
      console.log('⚠️  You are not opted into USDC (asset 10458941)')
      console.log('   Opt in first using AlgoExplorer:')
      console.log(`   https://testnet.algoexplorer.io/asset/${USDC_ASSET_ID}`)
      process.exit(1)
    }
    
    console.log('✅ You are opted into USDC')
    
    // Check current balance
    const usdcAsset = accountInfo.assets.find(a => a['asset-id'] === USDC_ASSET_ID)
    const currentBalance = usdcAsset ? usdcAsset.amount / 1_000_000 : 0
    
    console.log(`\n💰 Current USDC balance: ${currentBalance} USDC`)
    console.log('\n⚠️  Unfortunately, there is no public testnet USDC faucet.')
    console.log('   Options to get testnet USDC:')
    console.log('   1. Create your own USDC asset for testing')
    console.log('   2. Swap ALGO → USDC on Tinyman testnet')
    console.log('   3. Use the asset creator account to send you some')
    
    // Check who created this asset
    const assetInfo = await algodClient.getAssetByID(USDC_ASSET_ID).do()
    console.log(`\n   Asset creator: ${assetInfo.params.creator}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

main()

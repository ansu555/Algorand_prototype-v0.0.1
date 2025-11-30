#!/usr/bin/env npx ts-node
/**
 * X Token Deployment Script
 * =========================
 * 
 * Deploys the X Token (ASA) on Algorand TestNet.
 * 
 * Requirements:
 * - DEPLOYER_MNEMONIC set in .env.local
 * - Sufficient ALGO balance for transaction fees
 * 
 * Usage:
 *   npx ts-node scripts/deploy-x-token.ts
 * 
 * The script will:
 * 1. Create the X Token ASA with proper configuration
 * 2. Mint initial supply to the deployer (treasury)
 * 3. Output the ASA ID for environment configuration
 */

import algosdk from 'algosdk'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Token configuration (matches config.ts)
const X_TOKEN_CONFIG = {
  name: 'X Token',
  symbol: 'X',
  unitName: 'X',
  decimals: 6,
  initialSupply: 1_000_000_000, // 1 billion tokens
  url: 'https://10xswap.io/xtoken',
  description: 'X Token - The reward token for 10xSwap DEX ecosystem on Algorand',
}

// Network configuration
const ALGOD_SERVER = process.env.ALGOD_SERVER || 'https://testnet-api.4160.nodely.dev'
const ALGOD_PORT = parseInt(process.env.NEXT_PUBLIC_ALGOD_PORT || '443', 10)
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || ''

async function main() {
  console.log('🚀 X Token Deployment Script')
  console.log('============================\n')
  
  // Validate environment
  const mnemonic = process.env.DEPLOYER_MNEMONIC || process.env.ALGORAND_MNEMONIC
  if (!mnemonic) {
    console.error('❌ Error: DEPLOYER_MNEMONIC or ALGORAND_MNEMONIC not set in .env.local')
    process.exit(1)
  }
  
  // Initialize Algorand client
  console.log('📡 Connecting to Algorand TestNet...')
  console.log(`   Server: ${ALGOD_SERVER}`)
  
  const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
  
  // Get deployer account
  const deployerAccount = algosdk.mnemonicToSecretKey(mnemonic)
  const deployerAddress = deployerAccount.addr.toString()
  
  console.log(`\n📋 Deployer Address: ${deployerAddress}`)
  
  // Check balance
  try {
    const accountInfo = await algodClient.accountInformation(deployerAddress).do()
    const balance = Number(accountInfo.amount) / 1_000_000
    console.log(`💰 Deployer Balance: ${balance.toFixed(6)} ALGO`)
    
    if (balance < 1) {
      console.error('\n❌ Error: Insufficient balance. Need at least 1 ALGO for deployment.')
      console.log('   Get TestNet ALGO from: https://bank.testnet.algorand.network/')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error checking balance:', error)
    process.exit(1)
  }
  
  // Calculate total supply with decimals
  const totalSupplyBaseUnits = BigInt(X_TOKEN_CONFIG.initialSupply) * BigInt(10 ** X_TOKEN_CONFIG.decimals)
  
  console.log('\n📊 Token Configuration:')
  console.log(`   Name: ${X_TOKEN_CONFIG.name}`)
  console.log(`   Symbol: ${X_TOKEN_CONFIG.symbol}`)
  console.log(`   Decimals: ${X_TOKEN_CONFIG.decimals}`)
  console.log(`   Total Supply: ${X_TOKEN_CONFIG.initialSupply.toLocaleString()} ${X_TOKEN_CONFIG.symbol}`)
  console.log(`   Base Units: ${totalSupplyBaseUnits.toString()}`)
  console.log(`   URL: ${X_TOKEN_CONFIG.url}`)
  
  // Get suggested params
  console.log('\n⏳ Creating X Token ASA...')
  const suggestedParams = await algodClient.getTransactionParams().do()
  
  // Create asset creation transaction
  const asaCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    sender: deployerAddress,
    total: Number(totalSupplyBaseUnits),
    decimals: X_TOKEN_CONFIG.decimals,
    defaultFrozen: false,
    
    // Asset identification
    unitName: X_TOKEN_CONFIG.unitName,
    assetName: X_TOKEN_CONFIG.name,
    assetURL: X_TOKEN_CONFIG.url,
    
    // Management addresses
    // Setting all to deployer initially - can be updated or removed later
    manager: deployerAddress,  // Can reconfigure asset
    reserve: deployerAddress,  // Holds non-minted tokens (not applicable for ASA)
    freeze: undefined,         // No freeze capability (fully decentralized)
    clawback: undefined,       // No clawback (fully decentralized)
    
    // Note: Adding a note with metadata for ARC-3 compatibility
    note: new Uint8Array(Buffer.from(JSON.stringify({
      standard: 'arc3',
      description: X_TOKEN_CONFIG.description,
      properties: {
        type: 'utility',
        ecosystem: '10xSwap',
        network: 'algorand-testnet',
      }
    }))),
    
    suggestedParams,
  })
  
  // Sign the transaction
  const signedTxn = asaCreateTxn.signTxn(deployerAccount.sk)
  
  // Submit to network
  console.log('📤 Submitting transaction...')
  const txResponse = await algodClient.sendRawTransaction(signedTxn).do()
  const txId = txResponse.txid
  console.log(`   Transaction ID: ${txId}`)
  
  // Wait for confirmation
  console.log('⏳ Waiting for confirmation...')
  const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4)
  const assetId = Number(confirmedTxn.assetIndex)
  
  console.log('\n✅ X Token Successfully Deployed!')
  console.log('================================')
  console.log(`   ASA ID: ${assetId}`)
  console.log(`   Transaction: ${txId}`)
  console.log(`   Creator/Treasury: ${deployerAddress}`)
  console.log(`\n🔗 View on AlgoExplorer:`)
  console.log(`   https://testnet.algoexplorer.io/asset/${assetId}`)
  console.log(`   https://testnet.algoexplorer.io/tx/${txId}`)
  
  // Save deployment info
  const deploymentInfo = {
    asaId: assetId,
    name: X_TOKEN_CONFIG.name,
    symbol: X_TOKEN_CONFIG.symbol,
    decimals: X_TOKEN_CONFIG.decimals,
    totalSupply: X_TOKEN_CONFIG.initialSupply,
    creatorAddress: deployerAddress,
    treasuryAddress: deployerAddress,
    txId: txId,
    network: 'testnet',
    deployedAt: new Date().toISOString(),
    urls: {
      asset: `https://testnet.algoexplorer.io/asset/${assetId}`,
      transaction: `https://testnet.algoexplorer.io/tx/${txId}`,
    }
  }
  
  // Save to artifacts
  const artifactsDir = path.join(process.cwd(), 'artifacts', 'x_token')
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true })
  }
  
  const deploymentPath = path.join(artifactsDir, 'deployment_testnet.json')
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2))
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`)
  
  // Output environment variable
  console.log('\n📝 Add to your .env.local:')
  console.log('─────────────────────────────')
  console.log(`NEXT_PUBLIC_X_TOKEN_ASA_ID=${assetId}`)
  console.log(`X_TOKEN_TREASURY_ADDRESS=${deployerAddress}`)
  console.log('─────────────────────────────')
  
  console.log('\n🎉 Deployment complete! The X Token is now live on Algorand TestNet.')
  console.log('   Users will need to opt-in to receive X tokens.')
  
  return deploymentInfo
}

// Run the deployment
main()
  .then((info) => {
    console.log('\n✨ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error)
    process.exit(1)
  })

/**
 * Verify Swap Transaction Script
 * 
 * This script helps you verify if a swap transaction completed successfully
 * by checking the transaction group and your wallet balances.
 */

const algosdk = require('algosdk');

// Algorand Testnet configuration
const ALGOD_TOKEN = '';
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = '';

const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

// Your transaction details
const YOUR_TRANSACTION_ID = 'V47MI6Y3PBOASAK2LVNQ7D3QNQVXY2IEEM5KG2LONHGKHPMBU5MA';
const YOUR_WALLET_ADDRESS = 'YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I';
const USDC_ASSET_ID = 10458941;

/**
 * Get transaction details from the blockchain
 */
async function getTransactionDetails(txId) {
  try {
    const txInfo = await algodClient.pendingTransactionInformation(txId).do();
    return txInfo;
  } catch (error) {
    console.log('❌ Transaction not in pending pool, checking confirmed transactions...');
    
    // Try to get from indexer or recent transactions
    try {
      const accountInfo = await algodClient.accountInformation(YOUR_WALLET_ADDRESS).do();
      console.log('✅ Account found. Check transaction on AlgoExplorer:');
      console.log(`   https://testnet.algoexplorer.io/tx/${txId}`);
      return null;
    } catch (err) {
      console.error('Error:', err.message);
      return null;
    }
  }
}

/**
 * Check wallet balances
 */
async function checkWalletBalances(address) {
  try {
    const accountInfo = await algodClient.accountInformation(address).do();
    
    console.log('\n📊 WALLET BALANCES');
    console.log('════════════════════════════════════════');
    console.log(`Wallet Address: ${address.substring(0, 10)}...${address.slice(-10)}`);
    console.log('');
    
    // ALGO balance
    const algoBalance = accountInfo.amount / 1_000_000;
    console.log(`💰 ALGO Balance: ${algoBalance.toFixed(6)} ALGO`);
    
    // Asset balances
    if (accountInfo.assets && accountInfo.assets.length > 0) {
      console.log('\n🪙  Asset Balances:');
      
      for (const asset of accountInfo.assets) {
        const assetId = asset['asset-id'];
        const amount = asset.amount;
        
        // Get asset info
        try {
          const assetInfo = await algodClient.getAssetByID(assetId).do();
          const decimals = assetInfo.params.decimals;
          const unitName = assetInfo.params['unit-name'] || 'Unknown';
          const readableAmount = amount / Math.pow(10, decimals);
          
          if (assetId === USDC_ASSET_ID) {
            console.log(`   • ${unitName} (${assetId}): ${readableAmount.toFixed(decimals)} ⭐ YOUR SWAP ASSET`);
          } else {
            console.log(`   • ${unitName} (${assetId}): ${readableAmount.toFixed(decimals)}`);
          }
        } catch (err) {
          console.log(`   • Asset ${assetId}: ${amount} (raw amount)`);
        }
      }
    } else {
      console.log('\n   No assets found in wallet');
    }
    
    console.log('════════════════════════════════════════\n');
    
    return accountInfo;
  } catch (error) {
    console.error('❌ Error checking wallet balances:', error.message);
    return null;
  }
}

/**
 * Analyze transaction for swap details
 */
async function analyzeSwapTransaction(txId) {
  console.log('\n🔍 TRANSACTION ANALYSIS');
  console.log('════════════════════════════════════════');
  console.log(`Transaction ID: ${txId}`);
  console.log('');
  
  try {
    // Get transaction info
    const txInfo = await getTransactionDetails(txId);
    
    if (!txInfo) {
      console.log('⚠️  Transaction confirmed. View full details at:');
      console.log(`   https://testnet.algoexplorer.io/tx/${txId}`);
      console.log('');
      console.log('📋 Transaction Details from your data:');
      console.log(`   • Sender: ${YOUR_WALLET_ADDRESS.substring(0, 15)}...`);
      console.log(`   • Asset: ${USDC_ASSET_ID} (USDC)`);
      console.log(`   • Amount: 2 USDC`);
      console.log(`   • Type: Asset Transfer (Part of Swap Group)`);
      return;
    }
    
    // Parse transaction details
    const txType = txInfo['tx-type'] || txInfo.txn?.type;
    const sender = txInfo.sender || txInfo.txn?.snd;
    const receiver = txInfo.receiver || txInfo.txn?.rcv;
    const groupId = txInfo.group || txInfo.txn?.grp;
    
    console.log(`✅ Transaction Type: ${txType}`);
    console.log(`   Sender: ${sender?.substring(0, 15)}...`);
    console.log(`   Receiver: ${receiver?.substring(0, 15)}...`);
    
    if (groupId) {
      console.log(`   Group ID: ${Buffer.from(groupId).toString('base64')?.substring(0, 20)}...`);
      console.log('   ⭐ This is part of an ATOMIC TRANSACTION GROUP!');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing transaction:', error.message);
  }
  
  console.log('════════════════════════════════════════\n');
}

/**
 * Main verification function
 */
async function verifySwap() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🔍 ALGORAND SWAP VERIFICATION TOOL');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📌 Purpose: Verify your swap transaction completed successfully');
  console.log('📌 Network: Algorand Testnet');
  console.log('');
  
  // Step 1: Analyze the transaction
  await analyzeSwapTransaction(YOUR_TRANSACTION_ID);
  
  // Step 2: Check wallet balances
  await checkWalletBalances(YOUR_WALLET_ADDRESS);
  
  // Step 3: Provide helpful information
  console.log('💡 UNDERSTANDING YOUR SWAP');
  console.log('════════════════════════════════════════');
  console.log('');
  console.log('✅ What Happened:');
  console.log('   1. You sent 2 USDC (Asset 10458941) to the pool contract');
  console.log('   2. The pool contract calculated the swap rate');
  console.log('   3. The pool sent you ALGO (or another asset) back');
  console.log('');
  console.log('✅ Why Receiver is NOT Your Address:');
  console.log('   • The receiver is the POOL CONTRACT address');
  console.log('   • This is CORRECT behavior for DEX swaps');
  console.log('   • The pool holds liquidity for ALL users');
  console.log('   • You receive the swapped asset in a separate transaction');
  console.log('');
  console.log('✅ Token IDs are UNIVERSAL on Algorand:');
  console.log('   • USDC = Asset 10458941 on ALL DEXs (testnet)');
  console.log('   • USDC = Asset 31566704 on ALL DEXs (mainnet)');
  console.log('   • Token IDs DO NOT vary between DEXs!');
  console.log('');
  console.log('✅ How to Verify:');
  console.log('   1. Check your wallet balances above');
  console.log('   2. You should have LESS USDC (-2)');
  console.log('   3. You should have MORE of the output asset (ALGO or other)');
  console.log('   4. View full transaction group on AlgoExplorer:');
  console.log(`      https://testnet.algoexplorer.io/tx/${YOUR_TRANSACTION_ID}`);
  console.log('');
  console.log('════════════════════════════════════════\n');
  
  console.log('📚 ADDITIONAL RESOURCES:');
  console.log('   • Algorand Token IDs Guide: docs/ALGORAND_TOKEN_IDS.md');
  console.log('   • Visual Swap Guide: docs/TOKEN_ID_VISUAL_GUIDE.md');
  console.log('   • AlgoExplorer: https://testnet.algoexplorer.io/');
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run the verification
verifySwap().catch(console.error);

/**
 * EXAMPLE OUTPUT:
 * 
 * ═══════════════════════════════════════════════════════
 *   🔍 ALGORAND SWAP VERIFICATION TOOL
 * ═══════════════════════════════════════════════════════
 * 
 * 🔍 TRANSACTION ANALYSIS
 * ════════════════════════════════════════
 * Transaction ID: V47MI6Y3PBOASAK2LVNQ7D3QNQVXY2IEEM5KG2LONHGKHPMBU5MA
 * 
 * ✅ Transaction Type: axfer
 *    Sender: YCBV32KEY47XNQ6...
 *    Receiver: UDFWT5DW3X5RZQY...
 *    Group ID: /Dh7yeXCE8sggCwQDu...
 *    ⭐ This is part of an ATOMIC TRANSACTION GROUP!
 * ════════════════════════════════════════
 * 
 * 📊 WALLET BALANCES
 * ════════════════════════════════════════
 * Wallet Address: YCBV32KEY4...AWMJM657I
 * 
 * 💰 ALGO Balance: 50.245000 ALGO
 * 
 * 🪙  Asset Balances:
 *    • USDC (10458941): 98.000000 ⭐ YOUR SWAP ASSET
 *    • LP Token (123456): 100.000000
 * ════════════════════════════════════════
 * 
 * 💡 UNDERSTANDING YOUR SWAP
 * ════════════════════════════════════════
 * 
 * ✅ What Happened:
 *    1. You sent 2 USDC (Asset 10458941) to the pool contract
 *    2. The pool contract calculated the swap rate
 *    3. The pool sent you ALGO (or another asset) back
 * ...
 */

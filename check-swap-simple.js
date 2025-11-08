// Simple swap verification using Algoexplorer API
const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function checkSwap() {
  const txId = 'V47MI6Y3PBOASAK2LVNQ7D3QNQVXY2IEEM5KG2LONHGKHPMBU5MA';
  const yourAddress = 'YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I';
  const poolAddress = 'UDFWT5DW3X5RZQYXKQEMZ6MRWAEYHWYP7YUAPZKPW6WJK3JH3OZPL7PO2Y';
  
  console.log('🔍 Checking swap transaction...\n');
  console.log('Your Address:', yourAddress);
  console.log('Pool Address:', poolAddress);
  console.log('Transaction ID:', txId);
  console.log('═'.repeat(80));
  
  try {
    // Get transaction from Algoexplorer
    const url = `https://testnet.algoexplorerapi.io/v2/transactions/${txId}`;
    console.log('\n📡 Fetching transaction details from Algoexplorer...\n');
    
    const txData = await httpsGet(url);
    
    if (txData.transaction) {
      const tx = txData.transaction;
      
      console.log('✅ TRANSACTION FOUND:\n');
      console.log('Confirmed Round:', tx['confirmed-round']);
      console.log('Sender:', tx.sender);
      console.log('Type:', tx['tx-type']);
      
      if (tx['asset-transfer-transaction']) {
        const axfer = tx['asset-transfer-transaction'];
        console.log('Asset ID:', axfer['asset-id']);
        console.log('Amount:', axfer.amount / 1000000, 'tokens');
        console.log('Receiver:', axfer.receiver);
      }
      
      if (tx.group) {
        console.log('\n🔗 PART OF GROUP:', Buffer.from(tx.group, 'base64').toString('base64'));
        console.log('\n🔎 Searching for other transactions in this group...\n');
        
        // Get account transactions to find group members
        const accountUrl = `https://testnet.algoexplorerapi.io/v2/accounts/${yourAddress}/transactions?limit=50`;
        const accountTxs = await httpsGet(accountUrl);
        
        if (accountTxs.transactions) {
          const groupTxs = accountTxs.transactions.filter(t => 
            t.group && t.group === tx.group
          );
          
          console.log(`Found ${groupTxs.length} transactions in the group:\n`);
          console.log('═'.repeat(80));
          
          groupTxs.forEach((t, idx) => {
            console.log(`\nTransaction ${idx + 1}:`);
            console.log('  TX ID:', t.id);
            console.log('  Type:', t['tx-type']);
            console.log('  Sender:', t.sender);
            
            if (t['payment-transaction']) {
              const pay = t['payment-transaction'];
              console.log('  Receiver:', pay.receiver);
              console.log('  Amount:', pay.amount / 1000000, 'ALGO');
            }
            
            if (t['asset-transfer-transaction']) {
              const axfer = t['asset-transfer-transaction'];
              console.log('  Receiver:', axfer.receiver);
              console.log('  Asset ID:', axfer['asset-id']);
              console.log('  Amount:', axfer.amount / 1000000, 'tokens');
            }
            
            if (t['application-transaction']) {
              console.log('  App ID:', t['application-transaction']['application-id']);
              console.log('  App Call Type: Swap execution');
            }
          });
          
          console.log('\n═'.repeat(80));
          console.log('\n💰 SWAP SUMMARY:\n');
          
          // Find what you sent
          const sentTx = groupTxs.find(t => 
            t.sender === yourAddress && 
            (t['asset-transfer-transaction']?.receiver !== yourAddress ||
             t['payment-transaction']?.receiver !== yourAddress)
          );
          
          // Find what you received  
          const receivedTx = groupTxs.find(t =>
            t['asset-transfer-transaction']?.receiver === yourAddress &&
            t.sender !== yourAddress
          );
          
          if (sentTx) {
            console.log('✅ YOU SENT:');
            if (sentTx['asset-transfer-transaction']) {
              const amt = sentTx['asset-transfer-transaction'].amount;
              const assetId = sentTx['asset-transfer-transaction']['asset-id'];
              console.log(`   ${amt / 1000000} of Asset ${assetId} (probably USDC)`);
              console.log(`   To: ${sentTx['asset-transfer-transaction'].receiver}`);
            } else if (sentTx['payment-transaction']) {
              const amt = sentTx['payment-transaction'].amount;
              console.log(`   ${amt / 1000000} ALGO`);
              console.log(`   To: ${sentTx['payment-transaction'].receiver}`);
            }
          }
          
          if (receivedTx) {
            console.log('\n✅ YOU RECEIVED:');
            if (receivedTx['asset-transfer-transaction']) {
              const amt = receivedTx['asset-transfer-transaction'].amount;
              const assetId = receivedTx['asset-transfer-transaction']['asset-id'];
              console.log(`   ${amt / 1000000} of Asset ${assetId}`);
              console.log(`   From: ${receivedTx.sender} (Pool)`);
            } else if (receivedTx['payment-transaction']) {
              const amt = receivedTx['payment-transaction'].amount;
              console.log(`   ${amt / 1000000} ALGO`);
              console.log(`   From: ${receivedTx.sender} (Pool)`);
            }
          } else {
            console.log('\n⚠️  NO RETURN TRANSACTION FOUND IN YOUR ACCOUNT');
            console.log('   Checking if the pool sent tokens...\n');
            
            // Check pool transactions
            const poolUrl = `https://testnet.algoexplorerapi.io/v2/accounts/${poolAddress}/transactions?limit=50`;
            const poolTxs = await httpsGet(poolUrl);
            
            if (poolTxs.transactions) {
              const poolGroupTxs = poolTxs.transactions.filter(t =>
                t.group && t.group === tx.group
              );
              
              const poolSentToYou = poolGroupTxs.find(t =>
                (t['asset-transfer-transaction']?.receiver === yourAddress ||
                 t['payment-transaction']?.receiver === yourAddress) &&
                t.sender === poolAddress
              );
              
              if (poolSentToYou) {
                console.log('✅ FOUND: Pool sent you:');
                if (poolSentToYou['asset-transfer-transaction']) {
                  const amt = poolSentToYou['asset-transfer-transaction'].amount;
                  const assetId = poolSentToYou['asset-transfer-transaction']['asset-id'];
                  console.log(`   ${amt / 1000000} of Asset ${assetId}`);
                } else if (poolSentToYou['payment-transaction']) {
                  const amt = poolSentToYou['payment-transaction'].amount;
                  console.log(`   ${amt / 1000000} ALGO`);
                }
              }
            }
          }
          
          console.log('\n═'.repeat(80));
          console.log('\n📱 VIEW ON EXPLORER:');
          console.log(`https://testnet.algoexplorer.io/tx/${txId}`);
          
        } else {
          console.log('Could not fetch account transactions');
        }
      } else {
        console.log('\n⚠️  Transaction is NOT part of a group');
        console.log('This is unusual for a swap transaction');
      }
      
    } else {
      console.log('❌ Transaction not found or error:', txData);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📱 Check manually at:');
    console.log(`https://testnet.algoexplorer.io/tx/${txId}`);
  }
}

checkSwap().catch(console.error);

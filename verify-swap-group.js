// Verify swap transaction group and find the return transaction
const algosdk = require('algosdk');

const TESTNET_ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk.Algodv2('', TESTNET_ALGOD_SERVER, '');

async function verifySwapGroup() {
  const txId = 'V47MI6Y3PBOASAK2LVNQ7D3QNQVXY2IEEM5KG2LONHGKHPMBU5MA';
  const groupId = '/Dh7yeXCE8sggCwQDuKvSIjmf5SXQqP1EOX1cS93SOE=';
  
  console.log('🔍 Investigating transaction group for swap...\n');
  console.log('Transaction ID:', txId);
  console.log('Group ID:', groupId);
  console.log('─'.repeat(80));
  
  try {
    // Get the transaction details
    const txInfo = await algodClient.pendingTransactionInformation(txId).do();
    console.log('\n📋 Transaction Details:');
    console.log(JSON.stringify(txInfo, null, 2));
    
    // Try to get the transaction from confirmed blocks
    const round = 57324399; // The confirmed round from your transaction
    console.log(`\n🔎 Checking block ${round} for grouped transactions...`);
    
    try {
      const block = await algodClient.block(round).do();
      console.log('\n📦 Block found, searching for transactions in group...');
      
      // Find all transactions in this group
      const groupTxns = block.block.txns?.filter(tx => {
        const txGroupB64 = tx.txn.grp ? Buffer.from(tx.txn.grp).toString('base64') : null;
        return txGroupB64 === groupId;
      }) || [];
      
      console.log(`\n✅ Found ${groupTxns.length} transactions in the group:\n`);
      
      groupTxns.forEach((tx, idx) => {
        console.log(`Transaction ${idx + 1}:`);
        console.log('  Type:', tx.txn.type);
        console.log('  Sender:', algosdk.encodeAddress(tx.txn.snd));
        
        if (tx.txn.type === 'pay') {
          console.log('  Receiver:', algosdk.encodeAddress(tx.txn.rcv));
          console.log('  Amount:', tx.txn.amt, 'microAlgos');
        } else if (tx.txn.type === 'axfer') {
          console.log('  Receiver:', algosdk.encodeAddress(tx.txn.arcv));
          console.log('  Asset ID:', tx.txn.xaid);
          console.log('  Amount:', tx.txn.aamt);
        } else if (tx.txn.type === 'appl') {
          console.log('  App ID:', tx.txn.apid);
          console.log('  App Args:', tx.txn.apaa?.map(arg => Buffer.from(arg).toString('hex')));
        }
        console.log('');
      });
      
      // Analyze the swap
      console.log('─'.repeat(80));
      console.log('\n💡 SWAP ANALYSIS:');
      
      const yourAddress = 'YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I';
      const poolAddress = 'UDFWT5DW3X5RZQYXKQEMZ6MRWAEYHWYP7YUAPZKPW6WJK3JH3OZPL7PO2Y';
      
      // Find what you sent
      const sentTxn = groupTxns.find(tx => 
        algosdk.encodeAddress(tx.txn.snd) === yourAddress
      );
      
      // Find what you received
      const receivedTxns = groupTxns.filter(tx => {
        if (tx.txn.type === 'pay') {
          return algosdk.encodeAddress(tx.txn.rcv) === yourAddress;
        } else if (tx.txn.type === 'axfer') {
          return algosdk.encodeAddress(tx.txn.arcv) === yourAddress;
        }
        return false;
      });
      
      if (sentTxn) {
        console.log('\n✅ YOU SENT:');
        if (sentTxn.txn.type === 'axfer') {
          console.log(`   ${sentTxn.txn.aamt / 1000000} of Asset ${sentTxn.txn.xaid}`);
          console.log(`   To: ${algosdk.encodeAddress(sentTxn.txn.arcv)}`);
        } else if (sentTxn.txn.type === 'pay') {
          console.log(`   ${sentTxn.txn.amt / 1000000} ALGO`);
          console.log(`   To: ${algosdk.encodeAddress(sentTxn.txn.rcv)}`);
        }
      }
      
      if (receivedTxns.length > 0) {
        console.log('\n✅ YOU RECEIVED:');
        receivedTxns.forEach(tx => {
          if (tx.txn.type === 'axfer') {
            console.log(`   ${tx.txn.aamt / 1000000} of Asset ${tx.txn.xaid}`);
            console.log(`   From: ${algosdk.encodeAddress(tx.txn.snd)}`);
          } else if (tx.txn.type === 'pay') {
            console.log(`   ${tx.txn.amt / 1000000} ALGO`);
            console.log(`   From: ${algosdk.encodeAddress(tx.txn.snd)}`);
          }
        });
      } else {
        console.log('\n⚠️  NO RETURN TRANSACTION FOUND');
        console.log('   This might indicate:');
        console.log('   1. The swap is still processing');
        console.log('   2. The swap failed (but funds should be returned)');
        console.log('   3. The output is in a later transaction');
      }
      
    } catch (blockError) {
      console.error('Error fetching block:', blockError.message);
      console.log('\n💡 Trying alternative method...');
      
      // Alternative: Check account transactions
      console.log('\nChecking your account transactions around this time...');
      const yourAddress = 'YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I';
      
      // This would need indexer, but we can guide the user
      console.log('\n📱 To check the full swap results:');
      console.log('1. Go to: https://testnet.explorer.perawallet.app/tx-group/' + groupId.replace(/\//g, '%2F').replace(/\+/g, '%2B').replace(/=/g, '%3D'));
      console.log('2. Or check your wallet transaction history');
      console.log('3. Look for transactions in the same "group"');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n📱 Manual verification steps:');
    console.log('1. Check on Algorand TestNet Explorer:');
    console.log('   https://testnet.algoexplorer.io/tx/' + txId);
    console.log('2. Look for "Group" transactions');
    console.log('3. Check what assets you received in your wallet');
  }
}

verifySwapGroup().catch(console.error);

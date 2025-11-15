/**
 * Test script to debug box reference encoding
 * Run with: node test-pool-creation.js
 */

const algosdk = require('algosdk');
const crypto = require('crypto');

// Configuration
const POOL_APP_ID = 749649983;
const ASSET_1_ID = 70283957; // ALGF
const ASSET_2_ID = 10458941;  // USDC
const FEE_BPS = 30;
const USER_ADDRESS = 'M4QPAJAMJ7MNCVMCO3O4QZZVV7E2RW2WNDW2VC3JEIJRUS5OMBLS6HNPLE';

// Compute pool ID (same logic as client)
function computePoolId(asset1Id, asset2Id) {
  const [sortedAsset1, sortedAsset2] = asset1Id < asset2Id
    ? [asset1Id, asset2Id]
    : [asset2Id, asset1Id];

  const buffer = Buffer.alloc(16);
  buffer.writeBigUInt64BE(BigInt(sortedAsset1), 0);
  buffer.writeBigUInt64BE(BigInt(sortedAsset2), 8);

  const hash = crypto.createHash('sha256').update(buffer).digest();
  return new Uint8Array(hash);
}

// Create algod client
const algodClient = new algosdk.Algodv2(
  '',
  'https://testnet-api.algonode.cloud',
  ''
);

async function testBoxReference() {
  console.log('🔍 Testing box reference encoding...\n');

  // Compute pool ID
  const poolIdBytes = computePoolId(ASSET_1_ID, ASSET_2_ID);
  console.log('Pool ID (raw bytes):', Buffer.from(poolIdBytes).toString('hex'));
  console.log('Pool ID length:', poolIdBytes.length);
  console.log('Pool ID (base64):', Buffer.from(poolIdBytes).toString('base64'));
  console.log('');

  // Get suggested params
  const suggestedParams = await algodClient.getTransactionParams().do();
  const modifiedParams = { ...suggestedParams };
  modifiedParams.fee = BigInt(4000);
  modifiedParams.flatFee = true;

  // Create method signature
  const createPoolMethod = new algosdk.ABIMethod({
    name: 'create_pool',
    args: [
      { type: 'uint64', name: 'asset_1' },
      { type: 'uint64', name: 'asset_2' },
      { type: 'uint16', name: 'fee_bps' },
    ],
    returns: { type: 'string' },
  });

  // Encode arguments
  const appArgs = [createPoolMethod.getSelector()];
  const asset1Type = algosdk.ABIType.from('uint64');
  appArgs.push(asset1Type.encode(ASSET_1_ID));
  const asset2Type = algosdk.ABIType.from('uint64');
  appArgs.push(asset2Type.encode(ASSET_2_ID));
  const feeType = algosdk.ABIType.from('uint16');
  appArgs.push(feeType.encode(FEE_BPS));

  console.log('App args:');
  appArgs.forEach((arg, i) => {
    console.log(`  [${i}]:`, Buffer.from(arg).toString('hex'));
  });
  console.log('');

  // TEST 1: Box reference with Uint8Array directly
  console.log('📦 TEST 1: Box reference with Uint8Array');
  const boxRef1 = {
    appIndex: POOL_APP_ID,
    name: poolIdBytes, // Raw Uint8Array
  };
  console.log('  Box reference:', boxRef1);
  console.log('  Box name type:', boxRef1.name.constructor.name);
  console.log('  Box name hex:', Buffer.from(boxRef1.name).toString('hex'));
  console.log('');

  const txn1 = algosdk.makeApplicationCallTxnFromObject({
    sender: USER_ADDRESS,
    suggestedParams: modifiedParams,
    appIndex: POOL_APP_ID,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    appArgs,
    foreignAssets: [ASSET_1_ID, ASSET_2_ID],
    boxes: [boxRef1],
  });

  // Inspect the transaction object
  console.log('  Transaction object keys:', Object.keys(txn1));
  console.log('  Transaction applicationCall:', txn1.applicationCall);
  if (txn1.applicationCall) {
    console.log('  applicationCall.boxes:', txn1.applicationCall.boxes);
    console.log('  applicationCall.appBoxReferences:', txn1.applicationCall.appBoxReferences);
  }
  console.log('  Transaction object boxes:', txn1.boxes);
  console.log('  Transaction appBoxes:', txn1.appBoxes);

  // Encode and decode to inspect
  const encoded1 = algosdk.encodeUnsignedTransaction(txn1);
  const decoded1 = algosdk.decodeUnsignedTransaction(encoded1);

  console.log('  Decoded transaction applicationCall:', decoded1.applicationCall);
  if (decoded1.applicationCall && decoded1.applicationCall.boxes) {
    console.log('  Decoded transaction boxes:');
    decoded1.applicationCall.boxes.forEach((box, i) => {
      console.log(`    Box[${i}]:`, {
        appIndex: box.appIndex,
        nameHex: Buffer.from(box.name).toString('hex'),
        nameLength: box.name.length,
      });
    });

    // Check if the box reference has ARC-4 encoding
    const boxNameHex = Buffer.from(decoded1.applicationCall.boxes[0].name).toString('hex');
    console.log('  Raw box name hex:', boxNameHex);
    const hasLengthPrefix = boxNameHex.startsWith('0020');

    if (hasLengthPrefix) {
      console.log('  ❌ ERROR: Box reference has ARC-4 length prefix (0x0020)!');
      console.log('     This will cause "invalid Box reference" error');
    } else {
      console.log('  ✅ SUCCESS: Box reference is raw bytes without length prefix');
    }
  } else {
    console.log('  ⚠️  No boxes found in decoded transaction!');
  }
  console.log('');

  // TEST 2: Box reference with Buffer
  console.log('📦 TEST 2: Box reference with Buffer');
  const boxRef2 = {
    appIndex: POOL_APP_ID,
    name: Buffer.from(poolIdBytes),
  };
  console.log('  Box name type:', boxRef2.name.constructor.name);
  console.log('  Box name hex:', boxRef2.name.toString('hex'));
  console.log('');

  const txn2 = algosdk.makeApplicationCallTxnFromObject({
    sender: USER_ADDRESS,
    suggestedParams: modifiedParams,
    appIndex: POOL_APP_ID,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    appArgs,
    foreignAssets: [ASSET_1_ID, ASSET_2_ID],
    boxes: [boxRef2],
  });

  console.log('  Transaction object boxes:', txn2.boxes);
  console.log('  Transaction appBoxes:', txn2.appBoxes);

  const encoded2 = algosdk.encodeUnsignedTransaction(txn2);
  const decoded2 = algosdk.decodeUnsignedTransaction(encoded2);

  console.log('  Decoded transaction:');
  console.log('    - boxes:', decoded2.boxes);
  console.log('    - appBoxes:', decoded2.appBoxes);
  console.log('');

  if (decoded2.boxes && decoded2.boxes.length > 0) {
    console.log('  Encoded transaction boxes:');
    decoded2.boxes.forEach((box, i) => {
      console.log(`    Box[${i}]:`, {
        appIndex: box.appIndex,
        nameHex: Buffer.from(box.name).toString('hex'),
        nameLength: box.name.length,
      });
    });
  } else if (decoded2.appBoxes && decoded2.appBoxes.length > 0) {
    console.log('  Encoded transaction appBoxes:');
    decoded2.appBoxes.forEach((box, i) => {
      console.log(`    Box[${i}]:`, {
        appIndex: box.appIndex,
        nameHex: Buffer.from(box.name).toString('hex'),
        nameLength: box.name.length,
      });
    });
  } else {
    console.log('  ⚠️  No boxes found in decoded transaction!');
  }
  console.log('');

  // Check if both produce the same result (if boxes exist)
  const boxes1 = decoded1.boxes || decoded1.appBoxes;
  const boxes2 = decoded2.boxes || decoded2.appBoxes;

  if (boxes1 && boxes2 && boxes1.length > 0 && boxes2.length > 0) {
    const same = Buffer.from(boxes1[0].name).equals(Buffer.from(boxes2[0].name));
    console.log('✅ Both methods produce same box reference:', same);
    console.log('');

    // Verify the box reference is NOT ARC-4 encoded
    const boxNameHex = Buffer.from(boxes1[0].name).toString('hex');
    const hasLengthPrefix = boxNameHex.startsWith('0020');

    if (hasLengthPrefix) {
      console.log('❌ ERROR: Box reference has ARC-4 length prefix (0x0020)!');
      console.log('   This will cause "invalid Box reference" error');
    } else {
      console.log('✅ SUCCESS: Box reference is raw bytes without length prefix');
    }
  } else {
    console.log('⚠️  Cannot verify - boxes not found in transactions');
  }
}

testBoxReference().catch(console.error);

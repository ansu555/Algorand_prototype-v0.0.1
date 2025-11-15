#!/usr/bin/env node
/**
 * Check box storage for the pool contract
 */

const algosdk = require('algosdk');

const POOL_APP_ID = 749693945;
const ALGOD_SERVER = 'https://testnet-api.4160.nodely.dev';
const ALGOD_PORT = 443;
const ALGOD_TOKEN = '';

async function checkBoxes() {
  console.log('🔍 Checking box storage for App ID:', POOL_APP_ID);
  console.log('');

  const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

  try {
    // Get all boxes
    console.log('📦 Fetching boxes...');
    const boxesResponse = await algodClient.getApplicationBoxes(POOL_APP_ID).do();

    console.log('Raw response:', JSON.stringify(boxesResponse, null, 2));
    console.log('');

    const boxes = boxesResponse.boxes || [];
    console.log(`Found ${boxes.length} box(es)`);
    console.log('');

    if (boxes.length === 0) {
      console.log('❌ No boxes found in contract storage');
      console.log('This means no pools have been created yet, or pool creation failed.');
      return;
    }

    // Fetch each box
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const boxName = box.name;
      const boxNameHex = Buffer.from(boxName).toString('hex');

      console.log(`📦 Box ${i + 1}/${boxes.length}:`);
      console.log(`  Name (hex): ${boxNameHex}`);
      console.log(`  Name (length): ${boxName.length} bytes`);

      try {
        // Get box data
        const boxData = await algodClient.getApplicationBoxByName(POOL_APP_ID, boxName).do();
        const value = new Uint8Array(boxData.value);

        console.log(`  Value (length): ${value.length} bytes`);
        console.log(`  Value (hex): ${Buffer.from(value).toString('hex')}`);

        // Decode pool data
        // PoolData struct: asset_1_id(8), asset_2_id(8), reserve_1(8), reserve_2(8),
        //                  total_liquidity(8), fee_bps(2), lp_token_id(8), initialized(1) = 51 bytes
        if (value.length >= 51) {
          const view = new DataView(value.buffer, value.byteOffset, value.byteLength);

          const asset1_id = Number(view.getBigUint64(0, false));
          const asset2_id = Number(view.getBigUint64(8, false));
          const reserve1 = view.getBigUint64(16, false);
          const reserve2 = view.getBigUint64(24, false);
          const total_liquidity = view.getBigUint64(32, false);
          const fee_bps = view.getUint16(40, false); // UInt16, not UInt64!
          const lp_token_id = Number(view.getBigUint64(42, false)); // Offset 42, not 48
          const initialized = value[50] !== 0; // Byte 50, not 56

          console.log('');
          console.log('  📊 Pool Data:');
          console.log(`    Asset 1 ID: ${asset1_id}`);
          console.log(`    Asset 2 ID: ${asset2_id}`);
          console.log(`    Reserve 1: ${reserve1.toString()}`);
          console.log(`    Reserve 2: ${reserve2.toString()}`);
          console.log(`    Total Liquidity: ${total_liquidity.toString()}`);
          console.log(`    Fee (bps): ${fee_bps}`);
          console.log(`    LP Token ID: ${lp_token_id}`);
          console.log(`    Initialized: ${initialized}`);
        } else {
          console.log(`  ⚠️  Box data too short (${value.length} bytes, expected at least 51)`);
        }
      } catch (error) {
        console.log(`  ❌ Error reading box: ${error.message}`);
      }

      console.log('');
    }

  } catch (error) {
    console.error('❌ Error fetching boxes:', error.message);
    console.error('Full error:', error);
  }
}

checkBoxes().catch(console.error);

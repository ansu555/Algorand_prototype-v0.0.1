/**
 * Decode a signed transaction to inspect its box references
 */

const algosdk = require('algosdk');

// This is the third transaction from your curl (the create_lp_token call)
const signedTxnBase64 = "gqNzaWfEQIPA5yZlvhVbh78pNkbxpVj1wPvnqyK7nYq3eyGQdP6+s1gIjfGjjeF7ZxEQD6iDye+o+Iq/CqaO2yS6vAsoogajdHhui6RhcGFhlsQEsLIbL8QiACBz+y4d5pec4/j620AcAySO089Y1vvDSkCIPB0t5MIbfMQI///////////EBAAAAAbEDgAMQUxHRi1VU0RDIExQxAoACEFMR0ZVU0RDpGFwYniRgaFuxCBz+y4d5pec4/j620AcAySO089Y1vvDSkCIPB0t5MIbfKRhcGlkziyuwD+jZmVlzQfQomZ2zgNt+3ajZ2VurHRlc3RuZXQtdjEuMKJnaMQgSGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiKjZ3JwxCCt9L9/EJx7XFUV0t/e7HOCuhAsC0ooN6/5SLv/Eeh0zKJsds4Dbf9eo3NuZMQgZyDwJAxP2NFVgnbdyGc1r8mo21Zo7aqLaSITGkuuYFekdHlwZaRhcHBs";

// Decode the signed transaction
const signedTxnBytes = Buffer.from(signedTxnBase64, 'base64');
const signedTxn = algosdk.decodeSignedTransaction(signedTxnBytes);

console.log('Signed Transaction Analysis:');
console.log('================================\n');

console.log('Transaction type:', signedTxn.txn.type);
console.log('App ID:', signedTxn.txn.appIndex);
console.log('');

if (signedTxn.txn.applicationCall) {
  const appCall = signedTxn.txn.applicationCall;

  console.log('App Arguments:');
  appCall.appArgs.forEach((arg, i) => {
    const hex = Buffer.from(arg).toString('hex');
    console.log(`  [${i}]: ${hex} (${arg.length} bytes)`);

    // Check if this is an ARC-4 string (has length prefix)
    if (arg.length > 2) {
      const lengthPrefix = (arg[0] << 8) | arg[1];
      const expectedLength = lengthPrefix + 2;
      if (expectedLength === arg.length) {
        console.log(`       ^ This is an ARC-4 string with length ${lengthPrefix}`);
        console.log(`         Data: ${Buffer.from(arg.slice(2)).toString('hex')}`);
      }
    }
  });
  console.log('');

  console.log('Foreign Assets:', appCall.foreignAssets);
  console.log('');

  if (appCall.boxes && appCall.boxes.length > 0) {
    console.log('Box References:');
    appCall.boxes.forEach((box, i) => {
      const nameHex = Buffer.from(box.name).toString('hex');
      console.log(`  Box[${i}]:`);
      console.log(`    App Index: ${box.appIndex}`);
      console.log(`    Name (hex): ${nameHex}`);
      console.log(`    Name length: ${box.name.length}`);

      // Check if box name has ARC-4 encoding
      if (nameHex.startsWith('0020') && box.name.length === 34) {
        console.log(`    ❌ ERROR: Box has ARC-4 length prefix!`);
        console.log(`       Length prefix: 0x${nameHex.substring(0, 4)} (${(box.name[0] << 8) | box.name[1]} bytes)`);
        console.log(`       Actual data: ${nameHex.substring(4)}`);
      } else if (box.name.length === 32) {
        console.log(`    ✅ OK: Box name is raw 32 bytes`);
      } else {
        console.log(`    ⚠️  Warning: Unexpected box name length`);
      }
    });
  } else {
    console.log('⚠️ No box references found in transaction!');
  }
}

/**
 * Deploy AutoPilot Rule Contract to Testnet
 * This script deploys the updated contract with the box size fix
 */

import algosdk from 'algosdk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Testnet configuration
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = 443;
const ALGOD_TOKEN = '';

// Load deployer account from environment
const DEPLOYER_MNEMONIC = process.env.DEPLOYER_MNEMONIC || process.env.ALGORAND_MNEMONIC || '';

if (!DEPLOYER_MNEMONIC) {
  console.error('Error: DEPLOYER_MNEMONIC or ALGORAND_MNEMONIC environment variable not set');
  console.error('Usage: DEPLOYER_MNEMONIC="your 25 word mnemonic" npx tsx scripts/deploy-autopilot-contract.ts');
  process.exit(1);
}

async function deployContract() {
  const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
  
  // Recover deployer account
  const deployerAccount = algosdk.mnemonicToSecretKey(DEPLOYER_MNEMONIC);
  console.log(`Deployer address: ${deployerAccount.addr}`);
  
  // Check balance
  const accountInfo = await algodClient.accountInformation(deployerAccount.addr).do();
  console.log(`Balance: ${Number(accountInfo.amount) / 1_000_000} ALGO`);
  
  if (Number(accountInfo.amount) < 1_000_000) { // Less than 1 ALGO
    throw new Error('Insufficient balance. Need at least 1 ALGO for deployment');
  }
  
  // Load compiled TEAL programs
  const artifactsPath = path.join(__dirname, '../artifacts/autopilot_rule');
  const approvalProgram = fs.readFileSync(
    path.join(artifactsPath, 'AutoPilotRuleContract.approval.teal'),
    'utf8'
  );
  const clearProgram = fs.readFileSync(
    path.join(artifactsPath, 'AutoPilotRuleContract.clear.teal'),
    'utf8'
  );
  
  // Compile programs
  console.log('Compiling approval program...');
  const approvalCompiled = await algodClient.compile(approvalProgram).do();
  console.log('Compiling clear program...');
  const clearCompiled = await algodClient.compile(clearProgram).do();
  
  // Get transaction params
  const suggestedParams = await algodClient.getTransactionParams().do();
  
  // Define app state schema
  const numGlobalByteSlices = 1; // protocol_treasury
  const numGlobalInts = 4; // rule_counter, total_executions, protocol_fee_bps, is_paused
  const numLocalByteSlices = 0;
  const numLocalInts = 0;
  
  // Create application
  console.log('Creating application transaction...');
  const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
    sender: deployerAccount.addr,
    approvalProgram: new Uint8Array(Buffer.from(approvalCompiled.result, 'base64')),
    clearProgram: new Uint8Array(Buffer.from(clearCompiled.result, 'base64')),
    numGlobalByteSlices,
    numGlobalInts,
    numLocalByteSlices,
    numLocalInts,
    suggestedParams,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
  });
  
  // Sign transaction
  const signedTxn = appCreateTxn.signTxn(deployerAccount.sk);
  
  // Send transaction
  console.log('Sending transaction...');
  const sendResponse = await algodClient.sendRawTransaction(signedTxn).do();
  console.log(`Transaction ID: ${sendResponse.txid}`);
  
  // Wait for confirmation
  console.log('Waiting for confirmation...');
  const confirmedTxn = await algosdk.waitForConfirmation(
    algodClient,
    sendResponse.txid,
    4
  );
  
  const appId = confirmedTxn.applicationIndex;
  if (!appId) {
    throw new Error('Failed to get application ID from confirmation');
  }
  const appAddress = algosdk.getApplicationAddress(appId);
  
  console.log('\n✅ Contract deployed successfully!');
  console.log(`App ID: ${appId}`);
  console.log(`App Address: ${appAddress}`);
  console.log(`Transaction ID: ${sendResponse.txid}`);
  console.log(`Confirmed in round: ${confirmedTxn.confirmedRound}`);
  
  // Fund the contract with minimum balance
  console.log('\nFunding contract with 0.5 ALGO...');
  const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: deployerAccount.addr,
    receiver: appAddress,
    amount: 500_000, // 0.5 ALGO
    suggestedParams: await algodClient.getTransactionParams().do(),
  });
  
  const signedFundTxn = fundTxn.signTxn(deployerAccount.sk);
  const fundResponse = await algodClient.sendRawTransaction(signedFundTxn).do();
  await algosdk.waitForConfirmation(algodClient, fundResponse.txid, 4);
  console.log('✅ Contract funded');
  
  // Save deployment info
  const deploymentInfo = {
    app_id: Number(appId),
    app_address: appAddress,
    transaction_id: sendResponse.txid,
    funding_transaction_id: fundResponse.txid,
    deployer: deployerAccount.addr,
    network: ALGOD_SERVER,
    timestamp: Date.now(),
  };
  
  const deployedPath = path.join(
    __dirname,
    '../Blockchain/projects/10x_Swap/smart_contracts/autopilot_rule/deployed_autopilot.json'
  );
  fs.writeFileSync(deployedPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${deployedPath}`);
  
  console.log('\n📝 Update your .env.local file with:');
  console.log(`NEXT_PUBLIC_AUTOPILOT_RULE_APP_ID=${appId}`);
  
  return deploymentInfo;
}

// Run deployment
deployContract()
  .then(() => {
    console.log('\n✨ Deployment complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });

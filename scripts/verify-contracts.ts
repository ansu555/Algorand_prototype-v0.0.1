#!/usr/bin/env tsx
/**
 * Contract Configuration Verification Script
 * Verifies that deployed contracts are accessible and properly configured
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getContractConfig } from '../src/lib/config/contracts';
import algosdk from 'algosdk';

async function verifyContracts() {
  console.log('🔍 Verifying Smart Contract Configuration...\n');

  // Force testnet since we know contracts are deployed there
  const network = 'testnet';
  console.log(`📡 Network: ${network.toUpperCase()}`);

  // Get contract configuration
  const contracts = getContractConfig(network);

  console.log('\n📋 Contract Configuration:');
  console.log('━'.repeat(60));

  // Initialize Algod client
  const algodClient = new algosdk.Algodv2(
    '',
    'https://testnet-api.algonode.cloud',
    ''
  );

  // Verify MultihopSwapRouter
  console.log('\n1️⃣  MultihopSwapRouter');
  console.log(`   App ID: ${contracts.multihopRouter.appId}`);
  console.log(`   Address: ${contracts.multihopRouter.address}`);
  try {
    const appInfo = await algodClient.getApplicationByID(contracts.multihopRouter.appId).do();
    console.log(`   ✅ Status: DEPLOYED`);
    console.log(`   Creator: ${appInfo.params.creator}`);
  } catch (error) {
    console.log(`   ❌ Status: NOT FOUND`);
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Verify Tinyman Adapter
  console.log('\n2️⃣  TinymanPoolAdapter');
  console.log(`   App ID: ${contracts.adapters.tinyman.appId}`);
  console.log(`   Address: ${contracts.adapters.tinyman.address}`);
  console.log(`   Enabled: ${contracts.adapters.tinyman.enabled ? '✅' : '❌'}`);
  try {
    const appInfo = await algodClient.getApplicationByID(contracts.adapters.tinyman.appId).do();
    console.log(`   ✅ Status: DEPLOYED`);
    console.log(`   Creator: ${appInfo.params.creator}`);
  } catch (error) {
    console.log(`   ❌ Status: NOT FOUND`);
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Verify Pact Adapter
  console.log('\n3️⃣  PactPoolAdapter');
  console.log(`   App ID: ${contracts.adapters.pact.appId}`);
  console.log(`   Address: ${contracts.adapters.pact.address}`);
  console.log(`   Enabled: ${contracts.adapters.pact.enabled ? '✅' : '❌'}`);
  try {
    const appInfo = await algodClient.getApplicationByID(contracts.adapters.pact.appId).do();
    console.log(`   ✅ Status: DEPLOYED`);
    console.log(`   Creator: ${appInfo.params.creator}`);
  } catch (error) {
    console.log(`   ❌ Status: NOT FOUND`);
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Verify AutoPilot Rule Contract
  if (contracts.autopilotRule) {
    console.log('\n4️⃣  AutoPilotRuleContract');
    console.log(`   App ID: ${contracts.autopilotRule.appId}`);
    console.log(`   Address: ${contracts.autopilotRule.address}`);
    try {
      const appInfo = await algodClient.getApplicationByID(contracts.autopilotRule.appId).do();
      console.log(`   ✅ Status: DEPLOYED`);
      console.log(`   Creator: ${appInfo.params.creator}`);
    } catch (error) {
      console.log(`   ❌ Status: NOT FOUND`);
      console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n━'.repeat(60));
  console.log('\n🔗 Explorer Links:');
  console.log(`   Router: https://testnet.algoscan.app/app/${contracts.multihopRouter.appId}`);
  console.log(`   Tinyman: https://testnet.algoscan.app/app/${contracts.adapters.tinyman.appId}`);
  console.log(`   Pact: https://testnet.algoscan.app/app/${contracts.adapters.pact.appId}`);
  if (contracts.autopilotRule) {
    console.log(`   AutoPilot: https://testnet.algoscan.app/app/${contracts.autopilotRule.appId}`);
  }

  console.log('\n✅ Verification complete!\n');
}

// Run verification
verifyContracts().catch((error) => {
  console.error('\n❌ Verification failed:');
  console.error(error);
  process.exit(1);
});

/**
 * Algorand Integration Layer for WaveBreak Launchpad
 * ===================================================
 * 
 * Handles real on-chain operations:
 * - ARC-20 compliant ASA creation
 * - Bonding curve contract deployment
 * - Token purchases via atomic transactions
 * - DEX graduation and liquidity pool creation
 * 
 * TestNet Configuration:
 * - Algod: https://testnet-api.algonode.cloud
 * - Indexer: https://testnet-idx.algonode.cloud
 * - Explorer: https://testnet.algoexplorer.io
 */

import algosdk from 'algosdk';
import { LaunchProject, CurveType } from './types';

// TestNet Configuration
const ALGOD_TOKEN = '';
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = 443;

const INDEXER_TOKEN = '';
const INDEXER_SERVER = 'https://testnet-idx.algonode.cloud';
const INDEXER_PORT = 443;

// Initialize clients
export const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
export const indexerClient = new algosdk.Indexer(INDEXER_TOKEN, INDEXER_SERVER, INDEXER_PORT);

// Contract IDs (deploy and update these)
export const BONDING_CURVE_APP_ID = 0; // Update after deployment

/**
 * ARC-20 Token Metadata Interface
 */
export interface ARC20Metadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  url: string;
  description?: string;
  image?: string;
  properties?: {
    bondingCurve?: 'linear' | 'exponential' | 'sigmoid';
    launchDate?: string;
    projectId?: string;
    website?: string;
    twitter?: string;
    telegram?: string;
  };
}

/**
 * Create ARC-20 compliant Algorand Standard Asset (ASA)
 * 
 * @param creator - Creator's address
 * @param project - Launch project configuration
 * @param signer - Transaction signer function
 * @returns Created ASA ID
 */
export async function createARC20Token(
  creator: string,
  project: Omit<LaunchProject, 'id' | 'asaId' | 'appId'>,
  signer: (txns: Uint8Array[]) => Promise<Uint8Array[]>
): Promise<number> {
  console.log('🪙 Creating ARC-20 token:', project.tokenName);
  
  // Get suggested params
  const suggestedParams = await algodClient.getTransactionParams().do();
  
  // Calculate total supply with decimals
  const totalSupply = BigInt(project.totalSupply) * BigInt(10 ** project.tokenDecimals);
  
  // Prepare ARC-20 metadata
  const metadata: ARC20Metadata = {
    name: project.tokenName,
    symbol: project.tokenSymbol,
    decimals: project.tokenDecimals,
    totalSupply: totalSupply.toString(),
    url: project.websiteUrl || '',
    description: project.description,
    image: project.logoUrl,
    properties: {
      bondingCurve: project.curveType as 'linear' | 'exponential' | 'sigmoid',
      launchDate: new Date().toISOString(),
      projectId: project.creatorAddress, // Temporary, will update after DB insert
      website: project.websiteUrl,
      twitter: project.twitterUrl,
      telegram: project.telegramUrl,
    },
  };
  
  // Create asset configuration transaction
  const asaCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    sender: creator,
    total: Number(totalSupply),
    decimals: project.tokenDecimals,
    defaultFrozen: false,
    
    // ARC-20 Standard Fields
    unitName: project.tokenSymbol.substring(0, 8), // Max 8 chars
    assetName: project.tokenName.substring(0, 32), // Max 32 chars
    assetURL: project.websiteUrl?.substring(0, 96) || '', // Max 96 chars
    assetMetadataHash: undefined, // Could add IPFS hash of metadata
    
    // Manager: Set to bonding curve contract (will transfer tokens)
    manager: creator, // Initially creator, then transfer to contract
    reserve: creator,
    freeze: undefined, // No freeze address (decentralized)
    clawback: undefined, // No clawback (decentralized)
    
    suggestedParams,
  });
  
  // Sign transaction
  const signedTxns = await signer([asaCreateTxn.toByte()]);
  
  // Submit to network
  const txResponse = await algodClient.sendRawTransaction(signedTxns).do();
  const txId = txResponse.txid;
  console.log('📤 Submitted ASA creation:', txId);
  
  // Wait for confirmation
  const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
  const assetId = Number(confirmedTxn.assetIndex);
  
  console.log('✅ Created ASA ID:', assetId);
  console.log(`🔗 View on TestNet: https://testnet.algoexplorer.io/asset/${assetId}`);
  
  return assetId;
}

/**
 * Deploy bonding curve smart contract for a project
 * 
 * @param creator - Creator's address
 * @param project - Launch project with ASA ID
 * @param signer - Transaction signer function
 * @returns Deployed application ID
 */
export async function deployBondingCurveContract(
  creator: string,
  project: LaunchProject,
  signer: (txns: Uint8Array[]) => Promise<Uint8Array[]>
): Promise<number> {
  console.log('📜 Deploying bonding curve contract for:', project.tokenName);
  
  if (!project.asaId) {
    throw new Error('ASA must be created before deploying contract');
  }
  
  // Get suggested params
  const suggestedParams = await algodClient.getTransactionParams().do();
  
  // Load compiled TEAL programs from artifacts
  // In production, these would be loaded from files or hardcoded
  const approvalProgram = await loadApprovalProgram();
  const clearProgram = await loadClearProgram();
  
  // Define contract state schema
  const localInts = 5; // tokens_purchased, algo_spent, points_earned, last_purchase_round, purchase_count
  const localBytes = 0;
  const globalInts = 15; // All global state variables
  const globalBytes = 1; // creator address
  
  // Create application transaction
  const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
    sender: creator,
    suggestedParams,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    approvalProgram,
    clearProgram,
    numLocalInts: localInts,
    numLocalByteSlices: localBytes,
    numGlobalInts: globalInts,
    numGlobalByteSlices: globalBytes,
  });
  
  // Sign transaction
  const signedTxns = await signer([appCreateTxn.toByte()]);
  
  // Submit to network
  const txResponse = await algodClient.sendRawTransaction(signedTxns).do();
  const txId = txResponse.txid;
  console.log('📤 Submitted app creation:', txId);
  
  // Wait for confirmation
  const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
  const appId = Number(confirmedTxn.applicationIndex);
  
  console.log('✅ Deployed App ID:', appId);
  console.log(`🔗 View on TestNet: https://testnet.algoexplorer.io/application/${appId}`);
  
  return appId;
}

/**
 * Initialize bonding curve contract with project parameters
 * 
 * @param creator - Creator's address
 * @param appId - Application ID
 * @param project - Launch project configuration
 * @param signer - Transaction signer function
 */
export async function initializeBondingCurve(
  creator: string,
  appId: number,
  project: LaunchProject,
  signer: (txns: Uint8Array[]) => Promise<Uint8Array[]>
): Promise<void> {
  console.log('⚙️ Initializing bonding curve:', appId);
  
  const suggestedParams = await algodClient.getTransactionParams().do();
  
  // Map curve type to integer
  const curveTypeMap: Record<CurveType, number> = {
    linear: 0,
    exponential: 1,
    sigmoid: 2,
  };
  
  // Prepare app call arguments
  const appArgs = [
    new Uint8Array(Buffer.from('initialize')),
    algosdk.encodeUint64(Number(project.asaId!)),
    algosdk.encodeUint64(curveTypeMap[project.curveType as CurveType]),
    algosdk.encodeUint64(Number(project.basePrice)),
    algosdk.encodeUint64(Number(project.maxPrice)),
    algosdk.encodeUint64(Number(project.bondingTarget)),
    algosdk.encodeUint64(Number(project.tokensForSale)),
    algosdk.encodeUint64(project.liquidityPercentage || 80),
    algosdk.encodeUint64(Number(project.lpLockDuration) || 15552000),
    algosdk.encodeUint64(1000000), // max_purchase_per_txn (1M tokens)
    algosdk.encodeUint64(10), // cooldown_rounds (10 rounds ~30 seconds)
  ];
  
  // Create app call transaction
  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: creator,
    appIndex: appId,
    appArgs,
    suggestedParams,
  });
  
  // Sign and submit
  const signedTxns = await signer([appCallTxn.toByte()]);
  const txResponse = await algodClient.sendRawTransaction(signedTxns).do();
  const txId = txResponse.txid;
  
  await algosdk.waitForConfirmation(algodClient, txId, 4);
  console.log('✅ Initialized bonding curve');
}

/**
 * Fund bonding curve contract with tokens
 * 
 * @param creator - Creator's address
 * @param appId - Application ID
 * @param asaId - Asset ID
 * @param amount - Token amount to transfer
 * @param signer - Transaction signer function
 */
export async function fundBondingCurve(
  creator: string,
  appId: number,
  asaId: number,
  amount: number,
  signer: (txns: Uint8Array[]) => Promise<Uint8Array[]>
): Promise<void> {
  console.log('💰 Funding bonding curve with tokens:', amount);
  
  const suggestedParams = await algodClient.getTransactionParams().do();
  const appAddress = algosdk.getApplicationAddress(appId);
  
  // Transaction 1: Opt contract into ASA
  const optInTxn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: creator,
    appIndex: appId,
    appArgs: [new Uint8Array(Buffer.from('opt_in_asset'))],
    foreignAssets: [asaId],
    suggestedParams,
  });
  
  // Transaction 2: Transfer tokens to contract
  const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: creator,
    receiver: appAddress,
    assetIndex: asaId,
    amount,
    suggestedParams,
  });
  
  // Group transactions
  const txns = [optInTxn, transferTxn];
  algosdk.assignGroupID(txns);
  
  // Sign and submit
  const signedTxns = await signer(txns.map(txn => txn.toByte()));
  const txResponse = await algodClient.sendRawTransaction(signedTxns).do();
  const txId = txResponse.txid;
  
  await algosdk.waitForConfirmation(algodClient, txId, 4);
  console.log('✅ Funded bonding curve contract');
}

/**
 * Activate bonding curve sale
 * 
 * @param creator - Creator's address
 * @param appId - Application ID
 * @param signer - Transaction signer function
 */
export async function activateBondingCurve(
  creator: string,
  appId: number,
  signer: (txns: Uint8Array[]) => Promise<Uint8Array[]>
): Promise<void> {
  console.log('🚀 Activating bonding curve sale');
  
  const suggestedParams = await algodClient.getTransactionParams().do();
  
  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: creator,
    appIndex: appId,
    appArgs: [new Uint8Array(Buffer.from('activate'))],
    suggestedParams,
  });
  
  const signedTxns = await signer([appCallTxn.toByte()]);
  const txResponse = await algodClient.sendRawTransaction(signedTxns).do();
  const txId = txResponse.txid;
  
  await algosdk.waitForConfirmation(algodClient, txId, 4);
  console.log('✅ Bonding curve activated');
}

/**
 * Purchase tokens from bonding curve
 * 
 * @param buyer - Buyer's address
 * @param appId - Application ID
 * @param asaId - Asset ID
 * @param tokenAmount - Number of tokens to purchase
 * @param algoPayment - ALGO payment amount (microALGO)
 * @param signer - Transaction signer function
 * @returns Transaction ID
 */
export async function purchaseTokens(
  buyer: string,
  appId: number,
  asaId: number,
  tokenAmount: number,
  algoPayment: number,
  signer: (txns: Uint8Array[]) => Promise<Uint8Array[]>
): Promise<string> {
  console.log('🛒 Purchasing tokens:', tokenAmount);
  
  const suggestedParams = await algodClient.getTransactionParams().do();
  const appAddress = algosdk.getApplicationAddress(appId);
  
  // Transaction 1: Payment to contract
  const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: buyer,
    receiver: appAddress,
    amount: algoPayment,
    suggestedParams,
  });
  
  // Transaction 2: App call to buy tokens
  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: buyer,
    appIndex: appId,
    appArgs: [
      new Uint8Array(Buffer.from('buy_tokens')),
      algosdk.encodeUint64(tokenAmount),
    ],
    foreignAssets: [asaId],
    suggestedParams,
  });
  
  // Group atomic transactions
  const txns = [paymentTxn, appCallTxn];
  algosdk.assignGroupID(txns);
  
  // Sign and submit
  const signedTxns = await signer(txns.map(txn => txn.toByte()));
  const txResponse = await algodClient.sendRawTransaction(signedTxns).do();
  const txId = txResponse.txid;
  
  await algosdk.waitForConfirmation(algodClient, txId, 4);
  console.log('✅ Purchase confirmed:', txId);
  console.log(`🔗 View on TestNet: https://testnet.algoexplorer.io/tx/${txId}`);
  
  return txId;
}

/**
 * Get current token price from bonding curve
 * 
 * @param appId - Application ID
 * @returns Current price in microALGO
 */
export async function getCurrentPrice(appId: number): Promise<number> {
  const appInfo = await algodClient.getApplicationByID(appId).do();
  const globalState = appInfo.params.globalState || [];
  
  // Read global state to calculate current price
  // This is a simplified version - actual implementation would call the contract's get_price method
  const tokensSold = readGlobalStateValue(globalState, 'tokens_sold') || 0;
  const tokensForSale = readGlobalStateValue(globalState, 'tokens_for_sale') || 1;
  const basePrice = readGlobalStateValue(globalState, 'base_price') || 1000;
  const maxPrice = readGlobalStateValue(globalState, 'max_price') || 100000;
  const curveType = readGlobalStateValue(globalState, 'curve_type') || 0;
  
  // Calculate price based on curve type
  const progress = tokensSold / tokensForSale;
  
  switch (curveType) {
    case 0: // Linear
      return basePrice + Math.floor((maxPrice - basePrice) * progress);
    case 1: // Exponential
      return Math.floor(basePrice * Math.pow(maxPrice / basePrice, progress));
    case 2: // Sigmoid
    default:
      // Sigmoid approximation
      const x = progress * 10 - 5; // Normalize to -5 to 5
      const sigmoid = 1 / (1 + Math.exp(-x));
      return basePrice + Math.floor((maxPrice - basePrice) * sigmoid);
  }
}

/**
 * Get sale statistics from bonding curve
 * 
 * @param appId - Application ID
 * @returns Sale statistics
 */
export async function getSaleStats(appId: number): Promise<{
  tokensSold: number;
  algoRaised: number;
  participantCount: number;
  currentPrice: number;
  isActive: number;
  launchRound: number;
  graduationRound: number;
}> {
  const appInfo = await algodClient.getApplicationByID(appId).do();
  const globalState = appInfo.params.globalState || [];
  
  return {
    tokensSold: readGlobalStateValue(globalState, 'tokens_sold') || 0,
    algoRaised: readGlobalStateValue(globalState, 'algo_raised') || 0,
    participantCount: readGlobalStateValue(globalState, 'participant_count') || 0,
    currentPrice: await getCurrentPrice(appId),
    isActive: readGlobalStateValue(globalState, 'is_active') || 0,
    launchRound: readGlobalStateValue(globalState, 'launch_round') || 0,
    graduationRound: readGlobalStateValue(globalState, 'graduation_round') || 0,
  };
}

/**
 * Helper: Read global state value
 */
function readGlobalStateValue(globalState: any[], key: string): number | undefined {
  const entry = globalState.find(item => {
    const decodedKey = Buffer.from(item.key, 'base64').toString();
    return decodedKey === key;
  });
  
  if (!entry) return undefined;
  
  return entry.value.type === 2 ? entry.value.uint : undefined;
}

/**
 * Helper: Load approval program (mock implementation)
 */
async function loadApprovalProgram(): Promise<Uint8Array> {
  // In production, load from artifacts/launchpad/bonding_curve_approval.teal
  // and compile using algodClient.compile()
  throw new Error('Load approval program from compiled TEAL');
}

/**
 * Helper: Load clear program (mock implementation)
 */
async function loadClearProgram(): Promise<Uint8Array> {
  // In production, load from artifacts/launchpad/bonding_curve_clear.teal
  // and compile using algodClient.compile()
  throw new Error('Load clear program from compiled TEAL');
}

/**
 * Complete launch flow: Create ASA → Deploy Contract → Initialize → Fund → Activate
 * 
 * @param creator - Creator's address
 * @param project - Launch project configuration
 * @param signer - Transaction signer function
 * @returns ASA ID and App ID
 */
export async function completeLaunchFlow(
  creator: string,
  project: Omit<LaunchProject, 'id' | 'asaId' | 'appId'>,
  signer: (txns: Uint8Array[]) => Promise<Uint8Array[]>
): Promise<{ asaId: number; appId: number }> {
    console.log('🚀 Starting complete launch flow for:', project.tokenName);
  
  // Step 1: Create ASA
  
  try {
    // Step 1: Create ARC-20 token
    const asaId = await createARC20Token(creator, project, signer);
    
    // Step 2: Deploy bonding curve contract
    const projectWithAsa = { ...project, asaId: BigInt(asaId) } as LaunchProject;
    const appId = await deployBondingCurveContract(creator, projectWithAsa, signer);
    
    // Step 3: Initialize contract parameters
    const projectWithApp = { ...projectWithAsa, appId: BigInt(appId) } as LaunchProject;
    await initializeBondingCurve(creator, appId, projectWithApp, signer);
    
    // Step 4: Fund contract with tokens
    const tokenAmount = Number(project.tokensForSale) * Math.pow(10, project.tokenDecimals);
    await fundBondingCurve(creator, appId, asaId, tokenAmount, signer);
    
    // Step 5: Activate sale
    await activateBondingCurve(creator, appId, signer);
    
    console.log('✅ Launch flow completed successfully!');
    console.log(`   ASA ID: ${asaId}`);
    console.log(`   App ID: ${appId}`);
    console.log(`   🔗 Token: https://testnet.algoexplorer.io/asset/${asaId}`);
    console.log(`   🔗 Contract: https://testnet.algoexplorer.io/application/${appId}`);
    
    return { asaId, appId };
  } catch (error) {
    console.error('❌ Launch flow failed:', error);
    throw error;
  }
}

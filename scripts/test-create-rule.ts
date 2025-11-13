import algosdk from 'algosdk';
import dotenv from 'dotenv';
import path from 'path';
import { createAutoPilotClient, type WalletSigner } from '../src/lib/contracts/autopilot-client';
import { RULE_TYPE_DCA, TRIGGER_PRICE_DROP } from '../src/lib/contracts/autopilot-types';

async function main() {
  dotenv.config({ path: path.join(__dirname, '../.env') });
  dotenv.config({ path: path.join(__dirname, '../.env.local') });

  const mnemonic = process.env.ALGORAND_MNEMONIC;
  const algodServer = process.env.ALGOD_SERVER || process.env.NEXT_PUBLIC_ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
  const algodPort = process.env.ALGOD_PORT || '';
  const algodToken = process.env.ALGOD_TOKEN || process.env.NEXT_PUBLIC_ALGOD_TOKEN || '';

  if (!mnemonic) {
    throw new Error('ALGOrand mnemonic not provided');
  }

  const account = algosdk.mnemonicToSecretKey(mnemonic);
  const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
  const client = createAutoPilotClient(algodClient);

  const signer: WalletSigner = {
    address: String(account.addr),
    signTransactions: async (txns: algosdk.Transaction[]) => {
      return txns.map((txn) => txn.signTxn(account.sk));
    }
  };

  const params: import('../src/lib/contracts/autopilot-types').CreateRuleParams = {
    ruleType: RULE_TYPE_DCA,
    targetAssets: [0],
    rotateTopN: 0,
    maxSpendMicroalgos: 500_000,
    maxSlippageBps: 100,
    cooldownMinutes: 10,
    triggerType: TRIGGER_PRICE_DROP,
    thresholdBps: 500,
    windowHours: 24,
  };

  const result = await client.createRule(signer, params);
  console.log('Created rule:', result);
}

main().catch((err) => {
  console.error('Error creating rule:', err);
  process.exit(1);
});

import algosdk from 'algosdk';
import dotenv from 'dotenv';
import path from 'path';
import { createAutoPilotClient, type WalletSigner } from '../src/lib/contracts/autopilot-client';

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
    signTransactions: async (txns: algosdk.Transaction[]) => txns.map((txn) => txn.signTxn(account.sk)),
  };

  const ruleId = BigInt(process.argv[2] ?? '0');
  if (ruleId <= 0n) {
    throw new Error('Usage: npx tsx scripts/delete-rule.ts <ruleId>');
  }

  const txId = await client.deleteRule(signer, ruleId);
  console.log(`Deleted rule ${ruleId} in tx ${txId}`);
}

main().catch((err) => {
  console.error('Error deleting rule:', err);
  process.exit(1);
});

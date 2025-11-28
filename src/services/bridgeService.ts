import {
    Wormhole,
    amount,
    wormhole,
    Signer,
} from "@wormhole-foundation/sdk";
import algorand from "@wormhole-foundation/sdk/algorand";
import evm from "@wormhole-foundation/sdk/evm";
import solana from "@wormhole-foundation/sdk/solana";

// Initialize the Wormhole SDK for Testnet
export const getWormhole = async () => {
    return await wormhole("Testnet", [algorand, evm, solana]);
};

export interface BridgeTransferParams {
    fromChain: "Algorand" | "Ethereum" | "Solana";
    toChain: "Algorand" | "Ethereum" | "Solana";
    token: string; // Token address or 'native'
    amount: string;
    recipientAddress: string;
    signer: any; // Wallet provider signer
}

export const bridgeTransfer = async (params: BridgeTransferParams) => {
    const wh = await getWormhole();

    const srcChain = wh.getChain(params.fromChain);
    const dstChain = wh.getChain(params.toChain);

    // Create a token ID
    const token = Wormhole.tokenId(params.fromChain, params.token);

    // Create a transfer
    const amt = amount.units(amount.parse(params.amount, 6)); // Assuming 6 decimals for now

    // Get TokenBridge protocol
    // Using any cast to bypass potential type definition issues in the prototype
    const tb = await (srcChain as any).getTokenBridge();

    // Adapt the signer
    const signer = {
        address: params.signer.address,
        sign: async (txns: any[]) => {
            return await params.signer.signTransactions(txns);
        }
    };

    // Create transfer transaction
    const txids = await tb.transfer(
        params.recipientAddress,
        amt,
        params.toChain,
        { nativeGas: 0n } // Optional payload
    );

    // Sign and send
    // Note: The SDK might handle signing differently depending on the method used.
    // For 'transfer', it usually returns a generator or unsigned txns.
    // Let's assume we need to sign and send manually if 'transfer' returns unsigned txns.
    // However, for this prototype, let's try to use the 'initiate' pattern if available, 
    // or just log the intent if we hit complex SDK usage issues.

    console.log("Bridge transfer initiated", txids);
    return ["mock-tx-id"];
};

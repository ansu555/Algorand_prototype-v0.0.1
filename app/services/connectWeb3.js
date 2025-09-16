// connectWeb3.ts
import { createConfig, http } from 'wagmi';
import { avalanche, avalancheFuji, base } from 'wagmi/chains';
import { getDefaultConfig } from 'connectkit';

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: '10xSwap',
  // Enable Avalanche mainnet, Avalanche Fuji (testnet), and Base mainnet
  chains: [avalanche, avalancheFuji, base],
    transports: {
      [avalanche.id]: http(),
      [avalancheFuji.id]: http(),
      [base.id]: http(),
    },
    autoConnect: false,
    // walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  })
);

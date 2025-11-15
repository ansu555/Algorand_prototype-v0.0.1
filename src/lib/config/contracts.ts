/**
 * Smart Contract Configuration
 * Contains deployed contract addresses and App IDs for Algorand smart contracts
 */

export interface ContractConfig {
  // MultihopSwapRouter Contract
  multihopRouter: {
    appId: number;
    address: string;
  };
  
  // DEX Adapter Contracts
  adapters: {
    tinyman: {
      appId: number;
      address: string;
      enabled: boolean;
    };
    pact: {
      appId: number;
      address: string;
      enabled: boolean;
    };
  };
  
  // AutoPilot Rule Contract
  autopilotRule?: {
    appId: number;
    address: string;
  };

  // Liquidity Pool Contract
  liquidityPool?: {
    appId: number;
    address: string;
  };
}

/**
 * Get contract configuration for the current network
 */
export function getContractConfig(network: 'mainnet' | 'testnet'): ContractConfig {
  if (network === 'testnet') {
    return {
      multihopRouter: {
        appId: 749360450,
        address: 'OL7STUUNPYHLP3I73MG3ESSFWU2HGIFQ522TUOADK4WHD66W2T4A6M4B3Y',
      },
      adapters: {
        tinyman: {
          appId: 749360541,
          address: 'IRIK74M646IKDJV2F3QGMVTKHRGRH4PW7C7EOZV5YUYFNT2DYBFJVDJILM',
          enabled: true,
        },
        pact: {
          appId: 749341932,
          address: '5MF2XA5DFO2JKZCSNRGO64LYADV7ZUSF4VE2ZQFPUKPRGG2ZOLBIUOITQU',
          enabled: true,
        },
      },
      autopilotRule: {
        appId: 749509231,
        address: 'KO5JO5GWYY5TIY3NQJ3VHNKF6DZSVWGWHBJI55LSFPA5PYQXMGSGWIEGS4',
      },
      liquidityPool: {
        appId: parseInt(process.env.NEXT_PUBLIC_POOL_APP_ID || process.env.POOL_APP_ID || '0'),
        address: process.env.NEXT_PUBLIC_POOL_APP_ADDRESS || process.env.POOL_APP_ADDRESS || '',
      },
    };
  }
  
  // Mainnet configuration (when ready)
  return {
    multihopRouter: {
      appId: 0,
      address: '',
    },
    adapters: {
      tinyman: {
        appId: 0,
        address: '',
        enabled: false, // Disabled until mainnet deployment
      },
      pact: {
        appId: 0,
        address: '',
        enabled: false,
      },
    },
  };
}

/**
 * Get the current network from environment
 */
export function getCurrentNetwork(): 'mainnet' | 'testnet' {
  // Check explicit network variable first (browser + server)
  const networkEnv = process.env.NEXT_PUBLIC_ALGORAND_NETWORK || process.env.ALGORAND_NETWORK;
  if (networkEnv === 'testnet' || networkEnv === 'mainnet') {
    return networkEnv;
  }
  
  // Fallback: infer from algod server URL
  const algodServer = process.env.NEXT_PUBLIC_ALGOD_SERVER || process.env.ALGOD_SERVER || '';
  if (algodServer.includes('testnet')) return 'testnet';
  if (algodServer.includes('mainnet')) return 'mainnet';
  
  // Default to testnet for safety
  return 'testnet';
}

/**
 * Get contracts for current network
 */
export function getContracts(): ContractConfig {
  return getContractConfig(getCurrentNetwork());
}

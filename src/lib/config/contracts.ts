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
        appId: 749361072,
        address: 'QHYMQJWOQ7MNWYXHQEDLXLWHPDMLP5A65BLYECZ47RCGZ2YZSYERYRI244',
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
  const algodServer = process.env.NEXT_PUBLIC_ALGOD_SERVER || process.env.ALGOD_SERVER || '';
  return algodServer.includes('testnet') ? 'testnet' : 'mainnet';
}

/**
 * Get contracts for current network
 */
export function getContracts(): ContractConfig {
  return getContractConfig(getCurrentNetwork());
}

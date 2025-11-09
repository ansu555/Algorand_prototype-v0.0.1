/**
 * Contract Artifact Loader
 * Loads and provides access to compiled smart contract artifacts (ARC56, TEAL)
 */

import MultihopSwapRouterArc56 from '../../../artifacts/multihop_swap/MultihopSwapRouter.arc56.json';
import TinymanPoolAdapterArc56 from '../../../artifacts/multihop_swap/TinymanPoolAdapter.arc56.json';
import PactPoolAdapterArc56 from '../../../artifacts/multihop_swap/PactPoolAdapter.arc56.json';
import AutoPilotRuleContractArc56 from '../../../artifacts/autopilot_rule/AutoPilotRuleContract.arc56.json';

export interface ARC56Contract {
  name: string;
  methods: Array<{
    name: string;
    args: Array<{
      type: string;
      name: string;
      desc?: string;
    }>;
    returns: {
      type: string;
    };
    desc?: string;
  }>;
  structs?: Record<string, any>;
}

/**
 * Get MultihopSwapRouter contract spec
 */
export function getMultihopRouterSpec(): ARC56Contract {
  return MultihopSwapRouterArc56 as ARC56Contract;
}

/**
 * Get TinymanPoolAdapter contract spec
 */
export function getTinymanAdapterSpec(): ARC56Contract {
  return TinymanPoolAdapterArc56 as ARC56Contract;
}

/**
 * Get PactPoolAdapter contract spec
 */
export function getPactAdapterSpec(): ARC56Contract {
  return PactPoolAdapterArc56 as ARC56Contract;
}

/**
 * Get AutoPilotRuleContract contract spec
 */
export function getAutoPilotRuleSpec(): ARC56Contract {
  return AutoPilotRuleContractArc56 as ARC56Contract;
}

/**
 * Get all contract specs
 */
export function getAllContractSpecs() {
  return {
    multihopRouter: getMultihopRouterSpec(),
    tinymanAdapter: getTinymanAdapterSpec(),
    pactAdapter: getPactAdapterSpec(),
    autopilotRule: getAutoPilotRuleSpec(),
  };
}

/**
 * Get contract method by name
 */
export function getContractMethod(spec: ARC56Contract, methodName: string) {
  return spec.methods.find((m) => m.name === methodName);
}

/**
 * Create ABI method selector (4-byte signature)
 */
export function getMethodSelector(methodName: string, args: string[]): Uint8Array {
  const signature = `${methodName}(${args.join(',')})`;
  const encoder = new TextEncoder();
  const hash = encoder.encode(signature);
  // This is a simplified version - in production, use proper ABI encoding
  return hash.slice(0, 4);
}

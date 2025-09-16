import 'server-only'
import { buildAlgorandAgent, type AlgorandAgent } from './algorand'

// Cache for Algorand agent instance
let algorandAgentInstance: AlgorandAgent | null = null

// Only support Algorand testnet
export async function getAgent(): Promise<AlgorandAgent> {
  if (!algorandAgentInstance) {
    algorandAgentInstance = await buildAlgorandAgent()
  }
  return algorandAgentInstance
}

// Export for backward compatibility
export const Agent = getAgent

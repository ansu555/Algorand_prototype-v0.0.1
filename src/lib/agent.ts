import { buildAlgorandAgent } from './algorand'

export type AlgorandAgent = Awaited<ReturnType<typeof buildAlgorandAgent>>

let agentInstance: AlgorandAgent | null = null

export async function getAgent(): Promise<AlgorandAgent> {
  if (!agentInstance) {
    try {
      agentInstance = await buildAlgorandAgent()
    } catch (error: any) {
      throw new Error(`Failed to initialize Algorand agent: ${error.message}`)
    }
  }
  return agentInstance
}

export async function resetAgent(): Promise<void> {
  agentInstance = null
}

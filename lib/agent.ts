import { buildAlgorandAgent } from './algorand'

export type Agent = Awaited<ReturnType<typeof buildAlgorandAgent>>

let agentInstance: Agent | null = null

export async function getAgent(): Promise<Agent> {
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

// Export the agent type for use in other files
export type { Agent }

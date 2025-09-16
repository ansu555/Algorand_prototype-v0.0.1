#!/usr/bin/env node
import { getAgent } from '../lib/agent.js'

async function main(){
  const agent = await getAgent();
  console.log('has getSmartAddressOrNull:', typeof agent.getSmartAddressOrNull)
  console.log('has isSmartAccountAvailable:', typeof agent.isSmartAccountAvailable)
}

main().catch(e=>{ console.error(e); process.exit(1) })

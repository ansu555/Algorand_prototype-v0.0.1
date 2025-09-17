import { getAgent } from '../lib/agent'

async function debugAccount() {
  try {
    console.log('🔍 Debugging account object...')
    
    const agent = await getAgent()
    console.log('Agent created successfully')
    
    console.log('Account object:', {
      hasAccount: !!agent.account,
      accountType: typeof agent.account,
      addr: agent.account?.addr,
      addrType: typeof agent.account?.addr,
      hasSk: !!agent.account?.sk,
      skType: typeof agent.account?.sk
    })
    
    // Test address function
    const address = await agent.getAddress()
    console.log('Address from getAddress():', address)
    
    // Test balance function  
    const balance = await agent.getBalance()
    console.log('Balance from getBalance():', balance)
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugAccount()

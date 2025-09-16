#!/usr/bin/env node
import dotenv from 'dotenv'
import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'

dotenv.config()

const RPC = process.env.RPC_URL_BASE || process.env.RPC_URL || 'https://mainnet.base.org'
const FACTORY = process.env.CHECK_FACTORY_ADDRESS || '0x6Ce624d571B376D8Ecfbf9d9d79A3639D62A86C8'
const MODULE = process.env.CHECK_MODULE_ADDRESS || '0x024F01e9De3D0258DF7930f146F13D4eF5fe0750'
const MODULE_DATA = process.env.CHECK_MODULE_DATA || '0x2ede3bc00000000000000000000000006a79c5cbfb1832cbca2470a132bec858f4ff9df5'

async function main() {
  console.log('RPC:', RPC)
  console.log('Factory:', FACTORY)
  console.log('Module:', MODULE)
  console.log('ModuleData:', MODULE_DATA)

  const client = createPublicClient({ chain: base, transport: http(RPC) })
  const abi = parseAbi([
    'function getAddressForCounterFactualAccount(address moduleSetupContract, bytes moduleSetupData, uint256 index) view returns (address)'
  ])

  try {
    const res = await client.readContract({
      address: FACTORY,
      abi,
      functionName: 'getAddressForCounterFactualAccount',
      args: [MODULE, MODULE_DATA, 0n]
    })
    console.log('readContract result:', res)
  } catch (err) {
    console.error('readContract error:')
    console.error(err)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

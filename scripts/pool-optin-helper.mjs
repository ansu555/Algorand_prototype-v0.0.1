#!/usr/bin/env node

/**
 * Helper to opt into Tinyman V2 pools
 * This shows you how to opt in via Tinyman's official app
 */

console.log('\n🏊 TINYMAN POOL OPT-IN GUIDE\n')
console.log('═'.repeat(60))

console.log('\n📱 METHOD 1: Use Tinyman Testnet App (EASIEST)')
console.log('─'.repeat(60))
console.log('1. Visit: https://testnet.app.tinyman.org/')
console.log('2. Connect your Lute wallet')
console.log('3. Go to "Pool" section')
console.log('4. Find the pool you want to swap with (e.g., ALGO/USDC)')
console.log('5. Click "Add Liquidity" or "Enable Pool"')
console.log('6. This will automatically opt you into the pool')
console.log('7. Go back to your swap app and try again!')

console.log('\n💻 METHOD 2: Use Your Swap App (AUTOMATED)')
console.log('─'.repeat(60))
console.log('1. Try to swap ALGO → USDC in your app')
console.log('2. You\'ll get an error showing the Pool App ID')
console.log('3. The error will say: "Pool opt-in required"')
console.log('4. Note the pool app ID from the error')
console.log('5. I can then help you create an opt-in transaction')

console.log('\n🔧 METHOD 3: Manual Transaction (ADVANCED)')
console.log('─'.repeat(60))
console.log('If you know the pool app ID, you can use algokit:')
console.log('   algokit task opt-in --app-id <POOL_APP_ID> --network testnet')

console.log('\n📝 WHAT IS POOL OPT-IN?')
console.log('─'.repeat(60))
console.log('Tinyman V2 requires users to opt into each pool before swapping.')
console.log('This is a one-time transaction that costs ~0.001 ALGO.')
console.log('After opting in, you can swap unlimited times with that pool.')

console.log('\n💡 TIP: Try the swap first to get the pool app ID!')
console.log('═'.repeat(60))
console.log('')

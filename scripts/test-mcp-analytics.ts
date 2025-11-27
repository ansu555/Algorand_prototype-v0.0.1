/**
 * Test MCP Analytics API
 * Run with: npx tsx scripts/test-mcp-analytics.ts
 */

import { analyzeCoin } from '@/lib/mcp'

async function testMCPAnalytics() {
  console.log('🧪 Testing MCP Analytics Engine...\n')

  try {
    console.log('📊 Analyzing Algorand (7-day forecast)...')
    
    const result = await analyzeCoin({
      coin: 'algorand',
      horizonDays: 7,
      granularity: '1d',
      tasks: ['analysis', 'prediction', 'strategy'],
    })

    if (!result.ok) {
      console.error('❌ Analysis failed:', result.error)
      console.error('Suggestion:', result.suggestion)
      process.exit(1)
    }

    console.log('\n✅ Analysis successful!\n')
    
    if (result.summary) {
      console.log('📋 Summary:')
      console.log(result.summary)
      console.log()
    }

    if (result.insights && result.insights.length > 0) {
      console.log('💡 Insights:')
      result.insights.forEach(insight => console.log(`  ${insight}`))
      console.log()
    }

    if (result.predictions && result.predictions.length > 0) {
      console.log('🔮 Predictions:')
      result.predictions.slice(0, 3).forEach(pred => {
        console.log(`  ${pred.date}: $${pred.price.toFixed(2)} (${((pred.probability || 0) * 100).toFixed(0)}% confidence)`)
      })
      console.log()
    }

    if (result.strategies && result.strategies.length > 0) {
      console.log('📈 Strategies:')
      result.strategies.forEach(strategy => {
        console.log(`  ${strategy.name} (${strategy.risk} risk)`)
        console.log(`    ${strategy.description}`)
      })
      console.log()
    }

    if (result.methodology) {
      console.log('🔬 Methodology:')
      console.log(`  Data Points: ${result.methodology.dataPoints}`)
      console.log(`  Timeframe: ${result.methodology.timeframe}`)
      console.log(`  Method: ${result.methodology.method}`)
      console.log(`  Indicators: ${result.methodology.indicators.join(', ')}`)
      console.log()
    }

    console.log('🎉 MCP Analytics is working correctly!')
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

testMCPAnalytics()

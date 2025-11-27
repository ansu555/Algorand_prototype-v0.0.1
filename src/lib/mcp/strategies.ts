// Trading Strategies Generator
import { Indicators, Strategy } from './types'

/**
 * Generate trading strategies based on market conditions
 * Only DCA, REBALANCE, ROTATE - matching Rule Builder
 */
export function generateStrategies(
  coin: string,
  indicators: Indicators,
  currentPrice: number
): Strategy[] {
  const strategies: Strategy[] = []
  const { rsi, trend, volatility, sma20, sma50 } = indicators

  // DCA Strategy
  if (rsi < 40 || trend === 'bearish') {
    strategies.push({
      name: 'Dollar-Cost Averaging (DCA)',
      description: `With RSI at ${rsi.toFixed(1)} and ${trend} trend, consider regular purchases to average down your cost basis. Buy fixed amounts at regular intervals regardless of price.`,
      risk: 'low',
    })
  } else if (rsi < 60) {
    strategies.push({
      name: 'Dollar-Cost Averaging (DCA)',
      description: `Moderate RSI (${rsi.toFixed(1)}) suggests steady accumulation. Invest fixed amounts weekly or monthly to build position over time.`,
      risk: 'low',
    })
  }

  // Rebalance Strategy
  if (volatility > currentPrice * 0.05) {
    strategies.push({
      name: 'Portfolio Rebalancing',
      description: `High volatility (${((volatility / currentPrice) * 100).toFixed(1)}%) detected. Rebalance portfolio to maintain target allocation ratios. Sell overperforming assets, buy underperforming ones.`,
      risk: 'medium',
    })
  } else if (Math.abs(sma20 - sma50) > currentPrice * 0.03) {
    strategies.push({
      name: 'Portfolio Rebalancing',
      description: `Moving averages diverging. Rebalance to restore target allocations. Current deviation: ${(((sma20 - sma50) / currentPrice) * 100).toFixed(1)}%.`,
      risk: 'medium',
    })
  }

  // Rotation Strategy
  if (trend === 'bullish' && rsi > 60) {
    strategies.push({
      name: 'Momentum Rotation',
      description: `Strong ${trend} trend with RSI at ${rsi.toFixed(1)}. Rotate into top momentum performers. Monitor for trend reversal signals.`,
      risk: 'high',
    })
  } else if (trend === 'bearish' && rsi < 40) {
    strategies.push({
      name: 'Defensive Rotation',
      description: `Bearish conditions (RSI ${rsi.toFixed(1)}). Consider rotating into stable assets or stablecoins until trend improves.`,
      risk: 'medium',
    })
  } else if (volatility > currentPrice * 0.07) {
    strategies.push({
      name: 'Volatility-Based Rotation',
      description: `Extreme volatility (${((volatility / currentPrice) * 100).toFixed(1)}%). Rotate to lower-volatility assets to preserve capital.`,
      risk: 'high',
    })
  }

  // Ensure at least one strategy
  if (strategies.length === 0) {
    strategies.push({
      name: 'Hold & Observe',
      description: `Market conditions are neutral (RSI: ${rsi.toFixed(1)}, Trend: ${trend}). Maintain current positions and monitor for clearer signals.`,
      risk: 'low',
    })
  }

  return strategies
}

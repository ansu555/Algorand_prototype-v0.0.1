// Tool metadata for customSwap
export const customSwapTool = {
  name: 'CustomSwap',
  description: 'Perform a custom token swap using the deployed router on Avalanche Fuji. Requires tokenInSymbol, tokenOutSymbol, amount, and optional slippageBps.',
  inputSchema: {
    type: 'object',
    properties: {
      tokenInSymbol: { type: 'string', description: 'Symbol of input token (e.g., USDC)' },
      tokenOutSymbol: { type: 'string', description: 'Symbol of output token (e.g., WAVAX)' },
      amount: { type: 'string', description: 'Amount to swap (human readable)' },
      slippageBps: { type: 'number', description: 'Slippage in basis points (optional, default 100)' },
      wait: { type: 'boolean', description: 'Wait for transaction confirmation (optional, default true)' }
    },
    required: ['tokenInSymbol', 'tokenOutSymbol', 'amount']
  },
  outputSchema: {
    type: 'object',
    properties: {
      hash: { type: 'string', description: 'Transaction hash' },
      details: { type: 'object', description: 'Swap details (tokens, amounts, route, slippage)' }
    },
    required: ['hash', 'details']
  }
}

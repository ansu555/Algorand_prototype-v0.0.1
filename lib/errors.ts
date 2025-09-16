export type CustomSwapErrorCode =
  | 'UNSUPPORTED_TOKEN'
  | 'ROUTER_NOT_CONFIGURED'
  | 'DEADLINE_PAST'
  | 'GAS_FEE_INVALID'
  | 'SIMULATION_FAILED'
  | 'ALLOWANCE_READ_FAILED'
  | 'APPROVAL_FAILED'
  | 'EXECUTION_REVERTED'
  | 'SLIPPAGE_EXCEEDED'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'ROUTE_NOT_FOUND'
  | 'ROUTE_QUOTE_FAILED'
  | 'UNKNOWN'

export interface CustomSwapErrorOptions { cause?: any; data?: Record<string, any> }

export class CustomSwapError extends Error {
  code: CustomSwapErrorCode
  data?: Record<string, any>
  constructor(code: CustomSwapErrorCode, message: string, opts: CustomSwapErrorOptions = {}) {
    super(message)
    this.name = 'CustomSwapError'
    this.code = code
    this.data = opts.data
    if (opts.cause && (opts.cause as any).stack) {
      this.stack += '\nCaused By: ' + (opts.cause as any).stack
    }
  }
}

export function toUserMessage(err: unknown): { code: CustomSwapErrorCode; message: string } {
  if (err instanceof CustomSwapError) return { code: err.code, message: err.message }
  return { code: 'UNKNOWN', message: (err as any)?.message || 'Unknown error' }
}

export function wrapUnknown(code: CustomSwapErrorCode, fallbackMsg: string, err: any, data?: Record<string, any>) {
  if (err instanceof CustomSwapError) return err
  return new CustomSwapError(code, fallbackMsg + (err?.message ? ': ' + err.message : ''), { cause: err, data })
}

export function interpretExecutionError(err: any): CustomSwapError {
  const msg = (err?.shortMessage || err?.message || '').toLowerCase()
  if (msg.includes('insufficient') && msg.includes('liquidity')) {
    return new CustomSwapError('INSUFFICIENT_LIQUIDITY', 'Not enough liquidity for this trade', { cause: err })
  }
  if (msg.includes('slippage')) {
    return new CustomSwapError('SLIPPAGE_EXCEEDED', 'Slippage exceeded your tolerance', { cause: err })
  }
  return new CustomSwapError('EXECUTION_REVERTED', 'Swap execution reverted', { cause: err })
}

/**
 * DEX Utility Functions
 * Common calculations and helpers for AMM operations
 */

/**
 * Calculate output amount using constant product formula (x * y = k)
 * @param amountIn Input amount
 * @param reserveIn Reserve of input asset
 * @param reserveOut Reserve of output asset
 * @param feeBps Fee in basis points (e.g., 30 = 0.3%)
 */
export function calculateAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number
): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
    throw new Error('Invalid input: amounts and reserves must be positive');
  }

  // Calculate fee
  const feeMultiplier = 10000n - BigInt(feeBps);
  const amountInWithFee = amountIn * feeMultiplier;
  
  // x * y = k formula
  // amountOut = (amountIn * feeMultiplier * reserveOut) / (reserveIn * 10000 + amountIn * feeMultiplier)
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 10000n + amountInWithFee;
  
  return numerator / denominator;
}

/**
 * Calculate input amount needed for desired output
 */
export function calculateAmountIn(
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number
): bigint {
  if (amountOut <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
    throw new Error('Invalid input: amounts and reserves must be positive');
  }

  if (amountOut >= reserveOut) {
    throw new Error('Insufficient liquidity for desired output');
  }

  const feeMultiplier = 10000n - BigInt(feeBps);
  const numerator = reserveIn * amountOut * 10000n;
  const denominator = (reserveOut - amountOut) * feeMultiplier;
  
  return numerator / denominator + 1n; // Add 1 to account for rounding
}

/**
 * Calculate price impact percentage
 */
export function calculatePriceImpact(
  amountIn: bigint,
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  if (reserveIn <= 0n || reserveOut <= 0n) {
    return 100; // 100% impact if no liquidity
  }

  // Spot price before trade
  const spotPriceBefore = Number(reserveOut) / Number(reserveIn);
  
  // Execution price
  const executionPrice = Number(amountOut) / Number(amountIn);
  
  // Price impact = (1 - executionPrice / spotPrice) * 100
  const impact = (1 - executionPrice / spotPriceBefore) * 100;
  
  return Math.max(0, impact);
}

/**
 * Apply slippage tolerance to get minimum amount out
 */
export function applySlippage(amount: bigint, slippageBps: number): bigint {
  const slippageMultiplier = 10000n - BigInt(slippageBps);
  return (amount * slippageMultiplier) / 10000n;
}

/**
 * Calculate multi-hop swap output
 */
export function calculateMultiHopOutput(
  amountIn: bigint,
  reserves: Array<{ reserveIn: bigint; reserveOut: bigint; feeBps: number }>
): { amountOut: bigint; priceImpact: number } {
  let currentAmount = amountIn;
  let totalPriceImpact = 0;

  for (const hop of reserves) {
    const amountOut = calculateAmountOut(
      currentAmount,
      hop.reserveIn,
      hop.reserveOut,
      hop.feeBps
    );

    const impact = calculatePriceImpact(
      currentAmount,
      amountOut,
      hop.reserveIn,
      hop.reserveOut
    );

    totalPriceImpact += impact;
    currentAmount = amountOut;
  }

  return {
    amountOut: currentAmount,
    priceImpact: totalPriceImpact,
  };
}

/**
 * Format asset amount with decimals
 */
export function formatAssetAmount(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  if (fractionalPart === 0n) {
    return integerPart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  return `${integerPart}.${fractionalStr}`.replace(/\.?0+$/, '');
}

/**
 * Parse asset amount from string with decimals
 */
export function parseAssetAmount(amount: string, decimals: number): bigint {
  const [integerPart, fractionalPart = ''] = amount.split('.');
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  const fullAmount = integerPart + paddedFractional;
  return BigInt(fullAmount);
}

/**
 * Create pool key for caching
 */
export function getPoolKey(asset1Id: number, asset2Id: number): string {
  // Always use smaller ID first for consistency
  const [a, b] = asset1Id < asset2Id ? [asset1Id, asset2Id] : [asset2Id, asset1Id];
  return `${a}-${b}`;
}

/**
 * Check if pool has sufficient liquidity
 */
export function hasSufficientLiquidity(
  amountIn: bigint,
  reserveIn: bigint,
  minLiquidityMultiplier: number = 10
): boolean {
  return reserveIn >= amountIn * BigInt(minLiquidityMultiplier);
}

/**
 * Calculate fee amount
 */
export function calculateFee(amount: bigint, feeBps: number): bigint {
  return (amount * BigInt(feeBps)) / 10000n;
}

/**
 * Validate swap parameters
 */
export function validateSwapParams(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): void {
  if (amountIn <= 0n) {
    throw new Error('Amount in must be positive');
  }
  if (reserveIn <= 0n || reserveOut <= 0n) {
    throw new Error('Pool reserves must be positive');
  }
  if (amountIn >= reserveIn) {
    throw new Error('Amount in exceeds reserve');
  }
}

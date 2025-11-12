/**
 * Helper utilities for converting between UI data and contract parameters
 */

import type {
  CreateRuleParams,
  RuleType,
  TriggerType,
  RuleStatus,
} from './autopilot-types';
import {
  RULE_TYPE_DCA,
  RULE_TYPE_REBALANCE,
  RULE_TYPE_ROTATE,
  TRIGGER_PRICE_DROP,
  TRIGGER_TREND,
  TRIGGER_MOMENTUM,
} from './autopilot-types';
import type { BuiltRule } from '@/components/features/rules/rule-builder-modal';

/**
 * Convert UI form data to contract CreateRuleParams
 */
export function convertFormToContractParams(
  formData: BuiltRule,
  ownerAddress: string,
  assetIdMap: Record<string, number> // map coin id (e.g., "ALGO") to asset ID
): CreateRuleParams {
  // Map strategy to rule type
  const ruleType: RuleType =
    formData.strategy === 'DCA'
      ? RULE_TYPE_DCA
      : formData.strategy === 'REBALANCE'
      ? RULE_TYPE_REBALANCE
      : RULE_TYPE_ROTATE;

  // Map trigger type
  const triggerType: TriggerType =
    formData.triggerType === 'priceDrop'
      ? TRIGGER_PRICE_DROP
      : formData.triggerType === 'trend'
      ? TRIGGER_TREND
      : TRIGGER_MOMENTUM;

  // Convert coin IDs to asset IDs
  const targetAssets: number[] = formData.coins.map((coinId) => {
    const assetId = assetIdMap[coinId];
    if (assetId === undefined) {
      throw new Error(`Asset ID not found for coin: ${coinId}`);
    }
    return assetId;
  });

  // Calculate threshold in basis points based on trigger type
  let thresholdBps = 0;
  if (formData.triggerType === 'priceDrop' && formData.dropPercent) {
    thresholdBps = Math.round(formData.dropPercent * 100); // Convert percentage to bps
  } else if (formData.triggerType === 'trend' && formData.trendThreshold) {
    thresholdBps = Math.round(formData.trendThreshold * 100);
  } else if (formData.triggerType === 'momentum' && formData.momentumThreshold) {
    thresholdBps = Math.round(formData.momentumThreshold * 100);
  }

  // Calculate window hours based on trigger type
  let windowHours = 0;
  if (formData.triggerType === 'trend' && formData.trendWindow) {
    windowHours =
      formData.trendWindow === '24h'
        ? 24
        : formData.trendWindow === '7d'
        ? 168
        : 720; // 30d
  } else if (formData.triggerType === 'momentum' && formData.momentumLookback) {
    windowHours = formData.momentumLookback * 24;
  }

  // Convert max spend USD to microalgos (assuming 1 USD = some ALGO amount)
  // For testnet, we'll just use the USD value as microalgos directly for now
  // In production, you'd fetch the ALGO/USD price and convert
  const maxSpendMicroalgos = Math.round(formData.maxSpendUsd * 1_000_000);

  // Convert slippage percentage to basis points
  const maxSlippageBps = Math.round(formData.maxSlippagePercent * 100);

  return {
    ruleType,
    targetAssets,
    rotateTopN: formData.rotateTopN,
    maxSpendMicroalgos,
    maxSlippageBps,
    cooldownMinutes: formData.cooldownMinutes,
    triggerType,
    thresholdBps,
    windowHours,
  };
}

/**
 * Default asset ID mapping for Algorand testnet
 */
export const TESTNET_ASSET_MAP: Record<string, number> = {
  ALGO: 0,
  USDC: 10458941, // Circle USDC (Tinyman verified)
  USDT: 67396430, // Tether USDt (Tinyman verified)
  ALGF: 70283957, // AlgoFund governance token
};

/**
 * Format rule status for display
 */
export function formatRuleStatus(status: RuleStatus): string {
  switch (status) {
    case 1:
      return 'Active';
    case 2:
      return 'Paused';
    case 3:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

/**
 * Format microalgos to ALGO
 */
export function microalgosToAlgo(microalgos: number | bigint): string {
  return (Number(microalgos) / 1_000_000).toFixed(6);
}

/**
 * Format basis points to percentage
 */
export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2);
}

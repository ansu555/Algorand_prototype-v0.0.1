/**
 * TypeScript types for AutoPilot Rule Contract
 * Mirrors the smart contract structs and enums
 */

// Rule types
export const RULE_TYPE_DCA = 1;
export const RULE_TYPE_REBALANCE = 2;
export const RULE_TYPE_ROTATE = 3;

// Trigger types
export const TRIGGER_PRICE_DROP = 1;
export const TRIGGER_TREND = 2;
export const TRIGGER_MOMENTUM = 3;

// Rule status
export const STATUS_ACTIVE = 1;
export const STATUS_PAUSED = 2;
export const STATUS_CANCELLED = 3;

export type RuleType = typeof RULE_TYPE_DCA | typeof RULE_TYPE_REBALANCE | typeof RULE_TYPE_ROTATE;
export type TriggerType = typeof TRIGGER_PRICE_DROP | typeof TRIGGER_TREND | typeof TRIGGER_MOMENTUM;
export type RuleStatus = typeof STATUS_ACTIVE | typeof STATUS_PAUSED | typeof STATUS_CANCELLED;

/**
 * Trigger condition configuration
 */
export interface TriggerData {
  trigger_type: TriggerType;
  threshold_bps: number;  // Threshold in basis points (500 = 5%)
  window_hours: number;   // Time window for trend/momentum
  lookback_days: number;  // Lookback period for momentum
}

/**
 * Complete rule configuration (matches smart contract RuleData struct)
 */
export interface RuleData {
  rule_id: bigint;
  owner: string;  // Algorand address
  rule_type: RuleType;
  status: RuleStatus;
  
  // Assets
  target_assets: bigint[];  // Asset IDs
  rotate_top_n: number;
  
  // Risk Controls
  max_spend_microalgos: bigint;
  max_slippage_bps: number;
  cooldown_minutes: number;
  
  // Trigger Configuration
  trigger: TriggerData;
  
  // Execution Tracking
  last_execution_timestamp: bigint;
  total_executions: number;
  total_spent_microalgos: bigint;
  
  // Metadata
  created_at: bigint;
}

/**
 * Parameters for creating a new rule
 */
export interface CreateRuleParams {
  ruleType: RuleType;
  targetAssets: number[];  // Asset IDs
  rotateTopN?: number;
  maxSpendMicroalgos: number;
  maxSlippageBps: number;
  cooldownMinutes: number;
  triggerType: TriggerType;
  thresholdBps: number;
  windowHours?: number;
}

/**
 * Parameters for executing a rule
 */
export interface ExecuteRuleParams {
  ruleId: bigint;
  owner: string;
  assetIn: number;  // Asset ID
  assetOut: number; // Asset ID
  amountIn: bigint;
  minAmountOut: bigint;
  swapRouterAppId?: number;
  poolAppId?: number;
}

/**
 * Result from creating a rule
 */
export interface CreateRuleResult {
  ruleId: bigint;
  txId: string;
  confirmedRound?: number;
}

/**
 * Result from executing a rule
 */
export interface ExecuteRuleResult {
  amountSpent: bigint;
  txId: string;
  confirmedRound?: number;
}

/**
 * Rule statistics
 */
export interface RuleStats {
  totalExecutions: number;
  totalSpentMicroalgos: bigint;
  lastExecutionTimestamp: bigint;
}

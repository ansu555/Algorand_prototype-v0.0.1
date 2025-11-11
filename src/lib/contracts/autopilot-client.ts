/**
 * AutoPilot Rule Contract Client
 * Client library for interacting with the AutoPilot Rule smart contract
 */

import algosdk from 'algosdk';
import { getAutoPilotRuleSpec } from './artifacts';
import { getContracts } from '@/lib/config/contracts';
import type {
  CreateRuleParams,
  CreateRuleResult,
  ExecuteRuleParams,
  ExecuteRuleResult,
  RuleData,
  RuleStats,
  RuleStatus,
  RuleType,
  TriggerType,
} from './autopilot-types';

/**
 * Wallet signer interface
 */
export interface WalletSigner {
  address: string;
  signTransactions(txns: algosdk.Transaction[]): Promise<Uint8Array[]>;
}

/**
 * AutoPilot Rule Contract Client
 */
export class AutoPilotRuleClient {
  private algodClient: algosdk.Algodv2;
  private appId: number;
  private appAddress: string;

  constructor(algodClient: algosdk.Algodv2) {
    this.algodClient = algodClient;
    const contracts = getContracts();
    
    if (!contracts.autopilotRule) {
      throw new Error('AutoPilot Rule contract not configured for current network');
    }
    
    this.appId = contracts.autopilotRule.appId;
    this.appAddress = contracts.autopilotRule.address;
  }

  /**
   * Get the application ID
   */
  getAppId(): number {
    return this.appId;
  }

  /**
   * Get the application address
   */
  getAppAddress(): string {
    return this.appAddress;
  }

  /**
   * Create a new AutoPilot rule
   */
  async createRule(
    signer: WalletSigner,
    params: CreateRuleParams
  ): Promise<CreateRuleResult> {
    const suggestedParams = await this.algodClient.getTransactionParams().do();
    const isDev = process.env.NODE_ENV !== 'production';
    
    // Load the ARC-56 contract spec to get the method selector
    const arc56Contract = getAutoPilotRuleSpec();
    const abiContract = new algosdk.ABIContract(arc56Contract);
    const createRuleMethod = abiContract.getMethodByName('create_rule');
    
    // 1. Pre-compute the rule ID to construct box name
    const globalState = await this.algodClient.getApplicationByID(this.appId).do();
    const ruleCounterKey = Buffer.from('rule_counter').toString('base64');
    const paramsAny = (globalState.params ?? {}) as unknown as Record<string, unknown>;
    const globalAny = globalState as unknown as Record<string, unknown>;
    const globalStateEntries =
      (paramsAny['global-state'] as Array<any> | undefined) ??
      (paramsAny.globalState as Array<any> | undefined) ??
      (globalAny['global-state'] as Array<any> | undefined) ??
      [];
    const ruleCounterState = (globalStateEntries as Array<any>).find((kv: any) => {
      const keyValue = kv.key;
      if (typeof keyValue === 'string') {
        if (keyValue === ruleCounterKey || keyValue === 'rule_counter') {
          return true;
        }
      } else if (keyValue instanceof Uint8Array || Array.isArray(keyValue)) {
        const decodedKey = Buffer.from(keyValue).toString();
        if (decodedKey === 'rule_counter') {
          return true;
        }
      }
      return false;
    });
    const currentRuleCount = ruleCounterState ? BigInt(ruleCounterState.value.uint) : BigInt(0);
    const nextRuleId = currentRuleCount + BigInt(1);

    if (isDev) {
      console.debug('Rule counter introspection:', {
        ruleCounterKey,
        currentRuleCount: currentRuleCount.toString(),
        nextRuleId: nextRuleId.toString(),
      });
    }

    // 2. Calculate box size dynamically based on actual params
    // RuleData struct size breakdown:
    // - rule_id: 8 bytes
    // - owner: 32 bytes
    // - rule_type: 1 byte
    // - status: 1 byte
    // - target_assets: 2 bytes (length) + (8 * num_assets) bytes
    // - rotate_top_n: 1 byte
    // - max_spend_microalgos: 8 bytes
    // - max_slippage_bps: 2 bytes
    // - cooldown_minutes: 2 bytes
    // - trigger (TriggerData): 1 + 2 + 2 + 1 = 6 bytes
    // - last_execution_timestamp: 8 bytes
    // - total_executions: 4 bytes
    // - total_spent_microalgos: 8 bytes
    // - created_at: 8 bytes
    // Fixed size: 8+32+1+1+1+8+2+2+6+8+4+8+8 = 89 bytes
    
    const numAssets = params.targetAssets.length;
    const dynamicArraySize = 2 + (8 * numAssets); // 2-byte length prefix + asset IDs
    const totalBoxSize = 89 + dynamicArraySize;
    
    // Box MBR calculation: 2,500 + (400 * box_size) microALGOs
    const calculatedBoxMbr = 2500 + (400 * totalBoxSize);
    
    // The smart contract requires a minimum payment of 165,000 microALGOs
    // Use the maximum of calculated MBR and contract minimum
    const MIN_PAYMENT = 165_000; // 0.165 ALGO minimum required by contract
    const boxMbr = Math.max(calculatedBoxMbr, MIN_PAYMENT);
    
    if (isDev) {
      console.debug('Box payment calculation:', {
        numAssets,
        totalBoxSize,
        calculatedBoxMbr,
        finalPayment: boxMbr,
        paymentAlgo: boxMbr / 1_000_000,
      });
    }

    // 3. Create payment transaction for box storage
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: signer.address,
      receiver: this.appAddress,
      amount: boxMbr,
      suggestedParams,
    });

    // 4. Construct the box name: owner (32 bytes) + rule_id (8 bytes)
    const ownerBytes = algosdk.decodeAddress(signer.address).publicKey;
    const ruleIdBytes = this.encodeUint64(Number(nextRuleId));
    const boxName = new Uint8Array([...ownerBytes, ...ruleIdBytes]);

    if (isDev) {
      console.debug('Box reference details:', {
        ownerAddress: signer.address,
        ownerBytesHex: Buffer.from(ownerBytes).toString('hex'),
        ruleId: nextRuleId.toString(),
        ruleIdBytesHex: Buffer.from(ruleIdBytes).toString('hex'),
        fullBoxNameHex: Buffer.from(boxName).toString('hex'),
        boxNameLength: boxName.length,
        appId: this.appId,
      });
    }

    // 5. Create application call transaction with proper box reference
    // For box operations, we need to include the box reference in the transaction
    // Note: Use appIndex 0 to refer to the application being called
    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: signer.address,
      appIndex: this.appId,
      appArgs: [
        createRuleMethod.getSelector(),
        this.encodeUint8(params.ruleType),
        this.encodeUint64Array(params.targetAssets),
        this.encodeUint8(params.rotateTopN || 0),
        this.encodeUint64(params.maxSpendMicroalgos),
        this.encodeUint16(params.maxSlippageBps),
        this.encodeUint16(params.cooldownMinutes),
        this.encodeUint8(params.triggerType),
        this.encodeUint16(params.thresholdBps),
        this.encodeUint16(params.windowHours || 0),
      ],
      // Box references: Use app index 0 to refer to "this app"
      boxes: [
        { 
          appIndex: 0,  // 0 means "this application"
          name: boxName 
        }
      ],
      // Increase opcode budget for box operations
      note: new Uint8Array(Buffer.from('AutoPilot Rule Creation')),
      suggestedParams: {
        ...suggestedParams,
        flatFee: false,
        fee: 1000, // Standard fee
      },
    });

    // 6. Group transactions: payment MUST come first (referenced as txn index -1)
    const txnGroup = [paymentTxn, appCallTxn];
    algosdk.assignGroupID(txnGroup);

    // 7. Sign transactions
    const signedTxns = await signer.signTransactions(txnGroup);

    // 8. Send transactions
    const sendResult = await this.algodClient.sendRawTransaction(signedTxns).do();
    const txId = sendResult.txid;

    // 9. Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(
      this.algodClient,
      txId,
      4
    );

    if (isDev) {
      console.debug('Transaction logs:', confirmedTxn.logs ?? []);
    }

    // 10. Extract rule ID from logs or use pre-computed value
    let ruleId: bigint;
    try {
      ruleId = this.extractRuleIdFromLogs(confirmedTxn);
    } catch (error) {
      console.warn('Could not extract rule ID from logs, using pre-computed value:', error);
      // Fallback to pre-computed rule ID
      ruleId = nextRuleId;
    }

    return {
      ruleId,
      txId,
      confirmedRound: Number(confirmedTxn.confirmedRound),
    };
  }

  /**
   * Execute an AutoPilot rule
   */
  async executeRule(
    signer: WalletSigner,
    params: ExecuteRuleParams
  ): Promise<ExecuteRuleResult> {
    const suggestedParams = await this.algodClient.getTransactionParams().do();
    const contracts = getContracts();

    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: signer.address,
      appIndex: this.appId,
      appArgs: [
        new Uint8Array(Buffer.from('execute_rule')),
        this.encodeUint64(Number(params.ruleId)),
        algosdk.decodeAddress(params.owner).publicKey,
        this.encodeUint64(params.assetIn),
        this.encodeUint64(params.assetOut),
        this.encodeUint64(Number(params.amountIn)),
        this.encodeUint64(Number(params.minAmountOut)),
      ],
      foreignAssets: [params.assetIn, params.assetOut],
      foreignApps: [
        params.swapRouterAppId || contracts.multihopRouter.appId,
        params.poolAppId || 0,
      ],
      suggestedParams,
    });

    const signedTxn = await signer.signTransactions([appCallTxn]);
    const sendResult = await this.algodClient.sendRawTransaction(signedTxn).do();
    const txId = sendResult.txid;

    const confirmedTxn = await algosdk.waitForConfirmation(
      this.algodClient,
      txId,
      4
    );

    // Extract amount spent from return value
    const amountSpent = this.extractReturnValue(confirmedTxn);

    return {
      amountSpent: BigInt(amountSpent || 0),
      txId,
      confirmedRound: Number(confirmedTxn.confirmedRound),
    };
  }

  /**
   * Update rule status (pause/resume/cancel)
   */
  async updateRuleStatus(
    signer: WalletSigner,
    ruleId: bigint,
    newStatus: RuleStatus
  ): Promise<string> {
    const suggestedParams = await this.algodClient.getTransactionParams().do();

    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: signer.address,
      appIndex: this.appId,
      appArgs: [
        new Uint8Array(Buffer.from('update_rule_status')),
        this.encodeUint64(Number(ruleId)),
        this.encodeUint8(newStatus),
      ],
      suggestedParams,
    });

    const signedTxn = await signer.signTransactions([appCallTxn]);
    const sendResult = await this.algodClient.sendRawTransaction(signedTxn).do();
    const txId = sendResult.txid;

    await algosdk.waitForConfirmation(this.algodClient, txId, 4);

    return txId;
  }

  /**
   * Delete a rule and reclaim storage MBR
   */
  async deleteRule(
    signer: WalletSigner,
    ruleId: bigint
  ): Promise<string> {
    const suggestedParams = await this.algodClient.getTransactionParams().do();

    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: signer.address,
      appIndex: this.appId,
      appArgs: [
        new Uint8Array(Buffer.from('delete_rule')),
        this.encodeUint64(Number(ruleId)),
      ],
      suggestedParams,
    });

    const signedTxn = await signer.signTransactions([appCallTxn]);
    const sendResult = await this.algodClient.sendRawTransaction(signedTxn).do();
    const txId = sendResult.txid;

    await algosdk.waitForConfirmation(this.algodClient, txId, 4);

    return txId;
  }

  /**
   * List all rules for a user by querying box storage
   */
  async listUserRules(owner: string): Promise<Array<{ ruleId: bigint; data: Uint8Array }>> {
    try {
      // Get all boxes for this app
      const boxes = await this.algodClient.getApplicationBoxes(this.appId).do();
      
      const userRules: Array<{ ruleId: bigint; data: Uint8Array }> = [];
      const ownerBytes = algosdk.decodeAddress(owner).publicKey;

      // Filter boxes that belong to this user
      // Box name format: owner_address (32 bytes) + rule_id (8 bytes)
      for (const box of boxes.boxes) {
        if (box.name.length === 40) { // 32 + 8 bytes
          const boxOwner = box.name.slice(0, 32);
          
          // Check if this box belongs to the user
          if (Buffer.from(boxOwner).equals(Buffer.from(ownerBytes))) {
            // Extract rule ID from box name (last 8 bytes)
            const ruleIdBytes = box.name.slice(32);
            let ruleId = BigInt(0);
            for (let i = 0; i < 8; i++) {
              ruleId = (ruleId << BigInt(8)) | BigInt(ruleIdBytes[i]);
            }

            // Get box contents
            const boxData = await this.algodClient.getApplicationBoxByName(
              this.appId,
              box.name
            ).do();

            userRules.push({
              ruleId,
              data: boxData.value,
            });
          }
        }
      }

      return userRules;
    } catch (error: any) {
      console.error('Error listing user rules:', error);
      throw error;
    }
  }

  /**
   * Get rule details (read-only)
   */
  async getRule(ruleId: bigint, owner: string): Promise<RuleData> {
    // Construct box name: owner (32 bytes) + rule_id (8 bytes)
    const ownerBytes = algosdk.decodeAddress(owner).publicKey;
    const ruleIdBytes = this.encodeUint64(Number(ruleId));
    const boxName = new Uint8Array([...ownerBytes, ...ruleIdBytes]);

    try {
      const boxData = await this.algodClient.getApplicationBoxByName(
        this.appId,
        boxName
      ).do();

      // Decode RuleData from box storage
      const decoded = this.decodeRuleData(boxData.value);

      // Ensure rule_id and owner are set explicitly from inputs
      decoded.rule_id = ruleId;
      decoded.owner = owner;
      return decoded;
    } catch (error: any) {
      console.error('Error getting rule:', error);
      throw new Error(`Failed to get rule ${ruleId}: ${error.message}`);
    }
  }

  /**
   * Decode RuleData from bytes
   */
  private decodeRuleData(data: Uint8Array): RuleData {
    try {
      return this.decodeRuleDataArcOrder(data);
    } catch (e) {
      console.warn('ARC-order decode failed, attempting legacy decode...', e);
      return this.decodeRuleDataLegacy(data);
    }
  }

  private decodeRuleDataArcOrder(data: Uint8Array): RuleData {
    let offset = 0;

    // rule_id (uint64)
    let ruleIdNum = 0;
    for (let i = 0; i < 8; i++) {
      ruleIdNum = (ruleIdNum << 8) | data[offset++];
    }

    // owner (address - 32 bytes)
    const ownerBytes = data.slice(offset, offset + 32);
    offset += 32;
    const ownerAddr = algosdk.encodeAddress(ownerBytes);

    // rule_type (uint8)
    const ruleType = data[offset++];

    // status (uint8)
    const status = data[offset++];

    // target_assets (dynamic array of uint64) with 2-byte length prefix
    const assetsLength = (data[offset] << 8) | data[offset + 1];
    offset += 2;
    const targetAssets: bigint[] = [];
    for (let i = 0; i < assetsLength; i++) {
      let assetId = 0;
      for (let j = 0; j < 8; j++) {
        assetId = (assetId << 8) | data[offset++];
      }
      targetAssets.push(BigInt(assetId));
    }

    // rotate_top_n (uint8)
    const rotateTopN = data[offset++];

    // max_spend_microalgos (uint64)
    let maxSpendMicroalgos = 0;
    for (let i = 0; i < 8; i++) {
      maxSpendMicroalgos = (maxSpendMicroalgos << 8) | data[offset++];
    }

    // max_slippage_bps (uint16)
    const maxSlippageBps = (data[offset] << 8) | data[offset + 1];
    offset += 2;

    // cooldown_minutes (uint16)
    const cooldownMinutes = (data[offset] << 8) | data[offset + 1];
    offset += 2;

    // trigger (TriggerData)
    const triggerType = data[offset++];
    const thresholdBps = (data[offset] << 8) | data[offset + 1];
    offset += 2;
    const windowHours = (data[offset] << 8) | data[offset + 1];
    offset += 2;
    const lookbackDays = data[offset++];

    // last_execution_timestamp (uint64)
    let lastExecuted = 0;
    for (let i = 0; i < 8; i++) {
      lastExecuted = (lastExecuted << 8) | data[offset++];
    }

    // total_executions (uint32)
    let totalExecutions = 0;
    for (let i = 0; i < 4; i++) {
      totalExecutions = (totalExecutions << 8) | data[offset++];
    }

    // total_spent_microalgos (uint64)
    let totalSpent = 0;
    for (let i = 0; i < 8; i++) {
      totalSpent = (totalSpent << 8) | data[offset++];
    }

    // created_at (uint64)
    let createdAt = 0;
    for (let i = 0; i < 8; i++) {
      createdAt = (createdAt << 8) | data[offset++];
    }

    return {
      rule_id: BigInt(ruleIdNum),
      owner: ownerAddr,
      rule_type: ruleType as RuleType,
      status: status as RuleStatus,
      target_assets: targetAssets,
      rotate_top_n: rotateTopN,
      max_spend_microalgos: BigInt(maxSpendMicroalgos),
      max_slippage_bps: maxSlippageBps,
      cooldown_minutes: cooldownMinutes,
      trigger: {
        trigger_type: triggerType as TriggerType,
        threshold_bps: thresholdBps,
        window_hours: windowHours,
        lookback_days: lookbackDays,
      },
      last_execution_timestamp: BigInt(lastExecuted),
      total_executions: totalExecutions,
      total_spent_microalgos: BigInt(totalSpent),
      created_at: BigInt(createdAt),
    };
  }
  
  private decodeRuleDataLegacy(data: Uint8Array): RuleData {
    let offset = 0;

    // rule_type (uint8)
    const ruleType = data[offset++];

    // target_assets (dynamic array of uint64)
    const assetsLength = (data[offset] << 8) | data[offset + 1];
    offset += 2;
    const targetAssets: bigint[] = [];
    for (let i = 0; i < assetsLength; i++) {
      let assetId = 0;
      for (let j = 0; j < 8; j++) {
        assetId = (assetId << 8) | data[offset++];
      }
      targetAssets.push(BigInt(assetId));
    }

    // rotate_top_n (uint8)
    const rotateTopN = data[offset++];

    // max_spend_microalgos (uint64)
    let maxSpendMicroalgos = 0;
    for (let i = 0; i < 8; i++) {
      maxSpendMicroalgos = (maxSpendMicroalgos << 8) | data[offset++];
    }

    // max_slippage_bps (uint16)
    const maxSlippageBps = (data[offset] << 8) | data[offset + 1];
    offset += 2;

    // cooldown_minutes (uint16)
    const cooldownMinutes = (data[offset] << 8) | data[offset + 1];
    offset += 2;

    // trigger (TriggerData struct)
    const triggerType = data[offset++];
    const thresholdBps = (data[offset] << 8) | data[offset + 1];
    offset += 2;
    const windowHours = (data[offset] << 8) | data[offset + 1];
    offset += 2;

    // status (uint8)
    const status = data[offset++];

    // last_executed (uint64)
    let lastExecuted = 0;
    for (let i = 0; i < 8; i++) {
      lastExecuted = (lastExecuted << 8) | data[offset++];
    }

    // execution_count (uint64)
    let executionCount = 0;
    for (let i = 0; i < 8; i++) {
      executionCount = (executionCount << 8) | data[offset++];
    }

    // total_spent (uint64)
    let totalSpent = 0;
    for (let i = 0; i < 8; i++) {
      totalSpent = (totalSpent << 8) | data[offset++];
    }

    return {
      rule_id: BigInt(0),
      owner: '',
      rule_type: ruleType as RuleType,
      status: status as RuleStatus,
      target_assets: targetAssets,
      rotate_top_n: rotateTopN,
      max_spend_microalgos: BigInt(maxSpendMicroalgos),
      max_slippage_bps: maxSlippageBps,
      cooldown_minutes: cooldownMinutes,
      trigger: {
        trigger_type: triggerType as TriggerType,
        threshold_bps: thresholdBps,
        window_hours: windowHours,
        lookback_days: 0,
      },
      last_execution_timestamp: BigInt(lastExecuted),
      total_executions: Number(executionCount),
      total_spent_microalgos: BigInt(totalSpent),
      created_at: BigInt(0),
    };
  }

  async getRuleStats(ruleId: bigint, owner: string): Promise<RuleStats> {
    const ownerBytes = algosdk.decodeAddress(owner).publicKey;
    const ruleIdBytes = this.encodeUint64(Number(ruleId));
    const boxName = new Uint8Array([...ownerBytes, ...ruleIdBytes]);

    try {
      const boxData = await this.algodClient.getApplicationBoxByName(
        this.appId,
        boxName
      ).do();

      const decoded = this.decodeRuleData(boxData.value);
      return {
        totalExecutions: decoded.total_executions,
        totalSpentMicroalgos: decoded.total_spent_microalgos,
        lastExecutionTimestamp: decoded.last_execution_timestamp,
      };
    } catch (error: any) {
      console.error('Error getting rule stats:', error);
      throw new Error(`Failed to get stats for rule ${ruleId}: ${error.message}`);
    }
  }

  // ==================== Helper Methods ====================

  private encodeUint8(value: number): Uint8Array {
    const buffer = new Uint8Array(1);
    buffer[0] = value;
    return buffer;
  }

  private encodeUint16(value: number): Uint8Array {
    const buffer = new Uint8Array(2);
    buffer[0] = (value >> 8) & 0xff;
    buffer[1] = value & 0xff;
    return buffer;
  }

  private encodeUint64(value: number): Uint8Array {
    const buffer = new Uint8Array(8);
    const bigValue = BigInt(value);
    for (let i = 0; i < 8; i++) {
      buffer[7 - i] = Number((bigValue >> BigInt(i * 8)) & BigInt(0xff));
    }
    return buffer;
  }

  private encodeUint64Array(values: number[]): Uint8Array {
    // ARC-4 dynamic array encoding: 2-byte length prefix + concatenated elements
    const length = new Uint8Array(2);
    length[0] = (values.length >> 8) & 0xff;
    length[1] = values.length & 0xff;

    const elements = new Uint8Array(values.length * 8);
    values.forEach((val, idx) => {
      const encoded = this.encodeUint64(val);
      elements.set(encoded, idx * 8);
    });

    const result = new Uint8Array(2 + elements.length);
    result.set(length, 0);
    result.set(elements, 2);
    return result;
  }

  private extractRuleIdFromLogs(confirmedTxn: any): bigint {
    // Extract rule ID from transaction logs
    // The smart contract may log in different formats:
    // 1. b"RuleCreated", rule_id, sender
    // 2. Just the rule_id as a uint64
    const logs = confirmedTxn['logs'] || [];
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug('Transaction logs:', logs.map((log: string) => {
        const buf = Buffer.from(log, 'base64');
        return {
          base64: log,
          hex: buf.toString('hex'),
          utf8: buf.toString('utf8').replace(/[^\x20-\x7E]/g, '.'),
          length: buf.length,
        };
      }));
    }
    
    if (logs.length === 0) {
      throw new Error('No logs found in transaction');
    }
    
    // Try different log positions and formats
    for (let i = 0; i < logs.length; i++) {
      try {
        const logBuffer = Buffer.from(logs[i], 'base64');
        
        // Check if this log starts with "RuleCreated" or similar marker
        const logText = logBuffer.toString('utf8', 0, Math.min(20, logBuffer.length));
        if (logText.includes('Rule') || logText.includes('Created')) {
          continue; // Skip text logs
        }
        
        // Try to decode as uint64 (8 bytes)
        if (logBuffer.length === 8) {
          const ruleId = BigInt('0x' + logBuffer.toString('hex'));
          if (ruleId > 0n) {
            console.log(`Found rule ID in log ${i}:`, ruleId);
            return ruleId;
          }
        }
        
        // Try last 8 bytes if log is longer
        if (logBuffer.length > 8) {
          const last8Bytes = logBuffer.slice(-8);
          const ruleId = BigInt('0x' + last8Bytes.toString('hex'));
          if (ruleId > 0n && ruleId < BigInt(Number.MAX_SAFE_INTEGER)) {
            console.log(`Found rule ID in last 8 bytes of log ${i}:`, ruleId);
            return ruleId;
          }
        }
      } catch (e) {
        console.warn(`Failed to parse log ${i}:`, e);
        continue;
      }
    }
    
    throw new Error('Rule ID not found in transaction logs');
  }

  private extractReturnValue(confirmedTxn: any): number {
    const logs = confirmedTxn['logs'] || [];
    
    if (logs.length > 0) {
      const returnLog = Buffer.from(logs[logs.length - 1], 'base64');
      return Number(BigInt('0x' + returnLog.toString('hex')));
    }
    
    return 0;
  }
}

export function createAutoPilotClient(algodClient: algosdk.Algodv2): AutoPilotRuleClient {
  return new AutoPilotRuleClient(algodClient);
}
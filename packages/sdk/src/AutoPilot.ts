/**
 * AutoPilot - Automated trading rules engine
 */

import axios from 'axios'
import type {
  Network,
  RuleConfig,
  Rule,
  TxResult,
  SDKConfig,
  RuleStatus,
} from './types'

export class AutoPilot {
  private network: Network
  private apiBaseUrl: string
  private contractId?: string

  constructor(config: Network | SDKConfig, contractId?: string) {
    if (typeof config === 'string') {
      this.network = config
      this.apiBaseUrl = config === 'mainnet'
        ? 'https://10xswap.com/api'
        : 'http://localhost:3000/api'
    } else {
      this.network = config.network
      this.apiBaseUrl = config.apiBaseUrl || (config.network === 'mainnet'
        ? 'https://10xswap.com/api'
        : 'http://localhost:3000/api')
    }
    this.contractId = contractId
  }

  /**
   * Create a new automated trading rule
   */
  async createRule(config: RuleConfig, ownerAddress: string): Promise<Rule> {
    try {
      const payload = {
        ownerAddress,
        type: config.strategy.toLowerCase(),
        targets: config.targets || [],
        triggerType: config.trigger.type,
        dropPercent: config.trigger.value,
        trendWindow: config.trigger.window,
        trendThreshold: config.trigger.threshold,
        momentumLookback: config.trigger.lookback,
        momentumThreshold: config.trigger.threshold,
        maxSpendUSD: config.maxSpendUSD,
        maxSlippage: config.maxSlippage,
        cooldownMinutes: config.cooldownMinutes,
        rotateTopN: config.rotateTopN,
        status: 'active',
        network: this.network
      }

      const response = await axios.post(`${this.apiBaseUrl}/rules`, payload)

      if (response.data.ok && response.data.rule) {
        return response.data.rule
      } else {
        throw new Error(response.data.error || 'Failed to create rule')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to create rule')
    }
  }

  /**
   * Get all rules for a user
   */
  async getRules(ownerAddress: string): Promise<Rule[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/rules`, {
        params: {
          owner: ownerAddress,
          network: this.network
        }
      })

      if (response.data.ok && response.data.rules) {
        return response.data.rules
      } else {
        throw new Error(response.data.error || 'Failed to fetch rules')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch rules')
    }
  }

  /**
   * Get a specific rule by ID
   */
  async getRule(ruleId: string, ownerAddress: string): Promise<Rule> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/rules/${ruleId}`, {
        params: {
          owner: ownerAddress,
          network: this.network
        }
      })

      if (response.data.ok && response.data.rule) {
        return response.data.rule
      } else {
        throw new Error(response.data.error || 'Failed to fetch rule')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch rule')
    }
  }

  /**
   * Update rule status (pause/resume/cancel)
   */
  async updateRuleStatus(
    ruleId: string,
    status: RuleStatus,
    ownerAddress: string
  ): Promise<void> {
    try {
      const response = await axios.patch(`${this.apiBaseUrl}/rules`, {
        id: ruleId,
        owner: ownerAddress,
        status,
        network: this.network
      })

      if (!response.data.ok) {
        throw new Error(response.data.error || 'Failed to update rule status')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to update rule status')
    }
  }

  /**
   * Update rule parameters
   */
  async updateRuleParameters(
    ruleId: string,
    ownerAddress: string,
    updates: Partial<{
      maxSpendUSD: number
      maxSlippage: number
      cooldownMinutes: number
      targets: string[]
    }>
  ): Promise<void> {
    try {
      const response = await axios.patch(`${this.apiBaseUrl}/rules`, {
        id: ruleId,
        owner: ownerAddress,
        ...updates,
        network: this.network
      })

      if (!response.data.ok) {
        throw new Error(response.data.error || 'Failed to update rule parameters')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to update rule parameters')
    }
  }

  /**
   * Manually execute a rule
   */
  async executeRule(ruleId: string, ownerAddress: string): Promise<TxResult> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/rules/execute`, {
        id: ruleId,
        owner: ownerAddress,
        network: this.network
      })

      if (response.data.ok && response.data.txId) {
        return {
          txId: response.data.txId,
          confirmedRound: response.data.confirmedRound
        }
      } else {
        throw new Error(response.data.error || 'Failed to execute rule')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to execute rule')
    }
  }

  /**
   * Delete a rule
   */
  async deleteRule(ruleId: string, ownerAddress: string): Promise<void> {
    try {
      const response = await axios.delete(`${this.apiBaseUrl}/rules`, {
        params: {
          id: ruleId,
          owner: ownerAddress,
          network: this.network
        }
      })

      if (!response.data.ok) {
        throw new Error(response.data.error || 'Failed to delete rule')
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to delete rule')
    }
  }

  /**
   * Get rule execution statistics
   */
  async getRuleStats(ruleId: string, ownerAddress: string): Promise<{
    totalExecutions: number
    totalSpent: number
    lastExecuted?: number
    averageReturn?: number
  }> {
    try {
      const rule = await this.getRule(ruleId, ownerAddress)
      return {
        totalExecutions: rule.totalExecutions,
        totalSpent: rule.totalSpent,
        lastExecuted: rule.lastExecuted
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch rule stats')
    }
  }

  private handleError(error: any, message: string): Error {
    if (error.response) {
      return new Error(`${message}: ${error.response.data?.error || error.message}`)
    }
    return new Error(`${message}: ${error.message}`)
  }
}

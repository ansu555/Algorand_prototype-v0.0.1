"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  MoreVertical, 
  Pause, 
  Play, 
  Trash2, 
  RefreshCw, 
  AlertCircle,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Clock,
  Zap,
} from "lucide-react"
import { useWalletConnection, useWalletActions } from "@/components/providers/txnlab-wallet-provider"
import { AutoPilotRuleClient } from "@/lib/contracts/autopilot-client"
import { getAlgodClient } from "@/lib/algorand"
import { formatRuleStatus, microalgosToAlgo, bpsToPercent } from "@/lib/contracts/autopilot-helpers"
import { 
  RULE_TYPE_DCA, 
  RULE_TYPE_REBALANCE, 
  RULE_TYPE_ROTATE,
  TRIGGER_PRICE_DROP,
  TRIGGER_TREND,
  TRIGGER_MOMENTUM,
  STATUS_ACTIVE,
  STATUS_PAUSED,
  STATUS_CANCELLED,
  type RuleData,
  type RuleStatus,
} from "@/lib/contracts/autopilot-types"
import { toast } from "sonner"
import { useTradeableAssets } from "@/hooks/use-tradeable-assets"

interface RuleWithId extends RuleData {
  ruleId: bigint
}

export function AutoPilotRulesList() {
  const { isConnected, activeAccount } = useWalletConnection()
  const { walletSigner } = useWalletActions()
  const [rules, setRules] = useState<RuleWithId[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<bigint | null>(null)
  const [ruleToExecute, setRuleToExecute] = useState<RuleWithId | null>(null)
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false)
  const [executeAmount, setExecuteAmount] = useState<string>("")
  const [selectedAssetOut, setSelectedAssetOut] = useState<string>("")
  const [isExecuting, setIsExecuting] = useState(false)

  // Initialize autopilot client
  const autopilotClient = useMemo(() => {
    try {
      const algodClient = getAlgodClient()
      return new AutoPilotRuleClient(algodClient)
    } catch (error) {
      console.error('Failed to initialize autopilot client:', error)
      return null
    }
  }, [])

  const { assets: tradeableAssets } = useTradeableAssets()

  // Fetch user's rules
  const fetchRules = async () => {
    if (!activeAccount || !autopilotClient) return

    setIsLoading(true)
    setError(null)

    try {
      const userRules = await autopilotClient.listUserRules(activeAccount.address)
      
      // Decode each rule
      const decodedRules: RuleWithId[] = []
      for (const { ruleId, data } of userRules) {
        try {
          const ruleData = await autopilotClient.getRule(ruleId, activeAccount.address)
          decodedRules.push({ ...ruleData, ruleId })
        } catch (error) {
          console.error(`Failed to decode rule ${ruleId}:`, error)
        }
      }

      setRules(decodedRules)
    } catch (error: any) {
      console.error('Failed to fetch rules:', error)
      setError(error.message || 'Failed to fetch rules')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch rules on mount and when account changes
  useEffect(() => {
    if (isConnected && activeAccount) {
      fetchRules()
    } else {
      setRules([])
    }
  }, [isConnected, activeAccount])

  // Handle rule status update
  const handleStatusUpdate = async (ruleId: bigint, newStatus: RuleStatus) => {
    if (!walletSigner || !autopilotClient) return

    setActionInProgress(ruleId)
    const statusName = formatRuleStatus(newStatus)

    try {
      toast.loading(`Updating rule status to ${statusName}...`, { id: 'update-status' })

      const txId = await autopilotClient.updateRuleStatus(walletSigner, ruleId, newStatus)

      toast.success(`Rule ${statusName.toLowerCase()} successfully!`, {
        id: 'update-status',
        description: `Transaction: ${txId}`
      })

      // Refresh rules
      await fetchRules()
    } catch (error: any) {
      console.error('Failed to update rule status:', error)
      toast.error(error.message || 'Failed to update rule status', { id: 'update-status' })
    } finally {
      setActionInProgress(null)
    }
  }

  // Handle rule deletion
  const handleDelete = async (ruleId: bigint) => {
    if (!walletSigner || !autopilotClient) return

    if (!confirm('Are you sure you want to delete this rule? This action cannot be undone.')) {
      return
    }

    setActionInProgress(ruleId)

    try {
      toast.loading('Deleting rule...', { id: 'delete-rule' })

      const txId = await autopilotClient.deleteRule(walletSigner, ruleId)

      toast.success('Rule deleted successfully!', {
        id: 'delete-rule',
        description: `Transaction: ${txId}. MBR refunded.`
      })

      // Refresh rules
      await fetchRules()
    } catch (error: any) {
      console.error('Failed to delete rule:', error)
      toast.error(error.message || 'Failed to delete rule', { id: 'delete-rule' })
    } finally {
      setActionInProgress(null)
    }
  }

  // Helper functions for display
  const getRuleTypeLabel = (ruleType: number) => {
    switch (ruleType) {
      case RULE_TYPE_DCA: return 'DCA'
      case RULE_TYPE_REBALANCE: return 'Rebalance'
      case RULE_TYPE_ROTATE: return 'Rotate Top N'
      default: return 'Unknown'
    }
  }

  const getTriggerTypeLabel = (triggerType: number) => {
    switch (triggerType) {
      case TRIGGER_PRICE_DROP: return 'Price Drop'
      case TRIGGER_TREND: return 'Trend'
      case TRIGGER_MOMENTUM: return 'Momentum'
      default: return 'Unknown'
    }
  }

  const getStatusBadgeVariant = (status: number) => {
    switch (status) {
      case STATUS_ACTIVE: return 'default'
      case STATUS_PAUSED: return 'secondary'
      case STATUS_CANCELLED: return 'destructive'
      default: return 'outline'
    }
  }

  const formatTimestamp = (timestamp: bigint) => {
    if (timestamp === BigInt(0)) return 'Never'
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  const formatAssetLabel = (assetId: bigint) => {
    if (assetId === BigInt(0)) {
      return 'ALGO (0)'
    }
    const asset = tradeableAssets.find((item) => item.id === Number(assetId))
    if (asset) {
      const unit = asset.unitName || `#${asset.id}`
      return `${asset.name} (${unit})`
    }
    return `ASA ${assetId.toString()}`
  }

  const openExecuteDialog = (rule: RuleWithId) => {
    setRuleToExecute(rule)
    const defaultAmount = microalgosToAlgo(Number(rule.max_spend_microalgos))
    setExecuteAmount(defaultAmount)
    const firstTarget = rule.target_assets[0]
    setSelectedAssetOut(firstTarget !== undefined ? firstTarget.toString() : "")
    setIsExecuteDialogOpen(true)
  }

  const resetExecuteDialog = () => {
    setRuleToExecute(null)
    setExecuteAmount("")
    setSelectedAssetOut("")
    setIsExecuteDialogOpen(false)
  }

  const handleExecuteConfirm = async () => {
    if (!walletSigner || !autopilotClient || !ruleToExecute) {
      return
    }

    const amountFloat = Number(executeAmount)
    if (!Number.isFinite(amountFloat) || amountFloat <= 0) {
      toast.error('Enter a valid amount to execute')
      return
    }

    const assetOutId = Number(selectedAssetOut)
    if (!Number.isInteger(assetOutId) || assetOutId < 0) {
      toast.error('Select a target asset for this execution')
      return
    }

    const amountInMicroalgos = BigInt(Math.round(amountFloat * 1_000_000))
    if (amountInMicroalgos <= BigInt(0)) {
      toast.error('Amount must be greater than zero')
      return
    }

    setIsExecuting(true)
    setActionInProgress(ruleToExecute.ruleId)
    toast.loading('Executing rule on-chain...', { id: 'execute-rule' })

    try {
      const result = await autopilotClient.executeRule(walletSigner, {
        ruleId: ruleToExecute.ruleId,
        owner: ruleToExecute.owner,
        assetIn: 0, // Spend ALGO by default
        assetOut: assetOutId,
        amountIn: amountInMicroalgos,
        minAmountOut: BigInt(0),
      })

      toast.success(`Rule executed successfully!`, {
        id: 'execute-rule',
        description: `Spent ${microalgosToAlgo(result.amountSpent)} ALGO · Tx: ${result.txId}`,
      })

      resetExecuteDialog()
      await fetchRules()
    } catch (error: any) {
      console.error('Failed to execute rule:', error)
      toast.error(error.message || 'Failed to execute rule', { id: 'execute-rule' })
    } finally {
      setIsExecuting(false)
      setActionInProgress(null)
    }
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AutoPilot Rules</CardTitle>
          <CardDescription>Connect your wallet to view your rules</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your Algorand wallet to view and manage your autopilot rules.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>AutoPilot Rules</CardTitle>
          <CardDescription>
            Manage your automated trading rules on Algorand
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRules}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No autopilot rules found</p>
            <p className="text-sm text-muted-foreground">
              Create your first rule to get started with automated trading
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Max Spend</TableHead>
                  <TableHead className="text-right">Executions</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.ruleId.toString()}>
                    <TableCell className="font-mono text-sm">
                      #{rule.ruleId.toString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getRuleTypeLabel(rule.rule_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          {getTriggerTypeLabel(rule.trigger.trigger_type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {bpsToPercent(rule.trigger.threshold_bps)}%
                          {rule.trigger.window_hours > 0 && ` / ${rule.trigger.window_hours}h`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(rule.status)}>
                        {formatRuleStatus(rule.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">
                          {microalgosToAlgo(Number(rule.max_spend_microalgos))} ALGO
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">
                          {rule.total_executions}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">
                          {microalgosToAlgo(Number(rule.total_spent_microalgos))} ALGO
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionInProgress === rule.ruleId}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rule.status === STATUS_ACTIVE && (
                            <>
                              <DropdownMenuItem
                                onClick={() => openExecuteDialog(rule)}
                              >
                                <Zap className="w-4 h-4 mr-2" />
                                Execute Now
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {rule.status === STATUS_ACTIVE && (
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(rule.ruleId, STATUS_PAUSED)}
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Pause Rule
                            </DropdownMenuItem>
                          )}
                          {rule.status === STATUS_PAUSED && (
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(rule.ruleId, STATUS_ACTIVE)}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Resume Rule
                            </DropdownMenuItem>
                          )}
                          {rule.status !== STATUS_CANCELLED && (
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(rule.ruleId, STATUS_CANCELLED)}
                            >
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Cancel Rule
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <a
                              href={`https://testnet.algoexplorer.io/application/${autopilotClient?.getAppId()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View on Explorer
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(rule.ruleId)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Rule
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {rules.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Total rules: {rules.length}</p>
            <p className="text-xs mt-1">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
      <Dialog
        open={isExecuteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (isExecuting) return
            resetExecuteDialog()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Execute Rule
              {ruleToExecute && (
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  #{ruleToExecute.ruleId.toString()}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Trigger an immediate swap using this rule. Execution spends funds from your connected wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="execute-amount">Amount to Spend (ALGO)</Label>
              <Input
                id="execute-amount"
                type="number"
                min="0"
                step="0.000001"
                value={executeAmount}
                onChange={(event) => setExecuteAmount(event.target.value)}
                disabled={isExecuting}
              />
              {ruleToExecute && (
                <p className="text-xs text-muted-foreground">
                  Rule max spend: {microalgosToAlgo(Number(ruleToExecute.max_spend_microalgos))} ALGO
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Target Asset</Label>
              <Select
                value={selectedAssetOut}
                onValueChange={setSelectedAssetOut}
                disabled={isExecuting || !(ruleToExecute?.target_assets?.length)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {ruleToExecute?.target_assets.map((assetId) => (
                    <SelectItem key={assetId.toString()} value={assetId.toString()}>
                      {formatAssetLabel(assetId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={resetExecuteDialog}
              disabled={isExecuting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExecuteConfirm}
              disabled={isExecuting || !ruleToExecute}
            >
              {isExecuting ? 'Executing…' : 'Execute Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default AutoPilotRulesList

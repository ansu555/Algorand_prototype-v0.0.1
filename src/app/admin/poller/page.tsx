"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function PollerAdminPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const { toast } = useToast()

  const runPollerNow = async () => {
    try {
      setIsRunning(true)
      setLastResult(null)

      toast({
        title: "🚀 Running Poller...",
        description: "Checking all active rules and executing trades",
      })

      const response = await fetch(`/api/poller/run?token=${process.env.NEXT_PUBLIC_CRON_SECRET || 'cron_5d8f1b8b7f2a4c3e9e2d1c0a7b8d6f4a'}`)
      const data = await response.json()

      setLastResult(data)

      if (data.ok) {
        toast({
          title: "✅ Poller Completed Successfully",
          description: `Checked ${data.checked || 0} rules, triggered ${data.triggered?.length || 0} trades`,
        })
      } else {
        toast({
          title: "❌ Poller Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to run poller",
        variant: "destructive",
      })
      setLastResult({ ok: false, error: error.message })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Poller Management</h1>
        <p className="text-muted-foreground">
          Manually trigger the poller to check and execute trading rules
        </p>
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Run the poller on-demand to check all active rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={runPollerNow}
            disabled={isRunning}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isRunning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Running Poller...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Poller Now
              </>
            )}
          </Button>

          <div className="mt-4 text-sm text-muted-foreground space-y-2">
            <p>• Works on both localhost and production</p>
            <p>• Checks all active trading rules</p>
            <p>• Executes trades when conditions match</p>
            <p>• Respects cooldown periods</p>
          </div>
        </CardContent>
      </Card>

      {/* Last Result */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastResult.ok ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Last Execution Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={lastResult.ok ? "default" : "destructive"}>
                {lastResult.ok ? "Success" : "Failed"}
              </Badge>
            </div>

            {/* Stats */}
            {lastResult.ok && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-2xl font-bold">{lastResult.checked || 0}</div>
                  <div className="text-sm text-muted-foreground">Rules Checked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {lastResult.triggered?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Trades Executed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {lastResult.errors?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>
            )}

            {/* Triggered Rules */}
            {lastResult.triggered && lastResult.triggered.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Triggered Rules:</h3>
                <div className="space-y-1">
                  {lastResult.triggered.map((ruleId: string) => (
                    <Badge key={ruleId} variant="outline" className="mr-2">
                      {ruleId}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {lastResult.errors && lastResult.errors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Errors:
                </h3>
                <div className="space-y-2">
                  {lastResult.errors.map((err: any, i: number) => (
                    <div key={i} className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm">
                      <div className="font-medium">Rule: {err.ruleId}</div>
                      <div className="text-red-600 dark:text-red-400">{err.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {!lastResult.ok && lastResult.error && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                <p className="text-sm text-red-600 dark:text-red-400">{lastResult.error}</p>
              </div>
            )}

            {/* Raw Response */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                View Raw Response
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-medium mb-1">🔍 Rule Checking</h3>
            <p className="text-muted-foreground">
              The poller fetches all active rules and checks if their conditions are met
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">📊 Price Monitoring</h3>
            <p className="text-muted-foreground">
              Gets latest prices for all target cryptocurrencies and calculates changes
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">⚡ Trade Execution</h3>
            <p className="text-muted-foreground">
              Automatically executes trades when conditions match and cooldown has passed
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">📝 Logging</h3>
            <p className="text-muted-foreground">
              All checks and executions are logged to the database for audit trail
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Automated Schedule Info */}
      <Card className="mt-6 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-600 dark:text-blue-400">
            Automated Schedule
          </CardTitle>
          <CardDescription>
            The poller also runs automatically via GitHub Actions
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• <strong>Frequency:</strong> Daily at midnight UTC (5:30 AM IST)</p>
          <p>• <strong>Platform:</strong> GitHub Actions (free, unlimited)</p>
          <p>• <strong>Monitoring:</strong> Check workflow runs at GitHub Actions tab</p>
          <p>• <strong>Manual Trigger:</strong> Can also trigger from GitHub Actions UI</p>
        </CardContent>
      </Card>
    </div>
  )
}

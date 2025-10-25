"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Loader2, TrendingUp, TrendingDown, Activity, Brain, Target, AlertCircle } from 'lucide-react'
import type { AnalyzeResponse } from '@/app/mcp/client'

interface AssetAnalysisProps {
  coinId: string
  coinName: string
  coinSymbol: string
}

export function AssetAnalysis({ coinId, coinName, coinSymbol }: AssetAnalysisProps) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyzeAsset = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log(`🔍 Analyzing ${coinId}...`)
      
      const response = await fetch('/api/mcp/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coin: coinId,
          horizonDays: 30,
          tasks: ['analysis', 'prediction', 'strategy', 'charts'],
          chartType: 'candlestick'
        })
      })

      console.log(`📥 Response status: ${response.status}`)

      // Get response as text first for better error handling
      const text = await response.text()
      console.log(`📦 Response size: ${text.length} bytes`)
      
      if (!text || text.trim() === '') {
        throw new Error('Empty response from server')
      }

      let data
      try {
        data = JSON.parse(text)
      } catch (parseError: any) {
        console.error('JSON parse error:', parseError)
        console.error('Response preview:', text.substring(0, 500))
        throw new Error(`Failed to parse server response: ${parseError.message}`)
      }
      
      if (!data.ok) {
        const errorMsg = data.error || 'Analysis failed'
        if (data.suggestion) {
          console.log('💡 Suggestion:', data.suggestion)
          setError(`${errorMsg}\n\n${data.suggestion}`)
        } else {
          setError(errorMsg)
        }
        return
      }

      console.log('✅ Analysis complete')
      setAnalysis(data)
    } catch (err: any) {
      console.error('Analysis error:', err)
      setError(err.message || 'Failed to analyze asset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Analysis
          </CardTitle>
          <CardDescription>
            Deep analysis of {coinName} ({coinSymbol.toUpperCase()}) using advanced technical indicators and machine learning
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!analysis && (
            <Button 
              onClick={analyzeAsset} 
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Analyzing...' : `Analyze ${coinSymbol.toUpperCase()}`}
            </Button>
          )}

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900 dark:text-red-200">Analysis Error</p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
              <Button onClick={analyzeAsset} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          )}

          {analysis && (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="predictions">Predictions</TabsTrigger>
                <TabsTrigger value="strategies">Strategies</TabsTrigger>
                <TabsTrigger value="charts">Charts</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                {analysis.summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Market Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                    </CardContent>
                  </Card>
                )}

                {analysis.overallAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Detailed Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.overallAnalysis}</p>
                    </CardContent>
                  </Card>
                )}

                {analysis.methodology && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="methodology">
                      <AccordionTrigger>Methodology & Calculations</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="font-medium">Data Points</p>
                            <p className="text-muted-foreground">{analysis.methodology.dataPoints} price points</p>
                          </div>
                          <div>
                            <p className="font-medium">Timeframe</p>
                            <p className="text-muted-foreground">{analysis.methodology.timeframe}</p>
                          </div>
                          <div>
                            <p className="font-medium">Method</p>
                            <p className="text-muted-foreground">{analysis.methodology.method}</p>
                          </div>
                          <div>
                            <p className="font-medium">Indicators Used</p>
                            <ul className="list-disc list-inside text-muted-foreground">
                              {analysis.methodology.indicators.map((ind, i) => (
                                <li key={i}>{ind}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium">Confidence Assessment</p>
                            <p className="text-muted-foreground">{analysis.methodology.confidence}</p>
                          </div>
                          {analysis.methodology.calculations && (
                            <div>
                              <p className="font-medium mb-2">Detailed Calculations</p>
                              <pre className="p-3 bg-muted rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap">
                                {analysis.methodology.calculations}
                              </pre>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </TabsContent>

              <TabsContent value="insights" className="space-y-3">
                {analysis.insights && analysis.insights.length > 0 ? (
                  analysis.insights.map((insight, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-2">
                          <Activity className="h-4 w-4 mt-1 text-primary" />
                          <p className="text-sm flex-1">{insight}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No insights available</p>
                )}
              </TabsContent>

              <TabsContent value="predictions" className="space-y-3">
                {analysis.predictions && analysis.predictions.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysis.predictions.slice(0, 7).map((pred, i) => {
                        const confidence = pred.probability ? (pred.probability * 100).toFixed(0) : '50'
                        const confColor = Number(confidence) > 70 ? 'text-green-600' : Number(confidence) > 40 ? 'text-yellow-600' : 'text-red-600'
                        
                        return (
                          <Card key={i}>
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">{pred.date}</p>
                                  <p className="text-lg font-bold">${pred.price.toFixed(4)}</p>
                                </div>
                                <div className="text-right">
                                  <Target className={`h-4 w-4 ml-auto mb-1 ${confColor}`} />
                                  <p className={`text-sm font-medium ${confColor}`}>{confidence}%</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                    
                    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="pt-4">
                        <p className="text-xs text-blue-900 dark:text-blue-200">
                          <strong>Note:</strong> Predictions are based on historical data and technical analysis. 
                          Actual prices may vary significantly due to market volatility, news events, and other external factors. 
                          Use for directional bias only, not as precise price targets.
                        </p>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No predictions available</p>
                )}
              </TabsContent>

              <TabsContent value="strategies" className="space-y-3">
                {analysis.strategies && analysis.strategies.length > 0 ? (
                  analysis.strategies.map((strategy, i) => {
                    const riskColor = strategy.risk === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                      : strategy.risk === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    
                    const icon = strategy.name.includes('DCA') ? <TrendingDown className="h-4 w-4" />
                      : strategy.name.includes('REBALANCE') ? <Activity className="h-4 w-4" />
                      : <TrendingUp className="h-4 w-4" />
                    
                    return (
                      <Card key={i}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              {icon}
                              {strategy.name}
                            </CardTitle>
                            <Badge className={riskColor}>
                              {strategy.risk.toUpperCase()} RISK
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{strategy.description}</p>
                        </CardContent>
                      </Card>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No strategies available</p>
                )}
              </TabsContent>

              <TabsContent value="charts" className="space-y-3">
                {analysis.charts && analysis.charts.length > 0 ? (
                  analysis.charts.map((chart, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <CardTitle className="text-sm">{chart.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <img 
                          src={chart.url} 
                          alt={chart.title}
                          className="w-full rounded-lg border"
                        />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No charts available</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <Button onClick={analyzeAsset} variant="outline" className="w-full">
          Refresh Analysis
        </Button>
      )}
    </div>
  )
}

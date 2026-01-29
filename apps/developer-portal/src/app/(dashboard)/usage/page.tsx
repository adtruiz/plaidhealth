'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MetricCard } from '@/components/metric-card'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Activity,
  CheckCircle2,
  Clock,
  Download,
  Key,
  Loader2,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface UsageData {
  summary: {
    totalRequests: number
    activeKeys: number
    totalKeys: number
    period: string
  }
  dailyUsage: Array<{
    date: string
    requests: number
    errors: number
  }>
  byKey: Array<{
    id: string
    name: string
    requestCount: number
    lastUsedAt: string | null
  }>
}

type TimeRange = '7d' | '30d' | '90d'

const statusData = [
  { name: 'Success (2xx)', value: 12180, color: '#10b981' },
  { name: 'Client Error (4xx)', value: 245, color: '#f59e0b' },
  { name: 'Server Error (5xx)', value: 18, color: '#ef4444' },
] as const

const endpointData = [
  { endpoint: '/patients/{id}/records', calls: 4520, avgTime: 145 },
  { endpoint: '/connections/link', calls: 2340, avgTime: 890 },
  { endpoint: '/patients/{id}/medications', calls: 1890, avgTime: 112 },
  { endpoint: '/patients/{id}/labs', calls: 1650, avgTime: 98 },
  { endpoint: '/patients/{id}/conditions', calls: 1240, avgTime: 105 },
  { endpoint: '/webhooks/subscribe', calls: 890, avgTime: 67 },
] as const

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function UsagePage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [usageData, setUsageData] = useState<UsageData | null>(null)

  const loadUsage = useCallback(async () => {
    setIsLoading(true)
    const result = await api.getUsage(timeRange)
    if (result.data) {
      setUsageData(result.data)
    }
    setIsLoading(false)
  }, [timeRange])

  useEffect(() => {
    loadUsage()
  }, [loadUsage])

  const { totalCalls, totalErrors, errorRate, successRate } = useMemo(() => {
    const calls = usageData?.summary.totalRequests || 0
    const errors = usageData?.dailyUsage.reduce((sum, day) => sum + day.errors, 0) || 0
    const rate = calls > 0 ? ((errors / calls) * 100).toFixed(2) : '0.00'
    const success = calls > 0 ? (100 - parseFloat(rate)).toFixed(2) : '100.00'
    return { totalCalls: calls, totalErrors: errors, errorRate: rate, successRate: success }
  }, [usageData])

  const avgResponseTime = 142

  const dailyData = useMemo(() => {
    return usageData?.dailyUsage.map((day) => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calls: day.requests,
      errors: day.errors,
    })) || []
  }, [usageData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Usage Analytics</h1>
          <p className="text-muted-foreground">
            Monitor your API usage, performance, and error rates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  timeRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {TIME_RANGE_LABELS[range]}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total API Calls"
              value={totalCalls.toLocaleString()}
              change="+12.5%"
              changeType="positive"
              icon={Activity}
            />
            <MetricCard
              title="Success Rate"
              value={`${successRate}%`}
              change="+0.3%"
              changeType="positive"
              icon={CheckCircle2}
            />
            <MetricCard
              title="Avg Response Time"
              value={`${avgResponseTime}ms`}
              change="-8ms"
              changeType="positive"
              icon={Clock}
            />
            <MetricCard
              title="Active API Keys"
              value={`${usageData?.summary.activeKeys || 0}`}
              change={`${usageData?.summary.totalKeys || 0} total`}
              changeType="neutral"
              icon={Key}
            />
          </div>

          {/* Charts */}
          <Tabs defaultValue="requests" className="space-y-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="requests">API Requests</TabsTrigger>
              <TabsTrigger value="keys">By API Key</TabsTrigger>
              <TabsTrigger value="endpoints">By Endpoint</TabsTrigger>
              <TabsTrigger value="status">Status Codes</TabsTrigger>
            </TabsList>

            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>API Requests Over Time</CardTitle>
                  <CardDescription>
                    Daily API call volume and success/error distribution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    {dailyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyData}>
                          <defs>
                            <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => value.toLocaleString()}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="calls"
                            name="Requests"
                            stroke="hsl(var(--primary))"
                            fillOpacity={1}
                            fill="url(#colorCalls)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No usage data available for this period
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="keys">
              <Card>
                <CardHeader>
                  <CardTitle>Usage by API Key</CardTitle>
                  <CardDescription>
                    Request distribution across your API keys
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {usageData?.byKey && usageData.byKey.length > 0 ? (
                    <div className="space-y-4">
                      {usageData.byKey.map((keyUsage) => {
                        const maxRequests = Math.max(...usageData.byKey.map((k) => k.requestCount))
                        const percentage = maxRequests > 0 ? (keyUsage.requestCount / maxRequests) * 100 : 0

                        return (
                          <div key={keyUsage.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                  <Key className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{keyUsage.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {keyUsage.lastUsedAt
                                      ? `Last used ${new Date(keyUsage.lastUsedAt).toLocaleDateString()}`
                                      : 'Never used'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{keyUsage.requestCount.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">requests</p>
                              </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No API key usage data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="endpoints">
              <Card>
                <CardHeader>
                  <CardTitle>Usage by Endpoint</CardTitle>
                  <CardDescription>
                    Most frequently called API endpoints with performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...endpointData]} layout="vertical" margin={{ left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal vertical={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => value.toLocaleString()}
                        />
                        <YAxis
                          dataKey="endpoint"
                          type="category"
                          width={180}
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="calls"
                          name="Calls"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Endpoint Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium">Endpoint</th>
                          <th className="text-right py-3 px-4 font-medium">Calls</th>
                          <th className="text-right py-3 px-4 font-medium">Avg Time</th>
                          <th className="text-right py-3 px-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpointData.map((endpoint, index) => (
                          <tr key={endpoint.endpoint} className={cn('border-t', index % 2 === 0 && 'bg-muted/20')}>
                            <td className="py-3 px-4 font-mono text-xs">
                              {endpoint.endpoint}
                            </td>
                            <td className="text-right py-3 px-4 font-medium">
                              {endpoint.calls.toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className={cn(
                                endpoint.avgTime < 150 ? 'text-emerald-600 dark:text-emerald-400' :
                                endpoint.avgTime < 300 ? 'text-amber-600 dark:text-amber-400' :
                                'text-red-600 dark:text-red-400'
                              )}>
                                {endpoint.avgTime}ms
                              </span>
                            </td>
                            <td className="text-right py-3 px-4">
                              <Badge
                                variant={endpoint.avgTime < 150 ? 'success' : endpoint.avgTime < 300 ? 'warning' : 'destructive'}
                                className="text-xs"
                              >
                                {endpoint.avgTime < 150 ? 'Fast' : endpoint.avgTime < 300 ? 'Normal' : 'Slow'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Response Status Distribution</CardTitle>
                    <CardDescription>
                      Breakdown of API response status codes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[...statusData]}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Status Code Breakdown</CardTitle>
                    <CardDescription>
                      Detailed view of response codes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {statusData.map((status) => {
                        const total = statusData.reduce((a, b) => a + b.value, 0)
                        const percentage = ((status.value / total) * 100).toFixed(1)

                        return (
                          <div key={status.name} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: status.color }}
                                />
                                <span className="font-medium">{status.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold">{status.value.toLocaleString()}</span>
                                <span className="text-muted-foreground ml-2">({percentage}%)</span>
                              </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: status.color,
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Performance Summary */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Performance Summary
              </CardTitle>
              <CardDescription>
                Your API is performing well across all metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <div>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{successRate}%</p>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10">
                  <Clock className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-semibold text-blue-600 dark:text-blue-400">{avgResponseTime}ms</p>
                    <p className="text-sm text-muted-foreground">Avg Response</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/10">
                  <TrendingUp className="h-8 w-8 text-violet-500" />
                  <div>
                    <p className="font-semibold text-violet-600 dark:text-violet-400">99.9%</p>
                    <p className="text-sm text-muted-foreground">Uptime</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

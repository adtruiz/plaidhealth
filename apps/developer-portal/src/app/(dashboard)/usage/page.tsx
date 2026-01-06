'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  XCircle,
} from 'lucide-react'
import { api } from '@/lib/api'

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

const statusData = [
  { name: '2xx Success', value: 12180, color: '#22c55e' },
  { name: '4xx Client Error', value: 245, color: '#f59e0b' },
  { name: '5xx Server Error', value: 18, color: '#ef4444' },
]

const endpointData = [
  { endpoint: '/patients/{id}/records', calls: 4520, avgTime: 145 },
  { endpoint: '/connections/link', calls: 2340, avgTime: 890 },
  { endpoint: '/patients/{id}/medications', calls: 1890, avgTime: 112 },
  { endpoint: '/patients/{id}/labs', calls: 1650, avgTime: 98 },
  { endpoint: '/patients/{id}/conditions', calls: 1240, avgTime: 105 },
  { endpoint: '/webhooks/subscribe', calls: 890, avgTime: 67 },
]

export default function UsagePage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [usageData, setUsageData] = useState<UsageData | null>(null)

  useEffect(() => {
    loadUsage()
  }, [timeRange])

  const loadUsage = async () => {
    setIsLoading(true)
    const result = await api.getUsage(timeRange)
    if (result.data) {
      setUsageData(result.data)
    }
    setIsLoading(false)
  }

  const totalCalls = usageData?.summary.totalRequests || 0
  const totalErrors = usageData?.dailyUsage.reduce((sum, day) => sum + day.errors, 0) || 0
  const errorRate = totalCalls > 0 ? ((totalErrors / totalCalls) * 100).toFixed(2) : '0.00'
  const avgResponseTime = 142

  const dailyData = usageData?.dailyUsage.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    calls: day.requests,
    errors: day.errors,
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usage Analytics</h1>
          <p className="text-muted-foreground">
            Monitor your API usage, performance, and errors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCalls.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+12.5%</span> from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(100 - parseFloat(errorRate)).toFixed(2)}%</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+0.3%</span> from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgResponseTime}ms</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDown className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">-8ms</span> from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageData?.summary.activeKeys || 0} / {usageData?.summary.totalKeys || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {usageData?.summary.activeKeys || 0} active keys
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="requests" className="space-y-4">
            <TabsList>
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
                    Daily API call volume and error counts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    {dailyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyData}>
                          <defs>
                            <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="calls"
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
                    Request counts per API key
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {usageData?.byKey && usageData.byKey.length > 0 ? (
                      usageData.byKey.map((keyUsage) => (
                        <div key={keyUsage.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <div className="font-medium">{keyUsage.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {keyUsage.lastUsedAt
                                ? `Last used ${new Date(keyUsage.lastUsedAt).toLocaleDateString()}`
                                : 'Never used'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{keyUsage.requestCount.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">requests</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No API key usage data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="endpoints">
              <Card>
                <CardHeader>
                  <CardTitle>Usage by Endpoint</CardTitle>
                  <CardDescription>
                    Most frequently called API endpoints
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={endpointData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis
                          dataKey="endpoint"
                          type="category"
                          width={200}
                          className="text-xs"
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status">
              <div className="grid gap-4 lg:grid-cols-2">
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
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Status Code Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {statusData.map((status) => (
                        <div key={status.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
                            <span className="font-medium">{status.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{status.value.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {((status.value / (statusData.reduce((a, b) => a + b.value, 0))) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Top Endpoints Table */}
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Performance</CardTitle>
              <CardDescription>
                Response times and call volumes by endpoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Endpoint</th>
                      <th className="text-right py-3 px-4 font-medium">Calls</th>
                      <th className="text-right py-3 px-4 font-medium">Avg Time</th>
                      <th className="text-right py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpointData.map((endpoint) => (
                      <tr key={endpoint.endpoint} className="border-b last:border-0">
                        <td className="py-3 px-4 font-mono text-xs">
                          {endpoint.endpoint}
                        </td>
                        <td className="text-right py-3 px-4">
                          {endpoint.calls.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4">
                          {endpoint.avgTime}ms
                        </td>
                        <td className="text-right py-3 px-4">
                          <Badge
                            variant={endpoint.avgTime < 150 ? 'success' : endpoint.avgTime < 300 ? 'warning' : 'destructive'}
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
        </>
      )}
    </div>
  )
}

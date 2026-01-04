'use client'

import { useState } from 'react'
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
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  TrendingUp,
  XCircle,
} from 'lucide-react'

const dailyData = [
  { date: 'Dec 25', calls: 1200, errors: 12 },
  { date: 'Dec 26', calls: 1850, errors: 8 },
  { date: 'Dec 27', calls: 2100, errors: 15 },
  { date: 'Dec 28', calls: 1950, errors: 10 },
  { date: 'Dec 29', calls: 2300, errors: 18 },
  { date: 'Dec 30', calls: 2450, errors: 14 },
  { date: 'Dec 31', calls: 1800, errors: 9 },
  { date: 'Jan 1', calls: 1100, errors: 5 },
  { date: 'Jan 2', calls: 2200, errors: 11 },
  { date: 'Jan 3', calls: 2650, errors: 16 },
  { date: 'Jan 4', calls: 2800, errors: 12 },
]

const endpointData = [
  { endpoint: '/patients/{id}/records', calls: 4520, avgTime: 145 },
  { endpoint: '/connections/link', calls: 2340, avgTime: 890 },
  { endpoint: '/patients/{id}/medications', calls: 1890, avgTime: 112 },
  { endpoint: '/patients/{id}/labs', calls: 1650, avgTime: 98 },
  { endpoint: '/patients/{id}/conditions', calls: 1240, avgTime: 105 },
  { endpoint: '/webhooks/subscribe', calls: 890, avgTime: 67 },
]

const statusData = [
  { name: '2xx Success', value: 12180, color: '#22c55e' },
  { name: '4xx Client Error', value: 245, color: '#f59e0b' },
  { name: '5xx Server Error', value: 18, color: '#ef4444' },
]

const hourlyData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, '0')}:00`,
  calls: Math.floor(Math.random() * 200) + 50,
}))

export default function UsagePage() {
  const [timeRange, setTimeRange] = useState('7d')

  const totalCalls = dailyData.reduce((sum, day) => sum + day.calls, 0)
  const totalErrors = dailyData.reduce((sum, day) => sum + day.errors, 0)
  const errorRate = ((totalErrors / totalCalls) * 100).toFixed(2)
  const avgResponseTime = 142

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
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            {timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

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
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorRate}%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowDown className="h-3 w-3 text-green-500" />
              <span className="text-green-500">-0.1%</span> from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">API Requests</TabsTrigger>
          <TabsTrigger value="endpoints">By Endpoint</TabsTrigger>
          <TabsTrigger value="status">Status Codes</TabsTrigger>
          <TabsTrigger value="hourly">Hourly Distribution</TabsTrigger>
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

        <TabsContent value="hourly">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Request Distribution</CardTitle>
              <CardDescription>
                API calls by hour (UTC) - Today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" className="text-xs" interval={2} />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
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
    </div>
  )
}

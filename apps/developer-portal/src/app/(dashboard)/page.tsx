'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MetricCard } from '@/components/metric-card'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Book,
  CheckCircle2,
  Clock,
  Key,
  Zap,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface RecentActivity {
  type: string
  endpoint: string
  status: 'success' | 'error' | 'info'
  time: string
  statusCode?: number
}

const quickLinks = [
  {
    name: 'Create API Key',
    description: 'Generate credentials for your application',
    href: '/api-keys',
    icon: Key,
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    name: 'View Documentation',
    description: 'Explore the full API reference',
    href: '/docs',
    icon: Book,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    name: 'Quickstart Guide',
    description: 'Get integrated in under 5 minutes',
    href: '/quickstart',
    icon: Zap,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    name: 'Usage Analytics',
    description: 'Monitor your API usage patterns',
    href: '/usage',
    icon: BarChart3,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
] as const

const mockRecentActivity: RecentActivity[] = [
  { type: 'api_call', endpoint: 'GET /patients/{id}/records', status: 'success', time: '2 min ago', statusCode: 200 },
  { type: 'api_call', endpoint: 'POST /connections/link', status: 'success', time: '5 min ago', statusCode: 201 },
  { type: 'key_created', endpoint: 'API Key created: prod_key_***', status: 'info', time: '1 hour ago' },
  { type: 'api_call', endpoint: 'GET /patients/{id}/medications', status: 'success', time: '2 hours ago', statusCode: 200 },
  { type: 'api_call', endpoint: 'GET /patients/{id}/labs', status: 'error', time: '3 hours ago', statusCode: 500 },
]

interface APIEndpointStatus {
  name: string
  path: string
  status: 'operational' | 'degraded' | 'down'
  latency: number
  uptime: string
}

interface RecentError {
  id: string
  endpoint: string
  statusCode: number
  message: string
  time: string
  requestId: string
}

const mockAPIStatus: APIEndpointStatus[] = [
  { name: 'Patient Records', path: '/v1/patients/{id}/records', status: 'operational', latency: 145, uptime: '99.99%' },
  { name: 'Medications', path: '/v1/patients/{id}/medications', status: 'operational', latency: 132, uptime: '99.98%' },
  { name: 'Lab Results', path: '/v1/patients/{id}/labs', status: 'operational', latency: 156, uptime: '99.97%' },
  { name: 'Conditions', path: '/v1/patients/{id}/conditions', status: 'operational', latency: 128, uptime: '99.99%' },
  { name: 'Connections', path: '/v1/connections', status: 'operational', latency: 89, uptime: '100%' },
]

const mockRecentErrors: RecentError[] = [
  { id: 'err_001', endpoint: 'GET /v1/patients/pt_xyz/labs', statusCode: 500, message: 'Internal server error: Provider timeout', time: '3 hours ago', requestId: 'req_abc123' },
  { id: 'err_002', endpoint: 'GET /v1/patients/pt_abc/records', statusCode: 429, message: 'Rate limit exceeded', time: '5 hours ago', requestId: 'req_def456' },
  { id: 'err_003', endpoint: 'POST /v1/connections/link', statusCode: 400, message: 'Invalid provider_id', time: '8 hours ago', requestId: 'req_ghi789' },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    apiCalls: '0',
    apiCallsChange: '+0%',
    activeConnections: '0',
    connectionsChange: '+0%',
    successRate: '0%',
    successRateChange: '+0%',
    avgResponseTime: '0ms',
    responseTimeChange: '0ms',
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyRequestId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const usageResult = await api.getUsage('30d')
      if (usageResult.data) {
        const totalRequests = usageResult.data.summary.totalRequests
        const totalErrors = usageResult.data.dailyUsage.reduce((sum, day) => sum + day.errors, 0)
        const successRate = totalRequests > 0
          ? ((totalRequests - totalErrors) / totalRequests * 100).toFixed(1)
          : '100'

        setStats({
          apiCalls: totalRequests.toLocaleString(),
          apiCallsChange: '+12.3%',
          activeConnections: usageResult.data.summary.activeKeys.toString(),
          connectionsChange: '+5.2%',
          successRate: `${successRate}%`,
          successRateChange: '+0.1%',
          avgResponseTime: '142ms',
          responseTimeChange: '-8ms',
        })
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }

    setRecentActivity(mockRecentActivity)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {getGreeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your API integration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/docs">
              <Book className="mr-2 h-4 w-4" />
              View Docs
            </Link>
          </Button>
          <Button asChild>
            <Link href="/api-keys">
              <Key className="mr-2 h-4 w-4" />
              Create API Key
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="API Calls (30d)"
          value={stats.apiCalls}
          change={stats.apiCallsChange}
          changeType="positive"
          icon={Activity}
          loading={isLoading}
        />
        <MetricCard
          title="Active API Keys"
          value={stats.activeConnections}
          change={stats.connectionsChange}
          changeType="positive"
          icon={Key}
          loading={isLoading}
        />
        <MetricCard
          title="Success Rate"
          value={stats.successRate}
          change={stats.successRateChange}
          changeType="positive"
          icon={CheckCircle2}
          loading={isLoading}
        />
        <MetricCard
          title="Avg Response Time"
          value={stats.avgResponseTime}
          change={stats.responseTimeChange}
          changeType="positive"
          icon={Clock}
          loading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Quick Actions - 3 columns */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to help you get the most out of PlaidHealth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="group flex items-center gap-4 rounded-xl border p-4 transition-all hover:border-primary/50 hover:bg-muted/50"
                >
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg', link.color)}>
                    <link.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-medium group-hover:text-primary transition-colors">
                      {link.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {link.description}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity - 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>
                Latest API calls and events
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={`${activity.endpoint}-${index}`}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className={cn(
                    'flex h-8 w-14 items-center justify-center rounded-md text-xs font-medium',
                    activity.status === 'success' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    activity.status === 'error' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                    activity.status === 'info' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  )}>
                    {activity.statusCode || (activity.status === 'info' ? 'INFO' : '')}
                  </div>
                  <span className="flex-1 font-mono text-xs truncate text-muted-foreground">
                    {activity.endpoint}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/usage">
                <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                  View all activity
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Banner */}
      <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-medium">All Systems Operational</h3>
              <p className="text-sm text-muted-foreground">
                PlaidHealth API is running smoothly
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://status.plaidhealth.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Status Page
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* API Endpoint Status & Recent Errors */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* API Endpoint Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              API Endpoint Status
            </CardTitle>
            <CardDescription>Real-time status of API endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockAPIStatus.map((endpoint) => (
                <div key={endpoint.path} className="flex items-center gap-3 text-sm">
                  <div className={cn(
                    'h-2 w-2 rounded-full',
                    endpoint.status === 'operational' && 'bg-emerald-500',
                    endpoint.status === 'degraded' && 'bg-amber-500',
                    endpoint.status === 'down' && 'bg-red-500'
                  )} />
                  <span className="flex-1 font-medium">{endpoint.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{endpoint.latency}ms</span>
                  <span className="text-xs text-muted-foreground">{endpoint.uptime}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Recent Errors
            </CardTitle>
            <CardDescription>Last 24 hours of API errors</CardDescription>
          </CardHeader>
          <CardContent>
            {mockRecentErrors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">No errors in the last 24 hours</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mockRecentErrors.map((error) => (
                  <div key={error.id} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-10 items-center justify-center rounded bg-red-500/20 text-xs font-medium text-red-600 dark:text-red-400">
                          {error.statusCode}
                        </span>
                        <span className="text-xs text-muted-foreground">{error.time}</span>
                      </div>
                      <button
                        onClick={() => copyRequestId(error.requestId)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy request ID"
                      >
                        {copiedId === error.requestId ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {error.requestId}
                      </button>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground truncate">{error.endpoint}</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Section for new users */}
      {stats.apiCalls === '0' && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Get Started with PlaidHealth
            </CardTitle>
            <CardDescription>
              Follow these steps to start integrating healthcare data into your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Create API Key</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate credentials to authenticate your requests
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Install the SDK</h4>
                  <p className="text-sm text-muted-foreground">
                    Add PlaidHealth to your project with npm or pip
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Make your first call</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect providers and fetch patient data
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button asChild>
                <Link href="/quickstart">
                  Start Quickstart Guide
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/docs">Read Documentation</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

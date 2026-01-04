'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Book,
  CheckCircle2,
  Code2,
  Key,
  Users,
  Zap,
} from 'lucide-react'

const stats = [
  {
    name: 'API Calls (30d)',
    value: '12,543',
    change: '+12.3%',
    changeType: 'positive' as const,
    icon: Activity,
  },
  {
    name: 'Active Connections',
    value: '847',
    change: '+5.2%',
    changeType: 'positive' as const,
    icon: Users,
  },
  {
    name: 'Success Rate',
    value: '99.8%',
    change: '+0.1%',
    changeType: 'positive' as const,
    icon: CheckCircle2,
  },
  {
    name: 'Avg Response Time',
    value: '142ms',
    change: '-8ms',
    changeType: 'positive' as const,
    icon: Zap,
  },
]

const quickLinks = [
  {
    name: 'Create API Key',
    description: 'Generate a new API key for your application',
    href: '/api-keys',
    icon: Key,
  },
  {
    name: 'View Documentation',
    description: 'Explore the full API reference',
    href: '/docs',
    icon: Book,
  },
  {
    name: 'Quickstart Guide',
    description: 'Get started in under 5 minutes',
    href: '/quickstart',
    icon: Code2,
  },
  {
    name: 'Usage Analytics',
    description: 'Monitor your API usage and trends',
    href: '/usage',
    icon: BarChart3,
  },
]

const recentActivity = [
  {
    type: 'api_call',
    endpoint: 'GET /patients/{id}/records',
    status: 'success',
    time: '2 min ago',
  },
  {
    type: 'api_call',
    endpoint: 'POST /connections/link',
    status: 'success',
    time: '5 min ago',
  },
  {
    type: 'key_created',
    endpoint: 'API Key created: prod_key_***',
    status: 'info',
    time: '1 hour ago',
  },
  {
    type: 'api_call',
    endpoint: 'GET /patients/{id}/medications',
    status: 'success',
    time: '2 hours ago',
  },
  {
    type: 'api_call',
    endpoint: 'GET /patients/{id}/labs',
    status: 'error',
    time: '3 hours ago',
  },
]

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground">
          Here is what is happening with your API integration.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span
                  className={
                    stat.changeType === 'positive'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }
                >
                  {stat.change}
                </span>{' '}
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with common tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <link.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{link.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {link.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest API calls and events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 text-sm"
                >
                  <Badge
                    variant={
                      activity.status === 'success'
                        ? 'success'
                        : activity.status === 'error'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="w-16 justify-center"
                  >
                    {activity.status === 'success'
                      ? '200'
                      : activity.status === 'error'
                      ? '500'
                      : 'info'}
                  </Badge>
                  <span className="flex-1 font-mono text-xs truncate">
                    {activity.endpoint}
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/usage">
                <Button variant="ghost" className="w-full">
                  View all activity
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Status Banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
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
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Webhook,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ExternalLink,
  Copy,
  MoreHorizontal,
  Trash2,
  Pencil,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  status: 'active' | 'failing' | 'disabled'
  createdAt: string
  lastDelivery?: {
    status: 'success' | 'failed'
    timestamp: string
    responseTime: number
  }
}

interface WebhookDelivery {
  id: string
  event: string
  status: 'success' | 'failed' | 'pending'
  timestamp: string
  responseCode?: number
  responseTime?: number
}

const mockEndpoints: WebhookEndpoint[] = [
  {
    id: 'wh_001',
    url: 'https://api.yourapp.com/webhooks/plaidhealth',
    events: ['patient.connected', 'patient.disconnected', 'data.updated'],
    status: 'active',
    createdAt: '2024-01-10',
    lastDelivery: { status: 'success', timestamp: '2 min ago', responseTime: 142 },
  },
  {
    id: 'wh_002',
    url: 'https://staging.yourapp.com/webhooks',
    events: ['data.updated'],
    status: 'failing',
    createdAt: '2024-01-05',
    lastDelivery: { status: 'failed', timestamp: '5 min ago', responseTime: 3000 },
  },
]

const mockDeliveries: WebhookDelivery[] = [
  { id: 'del_001', event: 'patient.connected', status: 'success', timestamp: '2 min ago', responseCode: 200, responseTime: 142 },
  { id: 'del_002', event: 'data.updated', status: 'success', timestamp: '5 min ago', responseCode: 200, responseTime: 98 },
  { id: 'del_003', event: 'data.updated', status: 'failed', timestamp: '8 min ago', responseCode: 500, responseTime: 3000 },
  { id: 'del_004', event: 'patient.disconnected', status: 'success', timestamp: '15 min ago', responseCode: 200, responseTime: 156 },
  { id: 'del_005', event: 'data.updated', status: 'success', timestamp: '1 hour ago', responseCode: 200, responseTime: 112 },
]

const availableEvents = [
  { id: 'patient.connected', name: 'Patient Connected', description: 'When a patient authorizes data access' },
  { id: 'patient.disconnected', name: 'Patient Disconnected', description: 'When a patient revokes access' },
  { id: 'data.updated', name: 'Data Updated', description: 'When patient health data changes' },
  { id: 'connection.error', name: 'Connection Error', description: 'When a provider connection fails' },
]

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState(mockEndpoints)
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCreateWebhook = () => {
    if (!newUrl || selectedEvents.length === 0) return
    const newEndpoint: WebhookEndpoint = {
      id: `wh_${Date.now()}`,
      url: newUrl,
      events: selectedEvents,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    }
    setEndpoints([...endpoints, newEndpoint])
    setNewUrl('')
    setSelectedEvents([])
    setDialogOpen(false)
  }

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Webhooks</h1>
          <p className="text-muted-foreground">
            Receive real-time notifications when events occur
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Endpoint
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Webhook Endpoint</DialogTitle>
              <DialogDescription>
                Configure a URL to receive webhook events
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="url">Endpoint URL</Label>
                <Input
                  id="url"
                  placeholder="https://api.yourapp.com/webhooks"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Events to subscribe</Label>
                <div className="space-y-2">
                  {availableEvents.map((event) => (
                    <label
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.id)}
                        onChange={() => toggleEvent(event.id)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-medium text-sm">{event.name}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateWebhook} disabled={!newUrl || selectedEvents.length === 0}>
                Create Endpoint
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Endpoints</h2>
        {endpoints.map((endpoint) => (
          <Card key={endpoint.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={endpoint.status === 'active' ? 'default' : endpoint.status === 'failing' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {endpoint.status === 'active' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {endpoint.status === 'failing' && <XCircle className="w-3 h-3 mr-1" />}
                      {endpoint.status}
                    </Badge>
                  </div>
                  <p className="font-mono text-sm truncate">{endpoint.url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {endpoint.events.map((event) => (
                      <Badge key={event} variant="outline" className="text-xs font-normal">
                        {event}
                      </Badge>
                    ))}
                  </div>
                  {endpoint.lastDelivery && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last delivery: {endpoint.lastDelivery.status === 'success' ? '✓' : '✗'} {endpoint.lastDelivery.timestamp} ({endpoint.lastDelivery.responseTime}ms)
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <RotateCcw className="mr-2 h-4 w-4" /> Test
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Deliveries</CardTitle>
          <CardDescription>Last 24 hours of webhook delivery attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockDeliveries.map((delivery) => (
              <div key={delivery.id} className="flex items-center gap-3 text-sm">
                <div className={`flex h-8 w-14 items-center justify-center rounded-md text-xs font-medium ${
                  delivery.status === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                  delivery.status === 'failed' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                  'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {delivery.responseCode || '...'}
                </div>
                <span className="font-mono text-xs flex-1 truncate text-muted-foreground">
                  {delivery.event}
                </span>
                {delivery.responseTime && (
                  <span className="text-xs text-muted-foreground">
                    {delivery.responseTime}ms
                  </span>
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {delivery.timestamp}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

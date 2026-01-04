'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApiEndpoint {
  method: string
  path: string
  summary: string
  description: string
  requestBody?: Record<string, string>
  queryParams?: Record<string, string>
  response: Record<string, string>
}

interface ApiCategory {
  category: string
  description: string
  endpoints: ApiEndpoint[]
}

const apiEndpoints: ApiCategory[] = [
  {
    category: 'Connections',
    description: 'Link and manage healthcare provider connections',
    endpoints: [
      {
        method: 'POST',
        path: '/connections/link',
        summary: 'Initialize a connection link',
        description: 'Creates a link token for the PlaidHealth Connect widget to initiate a patient connection.',
        requestBody: {
          patient_id: 'string',
          redirect_uri: 'string',
          providers: 'string[] (optional)',
        },
        response: {
          link_token: 'string',
          expiration: 'string (ISO 8601)',
        },
      },
      {
        method: 'POST',
        path: '/connections/exchange',
        summary: 'Exchange public token',
        description: 'Exchanges a public token received from Connect widget for an access token.',
        requestBody: {
          public_token: 'string',
        },
        response: {
          access_token: 'string',
          connection_id: 'string',
          provider: 'string',
        },
      },
      {
        method: 'GET',
        path: '/connections/{id}',
        summary: 'Get connection status',
        description: 'Retrieves the current status and details of a connection.',
        response: {
          id: 'string',
          patient_id: 'string',
          provider: 'string',
          status: 'active | pending | disconnected',
          created_at: 'string (ISO 8601)',
        },
      },
      {
        method: 'DELETE',
        path: '/connections/{id}',
        summary: 'Revoke connection',
        description: 'Revokes a patient connection and deletes associated data.',
        response: {
          success: 'boolean',
        },
      },
    ],
  },
  {
    category: 'Patient Data',
    description: 'Access normalized healthcare data',
    endpoints: [
      {
        method: 'GET',
        path: '/patients/{id}/records',
        summary: 'Get all health records',
        description: 'Retrieves a comprehensive view of all available health records for a patient.',
        queryParams: {
          start_date: 'string (optional)',
          end_date: 'string (optional)',
          types: 'string[] (optional)',
        },
        response: {
          patient: 'PatientResource',
          medications: 'MedicationResource[]',
          conditions: 'ConditionResource[]',
          labs: 'LabResource[]',
          encounters: 'EncounterResource[]',
        },
      },
      {
        method: 'GET',
        path: '/patients/{id}/medications',
        summary: 'Get medications',
        description: 'Retrieves the list of medications for a patient, including dosage and prescriber information.',
        response: {
          medications: 'MedicationResource[]',
        },
      },
      {
        method: 'GET',
        path: '/patients/{id}/conditions',
        summary: 'Get conditions',
        description: 'Retrieves diagnosed conditions and problems for a patient.',
        response: {
          conditions: 'ConditionResource[]',
        },
      },
      {
        method: 'GET',
        path: '/patients/{id}/labs',
        summary: 'Get lab results',
        description: 'Retrieves laboratory test results for a patient.',
        queryParams: {
          start_date: 'string (optional)',
          end_date: 'string (optional)',
        },
        response: {
          labs: 'LabResource[]',
        },
      },
      {
        method: 'GET',
        path: '/patients/{id}/encounters',
        summary: 'Get encounters',
        description: 'Retrieves healthcare encounters and visits for a patient.',
        response: {
          encounters: 'EncounterResource[]',
        },
      },
    ],
  },
  {
    category: 'Webhooks',
    description: 'Real-time event notifications',
    endpoints: [
      {
        method: 'POST',
        path: '/webhooks/subscribe',
        summary: 'Subscribe to webhooks',
        description: 'Creates a webhook subscription for receiving real-time events.',
        requestBody: {
          url: 'string',
          events: 'string[]',
          secret: 'string (optional)',
        },
        response: {
          id: 'string',
          url: 'string',
          events: 'string[]',
          created_at: 'string (ISO 8601)',
        },
      },
      {
        method: 'GET',
        path: '/webhooks',
        summary: 'List webhooks',
        description: 'Lists all webhook subscriptions for your account.',
        response: {
          webhooks: 'WebhookResource[]',
        },
      },
      {
        method: 'DELETE',
        path: '/webhooks/{id}',
        summary: 'Unsubscribe webhook',
        description: 'Removes a webhook subscription.',
        response: {
          success: 'boolean',
        },
      },
    ],
  },
]

const methodColors: Record<string, string> = {
  GET: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  POST: 'bg-green-500/10 text-green-600 dark:text-green-400',
  PUT: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  DELETE: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set())

  const toggleEndpoint = (path: string) => {
    const newExpanded = new Set(expandedEndpoints)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedEndpoints(newExpanded)
  }

  const filteredCategories = apiEndpoints
    .map((category) => ({
      ...category,
      endpoints: category.endpoints.filter(
        (endpoint) =>
          endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          endpoint.summary.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.endpoints.length > 0)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Documentation</h1>
          <p className="text-muted-foreground">
            Complete reference for the PlaidHealth API
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="/api/openapi.yaml" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            OpenAPI Spec
          </a>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search endpoints..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Base URL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-sm">
            <span className="flex-1">https://api.plaidhealth.com/v1</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard('https://api.plaidhealth.com/v1')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            All API requests require authentication using an API key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Include your API key in the <code className="text-primary">Authorization</code> header:
          </p>
          <div className="p-3 bg-muted rounded-md font-mono text-sm overflow-x-auto">
            <code>Authorization: Bearer pfh_live_your_api_key</code>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <div className="space-y-6">
        {filteredCategories.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <CardTitle>{category.category}</CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {category.endpoints.map((endpoint) => (
                <div
                  key={endpoint.path}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => toggleEndpoint(endpoint.path)}
                  >
                    <Badge
                      className={cn(
                        'font-mono text-xs px-2 py-0.5',
                        methodColors[endpoint.method]
                      )}
                      variant="secondary"
                    >
                      {endpoint.method}
                    </Badge>
                    <span className="font-mono text-sm flex-1">
                      {endpoint.path}
                    </span>
                    <span className="text-sm text-muted-foreground hidden sm:block">
                      {endpoint.summary}
                    </span>
                    {expandedEndpoints.has(endpoint.path) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {expandedEndpoints.has(endpoint.path) && (
                    <div className="border-t bg-muted/30 p-4 space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground">
                          {endpoint.description}
                        </p>
                      </div>

                      {endpoint.requestBody && (
                        <div>
                          <h4 className="font-medium mb-2">Request Body</h4>
                          <div className="p-3 bg-background rounded-md font-mono text-xs overflow-x-auto">
                            <pre>
                              {JSON.stringify(endpoint.requestBody, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {endpoint.queryParams && (
                        <div>
                          <h4 className="font-medium mb-2">Query Parameters</h4>
                          <div className="p-3 bg-background rounded-md font-mono text-xs overflow-x-auto">
                            <pre>
                              {JSON.stringify(endpoint.queryParams, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-medium mb-2">Response</h4>
                        <div className="p-3 bg-background rounded-md font-mono text-xs overflow-x-auto">
                          <pre>
                            {JSON.stringify(endpoint.response, null, 2)}
                          </pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Example Request</h4>
                        <div className="p-3 bg-background rounded-md font-mono text-xs overflow-x-auto">
                          <pre>{`curl -X ${endpoint.method} \\
  https://api.plaidhealth.com/v1${endpoint.path.replace('{id}', 'pat_123')} \\
  -H "Authorization: Bearer pfh_live_your_api_key" \\
  -H "Content-Type: application/json"${
    endpoint.requestBody
      ? ` \\
  -d '${JSON.stringify(
    Object.fromEntries(
      Object.entries(endpoint.requestBody).map(([k, v]) => [
        k,
        v.includes('string') ? 'example_value' : v,
      ])
    ),
    null,
    2
  )}'`
      : ''
  }`}</pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Error Codes</CardTitle>
          <CardDescription>
            Common error responses and their meanings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Code</th>
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: 400, name: 'Bad Request', desc: 'Invalid request parameters' },
                  { code: 401, name: 'Unauthorized', desc: 'Invalid or missing API key' },
                  { code: 403, name: 'Forbidden', desc: 'Access denied to resource' },
                  { code: 404, name: 'Not Found', desc: 'Resource not found' },
                  { code: 429, name: 'Too Many Requests', desc: 'Rate limit exceeded' },
                  { code: 500, name: 'Internal Error', desc: 'Server error - contact support' },
                ].map((error) => (
                  <tr key={error.code} className="border-b last:border-0">
                    <td className="py-3 px-4">
                      <Badge variant="outline">{error.code}</Badge>
                    </td>
                    <td className="py-3 px-4 font-medium">{error.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{error.desc}</td>
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

'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Search,
  Check,
  FileJson,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

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
        description: 'Creates a link token for the VerziHealth Connect widget to initiate a patient connection.',
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

const methodStyles: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  POST: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  PUT: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  DELETE: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  PATCH: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
}

const errorCodes = [
  { code: 400, name: 'Bad Request', desc: 'Invalid request parameters', color: 'text-amber-600 dark:text-amber-400' },
  { code: 401, name: 'Unauthorized', desc: 'Invalid or missing API key', color: 'text-red-600 dark:text-red-400' },
  { code: 403, name: 'Forbidden', desc: 'Access denied to resource', color: 'text-red-600 dark:text-red-400' },
  { code: 404, name: 'Not Found', desc: 'Resource not found', color: 'text-amber-600 dark:text-amber-400' },
  { code: 429, name: 'Too Many Requests', desc: 'Rate limit exceeded', color: 'text-amber-600 dark:text-amber-400' },
  { code: 500, name: 'Internal Error', desc: 'Server error - contact support', color: 'text-red-600 dark:text-red-400' },
] as const

function getEndpointKey(endpoint: ApiEndpoint): string {
  return `${endpoint.method}:${endpoint.path}`
}

function generateCurlExample(endpoint: ApiEndpoint): string {
  const baseUrl = 'https://api.verzihealth.com/v1'
  const path = endpoint.path.replace('{id}', 'pat_123')
  const hasBody = endpoint.requestBody

  let curl = `curl -X ${endpoint.method} \\
  ${baseUrl}${path} \\
  -H "Authorization: Bearer pfh_live_your_api_key" \\
  -H "Content-Type: application/json"`

  if (hasBody) {
    const bodyObj = Object.fromEntries(
      Object.entries(endpoint.requestBody!).map(([k, v]) => [
        k,
        v.includes('string') ? 'example_value' : v,
      ])
    )
    curl += ` \\
  -d '${JSON.stringify(bodyObj, null, 2)}'`
  }

  return curl
}

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set())
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const { toast } = useToast()

  const toggleEndpoint = (key: string) => {
    setExpandedEndpoints((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(key)) {
        newExpanded.delete(key)
      } else {
        newExpanded.add(key)
      }
      return newExpanded
    })
  }

  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return apiEndpoints
      .map((category) => ({
        ...category,
        endpoints: category.endpoints.filter(
          (endpoint) =>
            endpoint.path.toLowerCase().includes(query) ||
            endpoint.summary.toLowerCase().includes(query) ||
            endpoint.description.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.endpoints.length > 0)
  }, [searchQuery])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    toast({ title: 'Copied to clipboard' })
    setTimeout(() => setCopiedText(null), 2000)
  }

  const totalEndpoints = apiEndpoints.reduce((sum, cat) => sum + cat.endpoints.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">API Documentation</h1>
          <p className="text-muted-foreground">
            Complete reference for the VerziHealth API ({totalEndpoints} endpoints)
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="/api/openapi.yaml" target="_blank" rel="noopener noreferrer">
            <FileJson className="mr-2 h-4 w-4" />
            OpenAPI Spec
          </a>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search endpoints, methods, or descriptions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Quick Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Base URL</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard('https://api.verzihealth.com/v1')}
                aria-label="Copy base URL"
              >
                {copiedText === 'https://api.verzihealth.com/v1' ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
              https://api.verzihealth.com/v1
            </code>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Authentication</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard('Authorization: Bearer pfh_live_your_api_key')}
                aria-label="Copy authentication header"
              >
                {copiedText === 'Authorization: Bearer pfh_live_your_api_key' ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
              Authorization: Bearer pfh_live_...
            </code>
          </CardContent>
        </Card>
      </div>

      {/* API Endpoints */}
      <div className="space-y-6">
        {filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-1">No endpoints found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search query
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCategories.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle>{category.category}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {category.endpoints.map((endpoint) => {
                  const style = methodStyles[endpoint.method]
                  const endpointKey = getEndpointKey(endpoint)
                  const isExpanded = expandedEndpoints.has(endpointKey)

                  return (
                    <div
                      key={endpointKey}
                      className="border rounded-xl overflow-hidden"
                    >
                      <button
                        className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => toggleEndpoint(endpointKey)}
                        aria-expanded={isExpanded}
                      >
                        <Badge
                          className={cn(
                            'font-mono text-xs px-2.5 py-1 font-semibold',
                            style.bg,
                            style.text
                          )}
                          variant="secondary"
                        >
                          {endpoint.method}
                        </Badge>
                        <span className="font-mono text-sm flex-1">
                          {endpoint.path}
                        </span>
                        <span className="text-sm text-muted-foreground hidden md:block max-w-xs truncate">
                          {endpoint.summary}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t bg-muted/30 p-5 space-y-5">
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground">
                              {endpoint.description}
                            </p>
                          </div>

                          {endpoint.requestBody && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Request Body</h4>
                              <div className="p-3 bg-background rounded-lg font-mono text-xs overflow-x-auto border">
                                <pre className="text-muted-foreground">
                                  {JSON.stringify(endpoint.requestBody, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {endpoint.queryParams && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Query Parameters</h4>
                              <div className="p-3 bg-background rounded-lg font-mono text-xs overflow-x-auto border">
                                <pre className="text-muted-foreground">
                                  {JSON.stringify(endpoint.queryParams, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="text-sm font-semibold mb-2">Response</h4>
                            <div className="p-3 bg-background rounded-lg font-mono text-xs overflow-x-auto border">
                              <pre className="text-muted-foreground">
                                {JSON.stringify(endpoint.response, null, 2)}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold">Example Request</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => copyToClipboard(generateCurlExample(endpoint))}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                            <div className="p-3 bg-background rounded-lg font-mono text-xs overflow-x-auto border">
                              <pre className="text-muted-foreground whitespace-pre-wrap">
                                {generateCurlExample(endpoint)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))
        )}
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
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Code</th>
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {errorCodes.map((error, index) => (
                  <tr key={error.code} className={cn('border-t', index % 2 === 0 && 'bg-muted/20')}>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={error.color}>{error.code}</Badge>
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

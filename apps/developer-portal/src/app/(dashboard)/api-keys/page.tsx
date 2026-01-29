'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  MoreHorizontal,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  Ban,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  requestCount: number
  status: 'active' | 'revoked'
}

type Environment = 'production' | 'sandbox'

const securityTips = [
  'Never expose API keys in client-side code or public repositories',
  'Use environment variables to store keys securely',
  'Rotate keys regularly and revoke unused keys',
  'Use sandbox keys for development and testing',
] as const

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatLastUsed(dateString: string | null): string {
  if (!dateString) return 'Never used'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyEnv, setNewKeyEnv] = useState<Environment>('sandbox')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const { toast } = useToast()

  const loadKeys = useCallback(async () => {
    setIsLoading(true)
    const result = await api.listKeys()
    if (result.data) {
      setKeys(result.data.keys)
    } else {
      toast({
        title: 'Error loading keys',
        description: result.error || 'Failed to load API keys',
        variant: 'destructive',
      })
    }
    setIsLoading(false)
  }, [toast])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  const closeCreateDialog = useCallback(() => {
    setIsCreateOpen(false)
    setNewKeyName('')
    setNewKeyEnv('sandbox')
    setCreatedKey(null)
    setShowKey(false)
  }, [])

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return

    setIsCreating(true)
    const result = await api.createKey(newKeyName, ['read', 'write'], newKeyEnv)

    if (result.data) {
      setCreatedKey(result.data.key)
      await loadKeys()
    } else {
      toast({
        title: 'Error creating key',
        description: result.error || 'Failed to create API key',
        variant: 'destructive',
      })
      closeCreateDialog()
    }
    setIsCreating(false)
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast({
      title: 'Copied to clipboard',
      description: 'API key has been copied to your clipboard.',
    })
  }

  const handleRevokeKey = async (keyId: string) => {
    const result = await api.revokeKey(keyId)

    if (result.data?.success) {
      setKeys((prevKeys) =>
        prevKeys.map((key) =>
          key.id === keyId ? { ...key, status: 'revoked' as const } : key
        )
      )
      toast({
        title: 'API key revoked',
        description: 'The API key has been revoked and can no longer be used.',
      })
    } else {
      toast({
        title: 'Error revoking key',
        description: result.error || 'Failed to revoke API key',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    const result = await api.deleteKey(keyId)

    if (result.data?.success) {
      setKeys((prevKeys) => prevKeys.filter((key) => key.id !== keyId))
      toast({
        title: 'API key deleted',
        description: 'The API key has been permanently deleted.',
      })
    } else {
      toast({
        title: 'Error deleting key',
        description: result.error || 'Failed to delete API key',
        variant: 'destructive',
      })
    }
  }

  const activeKeys = keys.filter((k) => k.status === 'active').length
  const revokedKeys = keys.filter((k) => k.status === 'revoked').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for accessing VerziHealth services
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            {!createdKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Create a new API key for your application. Choose sandbox for testing or production for live usage.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Key Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Production Server"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use a descriptive name to identify this key
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label>Environment</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewKeyEnv('sandbox')}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                          newKeyEnv === 'sandbox'
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-muted-foreground/30'
                        )}
                      >
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg',
                          newKeyEnv === 'sandbox' ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'
                        )}>
                          <Shield className="h-5 w-5" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium">Sandbox</p>
                          <p className="text-xs text-muted-foreground">For testing</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewKeyEnv('production')}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                          newKeyEnv === 'production'
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-muted-foreground/30'
                        )}
                      >
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg',
                          newKeyEnv === 'production' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                        )}>
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium">Production</p>
                          <p className="text-xs text-muted-foreground">For live apps</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={closeCreateDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Key
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                      <Check className="h-5 w-5 text-emerald-500" />
                    </div>
                    API Key Created
                  </DialogTitle>
                  <DialogDescription>
                    Make sure to copy your API key now. You won&apos;t be able to see it again.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="relative">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
                      <span className="flex-1 truncate">
                        {showKey ? createdKey : '•'.repeat(40)}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setShowKey(!showKey)}
                            aria-label={showKey ? 'Hide key' : 'Show key'}
                          >
                            {showKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {showKey ? 'Hide key' : 'Show key'}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleCopyKey(createdKey!)}
                            aria-label="Copy to clipboard"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy to clipboard</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      This key will only be displayed once. Store it securely in your environment variables.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={closeCreateDialog} className="w-full sm:w-auto">
                    Done
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Keys</p>
                <p className="text-2xl font-bold">{keys.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeKeys}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revoked</p>
                <p className="text-2xl font-bold text-muted-foreground">{revokedKeys}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Ban className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            Keys allow your applications to authenticate with VerziHealth API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                <Key className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No API keys yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first API key to start integrating with VerziHealth
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-colors',
                    key.status === 'revoked' && 'bg-muted/50 opacity-70'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      key.status === 'active' ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      <Key className={cn(
                        'h-5 w-5',
                        key.status === 'active' ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold">{key.name}</span>
                        <Badge
                          variant={key.status === 'active' ? 'success' : 'secondary'}
                          className="capitalize"
                        >
                          {key.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {key.keyPrefix}••••••••
                        </span>
                        <span>Created {formatDate(key.createdAt)}</span>
                        <span>{formatLastUsed(key.lastUsedAt)}</span>
                        {key.requestCount > 0 && (
                          <span>{key.requestCount.toLocaleString()} requests</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0" aria-label="Actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {key.status === 'active' && (
                        <DropdownMenuItem
                          onClick={() => handleRevokeKey(key.id)}
                          className="text-amber-600 focus:text-amber-600"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Revoke Key
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDeleteKey(key.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Key
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Security Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {securityTips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

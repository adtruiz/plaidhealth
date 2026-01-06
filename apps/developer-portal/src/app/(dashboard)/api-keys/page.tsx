'use client'

import { useState, useEffect } from 'react'
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
import { useToast } from '@/components/ui/use-toast'
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  MoreVertical,
  Plus,
  Trash2,
} from 'lucide-react'
import { api } from '@/lib/api'

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

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyEnv, setNewKeyEnv] = useState<'production' | 'sandbox'>('sandbox')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
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
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return

    setIsCreating(true)
    const result = await api.createKey(newKeyName, ['read', 'write'], newKeyEnv)

    if (result.data) {
      setCreatedKey(result.data.key)
      // Reload keys to get the new one in the list
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
      setKeys(
        keys.map((key) =>
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
      setKeys(keys.filter((key) => key.id !== keyId))
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

  const closeCreateDialog = () => {
    setIsCreateOpen(false)
    setNewKeyName('')
    setNewKeyEnv('sandbox')
    setCreatedKey(null)
    setShowKey(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatLastUsed = (dateString: string | null) => {
    if (!dateString) return 'Never used'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return formatDate(dateString)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for accessing PlaidHealth services.
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
                    Create a new API key for your application.
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
                  </div>
                  <div className="space-y-2">
                    <Label>Environment</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="environment"
                          value="sandbox"
                          checked={newKeyEnv === 'sandbox'}
                          onChange={() => setNewKeyEnv('sandbox')}
                          className="h-4 w-4"
                        />
                        <span>Sandbox</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="environment"
                          value="production"
                          checked={newKeyEnv === 'production'}
                          onChange={() => setNewKeyEnv('production')}
                          className="h-4 w-4"
                        />
                        <span>Production</span>
                      </label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
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
                    <Check className="h-5 w-5 text-green-500" />
                    API Key Created
                  </DialogTitle>
                  <DialogDescription>
                    Make sure to copy your API key now. You will not be able to see
                    it again!
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-sm">
                    <span className="flex-1 truncate">
                      {showKey ? createdKey : createdKey?.replace(/./g, '*')}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyKey(createdKey!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <p>
                      This key will only be displayed once. Store it securely in
                      your environment variables.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={closeCreateDialog}>Done</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            These keys allow your applications to access the PlaidHealth API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {keys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No API keys yet. Create one to get started.</p>
                </div>
              ) : (
                keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Key className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{key.name}</span>
                          <Badge
                            variant={
                              key.status === 'active' ? 'success' : 'secondary'
                            }
                          >
                            {key.status}
                          </Badge>
                          <Badge variant="outline">
                            {key.scopes?.join(', ') || 'read'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-mono">{key.keyPrefix}••••••••</span>
                          {' · '}
                          Created {formatDate(key.createdAt)}
                          {' · '}
                          {formatLastUsed(key.lastUsedAt)}
                          {key.requestCount > 0 && ` · ${key.requestCount.toLocaleString()} requests`}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {key.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => handleRevokeKey(key.id)}
                            className="text-yellow-600"
                          >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Revoke Key
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteKey(key.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Key
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Security Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              Never expose API keys in client-side code or public repositories
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              Use environment variables to store keys securely
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              Rotate keys regularly and revoke unused keys
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              Use sandbox keys for development and testing
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

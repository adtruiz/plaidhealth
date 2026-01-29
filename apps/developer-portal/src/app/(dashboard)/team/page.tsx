'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  Users,
  Plus,
  Mail,
  MoreHorizontal,
  Shield,
  Pencil,
  Trash2,
  Crown,
  UserCog,
  Eye,
} from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'developer' | 'viewer'
  avatar?: string
  status: 'active' | 'pending'
  joinedAt: string
}

const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'You', email: 'demo@verzihealth.com', role: 'owner', status: 'active', joinedAt: '2024-01-01' },
  { id: '2', name: 'Sarah Chen', email: 'sarah@yourcompany.com', role: 'admin', status: 'active', joinedAt: '2024-01-05' },
  { id: '3', name: 'Marcus Johnson', email: 'marcus@yourcompany.com', role: 'developer', status: 'active', joinedAt: '2024-01-10' },
  { id: '4', name: 'Pending Invite', email: 'newdev@yourcompany.com', role: 'developer', status: 'pending', joinedAt: '2024-01-15' },
]

const roles = [
  { id: 'admin', name: 'Admin', description: 'Full access to all settings', icon: Shield },
  { id: 'developer', name: 'Developer', description: 'Manage API keys and webhooks', icon: UserCog },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access', icon: Eye },
]

const roleColors = {
  owner: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  admin: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  developer: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  viewer: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  developer: UserCog,
  viewer: Eye,
}

export default function TeamPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState(mockTeamMembers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('developer')
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleInvite = () => {
    if (!inviteEmail) return
    const newMember: TeamMember = {
      id: `${Date.now()}`,
      name: 'Pending Invite',
      email: inviteEmail,
      role: inviteRole as TeamMember['role'],
      status: 'pending',
      joinedAt: new Date().toISOString().split('T')[0],
    }
    setMembers([...members, newMember])
    setInviteEmail('')
    setInviteRole('developer')
    setDialogOpen(false)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Team</h1>
          <p className="text-muted-foreground">
            Manage who has access to your VerziHealth dashboard
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@yourcompany.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="space-y-2">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        inviteRole === role.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.id}
                        checked={inviteRole === role.id}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <role.icon className="h-4 w-4" />
                          <p className="font-medium text-sm">{role.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={!inviteEmail}>
                <Mail className="mr-2 h-4 w-4" />
                Send Invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            {members.filter(m => m.status === 'active').length} active members, {members.filter(m => m.status === 'pending').length} pending invites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => {
              const RoleIcon = roleIcons[member.role]
              return (
                <div key={member.id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {member.name}
                        {member.id === '1' && <span className="text-muted-foreground"> (You)</span>}
                      </p>
                      {member.status === 'pending' && (
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Badge variant="outline" className={`${roleColors[member.role]} text-xs`}>
                    <RoleIcon className="w-3 h-3 mr-1" />
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Badge>
                  {member.role !== 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" /> Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
          <CardDescription>Understanding what each role can do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Permission</th>
                  <th className="text-center py-2 font-medium">Owner</th>
                  <th className="text-center py-2 font-medium">Admin</th>
                  <th className="text-center py-2 font-medium">Developer</th>
                  <th className="text-center py-2 font-medium">Viewer</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-2">View dashboard & analytics</td>
                  <td className="text-center text-emerald-500">✓</td>
                  <td className="text-center text-emerald-500">✓</td>
                  <td className="text-center text-emerald-500">✓</td>
                  <td className="text-center text-emerald-500">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Manage API keys</td>
                  <td className="text-center text-emerald-500">✓</td>
                  <td className="text-center text-emerald-500">✓</td>
                  <td className="text-center text-emerald-500">✓</td>
                  <td className="text-center text-muted-foreground/30">—</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Configure webhooks</td>
                  <td className="text-center text-emerald-500">✓</td>
                  <td className="text-center text-emerald-500">✓</td>
                  <td className="text-center text-emerald-500">✓</td>
                  <td className="text-center text-muted-foreground/30">—</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Manage team members</td>
                  <td className="text-center text-emerald-500">✓</td>
                  <td className="text-center text-emerald-500">✓</td>
                  <td className="text-center text-muted-foreground/30">—</td>
                  <td className="text-center text-muted-foreground/30">—</td>
                </tr>
                <tr>
                  <td className="py-2">Billing & subscription</td>
                  <td className="text-center text-emerald-500">✓</td>
                  <td className="text-center text-muted-foreground/30">—</td>
                  <td className="text-center text-muted-foreground/30">—</td>
                  <td className="text-center text-muted-foreground/30">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

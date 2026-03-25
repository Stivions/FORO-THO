'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BADGES, ALL_BADGE_IDS, type BadgeId } from '@/lib/badges'
import { Shield, ArrowLeft, Save, Loader2, Users, Check, X, Clock } from 'lucide-react'

interface AdminUser {
  _id: string
  username: string
  email: string
  displayName?: string
  avatar?: string
  role: string
  badges: string[]
  createdAt: string
}

interface PendingGroup {
  _id: string
  name: string
  description: string
  requestMessage?: string
  owner: { _id: string; username: string; displayName?: string; email: string; avatar?: string }
  status: string
  createdAt: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user, sessionId } = useCurrentUser()
  const [users,         setUsers]         = useState<AdminUser[]>([])
  const [groups,        setGroups]        = useState<PendingGroup[]>([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState<string | null>(null)
  const [actioningGroup, setActioningGroup] = useState<string | null>(null)
  const [edits,         setEdits]         = useState<Record<string, { role: string; badges: string[] }>>({})
  const [tab,           setTab]           = useState<'users' | 'groups'>('groups')

  const isAdmin = (user as any)?.role === 'admin'

  useEffect(() => {
    if (!sessionId) return
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/groups').then(r => r.json()),
    ]).then(([ud, gd]) => {
      setUsers(ud.users ?? [])
      setGroups(gd.groups ?? [])
      const init: Record<string, { role: string; badges: string[] }> = {}
      for (const u of ud.users ?? []) {
        init[u._id] = { role: u.role, badges: [...u.badges] }
      }
      setEdits(init)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [sessionId])

  const handleGroupAction = async (groupId: string, action: 'approve' | 'reject') => {
    setActioningGroup(groupId)
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setGroups(prev => prev.map(g => g._id === groupId ? { ...g, status: action === 'approve' ? 'approved' : 'rejected' } : g))
      }
    } finally {
      setActioningGroup(null)
    }
  }

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Acceso denegado</p>
      </div>
    )
  }

  const toggleBadge = (userId: string, badge: string) => {
    setEdits(prev => {
      const cur = prev[userId] ?? { role: 'user', badges: [] }
      const has = cur.badges.includes(badge)
      return {
        ...prev,
        [userId]: {
          ...cur,
          badges: has ? cur.badges.filter(b => b !== badge) : [...cur.badges, badge],
        },
      }
    })
  }

  const setRole = (userId: string, role: string) => {
    setEdits(prev => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? { badges: [] }), role },
    }))
  }

  const saveUser = async (userId: string) => {
    setSaving(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits[userId]),
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, ...data.user } : u))
      }
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-orange-400" />
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-6">
          <button
            onClick={() => setTab('groups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'groups' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Users className="h-4 w-4" />
            Grupos
            {groups.filter(g => g.status === 'pending').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {groups.filter(g => g.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'users' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Shield className="h-4 w-4" />
            Usuarios ({users.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : tab === 'groups' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {groups.filter(g => g.status === 'pending').length} pendientes · {groups.length} total
            </p>
            {groups.length === 0 && (
              <p className="text-center py-10 text-muted-foreground text-sm">Sin solicitudes de grupos todavía</p>
            )}
            {groups.map(g => (
              <Card key={g._id} className={`bg-card border-border ${g.status === 'pending' ? 'border-orange-500/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{g.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          g.status === 'pending'  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                          g.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {g.status === 'pending' ? '⏳ Pendiente' : g.status === 'approved' ? '✓ Aprobado' : '✗ Rechazado'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{g.description}</p>
                      {g.requestMessage && (
                        <p className="text-xs text-muted-foreground italic">"{g.requestMessage}"</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        por <span className="font-medium">@{g.owner?.username}</span> · {g.owner?.email}
                      </p>
                    </div>
                    {g.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-500 text-white gap-1"
                          disabled={actioningGroup === g._id}
                          onClick={() => handleGroupAction(g._id, 'approve')}
                        >
                          {actioningGroup === g._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          disabled={actioningGroup === g._id}
                          onClick={() => handleGroupAction(g._id, 'reject')}
                        >
                          <X className="h-3.5 w-3.5" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{users.length} usuarios registrados</p>
            {users.map(u => {
              const edit = edits[u._id] ?? { role: u.role, badges: u.badges }
              const changed =
                edit.role !== u.role ||
                JSON.stringify([...edit.badges].sort()) !== JSON.stringify([...u.badges].sort())

              return (
                <Card key={u._id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback>{u.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold">{u.displayName || u.username}</span>
                          <span className="text-sm text-muted-foreground">@{u.username}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </div>

                        {/* Role selector */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-muted-foreground">Rol:</span>
                          {['user', 'moderator', 'admin'].map(r => (
                            <button
                              key={r}
                              onClick={() => setRole(u._id, r)}
                              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                edit.role === r
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'border-border text-muted-foreground hover:border-primary/50'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">Insignias:</span>
                          {ALL_BADGE_IDS.map(bid => {
                            const badge = BADGES[bid]
                            const active = edit.badges.includes(bid)
                            return (
                              <button
                                key={bid}
                                onClick={() => toggleBadge(u._id, bid)}
                                title={badge.description}
                                className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all ${
                                  active ? badge.color : 'border-border text-muted-foreground opacity-40 hover:opacity-70'
                                }`}
                              >
                                {badge.emoji} {badge.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={changed ? 'default' : 'outline'}
                        disabled={!changed || saving === u._id}
                        onClick={() => saveUser(u._id)}
                        className="shrink-0"
                      >
                        {saving === u._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><Save className="h-4 w-4 mr-1" />Guardar</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

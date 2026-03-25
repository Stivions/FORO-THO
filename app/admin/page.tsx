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
import { Shield, ArrowLeft, Save, Loader2 } from 'lucide-react'

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

export default function AdminPage() {
  const router = useRouter()
  const { user, sessionId } = useCurrentUser()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { role: string; badges: string[] }>>({})

  const isAdmin = (user as any)?.role === 'admin'

  useEffect(() => {
    if (!sessionId) return
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => {
        setUsers(d.users ?? [])
        const init: Record<string, { role: string; badges: string[] }> = {}
        for (const u of d.users ?? []) {
          init[u._id] = { role: u.role, badges: [...u.badges] }
        }
        setEdits(init)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

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

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

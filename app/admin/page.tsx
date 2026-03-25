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
import { Shield, ArrowLeft, Save, Loader2, Users, Check, X, Clock, Trash2, Megaphone, Eye, FileWarning, ExternalLink } from 'lucide-react'

interface AdminUser {
  _id: string
  username: string
  email: string
  displayName?: string
  avatar?: string
  role: string
  badges: string[]
  banned?: boolean
  bannedReason?: string
  lastKnownIp?: string
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
  const [tab,           setTab]           = useState<'users' | 'groups' | 'announce' | 'posts'>('groups')
  const [pendingPosts,  setPendingPosts]  = useState<any[]>([])
  const [postsLoading,  setPostsLoading]  = useState(false)
  const [actioningPost, setActioningPost] = useState<string | null>(null)

  // Ban state
  const [banningId,  setBanningId]  = useState<string | null>(null)
  const [banReason,  setBanReason]  = useState<Record<string, string>>({})
  const [banIp,      setBanIp]      = useState<Record<string, boolean>>({})
  const [banConfirm, setBanConfirm] = useState<string | null>(null) // userId showing inline confirm

  // Announce state
  const [announce, setAnnounce] = useState({
    subject:    '',
    headline:   '',
    message:    '',
    ctaText:    '',
    ctaUrl:     '',
  })
  const [announcing,   setAnnouncing]   = useState(false)
  const [announceResult, setAnnounceResult] = useState<{ sent?: number; error?: string } | null>(null)
  const [showPreview, setShowPreview]   = useState(false)

  const isAdmin      = (user as any)?.role === 'admin'
  const isSuperAdmin = (user as any)?.email === 'stevensanchezdev@gmail.com' && isAdmin
  const [resetting, setResetting] = useState(false)

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

  const loadPendingPosts = async () => {
    setPostsLoading(true)
    try {
      const res = await fetch('/api/admin/posts')
      const data = await res.json()
      setPendingPosts(data.posts ?? [])
    } finally {
      setPostsLoading(false)
    }
  }

  const handlePostAction = async (postId: string, action: 'approve' | 'reject') => {
    setActioningPost(postId)
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setPendingPosts(prev => prev.map(p =>
          p._id === postId ? { ...p, status: action === 'approve' ? 'published' : 'rejected' } : p
        ))
      }
    } finally {
      setActioningPost(null)
    }
  }

  const handleBan = async (userId: string, action: 'ban' | 'unban') => {
    setBanningId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: banReason[userId] || '',
          banIp: banIp[userId] || false,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(prev => prev.map(u =>
          u._id === userId ? { ...u, banned: data.banned, bannedReason: banReason[userId] || '' } : u
        ))
        setBanConfirm(null)
        setBanReason(p => ({ ...p, [userId]: '' }))
        setBanIp(p => ({ ...p, [userId]: false }))
      }
    } finally {
      setBanningId(null)
    }
  }

  const sendAnnounce = async () => {
    if (!announce.subject.trim() || !announce.headline.trim() || !announce.message.trim()) return
    if (!confirm(`¿Enviar este anuncio a TODOS los usuarios registrados?`)) return
    setAnnouncing(true)
    setAnnounceResult(null)
    try {
      const res = await fetch('/api/admin/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...announce,
          senderName: (user as any)?.displayName || (user as any)?.username || 'Admin',
        }),
      })
      const data = await res.json()
      if (res.ok) setAnnounceResult({ sent: data.sent })
      else setAnnounceResult({ error: data.error })
    } finally {
      setAnnouncing(false)
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

  const resetForum = async () => {
    if (!confirm('⚠️ Esto borrará TODOS los posts, comentarios, mensajes y grupos.\n\nLos usuarios y categorías se conservan.\n\n¿Confirmar?')) return
    setResetting(true)
    try {
      const res = await fetch('/api/admin/reset', { method: 'DELETE' })
      if (res.ok) {
        alert('✅ Foro limpiado.')
        router.refresh()
      }
    } finally {
      setResetting(false)
    }
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
          {isSuperAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={resetForum}
              disabled={resetting}
              className="ml-auto gap-2"
            >
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Limpiar foro
            </Button>
          )}
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
          <button
            onClick={() => { setTab('posts'); loadPendingPosts() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'posts' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <FileWarning className="h-4 w-4" />
            Posts
            {pendingPosts.filter(p => p.status === 'pending').length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {pendingPosts.filter(p => p.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('announce')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'announce' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Megaphone className="h-4 w-4" />
            Anuncios
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
        ) : tab === 'users' ? (
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
                          {u.banned && (
                            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#ff003c20', color: '#ff003c', border: '1px solid #ff003c40' }}>
                              BANEADO {u.bannedReason ? `· ${u.bannedReason}` : ''}
                            </span>
                          )}
                        </div>
                        {u.lastKnownIp && (
                          <div className="text-xs font-mono mb-1" style={{ color: '#00fff540' }}>
                            IP: {u.lastKnownIp}
                          </div>
                        )}

                        {/* Inline ban form */}
                        {banConfirm === u._id && !u.banned && (
                          <div className="mt-2 p-3 rounded space-y-2" style={{ background: '#ff003c08', border: '1px solid #ff003c30' }}>
                            <input
                              placeholder="Razón del ban (opcional)"
                              value={banReason[u._id] || ''}
                              onChange={e => setBanReason(p => ({ ...p, [u._id]: e.target.value }))}
                              className="dedsec-input w-full px-2 py-1 text-xs outline-none"
                              style={{ borderColor: '#ff003c40 !important' }}
                            />
                            {u.lastKnownIp && (
                              <label className="flex items-center gap-2 text-xs font-mono cursor-pointer" style={{ color: '#ff003c80' }}>
                                <input
                                  type="checkbox"
                                  checked={banIp[u._id] || false}
                                  onChange={e => setBanIp(p => ({ ...p, [u._id]: e.target.checked }))}
                                  className="accent-red-500"
                                />
                                Banear también IP ({u.lastKnownIp})
                              </label>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleBan(u._id, 'ban')}
                                disabled={banningId === u._id}
                                className="flex-1 py-1 text-xs font-mono rounded transition-all"
                                style={{ background: '#ff003c20', border: '1px solid #ff003c', color: '#ff003c' }}
                              >
                                {banningId === u._id ? '...' : '⛔ CONFIRMAR BAN'}
                              </button>
                              <button
                                onClick={() => setBanConfirm(null)}
                                className="px-3 py-1 text-xs font-mono rounded"
                                style={{ border: '1px solid #00fff530', color: '#00fff560' }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

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

                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={changed ? 'default' : 'outline'}
                          disabled={!changed || saving === u._id}
                          onClick={() => saveUser(u._id)}
                        >
                          {saving === u._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <><Save className="h-4 w-4 mr-1" />Guardar</>
                          )}
                        </Button>

                        {u.role !== 'admin' && (
                          u.banned ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={banningId === u._id}
                              onClick={() => handleBan(u._id, 'unban')}
                              className="text-green-400 border-green-400/40 hover:bg-green-400/10 text-xs"
                            >
                              {banningId === u._id ? <Loader2 className="h-3 w-3 animate-spin" /> : '✓ Desbanear'}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setBanConfirm(banConfirm === u._id ? null : u._id)}
                              className="text-xs"
                              style={{ color: '#ff003c', borderColor: '#ff003c40' }}
                            >
                              Banear
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : tab === 'posts' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pendingPosts.filter(p => p.status === 'pending').length} pendientes · {pendingPosts.length} total
              </p>
              <button onClick={loadPendingPosts} className="text-xs font-mono" style={{ color: '#00fff560' }}>
                ↻ Actualizar
              </button>
            </div>
            {postsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : pendingPosts.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">No hay posts pendientes</p>
            ) : (
              pendingPosts.map(p => {
                const analysis = p.aiAnalysis
                const verdictColor = analysis ? ({ good: '#00ff88', suspicious: '#ff9500', bad: '#ff003c' } as any)[analysis.verdict] : null
                const vt = p.vtAnalysis
                const vtColor =
                  !vt              ? null :
                  vt.status === 'malicious'  ? '#ff003c' :
                  vt.status === 'suspicious' ? '#ff9500' :
                  vt.status === 'scanning'   ? '#aaaaaa' :
                  vt.status === 'clean'      ? '#00ff88' : '#555'
                const vtLabel =
                  !vt              ? null :
                  vt.status === 'malicious'  ? `🦠 VT: ${vt.malicious}/${vt.total} MALICIOSO` :
                  vt.status === 'suspicious' ? `⚠ VT: ${vt.suspicious}/${vt.total} sospechoso` :
                  vt.status === 'scanning'   ? '⏳ VT: escaneando...' :
                  vt.status === 'clean'      ? `✓ VT: limpio (${vt.total} motores)` :
                  '? VT: desconocido'
                return (
                  <Card key={p._id} className={`bg-card border-border ${
                    p.status === 'pending' ? (vt?.status === 'malicious' ? 'border-red-500/50' : 'border-orange-500/30') : ''
                  }`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm truncate">{p.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${
                              p.status === 'pending'  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                              p.status === 'published'? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}>
                              {p.status === 'pending' ? '⏳ Pendiente' : p.status === 'published' ? '✓ Aprobado' : '✕ Rechazado'}
                            </span>
                            {analysis && (
                              <span className="text-xs font-mono px-2 py-0.5 rounded" title={analysis.reason}
                                style={{ color: verdictColor, border: `1px solid ${verdictColor}40`, fontSize: '10px' }}>
                                IA: {analysis.verdict === 'good' ? '✓ Bueno' : analysis.verdict === 'bad' ? '✕ Alerta' : '⚠ Revisar'}
                              </span>
                            )}
                            {vt && vtColor && (
                              <a href={vt.permalink ?? '#'} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-mono px-2 py-0.5 rounded transition-opacity hover:opacity-80"
                                style={{ color: vtColor, border: `1px solid ${vtColor}40`, fontSize: '10px' }}
                                title={`SHA256: ${vt.sha256}`}>
                                {vtLabel}
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{p.content}</p>
                          {analysis?.reason && (
                            <p className="text-xs font-mono mb-1" style={{ color: verdictColor ?? '#00fff560' }}>
                              IA: {analysis.reason}
                              {analysis.flags?.length > 0 && <span style={{ color: '#ff9500' }}> · {analysis.flags.join(', ')}</span>}
                            </p>
                          )}
                          {p.mediaUrl && (
                            <a href={p.mediaUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-mono" style={{ color: '#00fff560' }}>
                              <ExternalLink className="h-3 w-3" /> Ver adjunto
                            </a>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            por <span className="font-medium">@{p.author?.username}</span> · {p.category}
                          </p>
                        </div>
                        {p.status === 'pending' && (
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white gap-1"
                              disabled={actioningPost === p._id} onClick={() => handlePostAction(p._id, 'approve')}>
                              {actioningPost === p._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              Aprobar
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1"
                              disabled={actioningPost === p._id} onClick={() => handlePostAction(p._id, 'reject')}>
                              <X className="h-3.5 w-3.5" />Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        ) : tab === 'announce' ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Envía un email a todos los usuarios registrados. Configura el template antes de enviar.
            </p>

            <div className="grid gap-4">
              {/* Subject */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: '#00fff5' }}>
                  {'> ASUNTO (subject)'}
                </label>
                <input
                  value={announce.subject}
                  onChange={e => setAnnounce(p => ({ ...p, subject: e.target.value }))}
                  placeholder="ej: 🔥 Nuevo torneo en Skill All Show"
                  className="dedsec-input px-3 py-2 text-sm rounded-none w-full outline-none"
                />
              </div>

              {/* Headline */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: '#00fff5' }}>
                  {'> TITULAR DEL EMAIL (headline)'}
                </label>
                <input
                  value={announce.headline}
                  onChange={e => setAnnounce(p => ({ ...p, headline: e.target.value }))}
                  placeholder="ej: ¡NUEVO TORNEO DISPONIBLE!"
                  className="dedsec-input px-3 py-2 text-sm rounded-none w-full outline-none"
                />
                <p className="text-xs text-muted-foreground font-mono">Aparece grande en el banner del email, en MAYÚSCULAS automático.</p>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: '#00fff5' }}>
                  {'> MENSAJE'}
                </label>
                <textarea
                  value={announce.message}
                  onChange={e => setAnnounce(p => ({ ...p, message: e.target.value }))}
                  placeholder="Escribe el cuerpo del anuncio aquí... Soporta saltos de línea."
                  rows={6}
                  className="dedsec-input px-3 py-2 text-sm rounded-none w-full outline-none resize-y"
                />
              </div>

              {/* CTA (opcional) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: '#00fff560' }}>
                    {'> BOTÓN (opcional)'}
                  </label>
                  <input
                    value={announce.ctaText}
                    onChange={e => setAnnounce(p => ({ ...p, ctaText: e.target.value }))}
                    placeholder="ej: VER EN EL FORO"
                    className="dedsec-input px-3 py-2 text-sm rounded-none w-full outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: '#00fff560' }}>
                    {'> URL DEL BOTÓN'}
                  </label>
                  <input
                    value={announce.ctaUrl}
                    onChange={e => setAnnounce(p => ({ ...p, ctaUrl: e.target.value }))}
                    placeholder="https://forotho.netlify.app"
                    className="dedsec-input px-3 py-2 text-sm rounded-none w-full outline-none"
                  />
                </div>
              </div>

              {/* Preview toggle */}
              <button
                onClick={() => setShowPreview(p => !p)}
                className="flex items-center gap-2 text-xs font-mono transition-colors"
                style={{ color: showPreview ? '#00fff5' : '#00fff560' }}
              >
                <Eye className="h-3.5 w-3.5" />
                {showPreview ? 'OCULTAR PREVIEW' : 'VER PREVIEW DEL EMAIL'}
              </button>

              {showPreview && (
                <div
                  className="rounded overflow-hidden"
                  style={{ border: '1px solid #00fff530', background: '#050810', maxHeight: '500px', overflowY: 'auto' }}
                >
                  {/* Simplified preview */}
                  <div style={{ padding: '24px', fontFamily: 'monospace' }}>
                    <div style={{ textAlign: 'center', borderBottom: '1px solid #00fff520', paddingBottom: '16px', marginBottom: '16px' }}>
                      <div style={{ color: '#00fff5', fontSize: '18px', fontWeight: 900, letterSpacing: '0.15em', textShadow: '0 0 12px #00fff5' }}>
                        SKILL ALL SHOW
                      </div>
                      <div style={{ color: '#00fff540', fontSize: '10px', marginTop: '4px' }}>SYS::DEDSEC_NET · STATUS: ONLINE</div>
                    </div>
                    <div style={{ color: '#00fff540', fontSize: '10px', letterSpacing: '0.2em', marginBottom: '6px' }}>&gt; ANUNCIO_OFICIAL</div>
                    <div style={{ color: '#00fff5', fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '16px', textShadow: '0 0 10px #00fff540' }}>
                      {announce.headline || 'TITULAR DEL ANUNCIO'}
                    </div>
                    <div style={{ color: '#c8fff8', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: '20px' }}>
                      {announce.message || 'El cuerpo del mensaje aparecerá aquí...'}
                    </div>
                    {announce.ctaText && (
                      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <span style={{ display: 'inline-block', padding: '10px 28px', border: '1px solid #00fff5', color: '#00fff5', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                          &gt; {announce.ctaText}
                        </span>
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid #00fff510', paddingTop: '16px', textAlign: 'center' }}>
                      <div style={{ color: '#00fff540', fontSize: '10px' }}>
                        Enviado por <strong style={{ color: '#00fff5' }}>{(user as any)?.displayName || (user as any)?.username || 'Admin'}</strong> · Skill All Show
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Result message */}
              {announceResult && (
                <div
                  className="p-3 rounded font-mono text-sm"
                  style={{
                    background: announceResult.error ? '#ff003c10' : '#00fff510',
                    border: `1px solid ${announceResult.error ? '#ff003c40' : '#00fff540'}`,
                    color: announceResult.error ? '#ff003c' : '#00fff5',
                  }}
                >
                  {announceResult.error
                    ? `// ERROR: ${announceResult.error.toUpperCase()}`
                    : `// OK: EMAIL ENVIADO A ${announceResult.sent} USUARIO${(announceResult.sent ?? 0) !== 1 ? 'S' : ''}`}
                </div>
              )}

              {/* Send button */}
              <button
                onClick={sendAnnounce}
                disabled={announcing || !announce.subject.trim() || !announce.headline.trim() || !announce.message.trim()}
                className="dedsec-btn py-3 text-sm flex items-center justify-center gap-2 w-full"
              >
                {announcing
                  ? <><Loader2 className="h-4 w-4 animate-spin" />ENVIANDO...</>
                  : <><Megaphone className="h-4 w-4" />ENVIAR ANUNCIO A TODOS LOS USUARIOS</>}
              </button>

              <p className="text-xs font-mono text-center" style={{ color: '#00fff530' }}>
                ⚠ Esto enviará un email desde noreply@stivion.com a cada usuario registrado.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

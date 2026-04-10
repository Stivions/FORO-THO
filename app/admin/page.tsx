'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BADGES, ALL_BADGE_IDS, type BadgeId } from '@/lib/badges'
import { Shield, ArrowLeft, Save, Loader2, Users, Check, X, Clock, Trash2, Megaphone, Eye, FileWarning, ExternalLink, Gift, Wallet, MessageSquare, Search, Download, ShieldAlert, Package, History } from 'lucide-react'

const AdminUsersPanel = dynamic(
  () => import('@/components/admin/admin-users-panel').then(mod => mod.AdminUsersPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

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
  sellerVerified?: boolean
  suspicious?: boolean
  suspiciousReason?: string
  sameIpUsers?: string[]
  sameIpCount?: number
  reputationScore?: number
  reputationVotes?: number
  vipAutoRenew?: boolean
  vip?: boolean
  vipExpiresAt?: string | null
  loginCount?: number
  lastLoginAt?: string
  lastLogin?: {
    ip?: string
    browser?: string
    os?: string
    device?: string
    country?: string
    city?: string
    authMethod?: string
  }
  recentLogins?: Array<{
    _id: string
    ip?: string
    browser?: string
    os?: string
    device?: string
    country?: string
    city?: string
    authMethod?: string
    createdAt: string
  }>
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
  const USER_PAGE_SIZE = 8
  const router = useRouter()
  const { user, sessionId } = useCurrentUser()
  const [users,         setUsers]         = useState<AdminUser[]>([])
  const [usersLoading,  setUsersLoading]  = useState(false)
  const [totalUsers,    setTotalUsers]    = useState(0)
  const [totalUserPages, setTotalUserPages] = useState(1)
  const [groups,        setGroups]        = useState<PendingGroup[]>([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState<string | null>(null)
  const [actioningGroup, setActioningGroup] = useState<string | null>(null)
  const [edits,         setEdits]         = useState<Record<string, {
    role: string
    badges: string[]
    sellerVerified?: boolean
    suspicious?: boolean
    suspiciousReason?: string
    vipAutoRenew?: boolean
    vip?: boolean
    vipExpiresAt?: string | null
  }>>({})
  const [tab,           setTab]           = useState<'users' | 'groups' | 'announce' | 'posts' | 'giveaway' | 'tickets' | 'accesses' | 'reports' | 'products'>('groups')
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
  const [announceResult, setAnnounceResult] = useState<{
    sent?: number
    total?: number
    failed?: number
    errors?: string[]
    invalidCount?: number
    invalidSample?: string[]
    error?: string
  } | null>(null)
  const [showPreview, setShowPreview]   = useState(false)

  // Giveaway state
  const [giveaways,       setGiveaways]       = useState<any[]>([])
  const [giveawaysLoading, setGiveawaysLoading] = useState(false)
  const [pendingPayments, setPendingPayments] = useState<any[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [giveawayForm,    setGiveawayForm]    = useState({
    title: '', description: '', prize: 'vip_1month', prizeDescription: 'Membresía VIP 1 mes', endsAt: '',
  })

  // Crypto donations state
  const [cryptoDonations, setCryptoDonations] = useState<any[]>([])
  const [donationsLoading, setDonationsLoading] = useState(false)

  // Tickets state
  const [tickets,        setTickets]        = useState<any[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [logins, setLogins] = useState<any[]>([])
  const [loginsLoading, setLoginsLoading] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [productRequests, setProductRequests] = useState<any[]>([])
  const [productRequestsLoading, setProductRequestsLoading] = useState(false)
  const [adminProducts, setAdminProducts] = useState<any[]>([])
  const [userFilters, setUserFilters] = useState({ q: '', country: '', ip: '', device: '', sameIpOnly: false, suspiciousOnly: false })
  const [userPage, setUserPage] = useState(1)

  const isAdmin      = (user as any)?.role === 'admin'
  const isSuperAdmin = (user as any)?.email === 'stevensanchezdev@gmail.com' && isAdmin
  const [resetting, setResetting] = useState(false)

  const mergeUserEdits = useCallback((incomingUsers: AdminUser[]) => {
    setEdits(prev => {
      const next = { ...prev }
      for (const u of incomingUsers) {
        next[u._id] = {
          role: next[u._id]?.role ?? u.role,
          badges: next[u._id]?.badges ?? [...u.badges],
          sellerVerified: next[u._id]?.sellerVerified ?? u.sellerVerified,
          suspicious: next[u._id]?.suspicious ?? u.suspicious,
          suspiciousReason: next[u._id]?.suspiciousReason ?? (u.suspiciousReason ?? ''),
          vipAutoRenew: next[u._id]?.vipAutoRenew ?? u.vipAutoRenew,
          vip: next[u._id]?.vip ?? u.vip,
          vipExpiresAt: next[u._id]?.vipExpiresAt ?? u.vipExpiresAt ?? null,
        }
      }
      return next
    })
  }, [])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const qs = new URLSearchParams({
        page: String(userPage),
        limit: String(USER_PAGE_SIZE),
      })
      if (userFilters.q.trim()) qs.set('q', userFilters.q.trim())
      if (userFilters.country.trim()) qs.set('country', userFilters.country.trim())
      if (userFilters.ip.trim()) qs.set('ip', userFilters.ip.trim())
      if (userFilters.device.trim()) qs.set('device', userFilters.device.trim())
      if (userFilters.sameIpOnly) qs.set('sameIpOnly', '1')
      if (userFilters.suspiciousOnly) qs.set('suspiciousOnly', '1')

      const res = await fetch(`/api/admin/users?${qs.toString()}`)
      const data = await res.json()
      const nextUsers = data.users ?? []
      setUsers(nextUsers)
      setTotalUsers(data.total ?? nextUsers.length)
      setTotalUserPages(data.totalPages ?? 1)
      mergeUserEdits(nextUsers)
    } catch {
      setUsers([])
      setTotalUsers(0)
      setTotalUserPages(1)
    } finally {
      setUsersLoading(false)
    }
  }, [mergeUserEdits, userFilters.country, userFilters.device, userFilters.ip, userFilters.q, userFilters.sameIpOnly, userFilters.suspiciousOnly, userPage])

  useEffect(() => {
    if (!sessionId) return
    fetch('/api/admin/groups')
      .then(r => r.json())
      .then(gd => {
        setGroups(gd.groups ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => {
    setUserPage(1)
  }, [userFilters.q, userFilters.country, userFilters.ip, userFilters.device, userFilters.sameIpOnly, userFilters.suspiciousOnly])

  useEffect(() => {
    if (!sessionId || tab !== 'users') return
    loadUsers()
  }, [sessionId, tab, loadUsers])

  useEffect(() => {
    if (userPage > totalUserPages) {
      setUserPage(totalUserPages)
    }
  }, [userPage, totalUserPages])

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
      if (res.ok) {
        setAnnounceResult({
          sent: data.sent,
          total: data.total,
          failed: data.failed,
          errors: data.errors,
          invalidCount: data.invalidCount,
          invalidSample: data.invalidSample,
        })
      } else {
        setAnnounceResult({
          error: data.error ?? 'Error al enviar',
          sent: data.sent,
          total: data.total,
          failed: data.failed,
          errors: data.errors,
          invalidCount: data.invalidCount,
          invalidSample: data.invalidSample,
        })
      }
    } finally {
      setAnnouncing(false)
    }
  }

  const loadGiveaways = async () => {
    setGiveawaysLoading(true)
    try {
      const [gr, pr] = await Promise.all([
        fetch('/api/admin/giveaway').then(r => r.json()),
        fetch('/api/admin/payments').then(r => r.json()),
      ])
      setGiveaways(gr.giveaways ?? [])
      setPendingPayments(pr.payments ?? [])
    } finally {
      setGiveawaysLoading(false)
    }
  }

  const loadPendingPayments = async () => {
    setPaymentsLoading(true)
    try {
      const pr = await fetch('/api/admin/payments').then(r => r.json())
      setPendingPayments(pr.payments ?? [])
    } finally {
      setPaymentsLoading(false)
    }
  }

  const loadCryptoDonations = async () => {
    setDonationsLoading(true)
    try {
      const res = await fetch('/api/admin/donations')
      const data = await res.json()
      setCryptoDonations(data.donations ?? [])
    } finally {
      setDonationsLoading(false)
    }
  }

  const handleDonationAction = async (donationId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/donations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationId, action }),
      })
      if (res.ok) {
        setCryptoDonations(prev => prev.filter(d => d._id !== donationId))
      }
    } catch {
      alert('Error al procesar donación')
    }
  }

  const loadTickets = async () => {
    setTicketsLoading(true)
    try {
      const res = await fetch('/api/tickets')
      const data = await res.json()
      setTickets(data.tickets ?? [])
    } finally {
      setTicketsLoading(false)
    }
  }

  const loadAccesses = async () => {
    setLoginsLoading(true)
    try {
      const qs = new URLSearchParams()
      if (userFilters.q.trim()) qs.set('q', userFilters.q.trim())
      if (userFilters.country.trim()) qs.set('country', userFilters.country.trim())
      if (userFilters.ip.trim()) qs.set('ip', userFilters.ip.trim())
      if (userFilters.device.trim()) qs.set('device', userFilters.device.trim())
      const res = await fetch(`/api/admin/logins${qs.toString() ? `?${qs.toString()}` : ''}`)
      const data = await res.json()
      setLogins(data.logins ?? [])
    } finally {
      setLoginsLoading(false)
    }
  }

  const loadReports = async () => {
    setReportsLoading(true)
    try {
      const res = await fetch('/api/admin/reports')
      const data = await res.json()
      setReports(data.reports ?? [])
    } finally {
      setReportsLoading(false)
    }
  }

  const loadProductRequests = async () => {
    setProductRequestsLoading(true)
    try {
      const [requestsRes, productsRes] = await Promise.all([
        fetch('/api/admin/product-requests').then(r => r.json()),
        fetch('/api/admin/products').then(r => r.json()),
      ])
      setProductRequests(requestsRes.requests ?? [])
      setAdminProducts(productsRes.products ?? [])
    } finally {
      setProductRequestsLoading(false)
    }
  }

  const updateReportStatus = async (id: string, status: string) => {
    const res = await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    const data = await res.json()
    if (res.ok) {
      setReports(prev => prev.map(item => item._id === id ? { ...item, ...data.report } : item))
    }
  }

  const updateProductRequest = async (id: string, status: string) => {
    const res = await fetch('/api/admin/product-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    const data = await res.json()
    if (res.ok) {
      setProductRequests(prev => prev.map(item => item._id === id ? { ...item, ...data.request } : item))
    }
  }

  const exportCsv = (type: 'users' | 'logins') => {
    window.open(`/api/admin/export?type=${type}`, '_blank')
  }

  const toggleFeaturedProduct = async (productId: string, featured: boolean) => {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: !featured }),
    })
    const data = await res.json()
    if (res.ok) {
      setAdminProducts(prev => prev.map(item => item._id === productId ? { ...item, ...data.product } : item))
    }
  }

  const handleDrawWinner = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/giveaway/${id}/draw`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert(`🎉 Ganador sorteado: @${data.winner.username} (${data.winner.email})`)
        setGiveaways(prev => prev.map(g => g._id === id ? { ...g, status: 'ended', winner: { username: data.winner.username } } : g))
      } else {
        alert('Error: ' + data.error)
      }
    } catch {
      alert('Error al sortear ganador')
    }
  }

  const handlePaymentAction = async (paymentId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      })
      if (res.ok) {
        setPendingPayments(prev => prev.filter(p => p._id !== paymentId))
      } else {
        const data = await res.json()
        alert('Error: ' + data.error)
      }
    } catch {
      alert('Error al procesar pago')
    }
  }

  const handleCreateGiveaway = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!giveawayForm.title.trim() || !giveawayForm.endsAt) return
    try {
      const res = await fetch('/api/admin/giveaway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(giveawayForm),
      })
      const data = await res.json()
      if (res.ok) {
        setGiveaways(prev => [data.giveaway, ...prev])
        setGiveawayForm({ title: '', description: '', prize: 'vip_1month', prizeDescription: 'Membresía VIP 1 mes', endsAt: '' })
      } else {
        alert('Error: ' + data.error)
      }
    } catch {
      alert('Error al crear sorteo')
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

  const setUserFlag = (userId: string, patch: Record<string, unknown>) => {
    setEdits(prev => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? { role: 'user', badges: [] }), ...patch },
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

  const safeUserPage = Math.min(userPage, totalUserPages)

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
            onClick={() => { setTab('users'); setUserPage(1) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'users' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Shield className="h-4 w-4" />
            Usuarios ({totalUsers || users.length})
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
          <button
            onClick={() => { setTab('giveaway'); loadGiveaways(); loadCryptoDonations() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'giveaway' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Gift className="h-4 w-4" />
            Sorteos
          </button>
          <button
            onClick={() => { setTab('tickets'); loadTickets() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'tickets' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <MessageSquare className="h-4 w-4" />
            Tickets
            {tickets.filter(t => t.status === 'open').length > 0 && (
              <span className="bg-cyan-500 text-black text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {tickets.filter(t => t.status === 'open').length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab('accesses'); loadAccesses() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'accesses' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <History className="h-4 w-4" />
            Accesos
          </button>
          <button
            onClick={() => { setTab('reports'); loadReports() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'reports' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ShieldAlert className="h-4 w-4" />
            Reportes
          </button>
          <button
            onClick={() => { setTab('products'); loadProductRequests() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'products' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Package className="h-4 w-4" />
            Productos
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
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">Mostrando {users.length} de {totalUsers} usuarios</p>
              <Button size="sm" variant="outline" onClick={() => exportCsv('users')} className="gap-2">
                <Download className="h-4 w-4" />CSV Usuarios
              </Button>
            </div>
            <div className="grid md:grid-cols-5 gap-2">
              <input value={userFilters.q} onChange={e => setUserFilters(prev => ({ ...prev, q: e.target.value }))} placeholder="Buscar usuario/IP/pais" className="dedsec-input px-3 py-2 text-sm md:col-span-2" />
              <input value={userFilters.country} onChange={e => setUserFilters(prev => ({ ...prev, country: e.target.value }))} placeholder="Pais" className="dedsec-input px-3 py-2 text-sm" />
              <input value={userFilters.ip} onChange={e => setUserFilters(prev => ({ ...prev, ip: e.target.value }))} placeholder="IP" className="dedsec-input px-3 py-2 text-sm" />
              <input value={userFilters.device} onChange={e => setUserFilters(prev => ({ ...prev, device: e.target.value }))} placeholder="Dispositivo" className="dedsec-input px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3 flex-wrap text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={userFilters.sameIpOnly} onChange={e => setUserFilters(prev => ({ ...prev, sameIpOnly: e.target.checked }))} />
                Con IP repetida
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={userFilters.suspiciousOnly} onChange={e => setUserFilters(prev => ({ ...prev, suspiciousOnly: e.target.checked }))} />
                Solo sospechosos
              </label>
            </div>
            <AdminUsersPanel
              usersLoading={usersLoading}
              users={users}
              edits={edits}
              totalUsers={totalUsers}
              safeUserPage={safeUserPage}
              totalUserPages={totalUserPages}
              userPageSize={USER_PAGE_SIZE}
              saving={saving}
              banningId={banningId}
              banConfirm={banConfirm}
              banReason={banReason}
              banIp={banIp}
              setUserFlag={setUserFlag}
              setRole={setRole}
              toggleBadge={toggleBadge}
              saveUser={saveUser}
              setBanConfirm={setBanConfirm}
              setBanReason={updater => setBanReason(updater)}
              setBanIp={updater => setBanIp(updater)}
              handleBan={handleBan}
              setUserPage={updater => setUserPage(updater)}
            />
            {false && (
              <>
            {usersLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">No hay usuarios para esos filtros</p>
            ) : users.map(u => {
              const edit = edits[u._id] ?? {
                role: u.role,
                badges: u.badges,
                sellerVerified: u.sellerVerified,
                suspicious: u.suspicious,
                suspiciousReason: u.suspiciousReason ?? '',
                vipAutoRenew: u.vipAutoRenew,
              }
              const changed =
                edit.role !== u.role ||
                JSON.stringify([...edit.badges].sort()) !== JSON.stringify([...u.badges].sort()) ||
                (edit.sellerVerified ?? false) !== (u.sellerVerified ?? false) ||
                (edit.suspicious ?? false) !== (u.suspicious ?? false) ||
                (edit.suspiciousReason ?? '') !== (u.suspiciousReason ?? '') ||
                (edit.vipAutoRenew ?? false) !== (u.vipAutoRenew ?? false)

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
                          {u.sellerVerified && (
                            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#00ff8815', color: '#00ff88', border: '1px solid #00ff8830' }}>
                              VENDEDOR
                            </span>
                          )}
                          {u.suspicious && (
                            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#ff950015', color: '#ff9500', border: '1px solid #ff950030' }}>
                              SOSPECHOSO
                            </span>
                          )}
                        </div>
                        {u.lastKnownIp && (
                          <div className="text-xs font-mono mb-1" style={{ color: '#00fff540' }}>
                            IP: {u.lastKnownIp}
                            {(u.sameIpCount ?? 0) > 0 && <span style={{ color: '#ff9500' }}> Â· {u.sameIpCount} cuenta(s) mas con la misma IP</span>}
                          </div>
                        )}
                        {(u.lastLoginAt || u.loginCount) && (
                          <div className="mb-2 p-2 rounded" style={{ background: '#00fff508', border: '1px solid #00fff515' }}>
                            <div className="text-xs font-mono mb-1" style={{ color: '#00fff580' }}>
                              ACCESOS: {u.loginCount ?? 0}
                              {u.lastLoginAt ? ` · ULTIMO: ${new Date(u.lastLoginAt).toLocaleString('es-ES')}` : ''}
                            </div>
                            {u.lastLogin && (
                              <div className="text-xs font-mono" style={{ color: '#00fff540' }}>
                                {[
                                  u.lastLogin.device,
                                  u.lastLogin.browser,
                                  u.lastLogin.os,
                                  u.lastLogin.country,
                                  u.lastLogin.city,
                                  u.lastLogin.authMethod ? `via ${u.lastLogin.authMethod}` : '',
                                ].filter(Boolean).join(' · ')}
                              </div>
                            )}
                            {(u.recentLogins?.length ?? 0) > 0 && (
                              <div className="mt-2 space-y-1">
                                {u.recentLogins!.map(login => (
                                  <div key={login._id} className="text-[11px] font-mono" style={{ color: '#00fff530' }}>
                                    {new Date(login.createdAt).toLocaleString('es-ES')} · {[
                                      login.ip,
                                      login.device,
                                      login.browser,
                                      login.os,
                                      login.country,
                                      login.city,
                                    ].filter(Boolean).join(' · ')}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mb-2 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={edit.sellerVerified === true} onChange={e => setUserFlag(u._id, { sellerVerified: e.target.checked })} />
                            Vendedor verificado
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={edit.suspicious === true} onChange={e => setUserFlag(u._id, { suspicious: e.target.checked })} />
                            Marcar sospechoso
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={edit.vipAutoRenew === true} onChange={e => setUserFlag(u._id, { vipAutoRenew: e.target.checked })} />
                            Auto VIP
                          </label>
                        </div>

                        <input
                          value={edit.suspiciousReason ?? ''}
                          onChange={e => setUserFlag(u._id, { suspiciousReason: e.target.value })}
                          placeholder="Motivo sospechoso / nota interna"
                          className="dedsec-input w-full px-2 py-1 text-xs outline-none mb-2"
                        />

                        <div className="flex flex-wrap gap-4 mb-3 text-xs text-muted-foreground">
                          <span>Reputacion: {u.reputationScore ?? 0}</span>
                          <span>Votos: {u.reputationVotes ?? 0}</span>
                        </div>

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
            {totalUsers > USER_PAGE_SIZE && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button size="sm" variant="outline" disabled={safeUserPage <= 1} onClick={() => setUserPage(p => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  Pagina {safeUserPage} de {totalUserPages}
                </span>
                <Button size="sm" variant="outline" disabled={safeUserPage >= totalUserPages} onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}>
                  Siguiente
                </Button>
              </div>
            )}
              </>
            )}
          </div>
        ) : tab === 'accesses' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">Ultimos accesos registrados</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => exportCsv('logins')} className="gap-2">
                  <Download className="h-4 w-4" />CSV Logins
                </Button>
                <Button size="sm" variant="outline" onClick={loadAccesses} className="gap-2">
                  <Search className="h-4 w-4" />Actualizar
                </Button>
              </div>
            </div>
            {loginsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : logins.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">Sin accesos todavia</p>
            ) : (
              logins.map(login => (
                <Card key={login._id} className="bg-card border-border">
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{login.user?.displayName || login.user?.username || 'Usuario'}</span>
                      <span className="text-xs text-muted-foreground">@{login.user?.username}</span>
                      <span className="text-xs text-muted-foreground">{login.user?.email}</span>
                    </div>
                    <p className="text-xs font-mono" style={{ color: '#00fff560' }}>
                      {new Date(login.createdAt).toLocaleString('es-ES')}
                    </p>
                    <p className="text-xs font-mono" style={{ color: '#00fff540' }}>
                      {[login.ip, login.country, login.city, login.device, login.browser, login.os, login.authMethod].filter(Boolean).join(' Â· ')}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : tab === 'reports' ? (
          <div className="space-y-4">
            {reportsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : reports.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">Sin reportes</p>
            ) : (
              reports.map(report => (
                <Card key={report._id} className="bg-card border-border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold uppercase">{report.targetType}</span>
                      <Badge variant="outline">{report.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString('es-ES')}</span>
                    </div>
                    <p className="text-sm">Motivo: {report.reason}</p>
                    {report.details && <p className="text-xs text-muted-foreground">{report.details}</p>}
                    <p className="text-xs text-muted-foreground">
                      Reporter: {(report.reporter as any)?.username ?? 'usuario'} · Reportado: {(report.reportedUser as any)?.username ?? 'N/A'}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {['open', 'reviewing', 'resolved', 'dismissed'].map(status => (
                        <Button key={status} size="sm" variant="outline" onClick={() => updateReportStatus(report._id, status)}>
                          {status}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : tab === 'products' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Solicitudes de producto con estado</p>
            {productRequestsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : productRequests.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">Sin solicitudes de producto</p>
            ) : (
              productRequests.map(request => (
                <Card key={request._id} className="bg-card border-border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{request.product?.title ?? 'Producto'}</span>
                      {request.product?.featured && <Badge variant="outline">Destacado</Badge>}
                      <Badge variant="outline">{request.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Usuario: {request.user?.displayName || request.user?.username || 'usuario'} · {request.user?.email}
                    </p>
                    {request.message && <p className="text-sm">{request.message}</p>}
                    {request.ticket?._id && (
                      <Link href={`/tickets/${request.ticket._id}`} className="text-xs font-mono text-cyan-400 hover:text-cyan-300">
                        Ver ticket: {request.ticket.subject ?? request.ticket._id}
                      </Link>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {['pending', 'reviewing', 'approved', 'rejected', 'fulfilled'].map(status => (
                        <Button key={status} size="sm" variant="outline" onClick={() => updateProductRequest(request._id, status)}>
                          {status}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Productos destacados</p>
              <div className="space-y-3">
                {adminProducts.map(product => (
                  <Card key={product._id} className="bg-card border-border">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{product.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.uploadedBy?.displayName || product.uploadedBy?.username || 'admin'}
                        </p>
                      </div>
                      <Button size="sm" variant={product.featured ? 'default' : 'outline'} onClick={() => toggleFeaturedProduct(product._id, product.featured === true)}>
                        {product.featured ? 'Quitar destacado' : 'Destacar'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
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
                    placeholder="https://tu-dominio.com"
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
              {announceResult && (() => {
                const sent = announceResult.sent ?? 0
                const total = announceResult.total ?? sent
                const failed = announceResult.failed ?? 0
                const invalidCount = announceResult.invalidCount ?? 0
                const hasError = Boolean(announceResult.error) || failed > 0 || invalidCount > 0

                return (
                  <div
                    className="p-3 rounded font-mono text-sm"
                    style={{
                      background: hasError ? '#ff003c10' : '#00fff510',
                      border: `1px solid ${hasError ? '#ff003c40' : '#00fff540'}`,
                      color: hasError ? '#ff003c' : '#00fff5',
                    }}
                  >
                    {announceResult.error
                      ? `// ERROR: ${announceResult.error.toUpperCase()}`
                      : (failed > 0 || invalidCount > 0)
                        ? `// PARCIAL: ENVIADO ${sent}/${total}. FALLARON ${failed}. INVALIDOS ${invalidCount}.`
                        : `// OK: EMAIL ENVIADO A ${sent} USUARIO${sent !== 1 ? 'S' : ''}`}
                    {announceResult.errors?.length ? (
                      <div className="mt-1 text-[11px]" style={{ color: hasError ? '#ff003c' : '#00fff5' }}>
                        {`DETALLES: ${announceResult.errors.slice(0, 2).join(' | ')}`}
                      </div>
                    ) : null}
                    {(announceResult.invalidSample?.length ?? 0) > 0 ? (
                      <div className="mt-1 text-[11px]" style={{ color: hasError ? '#ff003c' : '#00fff5' }}>
                        {`INVALIDOS: ${announceResult.invalidSample!.slice(0, 5).join(' | ')}`}
                      </div>
                    ) : null}
                  </div>
                )
              })()}

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
        ) : tab === 'giveaway' ? (
          <div className="space-y-8">
            {/* Create Giveaway */}
            <div className="p-5 rounded" style={{ border: '1px solid #ffaa0030', background: '#ffaa0005' }}>
              <h2 className="text-sm font-mono font-semibold uppercase tracking-widest mb-4" style={{ color: '#ffaa00' }}>
                {'// CREAR SORTEO'}
              </h2>
              <form onSubmit={handleCreateGiveaway} className="space-y-3">
                <input
                  placeholder="Título del sorteo"
                  value={giveawayForm.title}
                  onChange={e => setGiveawayForm(p => ({ ...p, title: e.target.value }))}
                  className="dedsec-input w-full px-3 py-2 text-sm outline-none"
                />
                <textarea
                  placeholder="Descripción (opcional)"
                  value={giveawayForm.description}
                  onChange={e => setGiveawayForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="dedsec-input w-full px-3 py-2 text-sm outline-none resize-none"
                />
                <select
                  value={giveawayForm.prize}
                  onChange={e => setGiveawayForm(p => ({ ...p, prize: e.target.value }))}
                  className="dedsec-input w-full px-3 py-2 text-sm outline-none"
                >
                  <option value="vip_1month">VIP 1 mes</option>
                  <option value="custom">Premio personalizado</option>
                </select>
                {giveawayForm.prize === 'custom' && (
                  <input
                    placeholder="Descripción del premio"
                    value={giveawayForm.prizeDescription}
                    onChange={e => setGiveawayForm(p => ({ ...p, prizeDescription: e.target.value }))}
                    className="dedsec-input w-full px-3 py-2 text-sm outline-none"
                  />
                )}
                <div>
                  <label className="text-xs font-mono text-muted-foreground mb-1 block">Fecha y hora de fin</label>
                  <input
                    type="datetime-local"
                    value={giveawayForm.endsAt}
                    onChange={e => setGiveawayForm(p => ({ ...p, endsAt: e.target.value }))}
                    className="dedsec-input w-full px-3 py-2 text-sm outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!giveawayForm.title.trim() || !giveawayForm.endsAt}
                  className="dedsec-btn w-full py-2 text-sm flex items-center justify-center gap-2"
                >
                  <Gift className="h-4 w-4" /> Crear Sorteo
                </button>
              </form>
            </div>

            {/* Giveaways list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-mono font-semibold uppercase tracking-widest" style={{ color: '#ffaa00' }}>
                  {'// SORTEOS ACTIVOS / PASADOS'}
                </h2>
                <button onClick={loadGiveaways} className="text-xs font-mono" style={{ color: '#00fff560' }}>↻ Actualizar</button>
              </div>
              {giveawaysLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : giveaways.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay sorteos todavía</p>
              ) : (
                <div className="space-y-3">
                  {giveaways.map(g => (
                    <div key={g._id} className="p-4 rounded" style={{ border: '1px solid #ffaa0020', background: '#ffaa0005' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-sm">{g.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded font-mono" style={{
                              background: g.status === 'active' ? '#00ff8820' : '#ff003c20',
                              color: g.status === 'active' ? '#00ff88' : '#ff003c',
                              border: `1px solid ${g.status === 'active' ? '#00ff8840' : '#ff003c40'}`,
                            }}>
                              {g.status === 'active' ? '● ACTIVO' : '■ FINALIZADO'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{g.prizeDescription}</p>
                          <p className="text-xs font-mono" style={{ color: '#ffaa0060' }}>
                            {g.participants?.length ?? 0} participantes · Fin: {new Date(g.endsAt).toLocaleString('es-ES')}
                          </p>
                          {g.winner && (
                            <p className="text-xs font-mono mt-1" style={{ color: '#00ff88' }}>
                              🏆 Ganador: @{g.winner.username ?? 'desconocido'}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          {g.status === 'active' && (
                            <button
                              onClick={() => handleDrawWinner(g._id)}
                              className="text-xs px-3 py-1.5 rounded font-mono transition-all"
                              style={{ background: '#ffaa0020', border: '1px solid #ffaa0050', color: '#ffaa00', cursor: 'pointer' }}
                            >
                              🎲 Sortear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Crypto Payments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-mono font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: '#00fff5' }}>
                  <Wallet className="h-4 w-4" />{'// PAGOS CRIPTO PENDIENTES'}
                </h2>
                <button onClick={loadPendingPayments} className="text-xs font-mono" style={{ color: '#00fff560' }}>↻ Actualizar</button>
              </div>
              {paymentsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : pendingPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay pagos cripto pendientes</p>
              ) : (
                <div className="space-y-3">
                  {pendingPayments.map(p => (
                    <div key={p._id} className="p-4 rounded" style={{ border: '1px solid #00fff520', background: '#00fff505' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">@{p.user?.username} <span className="text-xs text-muted-foreground">{p.user?.email}</span></p>
                          <p className="text-xs font-mono mt-1" style={{ color: '#00fff5' }}>
                            {p.cryptoCurrency || p.method?.toUpperCase()} · {p.amount} USD
                          </p>
                          <p className="text-xs font-mono mt-0.5 truncate" style={{ color: '#00fff560' }} title={p.cryptoTxHash}>
                            TX: {p.cryptoTxHash?.slice(0, 40)}{p.cryptoTxHash?.length > 40 ? '...' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(p.createdAt).toLocaleString('es-ES')}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handlePaymentAction(p._id, 'approve')}
                            className="text-xs px-3 py-1.5 rounded font-mono"
                            style={{ background: '#00ff8820', border: '1px solid #00ff8850', color: '#00ff88', cursor: 'pointer' }}
                          >
                            ✓ Aprobar VIP
                          </button>
                          <button
                            onClick={() => handlePaymentAction(p._id, 'reject')}
                            className="text-xs px-3 py-1.5 rounded font-mono"
                            style={{ background: '#ff003c10', border: '1px solid #ff003c40', color: '#ff003c', cursor: 'pointer' }}
                          >
                            ✕ Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Crypto Donations */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-mono font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: '#ffaa00' }}>
                  <Wallet className="h-4 w-4" />{'// DONACIONES CRIPTO'}
                </h2>
                <button onClick={loadCryptoDonations} className="text-xs font-mono" style={{ color: '#00fff560' }}>↻ Actualizar</button>
              </div>
              {donationsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : cryptoDonations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay donaciones cripto</p>
              ) : (
                <div className="space-y-3">
                  {cryptoDonations.map(d => (
                    <div key={d._id} className="p-4 rounded" style={{ border: '1px solid #ffaa0030', background: '#ffaa0008' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: '#c8fff8' }}>
                            {d.user ? `@${d.user.username}` : d.displayName || 'Anónimo'}
                            {d.user?.email && <span className="text-xs text-muted-foreground ml-2">{d.user.email}</span>}
                          </p>
                          <p className="text-xs font-mono mt-1" style={{ color: '#ffaa00' }}>
                            {d.cryptoCurrency} · ${d.amount} USD
                          </p>
                          <p className="text-xs font-mono mt-0.5 truncate" style={{ color: '#ffaa0080' }} title={d.cryptoTxHash}>
                            TX: {d.cryptoTxHash?.slice(0, 40)}{d.cryptoTxHash?.length > 40 ? '...' : ''}
                          </p>
                          {d.message && <p className="text-xs text-muted-foreground mt-0.5 italic">"{d.message}"</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(d.createdAt).toLocaleString('es-ES')} · Estado: {d.status}
                          </p>
                        </div>
                        {d.status === 'pending' && (
                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => handleDonationAction(d._id, 'approve')}
                              className="text-xs px-3 py-1.5 rounded font-mono"
                              style={{ background: '#00ff8820', border: '1px solid #00ff8850', color: '#00ff88', cursor: 'pointer' }}
                            >
                              ✓ Confirmar
                            </button>
                            <button
                              onClick={() => handleDonationAction(d._id, 'reject')}
                              className="text-xs px-3 py-1.5 rounded font-mono"
                              style={{ background: '#ff003c10', border: '1px solid #ff003c40', color: '#ff003c', cursor: 'pointer' }}
                            >
                              ✕ Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : tab === 'tickets' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {tickets.filter(t => t.status === 'open').length} abiertos · {tickets.length} total
              </p>
              <button onClick={loadTickets} className="text-xs font-mono" style={{ color: '#00fff560' }}>↻ Actualizar</button>
            </div>
            {ticketsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : tickets.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">No hay tickets todavía</p>
            ) : (
              <div className="space-y-2">
                {tickets.map(t => {
                  const statusColor =
                    t.status === 'open' ? '#00fff5' :
                    t.status === 'in_progress' ? '#ff9500' : '#555'
                  const statusLabel =
                    t.status === 'open' ? 'ABIERTO' :
                    t.status === 'in_progress' ? 'EN PROCESO' : 'CERRADO'
                  return (
                    <div
                      key={t._id}
                      className="p-4 rounded"
                      style={{ border: '1px solid #00fff515', background: '#00fff505' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm truncate">{t.subject}</span>
                            <span className="text-xs font-mono px-2 py-0.5 rounded"
                              style={{ color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}40` }}>
                              {statusLabel}
                            </span>
                            <span className="text-xs font-mono" style={{ color: '#ffaa0080' }}>{t.priority?.toUpperCase()}</span>
                            <span className="text-xs font-mono" style={{ color: '#00fff540' }}>{t.category}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            @{t.user?.username} · {t.user?.email ?? ''} · {new Date(t.createdAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <a
                          href={`/tickets/${t._id}`}
                          className="text-xs font-mono px-3 py-1.5 rounded shrink-0 transition-all"
                          style={{ background: '#00fff510', border: '1px solid #00fff530', color: '#00fff5' }}
                        >
                          → VER
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

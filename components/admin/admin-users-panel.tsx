'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Save } from 'lucide-react'
import { BADGES, ALL_BADGE_IDS } from '@/lib/badges'

interface UserDetail {
  recentLogins: Array<{
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
  sameIpUsers: Array<{
    _id: string
    username: string
    displayName?: string
    email?: string
    role?: string
    banned?: boolean
    sellerVerified?: boolean
    suspicious?: boolean
  }>
}

interface AdminUsersPanelProps {
  usersLoading: boolean
  users: any[]
  edits: Record<string, any>
  totalUsers: number
  safeUserPage: number
  totalUserPages: number
  userPageSize: number
  saving: string | null
  banningId: string | null
  banConfirm: string | null
  banReason: Record<string, string>
  banIp: Record<string, boolean>
  setUserFlag: (userId: string, patch: Record<string, unknown>) => void
  setRole: (userId: string, role: string) => void
  toggleBadge: (userId: string, badge: string) => void
  saveUser: (userId: string) => void
  setBanConfirm: (userId: string | null) => void
  setBanReason: (updater: (prev: Record<string, string>) => Record<string, string>) => void
  setBanIp: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  handleBan: (userId: string, action: 'ban' | 'unban') => void
  setUserPage: (updater: (prev: number) => number) => void
}

export function AdminUsersPanel({
  usersLoading,
  users,
  edits,
  totalUsers,
  safeUserPage,
  totalUserPages,
  userPageSize,
  saving,
  banningId,
  banConfirm,
  banReason,
  banIp,
  setUserFlag,
  setRole,
  toggleBadge,
  saveUser,
  setBanConfirm,
  setBanReason,
  setBanIp,
  handleBan,
  setUserPage,
}: AdminUsersPanelProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [detailsByUserId, setDetailsByUserId] = useState<Record<string, UserDetail>>({})
  const [detailLoadingByUserId, setDetailLoadingByUserId] = useState<Record<string, boolean>>({})

  const loadUserDetails = async (userId: string) => {
    if (detailsByUserId[userId] || detailLoadingByUserId[userId]) return

    setDetailLoadingByUserId(prev => ({ ...prev, [userId]: true }))
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      const data = await res.json()
      if (res.ok) {
        setDetailsByUserId(prev => ({
          ...prev,
          [userId]: {
            recentLogins: data.recentLogins ?? [],
            sameIpUsers: data.sameIpUsers ?? [],
          },
        }))
      }
    } finally {
      setDetailLoadingByUserId(prev => ({ ...prev, [userId]: false }))
    }
  }

  const toggleExpanded = (userId: string) => {
    setExpandedUserId(prev => {
      const next = prev === userId ? null : userId
      if (next) void loadUserDetails(next)
      return next
    })
  }

  if (usersLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (users.length === 0) {
    return <p className="text-center py-10 text-sm text-muted-foreground">No hay usuarios para esos filtros</p>
  }

  return (
    <>
      {users.map(u => {
        const edit = edits[u._id] ?? {
          role: u.role,
          badges: Array.isArray(u.badges) ? u.badges : [],
          sellerVerified: u.sellerVerified,
          suspicious: u.suspicious,
          suspiciousReason: u.suspiciousReason ?? '',
          vipAutoRenew: u.vipAutoRenew,
        }
        const editBadges = Array.isArray(edit.badges) ? edit.badges : []
        const userBadges = Array.isArray(u.badges) ? u.badges : []
        const changed =
          edit.role !== u.role ||
          JSON.stringify([...editBadges].sort()) !== JSON.stringify([...userBadges].sort()) ||
          (edit.sellerVerified ?? false) !== (u.sellerVerified ?? false) ||
          (edit.suspicious ?? false) !== (u.suspicious ?? false) ||
          (edit.suspiciousReason ?? '') !== (u.suspiciousReason ?? '') ||
          (edit.vipAutoRenew ?? false) !== (u.vipAutoRenew ?? false)
        const isExpanded = expandedUserId === u._id
        const detail = detailsByUserId[u._id]
        const isLoadingDetail = detailLoadingByUserId[u._id] === true

        return (
          <Card key={u._id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>{String(u.username || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{u.displayName || u.username}</span>
                        <span className="text-sm text-muted-foreground">@{u.username}</span>
                        <span className="text-xs text-muted-foreground break-all">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="outline">{edit.role}</Badge>
                        {u.banned && <Badge variant="outline" className="text-red-400 border-red-400/40">Baneado</Badge>}
                        {edit.sellerVerified && <Badge variant="outline" className="text-green-400 border-green-400/40">Vendedor</Badge>}
                        {edit.suspicious && <Badge variant="outline" className="text-orange-400 border-orange-400/40">Sospechoso</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>IP: {u.lastKnownIp || 'Sin registro'}</div>
                    <div>Accesos: {u.loginCount ?? 0}</div>
                    <div>Ultimo acceso: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('es-ES') : 'Sin registro'}</div>
                  </div>

                  {(u.sameIpCount ?? 0) > 0 && (
                    <p className="text-xs font-mono mt-2" style={{ color: '#ff9500' }}>
                      {u.sameIpCount} cuenta(s) mas usan la misma IP
                    </p>
                  )}

                  {isExpanded && (
                    <div className="mt-4 space-y-4 rounded border border-border p-3">
                      <div className="flex flex-wrap gap-3 text-xs">
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
                        className="dedsec-input w-full px-2 py-1 text-xs outline-none"
                      />

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>Reputacion: {u.reputationScore ?? 0}</span>
                        <span>Votos: {u.reputationVotes ?? 0}</span>
                        <span>
                          {[u.lastLogin?.device, u.lastLogin?.browser, u.lastLogin?.os, u.lastLogin?.country, u.lastLogin?.city].filter(Boolean).join(' · ') || 'Sin detalle de dispositivo'}
                        </span>
                      </div>

                      {isLoadingDetail && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Cargando detalles del usuario...
                        </div>
                      )}

                      {(detail?.sameIpUsers?.length ?? 0) > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Cuentas con la misma IP</p>
                          {detail!.sameIpUsers.map(other => (
                            <div key={other._id} className="text-[11px] font-mono" style={{ color: '#ff9500cc' }}>
                              @{other.username}
                              {other.displayName ? ` (${other.displayName})` : ''}
                              {other.role ? ` · ${other.role}` : ''}
                              {other.email ? ` · ${other.email}` : ''}
                              {other.banned ? ' · baneado' : ''}
                              {other.sellerVerified ? ' · vendedor' : ''}
                              {other.suspicious ? ' · sospechoso' : ''}
                            </div>
                          ))}
                        </div>
                      )}

                      {banConfirm === u._id && !u.banned && (
                        <div className="p-3 rounded space-y-2" style={{ background: '#ff003c08', border: '1px solid #ff003c30' }}>
                          <input
                            placeholder="Razon del ban (opcional)"
                            value={banReason[u._id] || ''}
                            onChange={e => setBanReason(prev => ({ ...prev, [u._id]: e.target.value }))}
                            className="dedsec-input w-full px-2 py-1 text-xs outline-none"
                          />
                          {u.lastKnownIp && (
                            <label className="flex items-center gap-2 text-xs font-mono cursor-pointer" style={{ color: '#ff003c80' }}>
                              <input
                                type="checkbox"
                                checked={banIp[u._id] || false}
                                onChange={e => setBanIp(prev => ({ ...prev, [u._id]: e.target.checked }))}
                                className="accent-red-500"
                              />
                              Banear tambien IP ({u.lastKnownIp})
                            </label>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleBan(u._id, 'ban')}
                              disabled={banningId === u._id}
                              className="flex-1 py-1 text-xs font-mono rounded transition-all"
                              style={{ background: '#ff003c20', border: '1px solid #ff003c', color: '#ff003c' }}
                            >
                              {banningId === u._id ? '...' : 'CONFIRMAR BAN'}
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

                      <div className="flex items-center gap-2 flex-wrap">
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

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Insignias:</span>
                        {ALL_BADGE_IDS.map(bid => {
                          const badge = BADGES[bid]
                          const active = editBadges.includes(bid)
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

                      {(detail?.recentLogins?.length ?? 0) > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Ultimos accesos</p>
                          {detail!.recentLogins.map((login: any) => (
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
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => toggleExpanded(u._id)}>
                    {isExpanded ? 'Ocultar' : 'Detalles'}
                  </Button>
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
                        {banningId === u._id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Desbanear'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (expandedUserId !== u._id) {
                            void loadUserDetails(u._id)
                          }
                          setExpandedUserId(u._id)
                          setBanConfirm(banConfirm === u._id ? null : u._id)
                        }}
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

      {totalUsers > userPageSize && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={safeUserPage <= 1} onClick={() => setUserPage(prev => Math.max(1, prev - 1))}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Pagina {safeUserPage} de {totalUserPages}
          </span>
          <Button size="sm" variant="outline" disabled={safeUserPage >= totalUserPages} onClick={() => setUserPage(prev => Math.min(totalUserPages, prev + 1))}>
            Siguiente
          </Button>
        </div>
      )}
    </>
  )
}

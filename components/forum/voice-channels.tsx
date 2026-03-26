'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useVoiceRoom } from '@/contexts/voice-room-context'
import {
  Volume2, Plus, Mic, Users, Settings, Trash2,
  Check, X, UserX, ChevronDown, ChevronRight,
  Loader2, Edit2, LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Participant { identity: string; name: string }
interface Channel {
  _id: string
  name: string
  description: string
  owner: { _id: string; username: string; displayName?: string }
  roomId: string
  maxParticipants: number
  participantCount: number
  participants: Participant[]
}

export function VoiceChannels() {
  const { data: session } = useSession()
  const { roomName: activeRoom, join, leave } = useVoiceRoom()

  const [channels,   setChannels]   = useState<Channel[]>([])
  const [expanded,   setExpanded]   = useState(true)
  const [creating,   setCreating]   = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newDesc,    setNewDesc]    = useState('')
  const [newMax,     setNewMax]     = useState(20)
  const [saving,     setSaving]     = useState(false)

  // Per-channel state
  const [joiningId,  setJoiningId]  = useState<string | null>(null)
  const [managingId, setManagingId] = useState<string | null>(null)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [editName,   setEditName]   = useState('')
  const [editDesc,   setEditDesc]   = useState('')
  const [kickingId,  setKickingId]  = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const uid  = (session?.user as any)?.id  ?? ''
  const role = (session?.user as any)?.role ?? ''

  const canManage = (ch: Channel) =>
    role === 'admin' || role === 'moderator' || ch.owner._id === uid

  // ── Fetch channels + participants every 5s ──
  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/voice/channels')
      if (res.ok) setChannels((await res.json()).channels ?? [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchChannels()
    const t = setInterval(fetchChannels, 5000)
    return () => clearInterval(t)
  }, [fetchChannels])

  // ── Join a channel ──
  const handleJoin = async (ch: Channel) => {
    if (!session) return
    setJoiningId(ch._id)
    try {
      const res = await fetch(`/api/voice/token?room=${encodeURIComponent(ch.roomId)}`)
      if (!res.ok) return
      const { token, serverUrl } = await res.json()
      join(ch.roomId, ch.name, token, serverUrl)
    } finally {
      setJoiningId(null)
    }
  }

  // ── Create channel ──
  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/voice/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), maxParticipants: newMax }),
      })
      if (res.ok) {
        const { channel } = await res.json()
        setChannels(prev => [{ ...channel, participantCount: 0, participants: [] }, ...prev])
        setNewName(''); setNewDesc(''); setNewMax(20); setCreating(false)
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Edit channel ──
  const startEdit = (ch: Channel) => {
    setEditingId(ch._id)
    setEditName(ch.name)
    setEditDesc(ch.description)
    setManagingId(null)
  }

  const saveEdit = async (ch: Channel) => {
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/voice/channels/${ch._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc }),
      })
      if (res.ok) {
        setChannels(prev => prev.map(c => c._id === ch._id ? { ...c, name: editName, description: editDesc } : c))
        setEditingId(null)
      }
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Kick participant ──
  const handleKick = async (ch: Channel, identity: string) => {
    setKickingId(identity)
    try {
      await fetch(`/api/voice/channels/${ch._id}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity }),
      })
      setChannels(prev => prev.map(c =>
        c._id === ch._id
          ? { ...c, participants: c.participants.filter(p => p.identity !== identity), participantCount: c.participantCount - 1 }
          : c
      ))
    } finally {
      setKickingId(null)
    }
  }

  // ── Delete channel ──
  const handleDelete = async (ch: Channel) => {
    if (!confirm(`¿Eliminar el canal "${ch.name}"? Se desconectará a todos los participantes.`)) return
    setDeletingId(ch._id)
    try {
      const res = await fetch(`/api/voice/channels/${ch._id}`, { method: 'DELETE' })
      if (res.ok) {
        setChannels(prev => prev.filter(c => c._id !== ch._id))
        if (activeRoom === ch.roomId) leave()
        setManagingId(null)
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mt-5">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid #00fff510' }}>
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-widest transition-colors"
          style={{ color: '#00fff560', letterSpacing: '0.15em' }}
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {'// VOZ'}
        </button>
        {session && (
          <button
            onClick={() => setCreating(c => !c)}
            className="transition-colors"
            title="Crear canal de voz"
            style={{ color: '#00fff540' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
            onMouseLeave={e => (e.currentTarget.style.color = '#00fff540')}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="mx-2 mt-2 p-2 space-y-1.5" style={{ background: '#00fff508', border: '1px solid #00fff520', borderRadius: '4px' }}>
          <input
            autoFocus
            placeholder="Nombre del canal..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
            maxLength={40}
            className="w-full bg-transparent text-xs font-mono outline-none px-2 py-1 rounded"
            style={{ border: '1px solid #00fff530', color: '#00fff5' }}
          />
          <input
            placeholder="Descripción (opcional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            maxLength={120}
            className="w-full bg-transparent text-xs font-mono outline-none px-2 py-1 rounded"
            style={{ border: '1px solid #00fff520', color: '#00fff580' }}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono" style={{ color: '#00fff550' }}>Máx:</span>
            <input
              type="number" min={2} max={50} value={newMax}
              onChange={e => setNewMax(parseInt(e.target.value) || 20)}
              className="w-14 bg-transparent text-xs font-mono text-center outline-none px-1 py-0.5 rounded"
              style={{ border: '1px solid #00fff520', color: '#00fff580' }}
            />
            <span className="text-[10px] font-mono" style={{ color: '#00fff540' }}>usuarios</span>
            <div className="ml-auto flex gap-1">
              <button onClick={() => setCreating(false)} style={{ color: '#ff003c80' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ff003c')}
                onMouseLeave={e => (e.currentTarget.style.color = '#ff003c80')}>
                <X className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleCreate} disabled={saving || !newName.trim()} style={{ color: '#00fff580' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
                onMouseLeave={e => (e.currentTarget.style.color = '#00fff580')}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel list */}
      {expanded && (
        <div className="space-y-0.5 mt-1">
          {channels.length === 0 && !creating && (
            <p className="px-3 py-2 text-[11px] font-mono" style={{ color: '#00fff530' }}>
              {'> sin canales — crea uno'}
            </p>
          )}

          {channels.map(ch => {
            const isActive   = activeRoom === ch.roomId
            const isManaging = managingId === ch._id
            const isEditing  = editingId  === ch._id
            const isMine     = canManage(ch)
            const isJoining  = joiningId  === ch._id

            return (
              <div key={ch._id} className="rounded overflow-hidden mx-1">
                {/* Channel row */}
                {isEditing ? (
                  <div className="flex items-center gap-1 px-2 py-1" style={{ background: '#00fff510' }}>
                    <Edit2 className="w-3 h-3 shrink-0" style={{ color: '#00fff5' }} />
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(ch); if (e.key === 'Escape') setEditingId(null) }}
                      maxLength={40}
                      className="flex-1 bg-transparent text-xs font-mono outline-none"
                      style={{ color: '#00fff5' }}
                    />
                    <button onClick={() => setEditingId(null)} style={{ color: '#ff003c80' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ff003c')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#ff003c80')}>
                      <X className="w-3 h-3" />
                    </button>
                    <button onClick={() => saveEdit(ch)} disabled={savingEdit} style={{ color: '#00fff580' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#00fff580')}>
                      {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </button>
                  </div>
                ) : (
                  <div className={cn(
                    'group flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors',
                    isActive && 'bg-green-500/10'
                  )}>
                    <Volume2 className={cn('w-3 h-3 shrink-0', isActive ? 'text-green-400' : 'text-muted-foreground')}
                      style={{ color: isActive ? '#4ade80' : '#00fff540' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono truncate" style={{ color: isActive ? '#4ade80' : 'var(--foreground)' }}>
                          {ch.name}
                        </span>
                        {ch.participantCount > 0 && (
                          <span className="text-[10px] font-mono flex items-center gap-0.5 ml-auto" style={{ color: '#4ade8080' }}>
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                            {ch.participantCount}
                          </span>
                        )}
                      </div>
                      {ch.description && (
                        <p className="text-[10px] font-mono truncate" style={{ color: '#00fff530' }}>{ch.description}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {session && !isActive && (
                        <button
                          onClick={() => handleJoin(ch)}
                          disabled={isJoining}
                          title="Unirse"
                          className="p-0.5 rounded transition-colors"
                          style={{ color: '#00fff540' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#00fff540')}
                        >
                          {isJoining ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                        </button>
                      )}
                      {isMine && (
                        <button
                          onClick={() => setManagingId(isManaging ? null : ch._id)}
                          title="Gestionar canal"
                          className="p-0.5 rounded transition-colors"
                          style={{ color: isManaging ? '#00fff5' : '#00fff540' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
                          onMouseLeave={e => { if (!isManaging) (e.currentTarget.style.color = '#00fff540') }}
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                      )}
                      {isActive && (
                        <button onClick={leave} title="Salir" className="p-0.5 rounded" style={{ color: '#ff003c80' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ff003c')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#ff003c80')}>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Management panel */}
                {isManaging && (
                  <div className="mx-1 mb-1 p-2 space-y-2 rounded" style={{ background: '#0a0a14', border: '1px solid #00fff520' }}>
                    {/* Actions row */}
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => startEdit(ch)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all"
                        style={{ background: '#00fff510', border: '1px solid #00fff530', color: '#00fff5' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#00fff520')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#00fff510')}
                      >
                        <Edit2 className="w-2.5 h-2.5" /> Renombrar
                      </button>
                      <button
                        onClick={() => handleDelete(ch)}
                        disabled={deletingId === ch._id}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all"
                        style={{ background: '#ff003c10', border: '1px solid #ff003c30', color: '#ff003c' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#ff003c20')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#ff003c10')}
                      >
                        {deletingId === ch._id
                          ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          : <Trash2 className="w-2.5 h-2.5" />}
                        Eliminar
                      </button>
                    </div>

                    {/* Participants */}
                    <div>
                      <p className="text-[10px] font-mono mb-1" style={{ color: '#00fff550', letterSpacing: '0.1em' }}>
                        PARTICIPANTES ({ch.participantCount}/{ch.maxParticipants})
                      </p>
                      {ch.participants.length === 0 ? (
                        <p className="text-[10px] font-mono" style={{ color: '#00fff530' }}>Sala vacía</p>
                      ) : (
                        <div className="space-y-0.5">
                          {ch.participants.map(p => (
                            <div key={p.identity} className="flex items-center gap-1.5">
                              <div className="h-3.5 w-3.5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                                <span className="text-[7px] text-green-400 font-bold">{(p.name || p.identity).slice(0,1).toUpperCase()}</span>
                              </div>
                              <span className="text-[10px] font-mono flex-1 truncate" style={{ color: '#aaa' }}>
                                {p.name || p.identity}
                                {p.identity === uid && <span style={{ color: '#00fff560' }}> (tú)</span>}
                              </span>
                              {p.identity !== uid && (
                                <button
                                  onClick={() => handleKick(ch, p.identity)}
                                  disabled={kickingId === p.identity}
                                  title="Expulsar"
                                  style={{ color: '#ff003c60' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#ff003c')}
                                  onMouseLeave={e => (e.currentTarget.style.color = '#ff003c60')}
                                >
                                  {kickingId === p.identity
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <UserX className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useVoiceRoom } from '@/contexts/voice-room-context'
import { Mic, MicOff, PhoneOff, Paperclip, X, Trash2, Phone } from 'lucide-react'

interface TicketUser {
  _id: string
  username: string
  displayName?: string
  avatar?: string
}

interface Attachment {
  url: string
  name: string
  mimeType: string
}

interface Ticket {
  _id: string
  subject: string
  status: 'open' | 'in_progress' | 'closed'
  priority: 'low' | 'normal' | 'high'
  category: string
  adminNotes?: string
  roomId?: string
  user: TicketUser
  createdAt: string
}

interface Message {
  _id: string
  content: string
  isInternal: boolean
  attachments?: Attachment[]
  sender: TicketUser
  createdAt: string
}

const STATUS_COLOR: Record<string, string> = {
  open:        '#00fff5',
  in_progress: '#ff9500',
  closed:      '#555555',
}

const STATUS_LABEL: Record<string, string> = {
  open:        'ABIERTO',
  in_progress: 'EN PROCESO',
  closed:      'CERRADO',
}

function isImage(mimeType: string) {
  return mimeType.startsWith('image/')
}

function isVideo(mimeType: string) {
  return mimeType.startsWith('video/')
}

export default function TicketDetailPage({ params: rawParams }: { params: any }) {
  const params = rawParams instanceof Promise ? use(rawParams) : rawParams as { id: string }
  const { user, sessionId } = useCurrentUser()
  const router = useRouter()
  const { roomName: activeRoom, join, leave } = useVoiceRoom()

  const [ticket, setTicket]         = useState<Ticket | null>(null)
  const [messages, setMessages]     = useState<Message[]>([])
  const [loading, setLoading]       = useState(true)
  const [content, setContent]       = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending]       = useState(false)
  const [newStatus, setNewStatus]   = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  // Attachments
  const [pendingFiles, setPendingFiles] = useState<{ file: File; uploading: boolean; url?: string; error?: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Voice
  const [joiningVoice, setJoiningVoice] = useState(false)
  const [voiceError, setVoiceError]     = useState('')
  const roomId    = ticket?.roomId ?? `ticket-${params.id}`
  const inVoice   = activeRoom === roomId

  const bottomRef = useRef<HTMLDivElement>(null)
  const isAdmin = (user as any)?.role === 'admin'
  const uid = sessionId

  const fetchMessages = useCallback(async () => {
    if (!uid) return
    try {
      const r = await fetch(`/api/tickets/${params.id}/messages`)
      const d = await r.json()
      if (d.messages) setMessages(d.messages)
    } catch {}
  }, [params.id, uid])

  useEffect(() => {
    if (!uid) return
    Promise.all([
      fetch(`/api/tickets/${params.id}`).then(r => r.json()),
      fetch(`/api/tickets/${params.id}/messages`).then(r => r.json()),
    ]).then(([td, md]) => {
      if (td.ticket) {
        setTicket(td.ticket)
        setNewStatus(td.ticket.status)
        setAdminNotes(td.ticket.adminNotes ?? '')
      }
      if (md.messages) setMessages(md.messages)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [params.id, uid])

  useEffect(() => {
    if (!uid) return
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages, uid])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''

    const newEntries = files.map(f => ({ file: f, uploading: true }))
    setPendingFiles(prev => [...prev, ...newEntries])

    for (const entry of newEntries) {
      const formData = new FormData()
      formData.append('file', entry.file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (res.ok && (data.url || data.mediaUrl)) {
          const url = data.url ?? data.mediaUrl
          setPendingFiles(prev => prev.map(p =>
            p.file === entry.file ? { ...p, uploading: false, url } : p
          ))
        } else {
          setPendingFiles(prev => prev.map(p =>
            p.file === entry.file ? { ...p, uploading: false, error: data.error ?? 'Error' } : p
          ))
        }
      } catch {
        setPendingFiles(prev => prev.map(p =>
          p.file === entry.file ? { ...p, uploading: false, error: 'Error de red' } : p
        ))
      }
    }
  }

  const removePendingFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const readyAttachments = pendingFiles
      .filter(p => p.url && !p.uploading && !p.error)
      .map(p => ({ url: p.url!, name: p.file.name, mimeType: p.file.type || 'application/octet-stream' }))

    if (!content.trim() && readyAttachments.length === 0) return
    if (pendingFiles.some(p => p.uploading)) return

    setSending(true)
    try {
      const res = await fetch(`/api/tickets/${params.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          isInternal: isAdmin ? isInternal : false,
          attachments: readyAttachments,
        }),
      })
      const data = await res.json()
      if (res.ok && data.message) {
        setMessages(prev => [...prev, data.message])
        setContent('')
        setIsInternal(false)
        setPendingFiles([])
      }
    } finally {
      setSending(false)
    }
  }

  const updateStatus = async () => {
    if (!newStatus || newStatus === ticket?.status) return
    const res = await fetch(`/api/tickets/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const data = await res.json()
    if (res.ok) setTicket(data.ticket)
  }

  const saveAdminNotes = async () => {
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/tickets/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      })
      if (res.ok) {
        const data = await res.json()
        setTicket(data.ticket)
      }
    } finally {
      setSavingNotes(false)
    }
  }

  const deleteTicket = async () => {
    if (!confirm('¿Eliminar este ticket y todos sus mensajes?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tickets/${params.id}`, { method: 'DELETE' })
      if (res.ok) router.push('/tickets')
    } finally {
      setDeleting(false)
    }
  }

  const joinVoice = async () => {
    setJoiningVoice(true); setVoiceError('')
    try {
      const res = await fetch(`/api/voice/token?room=${encodeURIComponent(roomId)}`)
      if (!res.ok) throw new Error('Error al obtener token de voz')
      const { token, serverUrl } = await res.json()
      join(roomId, `Ticket: ${ticket?.subject ?? params.id}`, token, serverUrl)
    } catch (err: any) {
      setVoiceError(err.message)
    } finally {
      setJoiningVoice(false)
    }
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a14' }}>
        <p className="font-mono" style={{ color: '#00fff5' }}>{'> ACCESO REQUERIDO'}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a14' }}>
        <p className="font-mono text-sm" style={{ color: '#00fff540' }}>{'> cargando...'}</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a14' }}>
        <div className="text-center space-y-3">
          <p className="font-mono" style={{ color: '#ff003c' }}>{'> TICKET NO ENCONTRADO'}</p>
          <Link href="/tickets" className="dedsec-btn px-4 py-2 text-xs inline-block">← VOLVER</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a14', color: '#c8fff8' }}>
      <div className="max-w-3xl mx-auto w-full p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="mb-6">
          <Link href="/tickets" className="inline-flex items-center gap-2 font-mono text-xs mb-4 transition-colors"
            style={{ color: '#00fff560' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
            onMouseLeave={e => (e.currentTarget.style.color = '#00fff560')}
          >
            ← TICKETS
          </Link>

          <div className="relative p-4 rounded" style={{ background: '#00fff508', border: '1px solid #00fff520' }}>
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: '#00fff5' }} />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: '#00fff5' }} />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: '#00fff5' }} />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: '#00fff5' }} />

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <h1 className="font-mono font-bold text-base mb-1" style={{ color: '#c8fff8' }}>{ticket.subject}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{
                      color: STATUS_COLOR[ticket.status],
                      background: `${STATUS_COLOR[ticket.status]}15`,
                      border: `1px solid ${STATUS_COLOR[ticket.status]}40`,
                    }}
                  >
                    {STATUS_LABEL[ticket.status]}
                  </span>
                  <span className="text-xs font-mono" style={{ color: '#00fff540' }}>{ticket.priority.toUpperCase()}</span>
                  <span className="text-xs font-mono" style={{ color: '#00fff540' }}>{ticket.category}</span>
                  {isAdmin && (
                    <span className="text-xs font-mono" style={{ color: '#00fff540' }}>
                      · @{ticket.user.username}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions: Voice + Admin controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Voice call button */}
                {!inVoice ? (
                  <button
                    onClick={joinVoice}
                    disabled={joiningVoice}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs transition-all"
                    style={{
                      background: '#00ff8815',
                      border: '1px solid #00ff8840',
                      color: '#00ff88',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#00ff8825')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#00ff8815')}
                    title="Unirse a sala de voz del ticket"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {joiningVoice ? 'CONECTANDO...' : 'VOZ'}
                  </button>
                ) : (
                  <button
                    onClick={leave}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs"
                    style={{
                      background: '#ff003c15',
                      border: '1px solid #ff003c40',
                      color: '#ff003c',
                    }}
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    SALIR VOZ
                  </button>
                )}

                {/* Admin: status change */}
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value)}
                      className="dedsec-input px-2 py-1 text-xs outline-none font-mono"
                    >
                      <option value="open">Abierto</option>
                      <option value="in_progress">En proceso</option>
                      <option value="closed">Cerrado</option>
                    </select>
                    <button
                      onClick={updateStatus}
                      disabled={newStatus === ticket.status}
                      className="dedsec-btn px-3 py-1 text-xs font-mono"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={deleteTicket}
                      disabled={deleting}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: '#ff003c80', border: '1px solid #ff003c30' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ff003c')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#ff003c80')}
                      title="Eliminar ticket"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {voiceError && (
              <p className="mt-2 font-mono text-xs" style={{ color: '#ff003c' }}>{voiceError}</p>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 mb-4 min-h-[200px] max-h-[500px] overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="text-center font-mono text-xs py-8" style={{ color: '#00fff530' }}>
              {'> sin mensajes todavía'}
            </p>
          ) : messages.map(msg => {
            const isSelf = msg.sender?._id === uid || String(msg.sender?._id) === uid
            const isNote = msg.isInternal

            if (isNote) {
              return (
                <div key={msg._id} className="w-full p-3 rounded" style={{ background: '#ff950015', border: '1px solid #ff950040' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: '14px' }}>📝</span>
                    <span className="text-xs font-mono font-semibold" style={{ color: '#ff9500' }}>
                      NOTA INTERNA · @{msg.sender?.username}
                    </span>
                  </div>
                  <p className="text-xs font-mono whitespace-pre-wrap" style={{ color: '#ff950090' }}>{msg.content}</p>
                </div>
              )
            }

            return (
              <div key={msg._id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] p-3 rounded space-y-2"
                  style={{
                    background: isSelf ? '#00fff530' : '#00fff510',
                    border: `1px solid ${isSelf ? '#00fff560' : '#00fff530'}`,
                  }}
                >
                  {!isSelf && (
                    <p className="text-xs font-mono font-semibold" style={{ color: '#00fff5' }}>
                      @{msg.sender?.username}
                    </p>
                  )}
                  {msg.content && (
                    <p className="text-sm font-mono whitespace-pre-wrap" style={{ color: '#c8fff8' }}>{msg.content}</p>
                  )}
                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="space-y-1.5 mt-1">
                      {msg.attachments.map((att, i) => (
                        <div key={i}>
                          {isImage(att.mimeType) ? (
                            <a href={att.url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={att.url}
                                alt={att.name}
                                className="max-w-full rounded"
                                style={{ maxHeight: '200px', objectFit: 'contain' }}
                              />
                            </a>
                          ) : isVideo(att.mimeType) ? (
                            <video
                              src={att.url}
                              controls
                              className="max-w-full rounded"
                              style={{ maxHeight: '200px' }}
                            />
                          ) : (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 rounded font-mono text-xs transition-all"
                              style={{ background: '#00fff510', border: '1px solid #00fff530', color: '#00fff5' }}
                            >
                              <Paperclip className="w-3 h-3 shrink-0" />
                              <span className="truncate">{att.name}</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs font-mono text-right" style={{ color: '#00fff540' }}>
                    {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Admin Notes Section */}
        {isAdmin && (
          <div className="mb-4 p-4 rounded" style={{ background: '#ff950008', border: '1px solid #ff950025' }}>
            <h3 className="font-mono text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#ff9500' }}>
              {'// NOTAS DEL CLIENTE (solo admin)'}
            </h3>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Notas privadas sobre este ticket..."
              className="dedsec-input w-full px-3 py-2 text-xs outline-none font-mono resize-none"
            />
            <button
              onClick={saveAdminNotes}
              disabled={savingNotes}
              className="mt-2 dedsec-btn px-4 py-1.5 text-xs font-mono"
            >
              {savingNotes ? '> guardando...' : '> GUARDAR NOTAS'}
            </button>
          </div>
        )}

        {/* Pending file uploads preview */}
        {pendingFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingFiles.map((pf, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded font-mono text-xs"
                style={{ background: '#00fff510', border: '1px solid #00fff530' }}
              >
                {pf.uploading ? (
                  <span style={{ color: '#00fff580' }}>⏳ {pf.file.name.slice(0, 20)}</span>
                ) : pf.error ? (
                  <span style={{ color: '#ff003c' }}>✕ {pf.file.name.slice(0, 20)}</span>
                ) : (
                  <span style={{ color: '#00ff88' }}>✓ {pf.file.name.slice(0, 20)}</span>
                )}
                <button
                  onClick={() => removePendingFile(i)}
                  className="ml-1"
                  style={{ color: '#ff003c80' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ff003c')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#ff003c80')}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Message Input */}
        <form onSubmit={sendMessage} className="space-y-2">
          {isAdmin && (
            <label className="flex items-center gap-2 text-xs font-mono cursor-pointer" style={{ color: '#ff9500' }}>
              <input
                type="checkbox"
                checked={isInternal}
                onChange={e => setIsInternal(e.target.checked)}
                className="accent-orange-500"
              />
              Nota interna (solo admins)
            </label>
          )}
          <div className="flex gap-2">
            {/* Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-2 rounded transition-all shrink-0"
              style={{ border: '1px solid #00fff530', color: '#00fff560' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#00fff560')}
              title="Adjuntar archivo"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFileSelect}
              accept="image/*,video/*,.pdf,.zip,.rar,.txt,.doc,.docx"
            />

            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={isInternal ? 'Nota interna...' : 'Escribe tu mensaje o adjunta archivos...'}
              rows={2}
              className="dedsec-input flex-1 px-3 py-2 text-sm outline-none font-mono resize-none"
              style={isInternal ? { borderColor: '#ff9500' } : {}}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  const hasContent = content.trim() || pendingFiles.some(p => p.url)
                  if (!sending && hasContent && !pendingFiles.some(p => p.uploading)) sendMessage(e as any)
                }
              }}
            />
            <button
              type="submit"
              disabled={sending || pendingFiles.some(p => p.uploading) || (!content.trim() && !pendingFiles.some(p => p.url))}
              className="dedsec-btn px-4 py-2 text-xs font-mono shrink-0"
              style={isInternal ? { borderColor: '#ff9500', color: '#ff9500' } : {}}
            >
              {sending ? '...' : '→'}
            </button>
          </div>
          <p className="text-xs font-mono" style={{ color: '#00fff530' }}>
            Enter para enviar · Shift+Enter nueva línea · 📎 imágenes, videos, archivos
          </p>
        </form>
      </div>
    </div>
  )
}

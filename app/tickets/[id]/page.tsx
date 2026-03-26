'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/use-current-user'

interface TicketUser {
  _id: string
  username: string
  displayName?: string
  avatar?: string
}

interface Ticket {
  _id: string
  subject: string
  status: 'open' | 'in_progress' | 'closed'
  priority: 'low' | 'normal' | 'high'
  category: string
  adminNotes?: string
  user: TicketUser
  createdAt: string
}

interface Message {
  _id: string
  content: string
  isInternal: boolean
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

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const { user, sessionId } = useCurrentUser()
  const [ticket, setTicket]       = useState<Ticket | null>(null)
  const [messages, setMessages]   = useState<Message[]>([])
  const [loading, setLoading]     = useState(true)
  const [content, setContent]     = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending]     = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
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

  // Poll every 5 seconds
  useEffect(() => {
    if (!uid) return
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages, uid])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/tickets/${params.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, isInternal: isAdmin ? isInternal : false }),
      })
      const data = await res.json()
      if (res.ok && data.message) {
        setMessages(prev => [...prev, data.message])
        setContent('')
        setIsInternal(false)
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
              <div>
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

              {/* Admin status change */}
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
                </div>
              )}
            </div>
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
                  className="max-w-[75%] p-3 rounded"
                  style={{
                    background: isSelf ? '#00fff530' : '#00fff510',
                    border: `1px solid ${isSelf ? '#00fff560' : '#00fff530'}`,
                  }}
                >
                  {!isSelf && (
                    <p className="text-xs font-mono font-semibold mb-1" style={{ color: '#00fff5' }}>
                      @{msg.sender?.username}
                    </p>
                  )}
                  <p className="text-sm font-mono whitespace-pre-wrap" style={{ color: '#c8fff8' }}>{msg.content}</p>
                  <p className="text-xs font-mono mt-1 text-right" style={{ color: '#00fff540' }}>
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
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={isInternal ? 'Nota interna...' : 'Escribe tu mensaje...'}
              rows={2}
              className="dedsec-input flex-1 px-3 py-2 text-sm outline-none font-mono resize-none"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (!sending && content.trim()) sendMessage(e as any)
                }
              }}
            />
            <button
              type="submit"
              disabled={sending || !content.trim()}
              className="dedsec-btn px-4 py-2 text-xs font-mono shrink-0"
              style={isInternal ? { borderColor: '#ff9500', color: '#ff9500' } : {}}
            >
              {sending ? '...' : '→'}
            </button>
          </div>
          <p className="text-xs font-mono" style={{ color: '#00fff530' }}>Enter para enviar · Shift+Enter nueva línea</p>
        </form>
      </div>
    </div>
  )
}

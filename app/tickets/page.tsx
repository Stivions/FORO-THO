'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/use-current-user'

interface Ticket {
  _id: string
  subject: string
  status: 'open' | 'in_progress' | 'closed'
  priority: 'low' | 'normal' | 'high'
  category: string
  createdAt: string
  user: { username: string; displayName?: string; avatar?: string }
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

const PRIORITY_COLOR: Record<string, string> = {
  low:    '#00fff560',
  normal: '#ffaa0090',
  high:   '#ff003c',
}

export default function TicketsPage() {
  const { user, sessionId } = useCurrentUser()
  const [tickets, setTickets]     = useState<Ticket[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [subject, setSubject]     = useState('')
  const [category, setCategory]   = useState('support')
  const [message, setMessage]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    fetch('/api/tickets')
      .then(r => r.json())
      .then(d => setTickets(d.tickets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, message }),
      })
      const data = await res.json()
      if (res.ok) {
        setTickets(prev => [{ ...data.ticket, user: { username: (user as any)?.username, displayName: (user as any)?.displayName } }, ...prev])
        setShowForm(false)
        setSubject('')
        setCategory('support')
        setMessage('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a14' }}>
        <div className="text-center space-y-4">
          <p className="font-mono" style={{ color: '#00fff5' }}>{'> ACCESO REQUERIDO'}</p>
          <Link href="/login" className="dedsec-btn px-6 py-2 text-sm inline-block">INICIAR SESIÓN</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a14', color: '#c8fff8' }}>
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-mono text-xs transition-colors" style={{ color: '#00fff560' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#00fff560')}
            >
              ← VOLVER
            </Link>
            <span style={{ color: '#00fff520' }}>|</span>
            <h1 className="font-mono font-bold tracking-widest" style={{ color: '#00fff5', letterSpacing: '0.2em' }}>
              {'// TICKETS DE SOPORTE'}
            </h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="dedsec-btn px-4 py-1.5 text-xs font-mono"
          >
            {showForm ? '✕ CANCELAR' : '+ NUEVO TICKET'}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="relative mb-6 p-5 rounded" style={{ background: '#00fff508', border: '1px solid #00fff530' }}>
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: '#00fff5' }} />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: '#00fff5' }} />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: '#00fff5' }} />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: '#00fff5' }} />

            <h2 className="font-mono text-sm font-semibold mb-4 tracking-widest" style={{ color: '#00fff5' }}>
              {'// CREAR NUEVO TICKET'}
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Asunto del ticket..."
                className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono"
                required
              />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono"
              >
                <option value="support">Soporte técnico</option>
                <option value="billing">Facturación</option>
                <option value="report">Reporte</option>
                <option value="other">Otro</option>
              </select>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe tu problema o consulta..."
                rows={4}
                className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono resize-none"
                required
              />
              <button
                type="submit"
                disabled={submitting || !subject.trim() || !message.trim()}
                className="dedsec-btn w-full py-2 text-sm font-mono"
              >
                {submitting ? '> ENVIANDO...' : '> ENVIAR TICKET'}
              </button>
            </form>
          </div>
        )}

        {/* Tickets List */}
        {loading ? (
          <div className="text-center py-20 font-mono text-sm" style={{ color: '#00fff540' }}>
            {'> cargando tickets...'}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="font-mono text-sm" style={{ color: '#00fff540' }}>{'> sin tickets todavía'}</p>
            <p className="font-mono text-xs" style={{ color: '#00fff530' }}>Crea tu primer ticket de soporte</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => (
              <Link key={t._id} href={`/tickets/${t._id}`}>
                <div
                  className="relative p-4 rounded transition-all cursor-pointer"
                  style={{ background: '#00fff505', border: '1px solid #00fff515' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#00fff540'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px #00fff508'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#00fff515'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l" style={{ borderColor: STATUS_COLOR[t.status] }} />
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r" style={{ borderColor: STATUS_COLOR[t.status] }} />
                  <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l" style={{ borderColor: STATUS_COLOR[t.status] }} />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r" style={{ borderColor: STATUS_COLOR[t.status] }} />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-sm font-semibold truncate" style={{ color: '#c8fff8' }}>{t.subject}</span>
                        <span
                          className="text-xs font-mono px-2 py-0.5 rounded"
                          style={{
                            color: STATUS_COLOR[t.status],
                            background: `${STATUS_COLOR[t.status]}15`,
                            border: `1px solid ${STATUS_COLOR[t.status]}40`,
                          }}
                        >
                          {STATUS_LABEL[t.status]}
                        </span>
                        <span
                          className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ color: PRIORITY_COLOR[t.priority], fontSize: '10px' }}
                        >
                          {t.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono" style={{ color: '#00fff540' }}>
                        <span>{t.category}</span>
                        <span>·</span>
                        <span>{new Date(t.createdAt).toLocaleDateString('es-ES')}</span>
                        {(user as any)?.role === 'admin' && t.user && (
                          <>
                            <span>·</span>
                            <span>@{t.user.username}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-xs shrink-0" style={{ color: '#00fff540' }}>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

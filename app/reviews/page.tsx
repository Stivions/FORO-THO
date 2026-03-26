'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/use-current-user'

interface ReviewUser {
  _id: string
  username: string
  displayName?: string
  avatar?: string
}

interface Review {
  _id: string
  rating: number
  title: string
  content: string
  verified: boolean
  user: ReviewUser
  createdAt: string
}

function Stars({ rating, size = 'sm', interactive = false, onRate }: {
  rating: number
  size?: 'sm' | 'lg'
  interactive?: boolean
  onRate?: (r: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  const sz = size === 'lg' ? '1.6rem' : '1rem'

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(i)}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          style={{
            background: 'none',
            border: 'none',
            cursor: interactive ? 'pointer' : 'default',
            fontSize: sz,
            color: i <= (hovered || rating) ? '#ffaa00' : '#333',
            transition: 'color 0.1s',
            padding: 0,
            lineHeight: 1,
          }}
        >
          {i <= (hovered || rating) ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const { user, sessionId } = useCurrentUser()
  const [reviews, setReviews]   = useState<Review[]>([])
  const [average, setAverage]   = useState(0)
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [myReview, setMyReview] = useState<Review | null>(null)

  // Form state
  const [rating, setRating]     = useState(5)
  const [title, setTitle]       = useState('')
  const [content, setContent]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    fetch('/api/reviews')
      .then(r => r.json())
      .then(d => {
        setReviews(d.reviews ?? [])
        setAverage(d.average ?? 0)
        setTotal(d.total ?? 0)
        if (sessionId) {
          const uid = sessionId
          const mine = (d.reviews ?? []).find((r: Review) =>
            r.user?._id === uid || String(r.user?._id) === uid
          )
          setMyReview(mine ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title, content }),
      })
      const data = await res.json()
      if (res.ok) {
        setReviews(prev => [data.review, ...prev])
        setTotal(t => t + 1)
        setAverage(prev => Math.round(((prev * (total) + rating) / (total + 1)) * 10) / 10)
        setMyReview(data.review)
        setShowForm(false)
        setTitle('')
        setContent('')
        setRating(5)
      } else {
        setError(data.error ?? 'Error al enviar reseña')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a14', color: '#c8fff8' }}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="font-mono text-xs transition-colors" style={{ color: '#00fff560' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
            onMouseLeave={e => (e.currentTarget.style.color = '#00fff560')}
          >
            ← VOLVER
          </Link>
          <span style={{ color: '#00fff520' }}>|</span>
          <h1 className="font-mono font-bold tracking-widest" style={{ color: '#00fff5', letterSpacing: '0.2em' }}>
            {'// RESEÑAS DE LA COMUNIDAD'}
          </h1>
        </div>

        {/* Stats */}
        <div className="relative mb-8 p-6 rounded text-center" style={{ background: '#ffaa0008', border: '1px solid #ffaa0025' }}>
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: '#ffaa00' }} />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: '#ffaa00' }} />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: '#ffaa00' }} />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: '#ffaa00' }} />

          <div className="font-mono font-black mb-2" style={{ fontSize: '3.5rem', color: '#ffaa00', lineHeight: 1, textShadow: '0 0 30px #ffaa0050' }}>
            {average.toFixed(1)}
          </div>
          <div className="flex justify-center mb-2">
            <Stars rating={Math.round(average)} size="lg" />
          </div>
          <p className="font-mono text-sm" style={{ color: '#ffaa0080' }}>
            {total} {total === 1 ? 'reseña' : 'reseñas'} de la comunidad
          </p>

          {sessionId && !myReview && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="mt-4 dedsec-btn px-6 py-2 text-sm font-mono inline-block"
              style={{ borderColor: '#ffaa00', color: '#ffaa00' }}
            >
              {showForm ? '✕ CANCELAR' : '★ ESCRIBIR RESEÑA'}
            </button>
          )}
          {myReview && (
            <p className="mt-4 font-mono text-xs" style={{ color: '#00ff8880' }}>
              ✓ Ya has escrito una reseña
            </p>
          )}
          {!sessionId && (
            <Link href="/login" className="mt-4 inline-block font-mono text-xs" style={{ color: '#00fff560' }}>
              Inicia sesión para escribir una reseña
            </Link>
          )}
        </div>

        {/* Write Review Form */}
        {showForm && (
          <div className="relative mb-8 p-5 rounded" style={{ background: '#ffaa0008', border: '1px solid #ffaa0030' }}>
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: '#ffaa00' }} />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: '#ffaa00' }} />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: '#ffaa00' }} />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: '#ffaa00' }} />

            <h2 className="font-mono text-sm font-semibold mb-4 tracking-widest" style={{ color: '#ffaa00' }}>
              {'// ESCRIBIR RESEÑA'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-xs mb-2" style={{ color: '#ffaa0080' }}>CALIFICACIÓN</label>
                <Stars rating={rating} size="lg" interactive onRate={setRating} />
              </div>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título de tu reseña..."
                className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono"
                required
              />
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Comparte tu experiencia con la comunidad... (máx. 500 caracteres)"
                maxLength={500}
                rows={4}
                className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono resize-none"
                required
              />
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs" style={{ color: '#ffaa0050' }}>{content.length}/500</span>
                {error && <span className="font-mono text-xs" style={{ color: '#ff003c' }}>{error}</span>}
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !content.trim()}
                  className="dedsec-btn px-6 py-2 text-sm font-mono"
                  style={{ borderColor: '#ffaa00', color: '#ffaa00' }}
                >
                  {submitting ? '> ENVIANDO...' : '> PUBLICAR RESEÑA'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews Grid */}
        {loading ? (
          <div className="text-center py-20 font-mono text-sm" style={{ color: '#ffaa0040' }}>
            {'> cargando reseñas...'}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="font-mono text-sm" style={{ color: '#ffaa0040' }}>{'> sin reseñas todavía'}</p>
            <p className="font-mono text-xs" style={{ color: '#ffaa0030' }}>¡Sé el primero en dejar una reseña!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map(r => (
              <div
                key={r._id}
                className="relative p-4 rounded"
                style={{ background: '#ffaa0005', border: '1px solid #ffaa0015' }}
              >
                <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l" style={{ borderColor: '#ffaa0040' }} />
                <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r" style={{ borderColor: '#ffaa0040' }} />
                <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l" style={{ borderColor: '#ffaa0040' }} />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r" style={{ borderColor: '#ffaa0040' }} />

                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-mono font-bold text-xs"
                    style={{
                      background: r.user?.avatar ? undefined : '#ffaa0020',
                      color: '#ffaa00',
                      border: '1px solid #ffaa0030',
                      backgroundImage: r.user?.avatar ? `url(${r.user.avatar})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {!r.user?.avatar && (r.user?.username ?? 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold" style={{ color: '#c8fff8' }}>
                        {r.user?.displayName || r.user?.username}
                      </span>
                      {r.verified && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: '#00ff8820', color: '#00ff88', border: '1px solid #00ff8840', fontSize: '9px' }}>
                          VERIFIED
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs" style={{ color: '#ffaa0060' }}>@{r.user?.username}</p>
                  </div>
                </div>

                <Stars rating={r.rating} />
                <h3 className="font-mono text-sm font-semibold mt-2 mb-1" style={{ color: '#ffaa00' }}>{r.title}</h3>
                <p className="font-mono text-xs leading-relaxed" style={{ color: '#c8fff880' }}>{r.content}</p>
                <p className="font-mono text-xs mt-3" style={{ color: '#ffaa0040' }}>
                  {new Date(r.createdAt).toLocaleDateString('es-ES')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

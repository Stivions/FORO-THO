'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { TrendingUp, ArrowUp, Terminal, Gift } from 'lucide-react'

interface TrendingPost { _id: string; title: string; upvoters: string[]; downvoters: string[] }
interface ActiveGiveaway {
  _id: string
  title: string
  prizeDescription: string
  participantCount: number
  endsAt: string
  entered: boolean
}

function timeLeft(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Terminado'
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((diff % 3600000) / 60000)
  return `${hours}h ${mins}m`
}

export function RightSidebar({ className }: { className?: string }) {
  const [trending,   setTrending]   = useState<TrendingPost[]>([])
  const [giveaways,  setGiveaways]  = useState<ActiveGiveaway[]>([])
  const [entering,   setEntering]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/posts?limit=5&page=1')
      .then(r => r.json())
      .then(data => {
        const sorted = [...(data.posts ?? [])].sort(
          (a: TrendingPost, b: TrendingPost) =>
            (b.upvoters.length - b.downvoters.length) - (a.upvoters.length - a.downvoters.length)
        )
        setTrending(sorted.slice(0, 5))
      })
      .catch(() => {})

    fetch('/api/giveaway')
      .then(r => r.json())
      .then(data => setGiveaways(data.giveaways ?? []))
      .catch(() => {})
  }, [])

  const handleEnter = async (id: string) => {
    setEntering(id)
    try {
      const res = await fetch(`/api/giveaway/${id}/enter`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setGiveaways(prev => prev.map(g =>
          g._id === id ? { ...g, entered: true, participantCount: data.count } : g
        ))
      }
    } finally {
      setEntering(null)
    }
  }

  return (
    <aside className={cn('space-y-4', className)}>
      {/* Trending */}
      <div
        className="relative"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '1rem',
        }}
      >
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: '#00fff5' }} />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: '#00fff5' }} />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: '#00fff5' }} />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: '#00fff5' }} />

        <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid #00fff510', paddingBottom: '8px' }}>
          <TrendingUp className="w-3.5 h-3.5" style={{ color: '#00fff5' }} />
          <span className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: '#00fff5', letterSpacing: '0.15em' }}>
            // TRENDING
          </span>
        </div>

        {trending.length === 0 ? (
          <p className="text-xs font-mono" style={{ color: '#00fff540' }}>{'> no posts yet'}</p>
        ) : (
          <div className="space-y-3">
            {trending.map((post, i) => (
              <Link key={post._id} href={`/post/${post._id}`} className="flex items-start gap-3 group">
                <span
                  className="text-xs font-mono font-bold w-4 shrink-0 mt-0.5"
                  style={{ color: '#00fff540' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs line-clamp-2 transition-colors"
                    style={{ color: 'var(--foreground)' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = '#00fff5'
                      ;(e.currentTarget as HTMLElement).style.textShadow = '0 0 8px #00fff530'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--foreground)'
                      ;(e.currentTarget as HTMLElement).style.textShadow = 'none'
                    }}
                  >
                    {post.title}
                  </p>
                  <p className="text-xs font-mono flex items-center gap-1 mt-0.5" style={{ color: '#00fff550' }}>
                    <ArrowUp className="w-2.5 h-2.5" />
                    {post.upvoters.length - post.downvoters.length}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Giveaways */}
      {giveaways.length > 0 && (
        <div
          className="relative"
          style={{
            background: 'var(--card)',
            border: '1px solid #ffaa0030',
            borderRadius: '4px',
            padding: '1rem',
          }}
        >
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: '#ffaa00' }} />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: '#ffaa00' }} />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: '#ffaa00' }} />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: '#ffaa00' }} />

          <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid #ffaa0020', paddingBottom: '8px' }}>
            <Gift className="w-3.5 h-3.5" style={{ color: '#ffaa00' }} />
            <span className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: '#ffaa00', letterSpacing: '0.15em' }}>
              // SORTEOS
            </span>
          </div>

          <div className="space-y-3">
            {giveaways.map(g => (
              <div key={g._id} style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #ffaa0010' }}>
                <p className="text-xs font-mono font-medium mb-0.5 line-clamp-2" style={{ color: 'var(--foreground)' }}>{g.title}</p>
                <p className="text-xs font-mono mb-1" style={{ color: '#ffaa0080' }}>{g.prizeDescription}</p>
                <div className="flex items-center justify-between text-xs font-mono mb-2" style={{ color: '#ffaa0060' }}>
                  <span>⏳ {timeLeft(g.endsAt)}</span>
                  <span>{g.participantCount} participantes</span>
                </div>
                <button
                  disabled={g.entered || entering === g._id}
                  onClick={() => handleEnter(g._id)}
                  className="w-full text-xs font-mono py-1.5 rounded transition-all"
                  style={{
                    background: g.entered ? '#ffaa0015' : '#ffaa0020',
                    border: `1px solid ${g.entered ? '#ffaa0060' : '#ffaa0050'}`,
                    color: g.entered ? '#ffaa0080' : '#ffaa00',
                    cursor: g.entered ? 'default' : 'pointer',
                    letterSpacing: '0.08em',
                  }}
                >
                  {entering === g._id ? '...' : g.entered ? '✓ INSCRITO' : '> PARTICIPAR'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div
        className="relative"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '1rem',
        }}
      >
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: '#00fff530' }} />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: '#00fff530' }} />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: '#00fff530' }} />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: '#00fff530' }} />

        <div className="flex items-center gap-2 mb-3" style={{ borderBottom: '1px solid #00fff510', paddingBottom: '8px' }}>
          <Terminal className="w-3.5 h-3.5" style={{ color: '#00fff5' }} />
          <span className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: '#00fff5', letterSpacing: '0.15em' }}>
            // DEDSEC_NET
          </span>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-mono" style={{ color: '#00fff560' }}>
            {'> comunidad de aprendizaje'}
          </p>
          <div className="space-y-1 mt-2">
            {['SÉ RESPETUOSO', 'NO SPAM', 'CONTENIDO RELEVANTE'].map((rule, i) => (
              <p key={i} className="text-xs font-mono flex items-center gap-1.5" style={{ color: '#00fff540' }}>
                <span style={{ color: '#00fff5' }}>✓</span> {rule}
              </p>
            ))}
          </div>
          <p className="text-xs font-mono mt-3" style={{ color: '#00fff530', letterSpacing: '0.08em' }}>
            STATUS: ONLINE
          </p>
        </div>
      </div>
    </aside>
  )
}

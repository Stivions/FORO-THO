'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Home,
  TrendingUp,
  Clock,
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Shield,
  Crown,
  MessageSquare,
  Star,
  Heart,
  Image,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useCategories, notifyCategories } from '@/hooks/use-categories'
import { getIcon } from '@/lib/icon-map'
import { CreateCategoryModal } from './create-category-modal'
import { VoiceRoom } from './voice-room'
import { VoiceChannels } from './voice-channels'
import { VIP_CATEGORIES } from '@/lib/categories'

interface LeftSidebarProps {
  onCreatePost: () => void
  className?: string
}

const navItems = [
  { icon: Home,         label: 'HOME',     href: '/' },
  { icon: TrendingUp,   label: 'POPULAR',  href: '/popular' },
  { icon: Clock,        label: 'LATEST',   href: '/latest' },
  { icon: Users,        label: 'GRUPOS',   href: '/groups' },
  { icon: Crown,        label: 'VIP',      href: '/vip' },
  { icon: Image,        label: 'GALERÍA',  href: '/products' },
  { icon: MessageSquare, label: 'TICKETS', href: '/tickets' },
  { icon: Star,         label: 'RESEÑAS',  href: '/reviews' },
  { icon: Heart,        label: 'DONAR',    href: '/donate' },
]

export function LeftSidebar({ onCreatePost, className }: LeftSidebarProps) {
  const [categoriesExpanded, setCategoriesExpanded] = useState(true)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { user, sessionId } = useCurrentUser()
  const { categories, isLoading: catsLoading, removeCategory } = useCategories()

  const isAdmin = (user as any)?.role === 'admin'

  const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('¿Eliminar esta categoría?')) return
    removeCategory(id)
    setDeletingId(id)
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (res.ok) {
        notifyCategories()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(`Error al borrar: ${data.error ?? res.status}`)
        notifyCategories()
      }
    } finally {
      setDeletingId(null)
    }
  }

  const displayName = user?.displayName || user?.username || '...'
  const initials = (user?.username ?? 'U').slice(0, 2).toUpperCase()

  return (
    <>
      <aside className={cn('flex flex-col h-full', className)}
        style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--border)' }}>

        {/* Logo */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <Link href="/" className="flex items-center gap-2.5">
            {/* DedSec eye icon */}
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" fill="transparent"/>
              <polyline points="2,7 2,2 7,2" stroke="#00fff5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="25,2 30,2 30,7" stroke="#00fff5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="2,25 2,30 7,30" stroke="#00fff5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="25,30 30,30 30,25" stroke="#00fff5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polygon points="16,7 25,16 16,25 7,16" stroke="#00fff5" strokeWidth="1.4" fill="none" opacity="0.8"/>
              <circle cx="16" cy="16" r="4.5" fill="#00fff5" opacity="0.12"/>
              <circle cx="16" cy="16" r="4.5" stroke="#00fff5" strokeWidth="1.2"/>
              <circle cx="16" cy="16" r="1.8" fill="#00fff5"/>
            </svg>
            <span className="ds-logo-text text-sm">Skill All Show</span>
          </Link>
        </div>

        {/* Create Post Button */}
        <div className="p-4">
          <button
            onClick={onCreatePost}
            className="w-full dedsec-btn py-2 text-xs flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            NUEVO POST
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2">
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="ds-nav-item flex items-center gap-3 px-3 py-2 rounded text-xs font-medium text-muted-foreground"
              >
                <item.icon className="w-4 h-4 shrink-0" style={{ color: '#00fff580' }} />
                <span className="font-mono tracking-wider">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Categories */}
          <div className="mt-5">
            <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid #00fff510' }}>
              <button
                onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-widest transition-colors"
                style={{ color: '#00fff560', letterSpacing: '0.15em' }}
              >
                {categoriesExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                {'// CATEGORIES'}
              </button>
              {sessionId && (
                <button
                  onClick={() => setShowCreateCategory(true)}
                  className="transition-colors"
                  style={{ color: '#00fff540' }}
                  title="Crear categoría"
                  onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#00fff540')}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {categoriesExpanded && (
              <div className="space-y-0.5 mt-1">
                {catsLoading ? (
                  <div className="px-3 py-2 text-xs font-mono" style={{ color: '#00fff540' }}>{'> loading...'}</div>
                ) : categories.map((cat) => {
                  const Icon = getIcon(cat.icon)
                  return (
                    <div key={cat._id} className="rounded overflow-hidden">
                      <div className="group flex items-center">
                        <Link
                          href={`/?category=${encodeURIComponent(cat.name)}`}
                          className="ds-nav-item flex flex-1 items-center gap-2.5 px-3 py-1.5 rounded text-xs text-muted-foreground"
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: '#00fff560' }} />
                          <span className="font-mono truncate" style={{ letterSpacing: '0.04em' }}>{cat.name}</span>
                        </Link>
                        {(isAdmin || cat.createdBy === sessionId) && (
                          <button
                            onClick={(e) => handleDeleteCategory(cat._id, e)}
                            disabled={deletingId === cat._id}
                            className="mr-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                            style={{ color: '#ff003c80' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ff003c')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#ff003c80')}
                            title="Eliminar categoría"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <VoiceRoom categoryId={cat._id} categoryName={cat.name} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* VIP Zone */}
          {(() => {
            const isVip = (user as any)?.vip === true && (
              !(user as any)?.vipExpiresAt || new Date((user as any).vipExpiresAt) > new Date()
            )
            const canSeeVip = isVip || isAdmin
            return (
              <div className="mt-5">
                <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1" style={{ borderBottom: '1px solid #ffaa0020' }}>
                  <Crown className="w-3 h-3" style={{ color: '#ffaa00' }} />
                  <span className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: '#ffaa0080', letterSpacing: '0.15em' }}>
                    // ZONA VIP
                  </span>
                  {!canSeeVip && (
                    <Link href="/vip" className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded transition-all"
                      style={{ background: '#ffaa0015', color: '#ffaa0080', border: '1px solid #ffaa0030' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ffaa00')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#ffaa0080')}
                    >
                      ACTIVAR VIP
                    </Link>
                  )}
                </div>
                <div className="space-y-0.5 mt-1">
                  {VIP_CATEGORIES.map(cat => (
                    canSeeVip ? (
                      <Link
                        key={cat}
                        href={`/?category=${encodeURIComponent(cat)}`}
                        className="ds-nav-item flex items-center gap-2.5 px-3 py-1.5 rounded text-xs text-muted-foreground"
                      >
                        <Crown className="w-3 h-3 shrink-0" style={{ color: '#ffaa0060' }} />
                        <span className="font-mono truncate" style={{ letterSpacing: '0.04em', color: '#ffaa00a0' }}>{cat}</span>
                      </Link>
                    ) : (
                      <div
                        key={cat}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded text-xs cursor-not-allowed"
                        title="Requiere VIP"
                      >
                        <Crown className="w-3 h-3 shrink-0" style={{ color: '#ffaa0030' }} />
                        <span className="font-mono truncate" style={{ letterSpacing: '0.04em', color: '#ffaa0030' }}>{cat}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Voice Channels */}
          <VoiceChannels />
        </nav>

        {/* User Profile Section */}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {isAdmin && (
            <div className="px-4 pt-3">
              <Link
                href="/admin"
                className="ds-nav-item flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-medium"
                style={{ color: '#ff9500' }}
              >
                <Shield className="w-3.5 h-3.5" />
                ADMIN PANEL
              </Link>
            </div>
          )}
          <div className="p-4">
            {sessionId ? (
              <Link
                href={`/profile/${sessionId}`}
                className="flex items-center gap-3 p-2 rounded transition-all"
                style={{ border: '1px solid transparent' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#00fff530'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px #00fff510'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar ?? ''} alt={displayName} />
                  <AvatarFallback style={{ background: '#00fff510', color: '#00fff5', fontFamily: 'monospace', fontSize: '11px' }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#00fff5' }}>{displayName}</p>
                  <p className="text-xs font-mono" style={{ color: '#00fff540' }}>{user?.role ?? 'agent'}</p>
                </div>
              </Link>
            ) : (
              <Link
                href="/login"
                className="dedsec-btn w-full py-2 text-xs flex items-center justify-center"
              >
                {'> ACCEDER'}
              </Link>
            )}
          </div>
        </div>
      </aside>

      <CreateCategoryModal
        isOpen={showCreateCategory}
        onClose={() => setShowCreateCategory(false)}
        onCreated={() => {
          notifyCategories()
          setShowCreateCategory(false)
        }}
      />
    </>
  )
}

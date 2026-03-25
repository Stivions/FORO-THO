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
  MessageSquare,
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Shield,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useCategories, notifyCategories } from '@/hooks/use-categories'
import { getIcon } from '@/lib/icon-map'
import { CreateCategoryModal } from './create-category-modal'
import { VoiceRoom } from './voice-room'

interface LeftSidebarProps {
  onCreatePost: () => void
  className?: string
}

const navItems = [
  { icon: Home,       label: 'Home',    href: '/' },
  { icon: TrendingUp, label: 'Popular', href: '/popular' },
  { icon: Clock,      label: 'Latest',  href: '/latest' },
  { icon: Users,      label: 'Grupos',  href: '/groups' },
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
    // Optimistic: remove immediately from UI
    removeCategory(id)
    setDeletingId(id)
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (res.ok) {
        notifyCategories() // sync other instances
      } else {
        const data = await res.json().catch(() => ({}))
        alert(`Error al borrar: ${data.error ?? res.status}`)
        notifyCategories() // restore real state
      }
    } finally {
      setDeletingId(null)
    }
  }

  const displayName = user?.displayName || user?.username || '...'
  const initials = (user?.username ?? 'U').slice(0, 2).toUpperCase()

  return (
    <>
      <aside className={cn('flex flex-col h-full', className)}>
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Skill All Show</span>
          </Link>
        </div>

        {/* Create Post Button */}
        <div className="p-4">
          <Button
            onClick={onCreatePost}
            className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
            Create Post
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2">
          {/* Main Nav */}
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Categories */}
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 py-2">
              <button
                onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                {categoriesExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Categories
              </button>
              {sessionId && (
                <button
                  onClick={() => setShowCreateCategory(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Crear categoría"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {categoriesExpanded && (
              <div className="space-y-1 mt-1">
                {catsLoading ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Cargando...</div>
                ) : categories.map((cat) => {
                  const Icon = getIcon(cat.icon)
                  return (
                    <div key={cat._id} className="rounded-lg overflow-hidden">
                      <div className="group flex items-center">
                        <Link
                          href={`/?category=${encodeURIComponent(cat.name)}`}
                          className="flex flex-1 items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          <span className="truncate">{cat.name}</span>
                        </Link>
                        {(isAdmin || cat.createdBy === sessionId) && (
                          <button
                            onClick={(e) => handleDeleteCategory(cat._id, e)}
                            disabled={deletingId === cat._id}
                            className="mr-1 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                            title="Eliminar categoría"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-border">
          {isAdmin && (
            <div className="px-4 pt-3">
              <Link
                href="/admin"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-orange-400 hover:bg-orange-500/10 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Panel de Admin
              </Link>
            </div>
          )}
          <div className="p-4">
          {sessionId ? (
            <Link
              href={`/profile/${sessionId}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.avatar ?? ''} alt={displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.role ?? 'usuario'}</p>
              </div>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground text-sm"
            >
              Iniciar sesión
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

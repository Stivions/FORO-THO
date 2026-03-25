'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PostFeed } from '@/components/forum/post-feed'
import { UserBadges } from '@/components/forum/user-badges'
import { MessageSquare, Users, Search } from 'lucide-react'

interface UserResult {
  _id: string
  username: string
  displayName?: string
  avatar?: string
  bio?: string
  role: string
  badges: string[]
  postsCount: number
}

function SearchResults() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [users, setUsers]     = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q) return
    setLoading(true)
    fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => setUsers(d.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [q])

  if (!q) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground">Escribe algo para buscar</p>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Users section */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          <Users className="h-4 w-4" />
          Usuarios
        </h2>

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 w-48 rounded-xl bg-secondary/50 animate-pulse shrink-0" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Sin usuarios para "{q}"</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map(u => (
              <Link
                key={u._id}
                href={`/profile/${u._id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-all"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={u.avatar} />
                  <AvatarFallback className="text-sm font-bold">
                    {(u.displayName || u.username).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {u.displayName || u.username}
                    </span>
                    {u.role !== 'user' && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {u.role}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                  {u.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{u.bio}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <UserBadges badges={u.badges} size="sm" />
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {u.postsCount} post{u.postsCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Posts section */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          <MessageSquare className="h-4 w-4" />
          Posts
        </h2>
        <PostFeed />
      </section>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  )
}

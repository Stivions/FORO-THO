'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CalendarDays, MessageSquare, Heart, Edit,
  MapPin, Globe, Twitter, Github, Instagram, MessageCircle, Loader2,
} from 'lucide-react'
import { PostCard } from './post-card'
import { EditProfileModal, type ProfileData } from './edit-profile-modal'
import { UserBadges } from './user-badges'
import type { PostData } from './post-feed'
import { getRank, getNextRank } from '@/lib/ranks'

interface UserProfileProps {
  user: ProfileData & {
    postsCount?: number
    commentsCount?: number
    likesCount?: number
    followersCount?: number
    followingCount?: number
    createdAt?: string
  }
  isCurrentUser?: boolean
}

export function UserProfile({ user: initialUser, isCurrentUser = false }: UserProfileProps) {
  const router = useRouter()
  const [user, setUser]         = useState(initialUser)
  const [editOpen, setEditOpen] = useState(false)
  const [posts, setPosts]       = useState<PostData[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')
  const [following, setFollowing]     = useState(false)
  const [followersCount, setFollowersCount] = useState(initialUser.followersCount ?? 0)
  const [followLoading, setFollowLoading]   = useState(false)

  useEffect(() => {
    if (activeTab !== 'posts') return
    setPostsLoading(true)
    fetch(`/api/posts?author=${user._id}&limit=20&page=1`)
      .then(r => r.json())
      .then(data => setPosts(data.posts ?? []))
      .catch(() => {})
      .finally(() => setPostsLoading(false))
  }, [user._id, activeTab])

  // Check follow status
  useEffect(() => {
    if (isCurrentUser) return
    fetch(`/api/users/${user._id}/follow`)
      .then(r => r.json())
      .then(d => { setFollowing(d.following); setFollowersCount(d.followersCount ?? 0) })
      .catch(() => {})
  }, [user._id, isCurrentUser])

  const handleFollow = async () => {
    setFollowLoading(true)
    try {
      const res = await fetch(`/api/users/${user._id}/follow`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) { setFollowing(d.following); setFollowersCount(d.followersCount) }
    } finally {
      setFollowLoading(false)
    }
  }

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : null

  const displayName = user.displayName || user.username

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="bg-card border-border overflow-hidden">
        {/* Banner */}
        <div className="relative h-40 overflow-hidden">
          {user.bannerUrl ? (
            <img src={user.bannerUrl} alt="banner" className="w-full h-full object-cover" />
          ) : (
            <div className="h-full bg-gradient-to-r from-primary/30 via-violet-500/20 to-primary/10" />
          )}
        </div>

        <CardContent className="relative px-6 pb-6">
          {/* Avatar */}
          <div className="absolute -top-16 left-6">
            <Avatar className="h-32 w-32 border-4 border-card shadow-xl">
              <AvatarImage src={user.avatar} alt={displayName} />
              <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mb-14">
            {isCurrentUser ? (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />Editar perfil
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => router.push(`/messages/${user._id}`)}>
                  <MessageSquare className="h-4 w-4 mr-1" />Mensaje
                </Button>
                <Button
                  size="sm"
                  variant={following ? 'outline' : 'default'}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : following ? 'Siguiendo' : 'Seguir'
                  }
                </Button>
              </>
            )}
          </div>

          {/* User Info */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                <UserBadges badges={(user as any).badges} size="md" />
              </div>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              {user.bio && <p className="text-foreground mt-2 leading-relaxed">{user.bio}</p>}
            </div>

            {/* Rank + Points */}
            {(() => {
              const pts   = (user as any).points ?? 0
              const rank  = getRank(pts)
              const next  = getNextRank(pts)
              return (
                <div className="flex items-center gap-3 flex-wrap py-1">
                  {/* Rank badge */}
                  <div
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono"
                    style={{
                      background: `${rank.glow}`,
                      border: `1px solid ${rank.color}60`,
                      color: rank.color,
                      textShadow: `0 0 8px ${rank.glow}`,
                      boxShadow: `0 0 12px ${rank.glow}`,
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{rank.icon}</span>
                    {rank.name}
                  </div>
                  {/* Points + progress */}
                  <div className="flex-1 min-w-[140px] max-w-[220px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-semibold" style={{ color: rank.color }}>
                        {pts.toLocaleString()} pts
                      </span>
                      {next && (
                        <span className="text-xs font-mono" style={{ color: '#88888880' }}>
                          {next.needed} para {next.name}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#ffffff10' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${rank.progress}%`,
                          background: `linear-gradient(90deg, ${rank.color}80, ${rank.color})`,
                          boxShadow: `0 0 6px ${rank.color}60`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })()}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {user.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />{user.location}
                </span>
              )}
              {user.website && (
                <a
                  href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />{user.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {joinDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />Se unió en {joinDate}
                </span>
              )}
            </div>

            {(user.socialLinks?.twitter || user.socialLinks?.github || user.socialLinks?.instagram || user.socialLinks?.discord) && (
              <div className="flex gap-3">
                {user.socialLinks?.twitter && (
                  <a href={`https://twitter.com/${user.socialLinks.twitter.replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-sky-400 transition-colors">
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
                {user.socialLinks?.github && (
                  <a href={`https://github.com/${user.socialLinks.github}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    <Github className="h-4 w-4" />
                  </a>
                )}
                {user.socialLinks?.instagram && (
                  <a href={`https://instagram.com/${user.socialLinks.instagram.replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-pink-400 transition-colors">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {user.socialLinks?.discord && (
                  <a
                    href={user.socialLinks.discord.startsWith('http') ? user.socialLinks.discord : `https://discord.com/users/${user.socialLinks.discord}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors"
                    style={{ color: undefined }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#5865F2')}
                    onMouseLeave={e => (e.currentTarget.style.color = '')}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-6 pt-1">
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{user.postsCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{user.commentsCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Comentarios</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{user.likesCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{followersCount}</p>
                <p className="text-xs text-muted-foreground">Seguidores</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="posts" className="gap-2">
            <MessageSquare className="h-4 w-4" />Posts
          </TabsTrigger>
          <TabsTrigger value="likes" className="gap-2">
            <Heart className="h-4 w-4" />Likes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-4">
          {postsLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
            </div>
          ) : posts.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">Sin posts todavía</p>
              </CardContent>
            </Card>
          ) : (
            posts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                onDelete={id => setPosts(prev => prev.filter(p => p._id !== id))}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="likes" className="mt-4">
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">Sin likes todavía</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isCurrentUser && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          profile={user}
          onSaved={updated => setUser(u => ({ ...u, ...updated }))}
        />
      )}
    </div>
  )
}

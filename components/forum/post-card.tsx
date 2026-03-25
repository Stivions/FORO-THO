'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowUp, ArrowDown, MessageCircle, Share2,
  MoreHorizontal, Flag, Pin, Trash2, Heart, FileText, Download,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { PostData } from './post-feed'
import { UserBadges } from './user-badges'

interface PostCardProps {
  post: PostData
  onImageClick?: (url: string) => void
  onDelete?: (id: string) => void
}

function timeAgo(date: string) {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (d < 60)   return `${d}s`
  if (d < 3600) return `${Math.floor(d/60)}m`
  if (d < 86400)return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

export function PostCard({ post, onImageClick, onDelete }: PostCardProps) {
  const { data: session } = useSession()
  const uid = (session?.user as any)?.id ?? ''

  const [upvotes,   setUpvotes]   = useState(post.upvoters.length)
  const [downvotes, setDownvotes] = useState(post.downvoters.length)
  const [userVote,  setUserVote]  = useState<'up'|'down'|null>(
    post.upvoters.includes(uid) ? 'up' : post.downvoters.includes(uid) ? 'down' : null
  )
  const [liked,      setLiked]      = useState((post as any).likers?.includes(uid) ?? false)
  const [likeCount,  setLikeCount]  = useState((post as any).likers?.length ?? 0)

  const vote = async (dir: 'up' | 'down') => {
    if (!uid) return
    const res = await fetch(`/api/posts/${post._id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction: dir }),
    })
    if (res.ok) {
      const data = await res.json()
      setUpvotes(data.upvotes)
      setDownvotes(data.downvotes)
      setUserVote(data.userVote)
    }
  }

  const handleLike = async () => {
    if (!uid) return
    const res = await fetch(`/api/posts/${post._id}/like`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setLiked(data.liked)
      setLikeCount(data.count)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este post?')) return
    const res = await fetch(`/api/posts/${post._id}`, { method: 'DELETE' })
    if (res.ok) onDelete?.(post._id)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post._id}`
    if (navigator.share) await navigator.share({ title: post.title, url })
    else await navigator.clipboard.writeText(url)
  }

  const role    = (session?.user as any)?.role
  const isOwner = uid === post.author._id || role === 'admin' || role === 'moderator'
  const score   = upvotes - downvotes
  const displayName = post.author.displayName || post.author.username

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Votos */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost" size="icon"
              className={cn('h-8 w-8 rounded-full', userVote === 'up' && 'text-primary bg-primary/10')}
              onClick={() => vote('up')}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
            <span className={cn('text-sm font-bold tabular-nums',
              userVote === 'up' && 'text-primary',
              userVote === 'down' && 'text-destructive'
            )}>
              {score}
            </span>
            <Button
              variant="ghost" size="icon"
              className={cn('h-8 w-8 rounded-full', userVote === 'down' && 'text-destructive bg-destructive/10')}
              onClick={() => vote('down')}
            >
              <ArrowDown className="h-5 w-5" />
            </Button>
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Link href={`/profile/${post.author._id}`}>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={post.author.avatar} />
                  <AvatarFallback className="text-xs">
                    {post.author.username.slice(0,2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Link href={`/profile/${post.author._id}`}
                className="text-sm font-medium hover:text-primary transition-colors">
                {displayName}
              </Link>
              <UserBadges badges={post.author.badges} size="sm" />
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
              {post.isPinned && <Pin className="h-3 w-3 text-primary" />}
              <Badge variant="secondary" className="ml-auto text-xs">{post.category}</Badge>
            </div>

            <Link href={`/post/${post._id}`}>
              <h3 className="text-lg font-semibold hover:text-primary transition-colors mb-2 line-clamp-2">
                {post.title}
              </h3>
            </Link>

            <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{post.content}</p>

            {post.mediaUrl && post.mediaType === 'image' && (
              <button
                onClick={() => onImageClick?.(post.mediaUrl!)}
                className="relative w-full aspect-video rounded-lg overflow-hidden mb-3 bg-secondary block"
              >
                <Image src={post.mediaUrl} alt="media" fill className="object-cover hover:scale-105 transition-transform duration-300" />
              </button>
            )}
            {post.mediaUrl && post.mediaType === 'video' && (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3 bg-secondary">
                {post.mediaUrl.includes('drive.google.com') ? (
                  <iframe
                    src={post.mediaUrl}
                    className="w-full h-full"
                    allow="autoplay"
                    allowFullScreen
                  />
                ) : (
                  <video src={post.mediaUrl} controls className="w-full h-full object-cover" />
                )}
              </div>
            )}

            {post.mediaUrl && post.mediaType === 'file' && (
              <a
                href={post.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary hover:border-primary/50 transition-colors mb-3 group"
                onClick={e => e.stopPropagation()}
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium flex-1 truncate">Archivo adjunto</span>
                <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </a>
            )}

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {post.tags.map(tag => (
                  <span key={tag} className="text-xs text-primary">#{tag}</span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" asChild>
                <Link href={`/post/${post._id}`}>
                  <MessageCircle className="h-4 w-4" />{post.commentsCount}
                </Link>
              </Button>
              <Button
                variant="ghost" size="sm"
                className={cn('gap-1.5', liked ? 'text-rose-500' : 'text-muted-foreground')}
                onClick={handleLike}
              >
                <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
                {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Compartir</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground ml-auto">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwner && (
                    <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleDelete}>
                      <Trash2 className="mr-2 h-4 w-4" />Eliminar
                    </DropdownMenuItem>
                  )}
                  {!isOwner && (
                    <DropdownMenuItem className="text-destructive cursor-pointer">
                      <Flag className="mr-2 h-4 w-4" />Reportar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

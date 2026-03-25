'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  if (d < 60)    return `${d}s`
  if (d < 3600)  return `${Math.floor(d/60)}m`
  if (d < 86400) return `${Math.floor(d/3600)}h`
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
  const [liked,     setLiked]     = useState((post as any).likers?.includes(uid) ?? false)
  const [likeCount, setLikeCount] = useState((post as any).likers?.length ?? 0)

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

  const role     = (session?.user as any)?.role
  const isAdmin  = role === 'admin' || role === 'moderator'
  const isOwner  = uid === post.author._id || isAdmin
  const analysis = (post as any).aiAnalysis
  const verdictStyle = analysis ? {
    good:       { color: '#00ff88', border: '#00ff8840', label: '✓ IA: Bueno' },
    suspicious: { color: '#ff9500', border: '#ff950040', label: '⚠ IA: Revisar' },
    bad:        { color: '#ff003c', border: '#ff003c40', label: '✕ IA: Alerta' },
  }[analysis.verdict as string] ?? null : null
  const score   = upvotes - downvotes
  const displayName = post.author.displayName || post.author.username

  return (
    <div
      className="ds-card relative"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderLeft: '2px solid transparent',
        borderRadius: '4px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderLeftColor = '#00fff5'
        el.style.boxShadow = '-3px 0 20px #00fff510, 0 0 30px #00fff506'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderLeftColor = 'transparent'
        el.style.boxShadow = 'none'
      }}
    >
      <div className="p-4">
        <div className="flex gap-3">
          {/* Votes */}
          <div className="flex flex-col items-center gap-0.5 min-w-[32px]">
            <button
              className="flex items-center justify-center h-7 w-7 rounded transition-all"
              style={{
                color: userVote === 'up' ? '#00fff5' : '#00fff550',
                textShadow: userVote === 'up' ? '0 0 8px #00fff5' : 'none',
                background: userVote === 'up' ? '#00fff510' : 'transparent',
              }}
              onClick={() => vote('up')}
              onMouseEnter={e => {
                if (userVote !== 'up') (e.currentTarget as HTMLElement).style.color = '#00fff5'
              }}
              onMouseLeave={e => {
                if (userVote !== 'up') (e.currentTarget as HTMLElement).style.color = '#00fff550'
              }}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <span
              className="text-xs font-bold font-mono tabular-nums"
              style={{
                color: userVote === 'up' ? '#00fff5' : userVote === 'down' ? '#ff003c' : 'var(--muted-foreground)',
                textShadow: userVote === 'up' ? '0 0 6px #00fff580' : userVote === 'down' ? '0 0 6px #ff003c80' : 'none',
              }}
            >
              {score}
            </span>
            <button
              className="flex items-center justify-center h-7 w-7 rounded transition-all"
              style={{
                color: userVote === 'down' ? '#ff003c' : '#00fff540',
                textShadow: userVote === 'down' ? '0 0 8px #ff003c' : 'none',
                background: userVote === 'down' ? '#ff003c10' : 'transparent',
              }}
              onClick={() => vote('down')}
              onMouseEnter={e => {
                if (userVote !== 'down') (e.currentTarget as HTMLElement).style.color = '#ff003c'
              }}
              onMouseLeave={e => {
                if (userVote !== 'down') (e.currentTarget as HTMLElement).style.color = '#00fff540'
              }}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Author row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Link href={`/profile/${post.author._id}`}>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={post.author.avatar} />
                  <AvatarFallback style={{ background: '#00fff510', color: '#00fff5', fontSize: '9px', fontFamily: 'monospace' }}>
                    {post.author.username.slice(0,2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Link
                href={`/profile/${post.author._id}`}
                className="text-xs font-mono font-medium transition-colors"
                style={{ color: '#00fff5' }}
                onMouseEnter={e => (e.currentTarget.style.textShadow = '0 0 8px #00fff5')}
                onMouseLeave={e => (e.currentTarget.style.textShadow = 'none')}
              >
                {displayName}
              </Link>
              <UserBadges badges={post.author.badges} size="sm" />
              <span style={{ color: '#00fff520' }}>·</span>
              <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{timeAgo(post.createdAt)}</span>
              {post.isPinned && <Pin className="h-3 w-3" style={{ color: '#00fff5' }} />}
              {isAdmin && verdictStyle && (
                <span
                  title={analysis.reason}
                  className="text-xs font-mono px-1.5 py-0.5 cursor-help"
                  style={{ color: verdictStyle.color, border: `1px solid ${verdictStyle.border}`, borderRadius: '2px', fontSize: '9px', letterSpacing: '0.05em' }}
                >
                  {verdictStyle.label}
                </span>
              )}
              <span
                className="ml-auto text-xs font-mono px-2 py-0.5"
                style={{
                  color: '#00fff5',
                  border: '1px solid #00fff530',
                  borderRadius: '2px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontSize: '10px',
                }}
              >
                {post.category}
              </span>
            </div>

            {/* Title */}
            <Link href={`/post/${post._id}`}>
              <h3
                className="text-base font-semibold mb-1.5 line-clamp-2 transition-colors"
                style={{ color: 'var(--foreground)', letterSpacing: '0.01em' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = '#00fff5'
                  ;(e.currentTarget as HTMLElement).style.textShadow = '0 0 12px #00fff530'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--foreground)'
                  ;(e.currentTarget as HTMLElement).style.textShadow = 'none'
                }}
              >
                {post.title}
              </h3>
            </Link>

            <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>{post.content}</p>

            {/* Media */}
            {post.mediaUrl && post.mediaType === 'image' && (
              <button
                onClick={() => onImageClick?.(post.mediaUrl!)}
                className="relative w-full aspect-video rounded overflow-hidden mb-3 block"
                style={{ border: '1px solid #00fff520' }}
              >
                <Image src={post.mediaUrl} alt="media" fill className="object-cover hover:scale-105 transition-transform duration-300" />
              </button>
            )}
            {post.mediaUrl && post.mediaType === 'video' && (
              <div
                className="relative w-full aspect-video rounded overflow-hidden mb-3"
                style={{ border: '1px solid #00fff520' }}
              >
                {post.mediaUrl.includes('drive.google.com') ? (
                  <iframe src={post.mediaUrl} className="w-full h-full" allow="autoplay" allowFullScreen />
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
                className="flex items-center gap-3 p-3 rounded mb-3 group transition-all"
                style={{ border: '1px solid #00fff520', background: '#00fff508' }}
                onClick={e => e.stopPropagation()}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#00fff560')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#00fff520')}
              >
                <div className="h-8 w-8 rounded flex items-center justify-center shrink-0" style={{ background: '#00fff515', border: '1px solid #00fff530' }}>
                  <FileText className="h-4 w-4" style={{ color: '#00fff5' }} />
                </div>
                <span className="text-xs font-mono flex-1 truncate" style={{ color: '#00fff5' }}>Archivo adjunto</span>
                <Download className="h-3.5 w-3.5 shrink-0 transition-colors" style={{ color: '#00fff560' }} />
              </a>
            )}

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {post.tags.map(tag => (
                  <span key={tag} className="ds-tag">#{tag}</span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-0.5">
              <Link
                href={`/post/${post._id}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-all"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = '#00fff5'
                  ;(e.currentTarget as HTMLElement).style.background = '#00fff508'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {post.commentsCount}
              </Link>

              <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-all"
                style={{
                  color: liked ? '#ff4d7d' : 'var(--muted-foreground)',
                  textShadow: liked ? '0 0 6px #ff4d7d80' : 'none',
                }}
                onClick={handleLike}
                onMouseEnter={e => {
                  if (!liked) (e.currentTarget as HTMLElement).style.color = '#ff4d7d'
                }}
                onMouseLeave={e => {
                  if (!liked) (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'
                }}
              >
                <Heart className={cn('h-3.5 w-3.5', liked && 'fill-current')} />
                {likeCount > 0 && likeCount}
              </button>

              <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-all"
                style={{ color: 'var(--muted-foreground)' }}
                onClick={handleShare}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = '#00fff5'
                  ;(e.currentTarget as HTMLElement).style.background = '#00fff508'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">SHARE</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="ml-auto flex items-center px-2 py-1.5 rounded transition-all"
                    style={{ color: 'var(--muted-foreground)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  style={{ background: '#0a0a14', border: '1px solid #00fff520', minWidth: '140px' }}
                >
                  {isOwner ? (
                    <DropdownMenuItem
                      className="cursor-pointer text-xs font-mono"
                      style={{ color: '#ff003c' }}
                      onClick={handleDelete}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />ELIMINAR
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem className="cursor-pointer text-xs font-mono" style={{ color: '#ff9500' }}>
                      <Flag className="mr-2 h-3.5 w-3.5" />REPORTAR
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

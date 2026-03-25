'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Heart, MessageCircle, MoreHorizontal, Flag, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCurrentUser } from '@/hooks/use-current-user'

interface CommentData {
  _id: string
  content: string
  author: { _id: string; username: string; avatar?: string; displayName?: string }
  parentComment?: string | null
  likers: string[]
  createdAt: string
  replies?: CommentData[]
}

function timeAgo(date: string) {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (d < 60)    return `${d}s`
  if (d < 3600)  return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}

interface CommentItemProps {
  comment: CommentData
  depth?: number
  postId: string
  currentUserId: string
  onDelete: (id: string) => void
  onReplyPosted: (parentId: string, reply: CommentData) => void
}

function CommentItem({ comment, depth = 0, postId, currentUserId, onDelete, onReplyPosted }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(true)
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [liked, setLiked] = useState(comment.likers.includes(currentUserId))
  const [likeCount, setLikeCount] = useState(comment.likers.length)
  const isOwner = currentUserId === comment.author._id
  const displayName = comment.author.displayName || comment.author.username
  const initials = comment.author.username.slice(0, 2).toUpperCase()

  const handleLike = async () => {
    if (!currentUserId) return
    const res = await fetch(`/api/comments/like/${comment._id}`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setLiked(data.liked)
      setLikeCount(data.count)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar comentario?')) return
    const res = await fetch(`/api/comments/delete/${comment._id}`, { method: 'DELETE' })
    if (res.ok) onDelete(comment._id)
  }

  const submitReply = async () => {
    if (!replyText.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/comments/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText.trim(), parentComment: comment._id }),
      })
      if (res.ok) {
        const data = await res.json()
        onReplyPosted(comment._id, data.comment)
        setReplyText('')
        setIsReplying(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn('group', depth > 0 && 'ml-6 pl-4 border-l-2 border-border')}>
      <div className="flex gap-3 py-3">
        <Link href={`/profile/${comment.author._id}`}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.author.avatar ?? ''} alt={displayName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/profile/${comment.author._id}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {displayName}
            </Link>
            <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          </div>

          <p className="text-sm text-foreground mb-2 break-words">{comment.content}</p>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              className={cn('h-7 px-2 gap-1 text-muted-foreground', liked && 'text-destructive')}
              onClick={handleLike}
            >
              <Heart className={cn('h-3.5 w-3.5', liked && 'fill-current')} />
              <span className="text-xs">{likeCount}</span>
            </Button>

            {depth < 2 && currentUserId && (
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 gap-1 text-muted-foreground"
                onClick={() => setIsReplying(!isReplying)}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="text-xs">Responder</span>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwner ? (
                  <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />Eliminar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="text-destructive cursor-pointer">
                    <Flag className="mr-2 h-3.5 w-3.5" />Reportar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isReplying && (
            <div className="mt-2 space-y-2">
              <Textarea
                placeholder={`Responder a ${displayName}...`}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                className="min-h-[70px] bg-secondary border-border text-sm resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setIsReplying(false); setReplyText('') }}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={submitReply} disabled={!replyText.trim() || isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Enviando...</> : 'Responder'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <>
          <Button
            variant="ghost" size="sm"
            className="h-6 px-2 text-xs text-muted-foreground gap-1 ml-11"
            onClick={() => setShowReplies(!showReplies)}
          >
            {showReplies ? (
              <><ChevronUp className="h-3 w-3" />Ocultar respuestas</>
            ) : (
              <><ChevronDown className="h-3 w-3" />Ver {comment.replies.length} respuesta{comment.replies.length !== 1 ? 's' : ''}</>
            )}
          </Button>
          {showReplies && comment.replies.map(reply => (
            <CommentItem
              key={reply._id}
              comment={reply}
              depth={depth + 1}
              postId={postId}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onReplyPosted={onReplyPosted}
            />
          ))}
        </>
      )}
    </div>
  )
}

interface CommentSectionProps {
  postId: string
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { user, sessionId } = useCurrentUser()
  const [comments, setComments] = useState<CommentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentUserId = sessionId ?? ''
  const displayName = user?.displayName || user?.username || ''
  const initials = (user?.username ?? 'U').slice(0, 2).toUpperCase()

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments/${postId}`)
      const data = await res.json()
      setComments(data.comments ?? [])
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
  }, [postId])

  useEffect(() => { loadComments() }, [loadComments])

  const submitComment = async () => {
    if (!newComment.trim() || !sessionId) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/comments/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => [data.comment, ...prev])
        setNewComment('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (id: string) => {
    setComments(prev => {
      const filter = (arr: CommentData[]): CommentData[] =>
        arr
          .filter(c => c._id !== id)
          .map(c => ({ ...c, replies: c.replies ? filter(c.replies) : [] }))
      return filter(prev)
    })
  }

  const handleReplyPosted = (parentId: string, reply: CommentData) => {
    setComments(prev => prev.map(c =>
      c._id === parentId
        ? { ...c, replies: [...(c.replies ?? []), reply] }
        : c
    ))
  }

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      {sessionId ? (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar ?? ''} alt={displayName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Escribe un comentario..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="min-h-[80px] bg-secondary border-border resize-none"
            />
            <div className="flex justify-end">
              <Button onClick={submitComment} disabled={!newComment.trim() || isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publicando...</> : 'Comentar'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">Inicia sesión</Link> para comentar.
        </p>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-3 pt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {comments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin comentarios todavía. ¡Sé el primero!</p>
            </div>
          ) : (
            comments.map(comment => (
              <CommentItem
                key={comment._id}
                comment={comment}
                postId={postId}
                currentUserId={currentUserId}
                onDelete={handleDelete}
                onReplyPosted={handleReplyPosted}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

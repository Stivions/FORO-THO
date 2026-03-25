'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MentionInput } from '@/components/ui/mention-input'
import { RenderContent } from '@/components/ui/render-content'
import { UserBadges } from '@/components/forum/user-badges'
import { ArrowLeft, Users, Send, Loader2, Trash2, ImageIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface GroupAuthor {
  _id: string
  username: string
  displayName?: string
  avatar?: string
  badges?: string[]
}

interface GroupMsg {
  _id: string
  content: string
  imageUrl?: string | null
  author: GroupAuthor
  createdAt: string
}

interface TypingUser {
  user: string
  username: string
  displayName?: string
  avatar?: string
}

interface GroupInfo {
  _id: string
  name: string
  description: string
  owner: GroupAuthor
  members: GroupAuthor[]
  status: string
}

/** Extract Google Drive file ID from various Drive URL formats */
function extractDriveId(url: string): string | null {
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/)
  return m?.[1] ?? null
}

/** Detect Drive links in text content */
function parseDriveLinks(text: string): string[] {
  const matches = text.match(/https?:\/\/drive\.google\.com\/\S+/g) ?? []
  return [...new Set(matches)]
}

function DriveEmbed({ url }: { url: string }) {
  const id = extractDriveId(url)
  if (!id) return null
  return (
    <div className="mt-1.5 rounded-lg overflow-hidden border border-border/50 bg-black/20">
      <iframe
        src={`https://drive.google.com/file/d/${id}/preview`}
        className="w-full"
        style={{ height: '180px' }}
        allow="autoplay"
        title="Drive preview"
      />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors border-t border-border/30"
      >
        <svg viewBox="0 0 87.3 78" className="h-3 w-3 shrink-0" fill="none">
          <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="M43.65 25L29.9 1.4C28.55.6 27 .2 25.45.2c-1.55 0-3.1.4-4.45 1.2L6.6 14.9 23.35 44z" fill="#00ac47"/>
          <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L85.1 57c.8-1.4 1.2-2.95 1.2-4.5H58.1l5.95 11.45z" fill="#ea4335"/>
          <path d="M43.65 25L57.4 1.4C56.05.6 54.5.2 52.95.2H34.35c-1.55 0-3.1.4-4.45 1.2z" fill="#00832d"/>
          <path d="M58.1 52.5H29.2L15.45 76.8c1.35.8 2.9 1.2 4.45 1.2H67.4c1.55 0 3.1-.4 4.45-1.2z" fill="#2684fc"/>
          <path d="M73.4 14.9L59.65 1.4C58.3.6 56.75.2 55.2.2h-2.25L43.65 25l14.45 27.5H85.9L73.4 14.9z" fill="#ffba00"/>
        </svg>
        Abrir en Google Drive
      </a>
    </div>
  )
}

export default function GroupChatPage() {
  const params  = useParams<{ id: string }>()
  const groupId = params.id
  const router  = useRouter()
  const { user: me, sessionId } = useCurrentUser()

  const [group,       setGroup]       = useState<GroupInfo | null>(null)
  const [messages,    setMessages]    = useState<GroupMsg[]>([])
  const [typing,      setTyping]      = useState<TypingUser[]>([])
  const [text,        setText]        = useState('')
  const [sending,     setSending]     = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [imagePreview, setImagePreview] = useState<{ url: string; file: File } | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [joined,      setJoined]      = useState(false)
  const [showMembers, setShowMembers] = useState(false)

  const bottomRef     = useRef<HTMLDivElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const lastMsgAt     = useRef<string>(new Date(Date.now() - 5000).toISOString())
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isTypingRef   = useRef(false)

  const isAdmin = (me as any)?.role === 'admin'

  // Load group info
  useEffect(() => {
    fetch(`/api/groups/${groupId}`)
      .then(r => r.json())
      .then(d => {
        setGroup(d.group)
        const memIds = d.group?.members?.map((m: any) => m._id?.toString() ?? m.toString()) ?? []
        setJoined(sessionId ? memIds.includes(sessionId) : false)
      })
      .finally(() => setLoading(false))
  }, [groupId, sessionId])

  // Load initial messages
  useEffect(() => {
    fetch(`/api/groups/${groupId}/messages`)
      .then(r => r.json())
      .then(d => {
        const msgs: GroupMsg[] = d.messages ?? []
        setMessages(msgs)
        if (msgs.length > 0) {
          const lastTs = msgs[msgs.length - 1].createdAt
          if (new Date(lastTs) > new Date(lastMsgAt.current)) {
            lastMsgAt.current = lastTs
          }
        }
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }), 80)
      })
  }, [groupId])

  // Poll for new messages every 1.5s
  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch(`/api/groups/${groupId}/messages?after=${encodeURIComponent(lastMsgAt.current)}`)
        const data = await res.json()
        const fresh: GroupMsg[] = data.messages ?? []
        if (fresh.length > 0) {
          lastMsgAt.current = fresh[fresh.length - 1].createdAt
          setMessages(prev => {
            const seen  = new Set(prev.map(m => m._id))
            const added = fresh.filter(m => !seen.has(m._id))
            if (added.length === 0) return prev
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
            return [...prev, ...added]
          })
        }
      } catch {}
    }
    const id = setInterval(poll, 1500)
    return () => clearInterval(id)
  }, [groupId])

  // Poll typing every 1s
  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch(`/api/groups/${groupId}/typing`)
        const data = await res.json()
        setTyping((data.typing ?? []).filter((t: any) => t.user !== sessionId))
      } catch {}
    }
    const id = setInterval(poll, 1000)
    return () => clearInterval(id)
  }, [groupId, sessionId])

  const handleTextChange = useCallback((val: string) => {
    setText(val)
    if (!sessionId) return
    if (!isTypingRef.current) {
      isTypingRef.current = true
      fetch(`/api/groups/${groupId}/typing`, { method: 'POST' }).catch(() => {})
    }
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      isTypingRef.current = false
      fetch(`/api/groups/${groupId}/typing`, { method: 'DELETE' }).catch(() => {})
    }, 2500)
  }, [groupId, sessionId])

  // Pick image from disk — show local preview first
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const localUrl = URL.createObjectURL(file)
    setImagePreview({ url: localUrl, file })
    e.target.value = ''
  }

  const sendMessage = useCallback(async (overrideImageUrl?: string) => {
    const hasText  = !!text.trim()
    const hasImage = !!imagePreview || !!overrideImageUrl
    if (!hasText && !hasImage) return
    if (!sessionId || sending) return

    setSending(true)
    clearTimeout(typingTimeout.current)
    isTypingRef.current = false
    fetch(`/api/groups/${groupId}/typing`, { method: 'DELETE' }).catch(() => {})

    try {
      let uploadedUrl: string | null = overrideImageUrl ?? null

      // Upload image if we have a local preview
      if (imagePreview && !overrideImageUrl) {
        setUploading(true)
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': imagePreview.file.type,
              'x-filename': encodeURIComponent(imagePreview.file.name),
            },
            body: imagePreview.file,
          })
          const data = await res.json()
          if (res.ok) uploadedUrl = data.url
        } finally {
          setUploading(false)
        }
      }

      const res  = await fetch(`/api/groups/${groupId}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: text.trim(), imageUrl: uploadedUrl }),
      })
      const data = await res.json()
      if (res.ok && data.message) {
        setMessages(prev => {
          if (prev.some(m => m._id === data.message._id)) return prev
          return [...prev, data.message]
        })
        if (new Date(data.message.createdAt) > new Date(lastMsgAt.current)) {
          lastMsgAt.current = data.message.createdAt
        }
        setText('')
        setImagePreview(null)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    } finally {
      setSending(false)
    }
  }, [text, imagePreview, sessionId, sending, groupId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleJoin = async () => {
    if (!sessionId) return
    const res  = await fetch(`/api/groups/${groupId}/join`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setJoined(data.joined)
      setGroup(prev => prev ? {
        ...prev,
        members: data.joined
          ? [...prev.members, { _id: sessionId, username: me?.username ?? '', displayName: me?.displayName, avatar: me?.avatar }]
          : prev.members.filter(m => m._id !== sessionId),
      } : prev)
    }
  }

  const deleteGroup = async () => {
    if (!confirm(`¿Eliminar el grupo "${group?.name}" permanentemente?`)) return
    const res = await fetch(`/api/admin/groups/${groupId}`, { method: 'DELETE' })
    if (res.ok) router.push('/groups')
  }

  const deleteMessage = async (msgId: string) => {
    const res = await fetch(`/api/groups/${groupId}/messages/${msgId}`, { method: 'DELETE' })
    if (res.ok) setMessages(prev => prev.filter(m => m._id !== msgId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Grupo no encontrado</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/groups">Volver a grupos</Link>
        </Button>
      </div>
    )
  }

  const canChat = joined && !!sessionId

  return (
    <div className="-mx-4 flex flex-col bg-card border-x border-border overflow-hidden" style={{ height: 'calc(100dvh - 10rem)' }}>
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <Link href="/groups"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm leading-tight truncate">{group.name}</h2>
          {group.description && (
            <p className="text-[11px] text-muted-foreground leading-tight truncate">{group.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowMembers(v => !v)}
          className={cn(
            'flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors shrink-0',
            showMembers ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Users className="h-3.5 w-3.5" />
          <span>{group.members.length}</span>
        </button>
        {sessionId && (
          <Button size="sm" variant={joined ? 'outline' : 'default'} onClick={toggleJoin} className="shrink-0 text-xs h-7 px-3">
            {joined ? 'Salir' : 'Unirse'}
          </Button>
        )}
        {isAdmin && (
          <button
            onClick={deleteGroup}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Eliminar grupo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Messages + input */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin mensajes aún. ¡Sé el primero!
                </p>
              )}

              <div className="flex flex-col gap-0.5">
                {messages.map((msg, i) => {
                  const isMine     = msg.author._id === sessionId
                  const prevAuthor = messages[i - 1]?.author._id
                  const showHeader = i === 0 || prevAuthor !== msg.author._id
                  const name       = msg.author.displayName || msg.author.username
                  const driveLinks = parseDriveLinks(msg.content)

                  return (
                    <div
                      key={msg._id}
                      className={cn(
                        'flex gap-2 group/msg',
                        isMine ? 'flex-row-reverse' : 'flex-row',
                        showHeader ? 'mt-3' : 'mt-0.5'
                      )}
                    >
                      {/* Avatar */}
                      {showHeader ? (
                        <Link href={`/u/${msg.author.username}`} className="shrink-0 self-end mb-0.5">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={msg.author.avatar ?? ''} />
                            <AvatarFallback className="text-[10px]">
                              {msg.author.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                      ) : (
                        <div className="w-7 shrink-0" />
                      )}

                      <div className={cn('flex flex-col max-w-[78%] sm:max-w-[65%]', isMine && 'items-end')}>
                        {showHeader && (
                          <div className={cn('flex items-center gap-1 mb-0.5 flex-wrap', isMine && 'flex-row-reverse')}>
                            <span className="text-xs font-semibold">{name}</span>
                            <UserBadges badges={msg.author.badges} size="sm" />
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: es })}
                            </span>
                          </div>
                        )}

                        {/* Bubble row */}
                        <div className={cn('flex items-end gap-1', isMine && 'flex-row-reverse')}>
                          {isAdmin && (
                            <button
                              onClick={() => deleteMessage(msg._id)}
                              className="shrink-0 opacity-0 group-hover/msg:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"
                              title="Eliminar mensaje"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}

                          <div className={cn(
                            'px-3 py-2 text-sm break-words leading-relaxed',
                            isMine
                              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
                              : 'bg-muted text-foreground rounded-2xl rounded-bl-sm',
                            /* no padding when only image */
                            !msg.content && msg.imageUrl && 'p-1'
                          )}>
                            {/* Image attachment */}
                            {msg.imageUrl && (
                              <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={msg.imageUrl}
                                  alt="imagen"
                                  className="rounded-xl max-w-full max-h-60 object-cover mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                                />
                              </a>
                            )}

                            {/* Text content */}
                            {msg.content && <RenderContent text={msg.content} />}

                            {/* Drive link embed */}
                            {driveLinks.map(link => (
                              <DriveEmbed key={link} url={link} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Typing indicator */}
              {typing.length > 0 && (
                <div className="flex items-center gap-2 mt-3 pl-9">
                  <div className="flex -space-x-1">
                    {typing.slice(0, 3).map(t => (
                      <div key={t.user} className="h-5 w-5 rounded-full bg-zinc-600 border border-background flex items-center justify-center text-[8px] text-white font-bold overflow-hidden">
                        {t.avatar
                          ? <img src={t.avatar} alt="" className="h-full w-full object-cover" />
                          : (t.displayName ?? t.username).slice(0, 1).toUpperCase()
                        }
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    {typing.length === 1
                      ? `${typing[0].displayName ?? typing[0].username} está escribiendo`
                      : `${typing.length} personas están escribiendo`}
                    <span className="flex gap-0.5 ml-0.5">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="animate-bounce inline-block" style={{ animationDelay: `${d}ms` }}>.</span>
                      ))}
                    </span>
                  </span>
                </div>
              )}

              <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          {canChat ? (
            <div className="border-t border-border bg-card shrink-0">
              {/* Image preview strip */}
              {imagePreview && (
                <div className="px-3 pt-2.5 flex items-start gap-2">
                  <div className="relative shrink-0">
                    <img
                      src={imagePreview.url}
                      alt="preview"
                      className="h-20 w-20 object-cover rounded-lg border border-border"
                    />
                    <button
                      onClick={() => setImagePreview(null)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-end gap-2 px-3 py-2.5">
                {/* Image picker button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Adjuntar imagen"
                >
                  {uploading
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : <ImageIcon className="h-5 w-5" />
                  }
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImagePick}
                />

                <MentionInput
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Mensaje… (Enter envía · Shift+Enter nueva línea)"
                  className="bg-muted/60 border-transparent text-sm"
                  minHeight="40px"
                  style={{ maxHeight: '100px' }}
                />

                <Button
                  size="icon"
                  onClick={() => sendMessage()}
                  disabled={(!text.trim() && !imagePreview) || sending || uploading}
                  className="h-10 w-10 shrink-0 rounded-xl"
                >
                  {sending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center px-4 py-3 border-t border-border bg-card shrink-0 text-sm text-muted-foreground">
              {sessionId
                ? <Button size="sm" onClick={toggleJoin}>Unirte al grupo para participar</Button>
                : <span><Link href="/login" className="text-primary hover:underline">Inicia sesión</Link> para participar</span>
              }
            </div>
          )}
        </div>

        {/* Members panel */}
        {showMembers && (
          <div className="w-44 sm:w-52 border-l border-border bg-card/60 flex flex-col shrink-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-border shrink-0">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Miembros ({group.members.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {group.members.map(m => (
                <Link
                  key={m._id}
                  href={`/u/${m.username}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={m.avatar ?? ''} />
                    <AvatarFallback className="text-[9px]">
                      {m.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 flex items-center gap-1">
                    <span className="text-xs font-medium truncate">{m.displayName ?? m.username}</span>
                    <UserBadges badges={m.badges} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

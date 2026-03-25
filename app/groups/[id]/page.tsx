'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MentionInput } from '@/components/ui/mention-input'
import { RenderContent } from '@/components/ui/render-content'
import { UserBadges } from '@/components/forum/user-badges'
import { ArrowLeft, Users, Send, Loader2, Settings } from 'lucide-react'
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

export default function GroupChatPage() {
  const params   = useParams<{ id: string }>()
  const groupId  = params.id
  const router   = useRouter()
  const { data: session }   = useSession()
  const { user: me, sessionId } = useCurrentUser()

  const [group,    setGroup]    = useState<GroupInfo | null>(null)
  const [messages, setMessages] = useState<GroupMsg[]>([])
  const [typing,   setTyping]   = useState<TypingUser[]>([])
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [joined,   setJoined]   = useState(false)
  const [showMembers, setShowMembers] = useState(false)

  const bottomRef     = useRef<HTMLDivElement>(null)
  const lastMsgAt     = useRef<string | null>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isTypingRef   = useRef(false)

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
        if (msgs.length > 0) lastMsgAt.current = msgs[msgs.length - 1].createdAt
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
  }, [groupId])

  // Poll for new messages (1.5s)
  useEffect(() => {
    const poll = async () => {
      if (!lastMsgAt.current) return
      try {
        const res  = await fetch(`/api/groups/${groupId}/messages?after=${encodeURIComponent(lastMsgAt.current)}`)
        const data = await res.json()
        const fresh: GroupMsg[] = data.messages ?? []
        if (fresh.length > 0) {
          lastMsgAt.current = fresh[fresh.length - 1].createdAt
          setMessages(prev => {
            const seen = new Set(prev.map(m => m._id))
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

  // Poll typing (1s)
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

  // Handle typing indicator
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

  // Send message
  const sendMessage = useCallback(async () => {
    if (!text.trim() || !sessionId || sending) return
    setSending(true)
    clearTimeout(typingTimeout.current)
    isTypingRef.current = false
    fetch(`/api/groups/${groupId}/typing`, { method: 'DELETE' }).catch(() => {})

    try {
      const res  = await fetch(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.message) {
        setMessages(prev => [...prev, data.message])
        lastMsgAt.current = data.message.createdAt
        setText('')
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    } finally {
      setSending(false)
    }
  }, [text, sessionId, sending, groupId])

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
          : prev.members.filter(m => m._id !== sessionId)
      } : prev)
    }
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

  const isMember = joined
  const canChat  = isMember && !!sessionId

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px] bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border shrink-0">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/groups"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{group.name}</h2>
          <p className="text-xs text-muted-foreground truncate">{group.description}</p>
        </div>
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Users className="h-3.5 w-3.5" />
          <span>{group.members.length}</span>
        </button>
        {sessionId && (
          <Button
            size="sm"
            variant={isMember ? 'outline' : 'default'}
            onClick={toggleJoin}
            className="shrink-0 text-xs h-7"
          >
            {isMember ? 'Salir' : 'Unirse'}
          </Button>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Messages */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <p>Sin mensajes aún. ¡Sé el primero en escribir!</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMine = msg.author._id === sessionId
              const showAvatar = i === 0 || messages[i - 1].author._id !== msg.author._id
              const displayName = msg.author.displayName || msg.author.username

              return (
                <div key={msg._id} className={cn('flex gap-2', isMine && 'flex-row-reverse')}>
                  {showAvatar ? (
                    <Link href={`/u/${msg.author.username}`} className="shrink-0 mt-0.5">
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
                  <div className={cn('max-w-[75%]', isMine && 'items-end flex flex-col')}>
                    {showAvatar && (
                      <div className={cn('flex items-center gap-1 mb-0.5', isMine && 'flex-row-reverse')}>
                        <span className="text-xs font-medium">{displayName}</span>
                        <UserBadges badges={msg.author.badges} size="sm" />
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    )}
                    <div className={cn(
                      'px-3 py-2 rounded-2xl text-sm break-words',
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
                    )}>
                      <RenderContent text={msg.content} />
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {typing.length > 0 && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex -space-x-1">
                  {typing.slice(0, 3).map(t => (
                    <div key={t.user} className="h-5 w-5 rounded-full bg-zinc-600 border border-background flex items-center justify-center text-[8px] text-white font-bold overflow-hidden">
                      {t.avatar ? <img src={t.avatar} alt="" className="h-full w-full object-cover" /> : (t.displayName ?? t.username).slice(0, 1).toUpperCase()}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>
                    {typing.length === 1
                      ? `${typing[0].displayName ?? typing[0].username} está escribiendo`
                      : `${typing.length} personas están escribiendo`}
                  </span>
                  <span className="flex gap-0.5">
                    <span className="animate-bounce inline-block" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce inline-block" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce inline-block" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {canChat ? (
            <div className="flex items-end gap-2 px-4 py-3 border-t border-border bg-background/50 shrink-0">
              <MentionInput
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
                className="bg-secondary border-border text-sm"
                minHeight="40px"
                style={{ maxHeight: '120px' }}
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!text.trim() || sending}
                className="h-10 w-10 shrink-0"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center px-4 py-3 border-t border-border text-sm text-muted-foreground bg-background/50 shrink-0">
              {sessionId
                ? <Button size="sm" onClick={toggleJoin}>Unirte para participar</Button>
                : <span><Link href="/login" className="text-primary hover:underline">Inicia sesión</Link> para participar</span>
              }
            </div>
          )}
        </div>

        {/* Members panel */}
        {showMembers && (
          <div className="w-52 border-l border-border bg-background/50 overflow-y-auto shrink-0">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Miembros ({group.members.length})
              </span>
            </div>
            <div className="p-2 space-y-1">
              {group.members.map(m => (
                <Link key={m._id} href={`/u/${m.username}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={m.avatar ?? ''} />
                    <AvatarFallback className="text-[9px]">{m.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium truncate">{m.displayName ?? m.username}</span>
                      <UserBadges badges={m.badges} size="sm" />
                    </div>
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

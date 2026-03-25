'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { timeAgo } from '@/lib/time-ago'
import { cn } from '@/lib/utils'

interface Msg {
  _id: string
  from: { _id: string; username: string; displayName?: string; avatar?: string }
  to:   { _id: string; username: string; displayName?: string; avatar?: string }
  content: string
  createdAt: string
}

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>()
  const { data: session } = useSession()
  const myId = (session?.user as any)?.id ?? ''

  const [messages,  setMessages]  = useState<Msg[]>([])
  const [partner,   setPartner]   = useState<{ username: string; displayName?: string; avatar?: string } | null>(null)
  const [text,      setText]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [loading,   setLoading]   = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?with=${userId}`)
    if (!res.ok) return
    const data = await res.json()
    setMessages(data.messages ?? [])
    const msgs: Msg[] = data.messages ?? []
    if (msgs.length > 0) {
      const other = msgs[0].from._id === myId ? msgs[0].to : msgs[0].from
      setPartner(other)
    }
  }, [userId, myId])

  // Initial load + partner info
  useEffect(() => {
    if (!userId) return
    setLoading(true)
    // Try to get partner info from users API
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(d => { if (d._id) setPartner(d) })
      .catch(() => {})

    fetchMessages().finally(() => setLoading(false))
  }, [userId, fetchMessages])

  // Poll for new messages
  useEffect(() => {
    const t = setInterval(fetchMessages, 3000)
    return () => clearInterval(t)
  }, [fetchMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: userId, content: text.trim() }),
      })
      if (res.ok) {
        setText('')
        await fetchMessages()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/messages"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        {partner && (
          <>
            <Avatar className="h-8 w-8">
              <AvatarImage src={partner.avatar} />
              <AvatarFallback>{(partner.displayName || partner.username).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Link href={`/profile/${userId}`} className="font-semibold text-sm hover:text-primary transition-colors">
              {partner.displayName || partner.username}
            </Link>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Inicia la conversación 👋
          </p>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.from._id === myId
            const showAvatar = !isMe && (i === 0 || messages[i - 1].from._id !== msg.from._id)
            return (
              <div key={msg._id} className={cn('flex gap-2', isMe ? 'justify-end' : 'justify-start')}>
                {!isMe && (
                  <Avatar className={cn('h-7 w-7 shrink-0 mt-auto', !showAvatar && 'invisible')}>
                    <AvatarImage src={msg.from.avatar} />
                    <AvatarFallback className="text-[10px]">
                      {(msg.from.displayName || msg.from.username).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn('max-w-[70%] space-y-0.5', isMe && 'items-end flex flex-col')}>
                  <div className={cn(
                    'px-3 py-2 rounded-2xl text-sm leading-relaxed break-words',
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-secondary text-foreground rounded-bl-sm'
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">{timeAgo(msg.createdAt)}</span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-border shrink-0">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1"
          disabled={sending}
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={!text.trim() || sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  )
}

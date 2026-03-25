'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare } from 'lucide-react'
import { timeAgo } from '@/lib/time-ago'

interface Conversation {
  partner: { _id: string; username: string; displayName?: string; avatar?: string }
  lastMessage: { content: string; createdAt: string }
  unread: number
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/messages')
      .then(r => r.json())
      .then(d => setConversations(d.conversations ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-secondary/40 animate-pulse" />
      ))}
    </div>
  )

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <MessageSquare className="h-5 w-5" /> Mensajes
      </h1>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Sin conversaciones todavía</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Ve al perfil de alguien y haz click en "Mensaje"</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {conversations.map(({ partner, lastMessage, unread }) => (
            <Link
              key={partner._id}
              href={`/messages/${partner._id}`}
              className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-secondary/50 transition-colors"
            >
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={partner.avatar} />
                  <AvatarFallback>{(partner.displayName || partner.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${unread > 0 ? 'text-foreground' : 'text-foreground/80'}`}>
                    {partner.displayName || partner.username}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {timeAgo(lastMessage.createdAt)}
                  </span>
                </div>
                <p className={`text-xs truncate ${unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {lastMessage.content}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

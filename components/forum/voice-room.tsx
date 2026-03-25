'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useVoiceRoom } from '@/contexts/voice-room-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, PhoneOff, Volume2, Users, Loader2 } from 'lucide-react'

interface VoiceRoomProps {
  categoryId:   string
  categoryName: string
}

export function VoiceRoom({ categoryId, categoryName }: VoiceRoomProps) {
  const { data: session }    = useSession()
  const { roomName: activeRoom, join, leave } = useVoiceRoom()
  const [expanded,     setExpanded]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [outsideUsers, setOutsideUsers] = useState<{ identity: string; name: string }[]>([])

  const roomName  = `category-${categoryId}`
  const isJoined  = activeRoom === roomName

  /* Poll participants even without joining */
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
    const poll = async () => {
      try {
        const res = await fetch(`/api/voice/participants?room=${encodeURIComponent(roomName)}`)
        if (res.ok) setOutsideUsers((await res.json()).participants ?? [])
      } catch {}
    }
    poll()
    timer = setInterval(poll, 5000)
    return () => clearInterval(timer)
  }, [roomName])

  const handleJoin = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/voice/token?room=${encodeURIComponent(roomName)}`)
      if (!res.ok) throw new Error('Error al obtener token')
      const { token, serverUrl } = await res.json()
      join(roomName, categoryName, token, serverUrl)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [roomName, categoryName, join])

  if (!session) return null

  return (
    <div className="border-t border-border/50 mt-1 pt-1">
      {/* Header */}
      <button
        className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"
        onClick={() => setExpanded(e => !e)}
      >
        <Volume2 className={cn('h-3 w-3', isJoined && 'text-green-400')} />
        <span className="flex-1 text-left">Sala de voz</span>
        {outsideUsers.length > 0 && (
          <span className="flex items-center gap-1 text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            {outsideUsers.length}
          </span>
        )}
        <Users className="h-3 w-3" />
      </button>

      {/* Participants preview (not joined) */}
      {outsideUsers.length > 0 && !isJoined && (
        <div className="px-2 pb-1 flex flex-col gap-0.5">
          {outsideUsers.map(u => (
            <div key={u.identity} className="flex items-center gap-2 px-1 py-0.5">
              <div className="h-4 w-4 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                <span className="text-[8px] text-green-400 font-bold">{(u.name || u.identity).slice(0, 1).toUpperCase()}</span>
              </div>
              <span className="text-[11px] text-muted-foreground truncate">{u.name || u.identity}</span>
              <Mic className="h-2.5 w-2.5 text-green-400 ml-auto" />
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div className="px-2 pb-2 space-y-1">
          {error && <p className="text-xs text-destructive">{error}</p>}

          {isJoined ? (
            /* Already in this room — show status + leave */
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-1 py-1 rounded bg-green-600/10 border border-green-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400 flex-1">Conectado</span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="w-full h-7 text-xs"
                onClick={leave}
              >
                <PhoneOff className="mr-1 h-3 w-3" />Salir
              </Button>
            </div>
          ) : activeRoom ? (
            /* In a different room */
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">Estás en otra sala</p>
              <Button size="sm" className="w-full h-7 text-xs" onClick={handleJoin} disabled={loading}>
                {loading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Conectando...</> : <><Mic className="mr-1 h-3 w-3" />Cambiar sala</>}
              </Button>
            </div>
          ) : (
            <Button size="sm" className="w-full h-7 text-xs" onClick={handleJoin} disabled={loading}>
              {loading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Conectando...</> : <><Mic className="mr-1 h-3 w-3" />Unirse</>}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

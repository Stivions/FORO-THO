'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useTracks,
  VideoTrack,
  TrackToggle,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Mic, MicOff, PhoneOff, Volume2, Users,
  Loader2, Monitor, MonitorOff, Maximize2, Minimize2, X, Video, VideoOff,
} from 'lucide-react'

/* ─── Mini participant tile in sidebar ─────────────────── */
function ParticipantBadge({ participant }: { participant: any }) {
  const isSpeaking = participant.isSpeaking
  const isMuted    = !participant.isMicrophoneEnabled
  const name       = participant.name ?? participant.identity ?? '?'

  return (
    <div className="flex items-center gap-2 px-1 py-0.5 rounded">
      <div className={cn(
        'relative flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0 transition-all',
        isSpeaking ? 'ring-2 ring-green-400 bg-green-500' : 'bg-muted'
      )}>
        {name.slice(0, 2).toUpperCase()}
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background',
          isMuted ? 'bg-destructive' : 'bg-green-500'
        )} />
      </div>
      <span className="text-xs text-foreground truncate flex-1">{name}</span>
      {isMuted ? <MicOff className="h-3 w-3 text-destructive" /> : <Mic className="h-3 w-3 text-green-500" />}
    </div>
  )
}

/* ─── Stream overlay (full screen video/screen share) ──── */
function StreamOverlay({ onLeave, onClose }: { onLeave: () => void; onClose: () => void }) {
  const containerRef               = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false })
  const cameraTracks = useTracks([Track.Source.Camera],      { onlySubscribed: false })
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()

  const activeTracks = screenTracks.length > 0 ? screenTracks : cameraTracks
  const isSharing    = localParticipant?.isScreenShareEnabled

  /* Fullscreen API */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white text-sm font-semibold">
            {screenTracks.length > 0 ? 'Pantalla compartida' : 'Sala de video'}
          </span>
          <span className="text-zinc-400 text-xs">· {participants.length} participante{participants.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleFullscreen}
            className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded hover:bg-zinc-800"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen
              ? <Minimize2 className="h-4 w-4" />
              : <Maximize2 className="h-4 w-4" />
            }
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 overflow-hidden flex items-center justify-center bg-black min-h-0">
        {activeTracks.length > 0 ? (
          <div className={cn(
            'w-full h-full grid gap-1 p-1',
            activeTracks.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          )}>
            {activeTracks.map(track => (
              <div
                key={track.publication.trackSid}
                className="relative rounded-lg overflow-hidden bg-zinc-900 flex items-center justify-center min-h-0"
              >
                <VideoTrack
                  trackRef={track}
                  className="absolute inset-0 w-full h-full object-contain"
                />
                <span className="absolute bottom-2 left-2 text-white text-xs bg-black/70 px-2 py-0.5 rounded-full z-10">
                  {track.participant.name ?? track.participant.identity}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500 gap-3">
            <Monitor className="h-16 w-16 opacity-20" />
            <p className="text-sm">Nadie está compartiendo aún</p>
            <p className="text-xs text-zinc-600">Usa "Go Live" o "Cámara" para transmitir</p>
          </div>
        )}
      </div>

      {/* Participants strip */}
      {participants.length > 0 && (
        <div className="flex gap-2 px-3 py-2 bg-zinc-900/80 overflow-x-auto shrink-0">
          {participants.map(p => (
            <div key={p.sid} className={cn(
              'flex flex-col items-center gap-1 px-2 py-1 rounded-lg min-w-[52px] transition-all shrink-0',
              p.isSpeaking && 'ring-1 ring-green-400 bg-green-900/20'
            )}>
              <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-white text-[10px] font-bold">
                {(p.name ?? p.identity ?? '?').slice(0, 2).toUpperCase()}
              </div>
              <span className="text-zinc-300 text-[9px] truncate max-w-[48px]">{p.name ?? p.identity}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 p-3 bg-zinc-900 border-t border-zinc-800 shrink-0 flex-wrap">
        {/* Mic */}
        <TrackToggle source={Track.Source.Microphone} className={cn(
          'flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors min-w-[60px]',
          localParticipant?.isMicrophoneEnabled ? 'bg-zinc-700 text-white' : 'bg-red-600/80 text-white'
        )}>
          {localParticipant?.isMicrophoneEnabled
            ? <><Mic className="h-5 w-5" /><span>Micro</span></>
            : <><MicOff className="h-5 w-5" /><span>Mudo</span></>
          }
        </TrackToggle>

        {/* Camera */}
        <TrackToggle source={Track.Source.Camera} className={cn(
          'flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors min-w-[60px]',
          localParticipant?.isCameraEnabled ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-white'
        )}>
          {localParticipant?.isCameraEnabled
            ? <><Video className="h-5 w-5" /><span>Cam ON</span></>
            : <><VideoOff className="h-5 w-5" /><span>Cámara</span></>
          }
        </TrackToggle>

        {/* Screen share */}
        <TrackToggle source={Track.Source.ScreenShare} className={cn(
          'flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors min-w-[60px]',
          isSharing ? 'bg-green-600 text-white' : 'bg-zinc-700 text-white'
        )}>
          {isSharing
            ? <><MonitorOff className="h-5 w-5" /><span>Detener</span></>
            : <><Monitor className="h-5 w-5" /><span>Go Live</span></>
          }
        </TrackToggle>

        {/* Leave */}
        <button
          onClick={onLeave}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-medium bg-red-600 text-white hover:bg-red-500 transition-colors min-w-[60px]"
        >
          <PhoneOff className="h-5 w-5" />
          <span>Salir</span>
        </button>
      </div>
    </div>
  )
}

/* ─── Inner room content (inside LiveKitRoom) ───────────── */
function RoomInner({ onLeave }: { onLeave: () => void }) {
  const participants = useParticipants()
  const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false })
  const [showStream, setShowStream] = useState(false)

  const hasStream = screenTracks.length > 0 || participants.some(p => p.isCameraEnabled)

  return (
    <>
      <RoomAudioRenderer />

      {showStream && <StreamOverlay onLeave={onLeave} onClose={() => setShowStream(false)} />}

      {hasStream && !showStream && (
        <button
          onClick={() => setShowStream(true)}
          className="flex items-center gap-1.5 w-full px-2 py-1 mt-1 rounded bg-green-600/20 border border-green-500/30 text-green-400 text-xs hover:bg-green-600/30 transition-colors"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          Ver transmisión
          <Maximize2 className="h-3 w-3 ml-auto" />
        </button>
      )}

      <div className="space-y-0.5 mt-1">
        {participants.map(p => (
          <ParticipantBadge key={p.sid} participant={p} />
        ))}
        {participants.length === 0 && (
          <p className="text-xs text-muted-foreground px-1">Solo tú en la sala</p>
        )}
      </div>

      <div className="flex gap-1.5 mt-2">
        <TrackToggle source={Track.Source.Microphone} className={cn(
          'flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors',
          'bg-secondary text-foreground hover:bg-secondary/80'
        )}>
          <Mic className="h-3 w-3" />Micro
        </TrackToggle>

        <TrackToggle source={Track.Source.ScreenShare} className={cn(
          'flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors',
          'bg-secondary text-foreground hover:bg-secondary/80'
        )}>
          <Monitor className="h-3 w-3" />
        </TrackToggle>

        <button
          onClick={onLeave}
          className="flex items-center justify-center px-2 py-1.5 rounded text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
        >
          <PhoneOff className="h-3 w-3" />
        </button>
      </div>
    </>
  )
}

/* ─── Main VoiceRoom component ──────────────────────────── */
interface VoiceRoomProps {
  categoryId:   string
  categoryName: string
}

export function VoiceRoom({ categoryId, categoryName }: VoiceRoomProps) {
  const { data: session } = useSession()
  const [expanded,     setExpanded]     = useState(false)
  const [token,        setToken]        = useState<string | null>(null)
  const [serverUrl,    setServerUrl]    = useState<string>('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [outsideUsers, setOutsideUsers] = useState<{identity:string; name:string}[]>([])

  const roomName = `category-${categoryId}`

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
    const poll = async () => {
      try {
        const res = await fetch(`/api/voice/participants?room=${encodeURIComponent(roomName)}`)
        if (res.ok) {
          const data = await res.json()
          setOutsideUsers(data.participants ?? [])
        }
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
      const data = await res.json()
      setToken(data.token)
      setServerUrl(data.serverUrl)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [roomName])

  const handleLeave = useCallback(() => setToken(null), [])

  if (!session) return null

  return (
    <div className="border-t border-border/50 mt-1 pt-1">
      <button
        className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"
        onClick={() => setExpanded(e => !e)}
      >
        <Volume2 className="h-3 w-3" />
        <span className="flex-1 text-left">Sala de voz</span>
        {outsideUsers.length > 0 && (
          <span className="flex items-center gap-1 text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            {outsideUsers.length}
          </span>
        )}
        <Users className="h-3 w-3" />
      </button>

      {outsideUsers.length > 0 && !token && (
        <div className="px-2 pb-1 flex flex-col gap-0.5">
          {outsideUsers.map(u => (
            <div key={u.identity} className="flex items-center gap-2 px-1 py-0.5">
              <div className="h-4 w-4 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                <span className="text-[8px] text-green-400 font-bold">{(u.name||u.identity).slice(0,1).toUpperCase()}</span>
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

          {!token ? (
            <Button size="sm" className="w-full h-7 text-xs" onClick={handleJoin} disabled={loading}>
              {loading
                ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Conectando...</>
                : <><Mic className="mr-1 h-3 w-3" />Unirse</>
              }
            </Button>
          ) : (
            <LiveKitRoom
              serverUrl={serverUrl}
              token={token}
              connect={true}
              audio={true}
              video={false}
              onDisconnected={handleLeave}
              style={{ display: 'contents' }}
              options={{ adaptiveStream: true, dynacast: true }}
            >
              <RoomInner onLeave={handleLeave} />
            </LiveKitRoom>
          )}
        </div>
      )}
    </div>
  )
}

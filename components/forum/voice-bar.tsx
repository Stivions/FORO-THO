'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
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
import { useVoiceRoom } from '@/contexts/voice-room-context'
import { cn } from '@/lib/utils'
import {
  Mic, MicOff, PhoneOff, Monitor, MonitorOff,
  Maximize2, Minimize2, X, Video, VideoOff, Users,
} from 'lucide-react'

/* ─── Stream overlay (full screen) ─── */
function StreamOverlay({ onClose, onLeave }: { onClose: () => void; onLeave: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFS, setIsFS] = useState(false)
  const screenTracks  = useTracks([Track.Source.ScreenShare], { onlySubscribed: false })
  const cameraTracks  = useTracks([Track.Source.Camera],      { onlySubscribed: false })
  const participants  = useParticipants()
  const { localParticipant } = useLocalParticipant()
  const activeTracks  = screenTracks.length > 0 ? screenTracks : cameraTracks
  const isSharing     = localParticipant?.isScreenShareEnabled

  const toggleFS = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }, [])

  useEffect(() => {
    const h = () => setIsFS(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  return (
    <div ref={containerRef} className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white text-sm font-semibold">
            {screenTracks.length > 0 ? 'Pantalla compartida' : 'Sala de video'}
          </span>
          <span className="text-zinc-400 text-xs">· {participants.length} participante{participants.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleFS} className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-zinc-800 transition-colors">
            {isFS ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-zinc-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex items-center justify-center bg-black min-h-0">
        {activeTracks.length > 0 ? (
          <div className={cn('w-full h-full grid gap-1 p-1', activeTracks.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {activeTracks.map(t => (
              <div key={t.publication.trackSid} className="relative rounded-lg overflow-hidden bg-zinc-900 min-h-0">
                <VideoTrack trackRef={t} className="absolute inset-0 w-full h-full object-contain" />
                <span className="absolute bottom-2 left-2 text-white text-xs bg-black/70 px-2 py-0.5 rounded-full z-10">
                  {t.participant.name ?? t.participant.identity}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-zinc-500">
            <Monitor className="h-16 w-16 opacity-20" />
            <p className="text-sm">Nadie está compartiendo aún</p>
          </div>
        )}
      </div>

      {participants.length > 0 && (
        <div className="flex gap-2 px-3 py-2 bg-zinc-900/80 overflow-x-auto shrink-0">
          {participants.map(p => (
            <div key={p.sid} className={cn('flex flex-col items-center gap-1 px-2 py-1 rounded-lg min-w-[52px] shrink-0', p.isSpeaking && 'ring-1 ring-green-400 bg-green-900/20')}>
              <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-white text-[10px] font-bold">
                {(p.name ?? p.identity ?? '?').slice(0, 2).toUpperCase()}
              </div>
              <span className="text-zinc-300 text-[9px] truncate max-w-[48px]">{p.name ?? p.identity}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 p-3 bg-zinc-900 border-t border-zinc-800 shrink-0 flex-wrap">
        <TrackToggle source={Track.Source.Microphone} className={cn('flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-medium min-w-[60px]', localParticipant?.isMicrophoneEnabled ? 'bg-zinc-700 text-white' : 'bg-red-600/80 text-white')}>
          {localParticipant?.isMicrophoneEnabled ? <><Mic className="h-5 w-5" /><span>Micro</span></> : <><MicOff className="h-5 w-5" /><span>Mudo</span></>}
        </TrackToggle>
        <TrackToggle source={Track.Source.Camera} className={cn('flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-medium min-w-[60px]', localParticipant?.isCameraEnabled ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-white')}>
          {localParticipant?.isCameraEnabled ? <><Video className="h-5 w-5" /><span>Cam ON</span></> : <><VideoOff className="h-5 w-5" /><span>Cámara</span></>}
        </TrackToggle>
        <TrackToggle source={Track.Source.ScreenShare} className={cn('flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-medium min-w-[60px]', isSharing ? 'bg-green-600 text-white' : 'bg-zinc-700 text-white')}>
          {isSharing ? <><MonitorOff className="h-5 w-5" /><span>Detener</span></> : <><Monitor className="h-5 w-5" /><span>Go Live</span></>}
        </TrackToggle>
        <button onClick={onLeave} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-medium bg-red-600 text-white hover:bg-red-500 min-w-[60px]">
          <PhoneOff className="h-5 w-5" /><span>Salir</span>
        </button>
      </div>
    </div>
  )
}

/* ─── Persistent bottom bar inner (inside LiveKitRoom) ─── */
function VoiceBarInner({ onLeave }: { onLeave: () => void }) {
  const { roomLabel } = useVoiceRoom()
  const { localParticipant } = useLocalParticipant()
  const participants  = useParticipants()
  const screenTracks  = useTracks([Track.Source.ScreenShare], { onlySubscribed: false })
  const cameraTracks  = useTracks([Track.Source.Camera],      { onlySubscribed: false })
  const [showStream, setShowStream] = useState(false)
  const hasStream = screenTracks.length > 0 || participants.some(p => p.isCameraEnabled)

  return (
    <>
      <RoomAudioRenderer />
      {showStream && <StreamOverlay onLeave={onLeave} onClose={() => setShowStream(false)} />}

      <div className="fixed bottom-0 left-0 right-0 z-[90] bg-zinc-900 border-t border-zinc-700 flex items-center gap-3 px-4 py-2">
        {/* Room info */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <span className="text-xs text-zinc-300 font-medium truncate">{roomLabel ?? 'Sala de voz'}</span>
          <span className="text-xs text-zinc-500">· {participants.length} conectado{participants.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Participants mini avatars */}
        <div className="flex -space-x-1 shrink-0">
          {participants.slice(0, 4).map(p => (
            <div key={p.sid} className={cn('h-5 w-5 rounded-full bg-zinc-600 border border-zinc-900 flex items-center justify-center text-[8px] text-white font-bold', p.isSpeaking && 'ring-1 ring-green-400')}>
              {(p.name ?? p.identity ?? '?').slice(0, 1).toUpperCase()}
            </div>
          ))}
          {participants.length > 4 && <div className="h-5 w-5 rounded-full bg-zinc-700 border border-zinc-900 flex items-center justify-center text-[8px] text-zinc-300">+{participants.length - 4}</div>}
        </div>

        <div className="flex-1" />

        {/* View stream button */}
        {hasStream && (
          <button onClick={() => setShowStream(true)} className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-600/20 border border-green-500/30 text-green-400 text-xs hover:bg-green-600/30 transition-colors">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Ver transmisión
            <Maximize2 className="h-3 w-3" />
          </button>
        )}

        {/* Controls */}
        <TrackToggle source={Track.Source.Microphone} className={cn('flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors', localParticipant?.isMicrophoneEnabled ? 'bg-zinc-700 text-white hover:bg-zinc-600' : 'bg-red-600/80 text-white hover:bg-red-600')}>
          {localParticipant?.isMicrophoneEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
        </TrackToggle>

        <TrackToggle source={Track.Source.Camera} className={cn('flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors', localParticipant?.isCameraEnabled ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-zinc-700 text-white hover:bg-zinc-600')}>
          {localParticipant?.isCameraEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
        </TrackToggle>

        <button onClick={onLeave} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium bg-red-600/80 text-white hover:bg-red-600 transition-colors">
          <PhoneOff className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  )
}

/* ─── Root-level persistent voice bar ─── */
export function VoiceBar() {
  const { token, serverUrl, leave } = useVoiceRoom()
  if (!token || !serverUrl) return null

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={leave}
      style={{ display: 'contents' }}
      options={{ adaptiveStream: true, dynacast: true }}
    >
      <VoiceBarInner onLeave={leave} />
    </LiveKitRoom>
  )
}

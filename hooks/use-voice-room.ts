'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

export interface VoiceMember {
  socketId: string
  userId: string
  username: string
  avatar?: string
  muted?: boolean
}

export function useVoiceRoom(roomId: string | null, currentUser: { id: string; username: string; avatar?: string } | null) {
  const socketRef     = useRef<Socket | null>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const peersRef      = useRef<Map<string, RTCPeerConnection>>(new Map())
  const audioRefs     = useRef<Map<string, HTMLAudioElement>>(new Map())

  const [members,    setMembers]    = useState<VoiceMember[]>([])
  const [joined,     setJoined]     = useState(false)
  const [muted,      setMuted]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  // RTC config with public STUN servers
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  }

  const getSocket = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io({ path: '/socket.io', transports: ['websocket'] })
    }
    return socketRef.current
  }, [])

  const createPeer = useCallback((targetSocketId: string, isInitiator: boolean) => {
    const socket = getSocket()
    const pc = new RTCPeerConnection(rtcConfig)

    // Add local tracks
    streamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, streamRef.current!)
    })

    // Remote audio
    pc.ontrack = (e) => {
      let audio = audioRefs.current.get(targetSocketId)
      if (!audio) {
        audio = new Audio()
        audio.autoplay = true
        audioRefs.current.set(targetSocketId, audio)
      }
      audio.srcObject = e.streams[0]
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('voice:ice', { to: targetSocketId, candidate: e.candidate })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peersRef.current.delete(targetSocketId)
      }
    }

    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer)
        socket.emit('voice:offer', { to: targetSocketId, offer })
      })
    }

    peersRef.current.set(targetSocketId, pc)
    return pc
  }, [getSocket])

  const join = useCallback(async () => {
    if (!roomId || !currentUser || joined) return
    setConnecting(true); setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const socket = getSocket()

      socket.on('voice:room-members', (existingMembers: VoiceMember[]) => {
        setMembers(existingMembers)
        // Initiate peer connection with each existing member
        existingMembers.forEach(m => createPeer(m.socketId, true))
      })

      socket.on('voice:user-joined', (member: VoiceMember) => {
        setMembers(prev => [...prev.filter(m => m.socketId !== member.socketId), member])
        createPeer(member.socketId, false)
      })

      socket.on('voice:user-left', ({ socketId }: { socketId: string }) => {
        setMembers(prev => prev.filter(m => m.socketId !== socketId))
        peersRef.current.get(socketId)?.close()
        peersRef.current.delete(socketId)
        audioRefs.current.get(socketId)?.remove()
        audioRefs.current.delete(socketId)
      })

      socket.on('voice:offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
        const pc = createPeer(from, false)
        await pc.setRemoteDescription(offer)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('voice:answer', { to: from, answer })
      })

      socket.on('voice:answer', async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
        await peersRef.current.get(from)?.setRemoteDescription(answer)
      })

      socket.on('voice:ice', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
        await peersRef.current.get(from)?.addIceCandidate(candidate).catch(() => {})
      })

      socket.on('voice:mute', ({ socketId, muted: m }: { socketId: string; muted: boolean }) => {
        setMembers(prev => prev.map(mem => mem.socketId === socketId ? { ...mem, muted: m } : mem))
      })

      socket.emit('voice:join', {
        roomId,
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
      })

      setJoined(true)
    } catch (e: any) {
      setError(e.message ?? 'Error al acceder al micrófono')
    } finally {
      setConnecting(false)
    }
  }, [roomId, currentUser, joined, getSocket, createPeer])

  const leave = useCallback(() => {
    const socket = socketRef.current
    if (socket) {
      socket.emit('voice:leave')
      socket.off('voice:room-members')
      socket.off('voice:user-joined')
      socket.off('voice:user-left')
      socket.off('voice:offer')
      socket.off('voice:answer')
      socket.off('voice:ice')
      socket.off('voice:mute')
    }

    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

    peersRef.current.forEach(pc => pc.close())
    peersRef.current.clear()

    audioRefs.current.forEach(a => { a.srcObject = null })
    audioRefs.current.clear()

    setMembers([])
    setJoined(false)
    setMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    if (!streamRef.current) return
    const newMuted = !muted
    streamRef.current.getAudioTracks().forEach(t => { t.enabled = !newMuted })
    setMuted(newMuted)
    socketRef.current?.emit('voice:mute', { roomId, muted: newMuted })
  }, [muted, roomId])

  // Cleanup on unmount
  useEffect(() => () => { leave() }, [leave])

  return { members, joined, muted, error, connecting, join, leave, toggleMute }
}

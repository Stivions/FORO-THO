'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface VoiceRoomState {
  roomName:  string | null
  roomLabel: string | null
  token:     string | null
  serverUrl: string | null
  join:  (roomName: string, roomLabel: string, token: string, serverUrl: string) => void
  leave: () => void
}

const VoiceRoomContext = createContext<VoiceRoomState>({
  roomName: null, roomLabel: null, token: null, serverUrl: null,
  join: () => {}, leave: () => {},
})

export function VoiceRoomProvider({ children }: { children: ReactNode }) {
  const [roomName,  setRoomName]  = useState<string | null>(null)
  const [roomLabel, setRoomLabel] = useState<string | null>(null)
  const [token,     setToken]     = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)

  const join = useCallback((rn: string, rl: string, t: string, su: string) => {
    setRoomName(rn); setRoomLabel(rl); setToken(t); setServerUrl(su)
  }, [])

  const leave = useCallback(() => {
    setRoomName(null); setRoomLabel(null); setToken(null); setServerUrl(null)
  }, [])

  return (
    <VoiceRoomContext.Provider value={{ roomName, roomLabel, token, serverUrl, join, leave }}>
      {children}
    </VoiceRoomContext.Provider>
  )
}

export const useVoiceRoom = () => useContext(VoiceRoomContext)

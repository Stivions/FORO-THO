'use client'

import { VoiceRoomProvider } from '@/contexts/voice-room-context'
import { VoiceBar } from '@/components/forum/voice-bar'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <VoiceRoomProvider>
      {children}
      <VoiceBar />
    </VoiceRoomProvider>
  )
}

'use client'

import { useEffect, createContext, useContext } from 'react'
import dynamic from 'next/dynamic'
import { VoiceRoomProvider } from '@/contexts/voice-room-context'
import { unlockAudio } from '@/lib/sounds'
import { useNotifications, type AppNotification } from '@/hooks/use-notifications'

// Lazy-load VoiceBar — LiveKit is ~500KB, no need to ship it on every page
const VoiceBar = dynamic(() => import('@/components/forum/voice-bar').then(m => ({ default: m.VoiceBar })), {
  ssr: false,
  loading: () => null,
})

/* ── Global notification context ── */
interface NotifCtx {
  notifications: AppNotification[]
  unread: number
  markAllRead: () => Promise<void>
}

const NotificationsContext = createContext<NotifCtx>({
  notifications: [],
  unread: 0,
  markAllRead: async () => {},
})

export function useGlobalNotifications() {
  return useContext(NotificationsContext)
}

/* ── Inner component that runs hooks ── */
function GlobalListeners({ children }: { children: React.ReactNode }) {
  const { notifications, unread, markAllRead } = useNotifications()

  // Unlock AudioContext on first user interaction (browser autoplay policy)
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('click',    unlock, { once: true })
    window.addEventListener('touchend', unlock, { once: true })
    window.addEventListener('keydown',  unlock, { once: true })
    return () => {
      window.removeEventListener('click',    unlock)
      window.removeEventListener('touchend', unlock)
      window.removeEventListener('keydown',  unlock)
    }
  }, [])

  return (
    <NotificationsContext.Provider value={{ notifications, unread, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <VoiceRoomProvider>
      <GlobalListeners>
        {children}
        <VoiceBar />
      </GlobalListeners>
    </VoiceRoomProvider>
  )
}

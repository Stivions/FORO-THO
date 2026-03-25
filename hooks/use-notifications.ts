'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { playSound } from '@/lib/sounds'

export interface AppNotification {
  _id: string
  type: 'dm' | 'post_like' | 'comment' | 'follow' | 'mention' | 'group_request' | 'group_update'
  from?: { _id: string; username: string; displayName?: string; avatar?: string }
  post?: { _id: string; title?: string }
  text: string
  read: boolean
  createdAt: string
}

let browserPermissionRequested = false

function requestBrowserPermission() {
  if (browserPermissionRequested) return
  browserPermissionRequested = true
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }
}

function showBrowserNotif(notif: AppNotification) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const who = notif.from?.displayName ?? notif.from?.username ?? 'Alguien'
  const messages: Record<string, string> = {
    dm:            `${who} te envió un mensaje`,
    post_like:     `A ${who} le gustó tu post`,
    comment:       `${who} comentó en tu post`,
    follow:        `${who} te comenzó a seguir`,
    mention:       `${who} te mencionó`,
    group_request: notif.text || 'Nueva solicitud de grupo',
    group_update:  notif.text || 'Actualización de tu grupo',
  }
  try {
    new Notification('FORO THO', {
      body: messages[notif.type] ?? 'Nueva notificación',
      icon: notif.from?.avatar ?? '/favicon.ico',
    })
  } catch {
    // Notification blocked or unavailable
  }
}

const soundMap: Record<string, Parameters<typeof playSound>[0]> = {
  dm:            'dm',
  post_like:     'like',
  comment:       'comment',
  follow:        'follow',
  mention:       'notification',
  group_request: 'notification',
  group_update:  'notification',
}

export function useNotifications(intervalMs = 20000) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unread, setUnread]               = useState(0)
  const knownIdsRef                       = useRef<Set<string>>(new Set())
  const firstFetch                        = useRef(true)

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const incoming: AppNotification[] = data.notifications ?? []

      // On first fetch just seed known IDs without playing sounds
      if (firstFetch.current) {
        firstFetch.current = false
        incoming.forEach(n => knownIdsRef.current.add(n._id))
        setNotifications(incoming)
        setUnread(data.unread ?? 0)
        return
      }

      // Detect genuinely new notifications
      const fresh = incoming.filter(n => !knownIdsRef.current.has(n._id))
      fresh.forEach(n => {
        knownIdsRef.current.add(n._id)
        playSound(soundMap[n.type] ?? 'notification')
        showBrowserNotif(n)
      })

      setNotifications(incoming)
      setUnread(data.unread ?? 0)
    } catch {
      // network error — ignore
    }
  }, [])

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications', { method: 'POST' })
    setUnread(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  useEffect(() => {
    requestBrowserPermission()
    fetchNotifs()

    let id: ReturnType<typeof setInterval> | undefined

    const start = () => { id = setInterval(fetchNotifs, intervalMs) }
    const stop  = () => { clearInterval(id); id = undefined }

    // Pause polling when the tab is hidden — resume when visible again
    const onVisibility = () => { document.hidden ? stop() : (fetchNotifs(), start()) }

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchNotifs, intervalMs])

  return { notifications, unread, markAllRead }
}

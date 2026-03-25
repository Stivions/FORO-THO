import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export interface CurrentUser {
  _id: string
  username: string
  displayName?: string
  avatar?: string
  bannerUrl?: string
  role?: string
  badges?: string[]
}

// Module-level refetch trigger
let _refetch: (() => void) | null = null

export function useCurrentUser() {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    _refetch = () => setTick(t => t + 1)
    return () => { _refetch = null }
  })

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/users/me')
      .then(r => r.json())
      .then(data => setUser(data))
      .catch(() => {})
  }, [status, tick])

  return { user, sessionId: (session?.user as any)?.id }
}

export function invalidateCurrentUser() {
  _refetch?.()
}

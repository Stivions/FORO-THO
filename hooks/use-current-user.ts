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

export function useCurrentUser() {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/users/me')
      .then(r => r.json())
      .then(data => setUser(data))
      .catch(() => {})
  }, [status])

  return { user, sessionId: (session?.user as any)?.id }
}

export function invalidateCurrentUser() {
  // kept for compatibility — no-op now that there's no module-level cache
}

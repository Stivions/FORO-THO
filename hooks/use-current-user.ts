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
  email?: string
  vip?: boolean
  vipExpiresAt?: string | null
  currentSessionId?: string
  sellerVerified?: boolean
  suspicious?: boolean
  suspiciousReason?: string
  reputationScore?: number
  reputationVotes?: number
}

let _refetch: (() => void) | null = null
let _cache: CurrentUser | null = null
let _cacheAt = 0
let _inflight: Promise<CurrentUser | null> | null = null

const CACHE_TTL_MS = 15_000

async function fetchCurrentUser(force = false): Promise<CurrentUser | null> {
  const fresh = Date.now() - _cacheAt < CACHE_TTL_MS
  if (!force && fresh) return _cache
  if (!force && _inflight) return _inflight

  _inflight = fetch('/api/users/me')
    .then(async r => {
      if (!r.ok) return null
      return await r.json()
    })
    .then(user => {
      _cache = user
      _cacheAt = Date.now()
      return user
    })
    .catch(() => _cache)
    .finally(() => {
      _inflight = null
    })

  return _inflight
}

export function useCurrentUser() {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<CurrentUser | null>(_cache)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    _refetch = () => setTick(t => t + 1)
    return () => { _refetch = null }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') {
      setUser(null)
      _cache = null
      _cacheAt = 0
      return
    }

    fetchCurrentUser(tick > 0).then(setUser)
  }, [status, tick])

  return {
    user,
    sessionId: (session?.user as any)?.id,
    currentSessionId: user?.currentSessionId || (session?.user as any)?.sid || '',
  }
}

export function invalidateCurrentUser() {
  _cacheAt = 0
  _cache = null
  _refetch?.()
}

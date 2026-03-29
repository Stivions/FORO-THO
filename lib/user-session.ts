import { UserSession } from '@/models/UserSession'

function readSessionHeader(headers: Headers, name: string) {
  return headers.get(name) || headers.get(name.toLowerCase()) || ''
}

export function getSessionIdFromSession(session: any) {
  return (session?.user as any)?.sid || ''
}

export async function touchUserSession(session: any, req?: Request) {
  const sessionId = getSessionIdFromSession(session)
  if (!sessionId) return

  const update: Record<string, unknown> = { lastSeenAt: new Date() }
  if (req) {
    const headers = req.headers
    const forwarded = readSessionHeader(headers, 'x-forwarded-for')
    const ip = forwarded.split(',')[0]?.trim() || readSessionHeader(headers, 'x-real-ip') || readSessionHeader(headers, 'cf-connecting-ip') || ''
    if (ip) update.ip = ip
  }

  await UserSession.updateOne(
    { sessionId, revokedAt: null },
    { $set: update }
  ).catch(() => {})
}

export async function revokeUserSession(sessionId: string, reason = 'logout') {
  if (!sessionId) return
  await UserSession.updateOne(
    { sessionId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  )
}

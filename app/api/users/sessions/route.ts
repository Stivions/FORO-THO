import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { UserSession } from '@/models/UserSession'
import { touchUserSession } from '@/lib/user-session'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await connectDB()
  await touchUserSession(session, req)

  const userId = (session.user as any).id
  const currentSessionId = (session.user as any).sid ?? ''
  const sessions = await UserSession.find({ user: userId })
    .sort({ revokedAt: 1, lastSeenAt: -1, createdAt: -1 })
    .lean()

  return NextResponse.json({
    currentSessionId,
    sessions: sessions.map((item: any) => ({
      ...item,
      isCurrent: item.sessionId === currentSessionId,
      active: !item.revokedAt,
    })),
  })
}

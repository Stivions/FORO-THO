import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AccessToken } from 'livekit-server-sdk'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room')
  if (!room) return NextResponse.json({ error: 'room requerido' }, { status: 400 })

  const userId   = (session.user as any).id
  const username = (session.user as any).name ?? 'Usuario'

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: userId, name: username, ttl: '4h' }
  )

  at.addGrant({
    roomJoin:          true,
    room,
    canPublish:        true,
    canSubscribe:      true,
    canPublishData:    true,
    canUpdateOwnMetadata: true,
  })

  return NextResponse.json({
    token:      await at.toJwt(),
    serverUrl:  process.env.LIVEKIT_URL,
  })
}

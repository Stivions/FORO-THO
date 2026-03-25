import { NextResponse } from 'next/server'
import { RoomServiceClient } from 'livekit-server-sdk'

export const dynamic = 'force-dynamic'

const svc = new RoomServiceClient(
  process.env.LIVEKIT_URL!.replace('wss://', 'https://'),
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room')
  if (!room) return NextResponse.json({ participants: [] })

  try {
    const participants = await svc.listParticipants(room)
    return NextResponse.json({
      participants: participants.map(p => ({
        identity: p.identity,
        name:     p.name,
        joinedAt: p.joinedAt?.toString(),
      }))
    })
  } catch {
    // Room doesn't exist yet → empty
    return NextResponse.json({ participants: [] })
  }
}

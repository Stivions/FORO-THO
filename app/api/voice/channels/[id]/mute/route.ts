import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { VoiceChannel } from '@/models/VoiceChannel'
import { RoomServiceClient } from 'livekit-server-sdk'

export const dynamic = 'force-dynamic'

const svc = new RoomServiceClient(
  process.env.LIVEKIT_URL!.replace('wss://', 'https://'),
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
)

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const { identity, muted } = await req.json()
  if (!identity) return NextResponse.json({ error: 'identity requerido' }, { status: 400 })

  await connectDB()
  const channel = await VoiceChannel.findById(id)
  if (!channel) return NextResponse.json({ error: 'Canal no encontrado' }, { status: 404 })

  const uid  = (session.user as any).id
  const role = (session.user as any).role
  const isOwnerOrAdmin = role === 'admin' || role === 'moderator' || channel.owner.toString() === uid

  if (!isOwnerOrAdmin) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  if (identity === uid) return NextResponse.json({ error: 'No puedes mutearte a ti mismo desde aquí' }, { status: 400 })

  try {
    // Find participant's microphone track SID
    const participants = await svc.listParticipants(channel.roomId)
    const participant  = participants.find(p => p.identity === identity)

    if (!participant) {
      return NextResponse.json({ error: 'Participante no encontrado en la sala' }, { status: 404 })
    }

    // source: 0=unknown, 1=camera, 2=microphone, 3=screenshare, 4=screenshare_audio
    const micTrack = participant.tracks.find((t: any) => t.source === 2)

    if (!micTrack) {
      return NextResponse.json({ ok: true, message: 'Sin micrófono activo' })
    }

    await svc.mutePublishedTrack(channel.roomId, identity, micTrack.sid, muted !== false)
    return NextResponse.json({ ok: true, muted: muted !== false })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error al mutear' }, { status: 500 })
  }
}

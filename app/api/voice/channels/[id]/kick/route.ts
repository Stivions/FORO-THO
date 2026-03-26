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
  const { identity } = await req.json()
  if (!identity) return NextResponse.json({ error: 'identity requerido' }, { status: 400 })

  await connectDB()
  const channel = await VoiceChannel.findById(id)
  if (!channel) return NextResponse.json({ error: 'Canal no encontrado' }, { status: 404 })

  const uid  = (session.user as any).id
  const role = (session.user as any).role
  const isOwnerOrAdmin = role === 'admin' || role === 'moderator' || channel.owner.toString() === uid

  if (!isOwnerOrAdmin) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  if (identity === uid) return NextResponse.json({ error: 'No puedes expulsarte a ti mismo' }, { status: 400 })

  try {
    await svc.removeParticipant(channel.roomId, identity)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error al expulsar' }, { status: 500 })
  }
}

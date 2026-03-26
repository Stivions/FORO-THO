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

type Ctx = { params: Promise<{ id: string }> }

async function isOwnerOrAdmin(session: any, channel: any): boolean {
  const uid  = (session?.user as any)?.id
  const role = (session?.user as any)?.role
  return role === 'admin' || role === 'moderator' || channel.owner.toString() === uid
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const channel = await VoiceChannel.findById(id)
  if (!channel) return NextResponse.json({ error: 'Canal no encontrado' }, { status: 404 })

  if (!await isOwnerOrAdmin(session, channel)) {
    return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 })
  }

  const { name, description, maxParticipants } = await req.json()
  if (name)            channel.name            = name.trim().slice(0, 40)
  if (description !== undefined) channel.description = description.slice(0, 120)
  if (maxParticipants) channel.maxParticipants  = Math.min(Math.max(parseInt(maxParticipants) || 20, 2), 50)
  await channel.save()

  const populated = await channel.populate('owner', 'username displayName avatar')
  return NextResponse.json({ channel: populated })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const channel = await VoiceChannel.findById(id)
  if (!channel) return NextResponse.json({ error: 'Canal no encontrado' }, { status: 404 })

  if (!await isOwnerOrAdmin(session, channel)) {
    return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 })
  }

  // Delete LiveKit room (kicks everyone out)
  try { await svc.deleteRoom(channel.roomId) } catch {}

  await VoiceChannel.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}

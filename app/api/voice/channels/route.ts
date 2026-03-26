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

export async function GET() {
  await connectDB()
  const channels = await VoiceChannel.find()
    .populate('owner', 'username displayName avatar')
    .sort({ createdAt: -1 })
    .lean()

  // Fetch participant counts for all channels in parallel
  const withCounts = await Promise.all(
    channels.map(async (ch: any) => {
      try {
        const parts = await svc.listParticipants(ch.roomId)
        return { ...ch, participantCount: parts.length, participants: parts.map(p => ({ identity: p.identity, name: p.name })) }
      } catch {
        return { ...ch, participantCount: 0, participants: [] }
      }
    })
  )

  return NextResponse.json({ channels: withCounts })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, description, maxParticipants } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  await connectDB()
  const uid = (session.user as any).id

  const channel = await VoiceChannel.create({
    name:            name.trim().slice(0, 40),
    description:     (description ?? '').slice(0, 120),
    owner:           uid,
    roomId:          '',            // will set after insert
    maxParticipants: Math.min(Math.max(parseInt(maxParticipants) || 20, 2), 50),
  })

  // Use the MongoDB _id to make a stable, unique room ID
  channel.roomId = `channel-${channel._id}`
  await channel.save()

  const populated = await channel.populate('owner', 'username displayName avatar')
  return NextResponse.json({ channel: populated }, { status: 201 })
}

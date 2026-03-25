import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Message } from '@/models/Message'
import { User } from '@/models/User'

export const dynamic = 'force-dynamic'

/* GET /api/messages?with=userId — get conversation */
/* GET /api/messages              — get conversations list */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const uid = (session.user as any).id
  const { searchParams } = new URL(req.url)
  const withId = searchParams.get('with')

  await connectDB()

  if (withId) {
    /* Conversation with a specific user */
    if (!mongoose.Types.ObjectId.isValid(withId))
      return NextResponse.json({ messages: [] })

    // Mark incoming messages as read
    await Message.updateMany({ from: withId, to: uid, read: false }, { read: true })

    const messages = await Message.find({
      $or: [
        { from: uid, to: withId },
        { from: withId, to: uid },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('from', 'username displayName avatar')
      .populate('to',   'username displayName avatar')
      .lean()

    return NextResponse.json({ messages })
  }

  /* Conversations list: last message per conversation partner */
  const allMessages = await Message.find({
    $or: [{ from: uid }, { to: uid }],
  })
    .sort({ createdAt: -1 })
    .populate('from', 'username displayName avatar')
    .populate('to',   'username displayName avatar')
    .lean()

  // Deduplicate: one entry per conversation partner
  const seen = new Set<string>()
  const conversations: any[] = []
  for (const msg of allMessages) {
    const partnerId = (msg.from as any)._id.toString() === uid
      ? (msg.to as any)._id.toString()
      : (msg.from as any)._id.toString()
    if (seen.has(partnerId)) continue
    seen.add(partnerId)
    const unread = await Message.countDocuments({ from: partnerId, to: uid, read: false })
    conversations.push({ lastMessage: msg, partner: (msg.from as any)._id.toString() === uid ? msg.to : msg.from, unread })
  }

  return NextResponse.json({ conversations })
}

/* POST /api/messages — send message */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const uid = (session.user as any).id
  const { to, content } = await req.json()

  if (!to || !content?.trim())
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  if (!mongoose.Types.ObjectId.isValid(to))
    return NextResponse.json({ error: 'Destinatario inválido' }, { status: 400 })
  if (uid === to)
    return NextResponse.json({ error: 'No puedes enviarte un mensaje a ti mismo' }, { status: 400 })

  await connectDB()

  const msg = await Message.create({ from: uid, to, content: content.trim() })
  const populated = await msg.populate([
    { path: 'from', select: 'username displayName avatar' },
    { path: 'to',   select: 'username displayName avatar' },
  ])

  return NextResponse.json({ message: populated }, { status: 201 })
}

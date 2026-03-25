import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Message } from '@/models/Message'
import { User } from '@/models/User'
import { Notification } from '@/models/Notification'

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

  /* Conversations list — single aggregation pipeline, no N+1 */
  const uidObj = new mongoose.Types.ObjectId(uid)

  // 1. Unread counts per sender in one query
  const unreadCounts = await Message.aggregate([
    { $match: { to: uidObj, read: false } },
    { $group: { _id: '$from', count: { $sum: 1 } } },
  ])
  const unreadMap = new Map(unreadCounts.map((r: any) => [r._id.toString(), r.count]))

  // 2. Last message per conversation partner in one query
  const lastMessages = await Message.aggregate([
    { $match: { $or: [{ from: uidObj }, { to: uidObj }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          $cond: [{ $eq: ['$from', uidObj] }, '$to', '$from'],
        },
        lastMsgId: { $first: '$_id' },
      },
    },
    {
      $lookup: {
        from: 'messages',
        localField: 'lastMsgId',
        foreignField: '_id',
        as: 'msg',
      },
    },
    { $unwind: '$msg' },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'partner',
        pipeline: [{ $project: { username: 1, displayName: 1, avatar: 1 } }],
      },
    },
    { $unwind: '$partner' },
    { $sort: { 'msg.createdAt': -1 } },
    { $limit: 50 },
  ])

  const conversations = lastMessages.map((c: any) => ({
    lastMessage: c.msg,
    partner:     c.partner,
    unread:      unreadMap.get(c._id.toString()) ?? 0,
  }))

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
  Notification.create({
    user: to,
    type: 'dm',
    from: uid,
    text: content.trim().slice(0, 80),
  }).catch(() => {})
  const populated = await msg.populate([
    { path: 'from', select: 'username displayName avatar' },
    { path: 'to',   select: 'username displayName avatar' },
  ])

  return NextResponse.json({ message: populated }, { status: 201 })
}

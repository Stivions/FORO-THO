import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Notification } from '@/models/Notification'

export const dynamic = 'force-dynamic'

/* GET — unread + recent notifications */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ notifications: [], unread: 0 })

  const uid = (session.user as any).id
  await connectDB()

  const notifications = await Notification.find({ user: uid })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('from', 'username displayName avatar')
    .populate('post', 'title')
    .lean()

  const unread = notifications.filter(n => !n.read).length

  return NextResponse.json({ notifications, unread })
}

/* POST — mark all as read */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ ok: false })

  const uid = (session.user as any).id
  await connectDB()
  await Notification.updateMany({ user: uid, read: false }, { read: true })
  return NextResponse.json({ ok: true })
}

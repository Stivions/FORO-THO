import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { LoginEvent } from '@/models/LoginEvent'

async function isAdmin(session: any): Promise<boolean> {
  if (!session?.user) return false
  await connectDB()
  const u = await User.findById((session.user as any).id).select('role').lean() as any
  return u?.role === 'admin'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await User.find({})
    .select('-password')
    .sort({ lastLoginAt: -1, createdAt: -1 })
    .lean() as any[]

  const userIds = users.map(u => u._id)
  const loginEvents = await LoginEvent.find({ user: { $in: userIds } })
    .sort({ createdAt: -1 })
    .lean() as any[]

  const loginMap = new Map<string, any[]>()
  for (const event of loginEvents) {
    const key = String(event.user)
    const list = loginMap.get(key) ?? []
    if (list.length < 3) {
      list.push(event)
      loginMap.set(key, list)
    }
  }

  const enriched = users.map(user => ({
    ...user,
    recentLogins: loginMap.get(String(user._id)) ?? [],
  }))

  return NextResponse.json({ users: enriched })
}

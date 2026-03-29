import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { LoginEvent } from '@/models/LoginEvent'

export const dynamic = 'force-dynamic'

async function isAdmin(session: any): Promise<boolean> {
  if (!session?.user) return false
  await connectDB()
  const user = await User.findById((session.user as any).id).select('role').lean() as any
  return user?.role === 'admin' || user?.role === 'moderator'
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const country = searchParams.get('country')?.trim() ?? ''
  const ip = searchParams.get('ip')?.trim() ?? ''
  const device = searchParams.get('device')?.trim() ?? ''
  const q = searchParams.get('q')?.trim() ?? ''

  const filter: any = {}
  if (country) filter.country = country
  if (ip) filter.ip = ip
  if (device) filter.device = device

  await connectDB()
  const logins = await LoginEvent.find(filter)
    .populate('user', 'username displayName email avatar role lastKnownIp suspicious sellerVerified')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean() as any[]

  const filtered = q
    ? logins.filter(entry => {
        const user = entry.user as any
        const haystack = [
          user?.username,
          user?.displayName,
          user?.email,
          entry.ip,
          entry.browser,
          entry.os,
          entry.device,
          entry.country,
          entry.city,
        ].join(' ').toLowerCase()
        return haystack.includes(q.toLowerCase())
      })
    : logins

  return NextResponse.json({ logins: filtered })
}

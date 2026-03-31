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
  const u = await User.findById((session.user as any).id).select('role').lean() as any
  return u?.role === 'admin'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await User.find({})
    .select([
      'username',
      'email',
      'displayName',
      'avatar',
      'role',
      'badges',
      'banned',
      'bannedReason',
      'lastKnownIp',
      'sellerVerified',
      'suspicious',
      'suspiciousReason',
      'reputationScore',
      'reputationVotes',
      'vipAutoRenew',
      'loginCount',
      'lastLoginAt',
      'lastLogin',
      'createdAt',
    ].join(' '))
    .sort({ lastLoginAt: -1, createdAt: -1 })
    .lean() as any[]

  const userIds = users.map(u => u._id)
  const loginGroups = await LoginEvent.aggregate([
    { $match: { user: { $in: userIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$user',
        recentLogins: {
          $push: {
            _id: '$_id',
            ip: '$ip',
            browser: '$browser',
            os: '$os',
            device: '$device',
            country: '$country',
            city: '$city',
            authMethod: '$authMethod',
            createdAt: '$createdAt',
          },
        },
      },
    },
    { $project: { recentLogins: { $slice: ['$recentLogins', 3] } } },
  ]) as any[]

  const loginMap = new Map<string, any[]>()
  for (const group of loginGroups) {
    loginMap.set(String(group._id), group.recentLogins ?? [])
  }

  const ipMap = new Map<string, string[]>()
  for (const user of users) {
    const ip = String(user.lastKnownIp || '').trim()
    if (!ip) continue
    const list = ipMap.get(ip) ?? []
    list.push(String(user._id))
    ipMap.set(ip, list)
  }

  const enriched = users.map(user => ({
    ...user,
    recentLogins: loginMap.get(String(user._id)) ?? [],
    sameIpUsers: user.lastKnownIp ? (ipMap.get(String(user.lastKnownIp)) ?? []).filter(id => id !== String(user._id)) : [],
    sameIpCount: user.lastKnownIp ? Math.max((ipMap.get(String(user.lastKnownIp)) ?? []).length - 1, 0) : 0,
  }))

  return NextResponse.json({ users: enriched })
}

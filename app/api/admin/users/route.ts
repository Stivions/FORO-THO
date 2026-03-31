import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { LoginEvent } from '@/models/LoginEvent'

export const dynamic = 'force-dynamic'

const USER_FIELDS = [
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
].join(' ')

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function isAdmin(session: any): Promise<boolean> {
  if (!session?.user) return false
  await connectDB()
  const user = await User.findById((session.user as any).id).select('role').lean() as any
  return user?.role === 'admin'
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.min(25, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10) || 10))
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const country = req.nextUrl.searchParams.get('country')?.trim() ?? ''
  const ip = req.nextUrl.searchParams.get('ip')?.trim() ?? ''
  const device = req.nextUrl.searchParams.get('device')?.trim() ?? ''
  const sameIpOnly = req.nextUrl.searchParams.get('sameIpOnly') === '1'
  const suspiciousOnly = req.nextUrl.searchParams.get('suspiciousOnly') === '1'

  const query: Record<string, any> = {}
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i')
    query.$or = [
      { username: regex },
      { displayName: regex },
      { email: regex },
      { lastKnownIp: regex },
      { 'lastLogin.country': regex },
      { 'lastLogin.city': regex },
      { 'lastLogin.device': regex },
      { 'lastLogin.browser': regex },
      { 'lastLogin.os': regex },
    ]
  }
  if (country) query['lastLogin.country'] = new RegExp(escapeRegex(country), 'i')
  if (ip) query.lastKnownIp = new RegExp(escapeRegex(ip), 'i')
  if (device) {
    const deviceRegex = new RegExp(escapeRegex(device), 'i')
    query.$and = [
      ...(query.$and ?? []),
      {
        $or: [
          { 'lastLogin.device': deviceRegex },
          { 'lastLogin.browser': deviceRegex },
          { 'lastLogin.os': deviceRegex },
        ],
      },
    ]
  }
  if (suspiciousOnly) query.suspicious = true

  if (sameIpOnly) {
    const duplicateIps = await User.aggregate([
      { $match: { lastKnownIp: { $type: 'string', $ne: '' } } },
      { $group: { _id: '$lastKnownIp', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]) as Array<{ _id: string }>

    const duplicateIpSet = new Set(duplicateIps.map(entry => entry._id).filter(Boolean))
    if (duplicateIpSet.size === 0) {
      return NextResponse.json({ users: [], total: 0, page, limit, totalPages: 1 })
    }
    query.$and = [
      ...(query.$and ?? []),
      { lastKnownIp: { $in: Array.from(duplicateIpSet) } },
    ]
  }

  const total = await User.countDocuments(query)
  if (total === 0) {
    return NextResponse.json({ users: [], total: 0, page, limit, totalPages: 1 })
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(page, totalPages)
  const skip = (safePage - 1) * limit

  const users = await User.find(query)
    .select(USER_FIELDS)
    .sort({ lastLoginAt: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean() as any[]

  const userIds = users.map(user => user._id)
  const pagedIps = Array.from(
    new Set(users.map(user => String(user.lastKnownIp || '').trim()).filter(Boolean))
  )

  const [loginGroups, ipGroups] = await Promise.all([
    userIds.length > 0
      ? LoginEvent.aggregate([
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
        ])
      : Promise.resolve([]),
    pagedIps.length > 0
      ? User.aggregate([
          { $match: { lastKnownIp: { $in: pagedIps } } },
          { $group: { _id: '$lastKnownIp', userIds: { $push: '$_id' }, count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
  ]) as any[]

  const loginMap = new Map<string, any[]>()
  for (const group of loginGroups) {
    loginMap.set(String(group._id), group.recentLogins ?? [])
  }

  const ipMap = new Map<string, { count: number; userIds: string[] }>()
  for (const group of ipGroups) {
    ipMap.set(String(group._id), {
      count: Number(group.count ?? 0),
      userIds: (group.userIds ?? []).map((id: any) => String(id)),
    })
  }

  const enriched = users.map(user => {
    const ipInfo = ipMap.get(String(user.lastKnownIp || ''))
    return {
      ...user,
      recentLogins: loginMap.get(String(user._id)) ?? [],
      sameIpUsers: ipInfo ? ipInfo.userIds.filter(id => id !== String(user._id)) : [],
      sameIpCount: ipInfo ? Math.max(ipInfo.count - 1, 0) : 0,
    }
  })

  return NextResponse.json({
    users: enriched,
    total,
    page: safePage,
    limit,
    totalPages,
  })
}

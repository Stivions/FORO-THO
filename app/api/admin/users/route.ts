import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

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

  const pagedIps = Array.from(
    new Set(users.map(user => String(user.lastKnownIp || '').trim()).filter(Boolean))
  )

  const ipGroups = pagedIps.length > 0
    ? await User.aggregate([
        { $match: { lastKnownIp: { $in: pagedIps } } },
        { $group: { _id: '$lastKnownIp', count: { $sum: 1 } } },
      ])
    : []

  const ipMap = new Map<string, number>()
  for (const group of ipGroups) {
    ipMap.set(String(group._id), Number(group.count ?? 0))
  }

  const enriched = users.map(user => {
    const sameIpCount = Math.max((ipMap.get(String(user.lastKnownIp || '')) ?? 0) - 1, 0)
    return {
      ...user,
      sameIpCount,
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

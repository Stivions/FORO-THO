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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const user = await User.findById(id).select('-password').lean() as any
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [recentLogins, sameIpUsers] = await Promise.all([
    LoginEvent.find({ user: user._id })
      .select('ip browser os device country city authMethod createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    user.lastKnownIp
      ? User.find({
          _id: { $ne: user._id },
          lastKnownIp: user.lastKnownIp,
        })
          .select('username displayName email role banned sellerVerified suspicious')
          .sort({ lastLoginAt: -1, createdAt: -1 })
          .limit(10)
          .lean()
      : [],
  ])

  return NextResponse.json({ user, recentLogins, sameIpUsers })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { role, badges, sellerVerified, suspicious, suspiciousReason, vipAutoRenew } = body

  const update: Record<string, unknown> = {}
  if (role)   update.role   = role
  if (badges) update.badges = badges
  if (sellerVerified !== undefined) update.sellerVerified = sellerVerified === true
  if (suspicious !== undefined) update.suspicious = suspicious === true
  if (suspiciousReason !== undefined) update.suspiciousReason = String(suspiciousReason ?? '').slice(0, 200)
  if (vipAutoRenew !== undefined) update.vipAutoRenew = vipAutoRenew === true

  await connectDB()
  const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password')
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ user })
}

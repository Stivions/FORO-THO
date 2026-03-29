import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { touchUserSession } from '@/lib/user-session'
import { resend, buildVipExpiryReminderEmail } from '@/lib/resend'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await connectDB()
  await touchUserSession(session, req)
  const user = await User.findById((session.user as any).id).select('-password')
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const vipExpiresAt = (user as any).vipExpiresAt ? new Date((user as any).vipExpiresAt) : null
  const noticeSentAt = (user as any).vipExpiryNoticeSentAt ? new Date((user as any).vipExpiryNoticeSentAt) : null
  const now = new Date()
  const shouldWarnVip =
    (user as any).vip === true &&
    vipExpiresAt &&
    vipExpiresAt > now &&
    vipExpiresAt.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000 &&
    (!noticeSentAt || now.getTime() - noticeSentAt.getTime() > 24 * 60 * 60 * 1000)

  if (shouldWarnVip) {
    User.updateOne(
      { _id: user._id },
      { $set: { vipExpiryNoticeSentAt: new Date() } }
    ).catch(() => {})

    resend.emails.send({
      from: process.env.RESEND_FROM ?? 'FOROSAS <onboarding@resend.dev>',
      to: [String((user as any).email)],
      subject: 'Tu VIP esta por vencer',
      html: buildVipExpiryReminderEmail((user as any).username, vipExpiresAt),
    }).catch(() => {})
  }

  const payload = user.toObject()
  return NextResponse.json({
    ...payload,
    currentSessionId: (session.user as any).sid ?? '',
  })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const allowed = ['displayName', 'bio', 'location', 'website', 'socialLinks', 'avatar', 'bannerUrl', 'vipAutoRenew']
    const update: Record<string, any> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key]
    }

    await connectDB()
    const user = await User.findByIdAndUpdate(
      (session.user as any).id,
      { $set: update },
      { new: true }
    ).select('-password')

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

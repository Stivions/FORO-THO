import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Payment } from '@/models/Payment'
import { User } from '@/models/User'
import { resend, buildVipReceiptEmail, buildVipAdminNotifEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    await connectDB()
    const payments = await Payment.find({ status: 'pending', method: { $ne: 'paypal' } })
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .lean()
    return NextResponse.json({ payments })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const { paymentId, action } = await req.json()
    if (!paymentId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    await connectDB()
    const payment = await Payment.findById(paymentId).populate('user', 'username email')
    if (!payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })

    if (action === 'approve') {
      payment.status = 'completed'
      await payment.save()

      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      await User.findByIdAndUpdate(payment.user, {
        $set: { vip: true, vipExpiresAt: thirtyDays },
      })

      // Send emails asynchronously (don't block response)
      sendVipEmails(payment, thirtyDays).catch(err => console.error('Email error:', err))

    } else {
      payment.status = 'failed'
      await payment.save()
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

async function sendVipEmails(payment: any, expiresAt: Date) {
  const buyer = payment.user as any
  if (!buyer?.email) return

  // 1. Receipt to buyer
  await resend.emails.send({
    from:    'Skill All Show <noreply@skillallshow.com>',
    to:      buyer.email,
    subject: '👑 Tu VIP está activo — Skill All Show',
    html:    buildVipReceiptEmail(buyer.username, expiresAt),
  }).catch(() => {})

  // 2. Notification to all admins
  const admins = await User.find({ role: 'admin', banned: { $ne: true } }, 'email').lean()
  const adminEmails = admins.map((a: any) => a.email).filter(Boolean)
  if (adminEmails.length === 0) return

  await resend.emails.send({
    from:    'Skill All Show <noreply@skillallshow.com>',
    to:      adminEmails,
    subject: `💰 Nueva compra VIP — @${buyer.username}`,
    html:    buildVipAdminNotifEmail(
      buyer.username,
      buyer.email,
      payment.method,
      payment.amount,
      payment.cryptoTxHash || undefined,
    ),
  }).catch(() => {})
}

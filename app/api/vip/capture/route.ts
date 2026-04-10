import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Payment } from '@/models/Payment'
import { User } from '@/models/User'
import { captureOrder } from '@/lib/paypal'
import { resend, buildVipReceiptEmail, buildVipAdminNotifEmail } from '@/lib/resend'
import { getRequestBaseUrl } from '@/lib/request'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token') ?? ''
    // PayerID may or may not be present

    const returnBase = getRequestBaseUrl(req)
    if (!token) {
      return NextResponse.redirect(
        new URL('/vip?failed=1', returnBase)
      )
    }

    await connectDB()
    const capture = await captureOrder(token)

    if (capture?.status === 'COMPLETED') {
      const payment = await Payment.findOne({ paypalOrderId: token }).populate('user', 'username email')
      if (payment) {
        payment.status = 'completed'
        await payment.save()

        const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        const userId = (payment.user as any)?._id ?? payment.user
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            $set: { vip: true, vipExpiresAt: thirtyDays },
          })
        }

        // Send emails asynchronously (do not block redirect)
        sendVipEmails(payment, thirtyDays).catch(err => console.error('Email error:', err))
      }

      return NextResponse.redirect(
        new URL('/vip?success=1', returnBase)
      )
    }

    return NextResponse.redirect(
      new URL('/vip?failed=1', returnBase)
    )
  } catch (err) {
    console.error(err)
    return NextResponse.redirect(
      new URL('/vip?failed=1', getRequestBaseUrl(req))
    )
  }
}

async function sendVipEmails(payment: any, expiresAt: Date) {
  const buyer = payment?.user as any
  if (!buyer?.email) return

  const from = process.env.RESEND_FROM ?? 'Skill All Show <noreply@skillallshow.com>'
  await resend.emails.send({
    from,
    to: buyer.email,
    subject: 'Tu VIP esta activo - Skill All Show',
    html: buildVipReceiptEmail(buyer.username, expiresAt),
  }).catch(() => {})

  const admins = await User.find({ role: 'admin', banned: { $ne: true } }, 'email').lean()
  const adminEmails = admins.map((a: any) => a.email).filter(Boolean)
  if (adminEmails.length === 0) return

  await resend.emails.send({
    from,
    to: adminEmails,
    subject: `Nueva compra VIP - @${buyer.username}`,
    html: buildVipAdminNotifEmail(
      buyer.username,
      buyer.email,
      payment.method || 'paypal',
      payment.amount || 8,
      payment.cryptoTxHash || undefined,
    ),
  }).catch(() => {})
}

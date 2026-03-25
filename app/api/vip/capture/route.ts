import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Payment } from '@/models/Payment'
import { User } from '@/models/User'
import { captureOrder } from '@/lib/paypal'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token') ?? ''
    // PayerID may or may not be present

    if (!token) {
      return NextResponse.redirect(
        new URL('/vip?failed=1', process.env.NEXTAUTH_URL ?? 'https://forotho.netlify.app')
      )
    }

    await connectDB()
    const capture = await captureOrder(token)

    if (capture?.status === 'COMPLETED') {
      const payment = await Payment.findOne({ paypalOrderId: token })
      if (payment) {
        payment.status = 'completed'
        await payment.save()

        const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        await User.findByIdAndUpdate(payment.user, {
          $set: { vip: true, vipExpiresAt: thirtyDays },
        })
      }

      return NextResponse.redirect(
        new URL('/vip?success=1', process.env.NEXTAUTH_URL ?? 'https://forotho.netlify.app')
      )
    }

    return NextResponse.redirect(
      new URL('/vip?failed=1', process.env.NEXTAUTH_URL ?? 'https://forotho.netlify.app')
    )
  } catch (err) {
    console.error(err)
    return NextResponse.redirect(
      new URL('/vip?failed=1', process.env.NEXTAUTH_URL ?? 'https://forotho.netlify.app')
    )
  }
}

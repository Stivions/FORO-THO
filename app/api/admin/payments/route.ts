import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Payment } from '@/models/Payment'
import { User } from '@/models/User'

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
    const payment = await Payment.findById(paymentId)
    if (!payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })

    if (action === 'approve') {
      payment.status = 'completed'
      await payment.save()
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      await User.findByIdAndUpdate(payment.user, {
        $set: { vip: true, vipExpiresAt: thirtyDays },
      })
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

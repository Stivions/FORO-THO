import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Payment } from '@/models/Payment'
import { createOrder } from '@/lib/paypal'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    await connectDB()
    const returnBase = process.env.NEXTAUTH_URL ?? 'https://forotho.netlify.app'
    const order = await createOrder(returnBase)

    if (!order.id) {
      return NextResponse.json({ error: 'Error al crear orden PayPal' }, { status: 500 })
    }

    const uid = (session.user as any).id
    await Payment.create({
      user: uid,
      amount: 8.00,
      currency: 'USD',
      method: 'paypal',
      status: 'pending',
      paypalOrderId: order.id,
    })

    const approvalUrl = order.links?.find((l: any) => l.rel === 'approve')?.href
    if (!approvalUrl) {
      return NextResponse.json({ error: 'No se pudo obtener URL de aprobación' }, { status: 500 })
    }

    return NextResponse.json({ approvalUrl })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

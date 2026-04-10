import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Payment } from '@/models/Payment'
import { createOrder } from '@/lib/paypal'
import { getRequestBaseUrl } from '@/lib/request'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    await connectDB()
    const returnBase = getRequestBaseUrl(req)
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
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

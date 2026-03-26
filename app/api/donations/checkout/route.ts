import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Donation } from '@/models/Donation'
import { createDonationOrder } from '@/lib/paypal'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { amount, message, displayName } = await req.json()

  if (!amount || Number(amount) < 5) {
    return NextResponse.json({ error: 'El monto mínimo es $5' }, { status: 400 })
  }

  try {
    await connectDB()
    const returnBase = process.env.NEXTAUTH_URL ?? 'https://forotho.netlify.app'
    const order = await createDonationOrder(returnBase, Number(amount))

    if (!order.id) {
      return NextResponse.json({ error: 'Error al crear orden PayPal' }, { status: 500 })
    }

    const session = await getServerSession(authOptions)
    const uid = (session?.user as any)?.id ?? null

    await Donation.create({
      user: uid || undefined,
      displayName: displayName?.trim() || (uid ? undefined : 'Anónimo'),
      amount: Number(amount),
      message: message?.trim() || '',
      paypalOrderId: order.id,
      status: 'pending',
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

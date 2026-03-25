import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Payment } from '@/models/Payment'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { cryptoTxHash, cryptoCurrency } = await req.json()
    if (!cryptoTxHash?.trim() || !cryptoCurrency) {
      return NextResponse.json({ error: 'Se requiere hash de transacción y moneda' }, { status: 400 })
    }

    const method = cryptoCurrency.toLowerCase()
    if (!['btc', 'eth', 'usdt'].includes(method)) {
      return NextResponse.json({ error: 'Moneda no válida' }, { status: 400 })
    }

    await connectDB()
    const uid = (session.user as any).id

    await Payment.create({
      user: uid,
      amount: 8.00,
      currency: 'USD',
      method,
      status: 'pending',
      cryptoTxHash: cryptoTxHash.trim(),
      cryptoCurrency: cryptoCurrency.toUpperCase(),
    })

    return NextResponse.json({ ok: true, message: 'Pago enviado, esperando confirmación del admin' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

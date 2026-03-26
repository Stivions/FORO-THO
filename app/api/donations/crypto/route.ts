import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Donation } from '@/models/Donation'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { amount, cryptoTxHash, cryptoCurrency, message, displayName } = await req.json()

    if (!cryptoTxHash?.trim() || !cryptoCurrency) {
      return NextResponse.json({ error: 'Se requiere hash de transacción y moneda' }, { status: 400 })
    }

    const parsedAmount = Number(amount)
    if (!parsedAmount || parsedAmount < 1) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }

    const method = cryptoCurrency.toLowerCase()
    if (!['btc', 'eth', 'usdt'].includes(method)) {
      return NextResponse.json({ error: 'Moneda no soportada' }, { status: 400 })
    }

    await connectDB()
    const session = await getServerSession(authOptions)
    const uid = (session?.user as any)?.id ?? null

    await Donation.create({
      user:          uid || undefined,
      displayName:   displayName?.trim() || 'Anónimo',
      amount:        parsedAmount,
      message:       message?.trim() || '',
      cryptoTxHash:  cryptoTxHash.trim(),
      cryptoCurrency: cryptoCurrency.toUpperCase(),
      status:        'pending',
    })

    return NextResponse.json({ ok: true, message: 'Donación recibida, esperando confirmación del admin' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

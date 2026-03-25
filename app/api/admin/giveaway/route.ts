import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Giveaway } from '@/models/Giveaway'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    await connectDB()
    const giveaways = await Giveaway.find()
      .populate('winner', 'username email')
      .sort({ createdAt: -1 })
      .lean()
    return NextResponse.json({ giveaways })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const { title, description, prize, prizeDescription, endsAt } = await req.json()
    if (!title?.trim() || !endsAt) {
      return NextResponse.json({ error: 'Título y fecha de fin son requeridos' }, { status: 400 })
    }

    await connectDB()
    const uid = (session.user as any).id
    const giveaway = await Giveaway.create({
      title: title.trim(),
      description: description?.trim() ?? '',
      prize: prize ?? 'vip_1month',
      prizeDescription: prizeDescription?.trim() ?? 'Membresía VIP 1 mes',
      endsAt: new Date(endsAt),
      createdBy: uid,
    })

    return NextResponse.json({ ok: true, giveaway }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

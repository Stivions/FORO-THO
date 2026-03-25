import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Giveaway } from '@/models/Giveaway'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    await connectDB()
    const uid = (session.user as any).id

    const giveaway = await Giveaway.findById(id)
    if (!giveaway) return NextResponse.json({ error: 'Sorteo no encontrado' }, { status: 404 })
    if (giveaway.status !== 'active')
      return NextResponse.json({ error: 'Este sorteo ya terminó' }, { status: 400 })

    const alreadyIn = giveaway.participants.some((p: any) => p.toString() === uid)
    if (!alreadyIn) {
      giveaway.participants.push(new mongoose.Types.ObjectId(uid))
      await giveaway.save()
    }

    return NextResponse.json({ ok: true, count: giveaway.participants.length })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

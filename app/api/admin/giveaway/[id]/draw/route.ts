import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Giveaway } from '@/models/Giveaway'
import { User } from '@/models/User'
import { Notification } from '@/models/Notification'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const { id } = await params
    await connectDB()

    const giveaway = await Giveaway.findById(id)
    if (!giveaway) return NextResponse.json({ error: 'Sorteo no encontrado' }, { status: 404 })
    if (!giveaway.participants || giveaway.participants.length === 0)
      return NextResponse.json({ error: 'No hay participantes en este sorteo' }, { status: 400 })

    const winnerIndex = Math.floor(Math.random() * giveaway.participants.length)
    const winnerId = giveaway.participants[winnerIndex]

    const winner = await User.findById(winnerId)
    if (!winner) return NextResponse.json({ error: 'Ganador no encontrado' }, { status: 404 })

    if (giveaway.prize === 'vip_1month') {
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      await User.findByIdAndUpdate(winnerId, {
        $set: { vip: true, vipExpiresAt: thirtyDays },
      })
    }

    giveaway.winner = winnerId
    giveaway.winnerPickedAt = new Date()
    giveaway.status = 'ended'
    await giveaway.save()

    // Create notification for winner
    await Notification.create({
      user: winnerId,
      type: 'group_update',
      text: `🎉 ¡Ganaste el sorteo "${giveaway.title}"! Tu VIP está activo por 30 días.`,
    })

    return NextResponse.json({
      ok: true,
      winner: { username: winner.username, email: winner.email },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

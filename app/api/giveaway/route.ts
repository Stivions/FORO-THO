import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Giveaway } from '@/models/Giveaway'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    const uid = (session?.user as any)?.id ?? null

    const giveaways = await Giveaway.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .lean()

    const result = giveaways.map(g => ({
      _id: g._id,
      title: g.title,
      description: g.description,
      prize: g.prize,
      prizeDescription: g.prizeDescription,
      participantCount: g.participants?.length ?? 0,
      endsAt: g.endsAt,
      status: g.status,
      entered: uid ? g.participants.some((p: any) => p.toString() === uid) : false,
    }))

    return NextResponse.json({ giveaways: result })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

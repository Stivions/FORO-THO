import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { ReputationVote } from '@/models/ReputationVote'
import { User } from '@/models/User'

type Ctx = { params: Promise<{ id: string }> }

async function refreshReputation(userId: string) {
  const votes = await ReputationVote.find({ to: userId }).lean()
  const reputationScore = votes.reduce((sum: number, vote: any) => sum + (vote.value || 0), 0)
  const reputationVotes = votes.length
  await User.findByIdAndUpdate(userId, {
    $set: { reputationScore, reputationVotes },
  })
  return { reputationScore, reputationVotes }
}

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  const currentUserId = (session?.user as any)?.id ?? ''

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
  }

  await connectDB()
  const [user, myVote] = await Promise.all([
    User.findById(id).select('reputationScore reputationVotes').lean(),
    currentUserId ? ReputationVote.findOne({ from: currentUserId, to: id }).lean() : null,
  ])

  return NextResponse.json({
    reputationScore: (user as any)?.reputationScore ?? 0,
    reputationVotes: (user as any)?.reputationVotes ?? 0,
    myVote: (myVote as any)?.value ?? 0,
  })
}

export async function POST(req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
  }

  const uid = (session.user as any).id
  if (uid === id) return NextResponse.json({ error: 'No puedes votarte a ti mismo' }, { status: 400 })

  const { value, note } = await req.json()
  if (![1, -1, 0].includes(value)) {
    return NextResponse.json({ error: 'Valor invalido' }, { status: 400 })
  }

  await connectDB()

  if (value === 0) {
    await ReputationVote.deleteOne({ from: uid, to: id })
  } else {
    await ReputationVote.findOneAndUpdate(
      { from: uid, to: id },
      { $set: { value, note: (note ?? '').toString().slice(0, 160) } },
      { upsert: true, new: true }
    )
  }

  const totals = await refreshReputation(id)
  const myVote = value === 0 ? 0 : value

  return NextResponse.json({ ...totals, myVote })
}

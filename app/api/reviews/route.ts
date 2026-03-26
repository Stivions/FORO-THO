import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Review } from '@/models/Review'

export const dynamic = 'force-dynamic'

export async function GET() {
  await connectDB()
  const reviews = await Review.find()
    .populate('user', 'username avatar displayName')
    .sort({ createdAt: -1 })
    .lean()

  const total = reviews.length
  const average = total > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    : 0

  return NextResponse.json({ reviews, average, total })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { rating, title, content } = await req.json()
  if (!rating || !title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating debe ser entre 1 y 5' }, { status: 400 })
  }

  await connectDB()
  const uid = (session.user as any).id

  const existing = await Review.findOne({ user: uid })
  if (existing) return NextResponse.json({ error: 'Ya has escrito una reseña' }, { status: 409 })

  const review = await Review.create({ user: uid, rating, title, content })
  const populated = await review.populate('user', 'username avatar displayName')

  return NextResponse.json({ review: populated }, { status: 201 })
}

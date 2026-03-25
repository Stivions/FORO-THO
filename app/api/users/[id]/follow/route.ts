import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Follow } from '@/models/Follow'
import { User } from '@/models/User'

type Ctx = { params: Promise<{ id: string }> }

/* GET — check if current user follows this user */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ following: false })

  const { id } = await params
  const uid = (session.user as any).id
  await connectDB()

  const exists = await Follow.exists({ follower: uid, following: id })
  const count  = await Follow.countDocuments({ following: id })
  return NextResponse.json({ following: !!exists, followersCount: count })
}

/* POST — toggle follow */
export async function POST(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const uid = (session.user as any).id
  if (uid === id) return NextResponse.json({ error: 'No puedes seguirte a ti mismo' }, { status: 400 })

  await connectDB()

  const existing = await Follow.findOne({ follower: uid, following: id })
  if (existing) {
    await existing.deleteOne()
    await Promise.all([
      User.findByIdAndUpdate(uid, { $inc: { followingCount: -1 } }),
      User.findByIdAndUpdate(id,  { $inc: { followersCount: -1 } }),
    ])
    const count = await Follow.countDocuments({ following: id })
    return NextResponse.json({ following: false, followersCount: count })
  } else {
    await Follow.create({ follower: uid, following: id })
    await Promise.all([
      User.findByIdAndUpdate(uid, { $inc: { followingCount: 1 } }),
      User.findByIdAndUpdate(id,  { $inc: { followersCount: 1 } }),
    ])
    const count = await Follow.countDocuments({ following: id })
    return NextResponse.json({ following: true, followersCount: count })
  }
}

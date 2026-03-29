import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { UserBlock } from '@/models/UserBlock'

type Ctx = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ blocked: false })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ blocked: false })

  await connectDB()
  const uid = (session.user as any).id
  const exists = await UserBlock.exists({ blocker: uid, blocked: id })
  return NextResponse.json({ blocked: !!exists })
}

export async function POST(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
  }

  const uid = (session.user as any).id
  if (uid === id) {
    return NextResponse.json({ error: 'No puedes bloquearte a ti mismo' }, { status: 400 })
  }

  await connectDB()
  const existing = await UserBlock.findOne({ blocker: uid, blocked: id })

  if (existing) {
    await existing.deleteOne()
    return NextResponse.json({ blocked: false })
  }

  await UserBlock.create({ blocker: uid, blocked: id })
  return NextResponse.json({ blocked: true })
}

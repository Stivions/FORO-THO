import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Comment } from '@/models/Comment'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const uid = (session.user as any).id
  await connectDB()

  const comment = await Comment.findById(id)
  if (!comment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const alreadyLiked = comment.likers.map(String).includes(uid)
  if (alreadyLiked) {
    comment.likers = comment.likers.filter((l: any) => l.toString() !== uid)
  } else {
    comment.likers.push(uid)
  }
  await comment.save()

  return NextResponse.json({ liked: !alreadyLiked, count: comment.likers.length })
}

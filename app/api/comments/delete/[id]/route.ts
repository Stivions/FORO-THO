import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Comment } from '@/models/Comment'
import { Post } from '@/models/Post'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  await connectDB()
  const comment = await Comment.findById(id)
  if (!comment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const uid  = (session.user as any).id
  const role = (session.user as any).role
  if (comment.author.toString() !== uid && role !== 'admin' && role !== 'moderator') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  await Promise.all([
    Comment.findByIdAndDelete(id),
    Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } }),
  ])

  return NextResponse.json({ message: 'Comentario eliminado' })
}

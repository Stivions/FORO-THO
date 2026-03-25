import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Comment } from '@/models/Comment'
import { Post } from '@/models/Post'

type Ctx = { params: Promise<{ postId: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { postId } = await params
  if (!mongoose.Types.ObjectId.isValid(postId))
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  await connectDB()
  const all = await Comment.find({ post: postId })
    .populate('author', 'username avatar displayName')
    .sort({ createdAt: 1 })
    .lean()

  // Build tree: top-level first, then nest replies
  const map = new Map<string, any>()
  const roots: any[] = []

  for (const c of all) {
    map.set(c._id.toString(), { ...c, _id: c._id.toString(), replies: [] })
  }
  for (const c of map.values()) {
    const parentId = c.parentComment?.toString()
    if (parentId && map.has(parentId)) {
      map.get(parentId).replies.push(c)
    } else {
      roots.push(c)
    }
  }

  return NextResponse.json({ comments: roots })
}

export async function POST(req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { postId } = await params
  if (!mongoose.Types.ObjectId.isValid(postId))
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { content, parentComment } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Contenido requerido' }, { status: 400 })

  await connectDB()
  const [doc] = await Promise.all([
    Comment.create({
      content: content.trim(),
      author: (session.user as any).id,
      post: postId,
      parentComment: parentComment ?? null,
    }),
    Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } }),
  ])

  const populated = await doc.populate('author', 'username avatar displayName')
  const plain = populated.toObject()
  return NextResponse.json({
    comment: { ...plain, _id: plain._id.toString(), replies: [] }
  }, { status: 201 })
}

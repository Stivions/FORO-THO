import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Post } from '@/models/Post'
import { Comment } from '@/models/Comment'
import { User } from '@/models/User'
import { canPostInCategory, canReadCategory, getCategoryConfigByName } from '@/lib/access-control'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  await connectDB()
  const post = await Post.findById(id).populate('author', 'username avatar displayName').lean()
  if (!post) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const session = await getServerSession(authOptions)
  const viewer = session?.user
    ? await User.findById((session.user as any).id).select('role vip vipExpiresAt').lean()
    : null
  const categoryConfig = await getCategoryConfigByName((post as any).category)
  if (!canReadCategory(categoryConfig || { name: (post as any).category }, viewer as any)) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }
  return NextResponse.json({ post })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  await connectDB()
  const post = await Post.findById(id)
  if (!post) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const uid = (session.user as any).id
  const role = (session.user as any).role
  if (post.author.toString() !== uid && role !== 'admin' && role !== 'moderator') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  await Promise.all([
    Post.findByIdAndDelete(id),
    Comment.deleteMany({ post: id }),
    User.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } }),
  ])

  return NextResponse.json({ message: 'Post eliminado' })
}

export async function PUT(req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  await connectDB()
  const post = await Post.findById(id)
  if (!post) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (post.author.toString() !== (session.user as any).id)
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const { title, content, category, tags } = await req.json()
  const viewer = await User.findById((session.user as any).id).select('role vip vipExpiresAt').lean()
  const categoryConfig = await getCategoryConfigByName(category)
  if (categoryConfig && !canPostInCategory(categoryConfig as any, viewer as any)) {
    return NextResponse.json({ error: 'No tienes permiso para mover el post a esa categoria' }, { status: 403 })
  }
  const updated = await Post.findByIdAndUpdate(
    id,
    { $set: { title, content, category, tags } },
    { new: true }
  ).populate('author', 'username avatar displayName')

  return NextResponse.json(updated)
}

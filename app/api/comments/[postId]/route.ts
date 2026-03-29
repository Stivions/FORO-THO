import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Comment } from '@/models/Comment'
import { Post } from '@/models/Post'
import { Notification } from '@/models/Notification'
import { extractMentions, triggerBotReply, notifyMentions } from '@/lib/thobot'
import { User } from '@/models/User'
import { canReadCategory, getCategoryConfigByName } from '@/lib/access-control'

type Ctx = { params: Promise<{ postId: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { postId } = await params
  if (!mongoose.Types.ObjectId.isValid(postId))
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  await connectDB()
  const session = await getServerSession(authOptions)
  const viewer = session?.user
    ? await User.findById((session.user as any).id).select('role vip vipExpiresAt').lean()
    : null
  const post = await Post.findById(postId).select('category').lean()
  if (!post) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const categoryConfig = await getCategoryConfigByName((post as any).category)
  if (!canReadCategory(categoryConfig || { name: (post as any).category }, viewer as any)) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const all = await Comment.find({ post: postId })
    .populate('author', 'username avatar displayName badges')
    .sort({ createdAt: 1 })
    .lean()

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
  const uid = (session.user as any).id
  const user = await User.findById(uid).select('role vip vipExpiresAt').lean()
  const post = await Post.findById(postId).select('author title content category').lean()
  if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })

  const categoryConfig = await getCategoryConfigByName((post as any).category)
  if (!canReadCategory(categoryConfig || { name: (post as any).category }, user as any)) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const [doc] = await Promise.all([
    Comment.create({
      content: content.trim(),
      author: uid,
      post: postId,
      parentComment: parentComment ?? null,
    }),
    Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } }),
  ])

  // Notify post author (skip self-comment)
  if (post && (post.author as any).toString() !== uid) {
    Notification.create({
      user: post.author,
      type: 'comment',
      from: uid,
      post: postId,
      text: content.trim().slice(0, 80),
    }).catch(() => {})
  }

  // Process @mentions asynchronously
  const mentions = extractMentions(content)
  const postContext = `${(post as any)?.title ?? ''} — ${(post as any)?.content ?? ''}`

  if (mentions.includes('thobot')) {
    // Fire-and-forget bot reply (reply to the specific comment if it's a reply)
    triggerBotReply(postId, postContext, content.trim(), parentComment ?? null).catch(() => {})
  }

  // Notify mentioned users (non-bot)
  notifyMentions(content, uid, postId, content.trim()).catch(() => {})

  const populated = await doc.populate('author', 'username avatar displayName badges')
  const plain = populated.toObject()
  return NextResponse.json({
    comment: { ...plain, _id: plain._id.toString(), replies: [] }
  }, { status: 201 })
}

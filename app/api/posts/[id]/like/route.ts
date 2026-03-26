import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Post } from '@/models/Post'
import { User } from '@/models/User'
import { Notification } from '@/models/Notification'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const uid = (session.user as any).id
  await connectDB()

  const post = await Post.findById(id)
  if (!post) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const liked = post.likers.map(String).includes(uid)
  if (liked) {
    post.likers = post.likers.filter((l: any) => l.toString() !== uid)
  } else {
    post.likers.push(uid)
    // Award points to post author for receiving a like
    if (post.author.toString() !== uid) {
      User.findByIdAndUpdate(post.author, { $inc: { points: 1 } }).catch(() => {})
    }
    // Notify post author — only one notification per user/post (no spam)
    if (post.author.toString() !== uid) {
      const alreadyNotified = await Notification.exists({
        user: post.author, type: 'post_like', from: uid, post: id,
      })
      if (!alreadyNotified) {
        Notification.create({
          user: post.author,
          type: 'post_like',
          from: uid,
          post: id,
          text: post.title?.slice(0, 80) ?? '',
        }).catch(() => {})
      }
    }
  }
  await post.save()

  return NextResponse.json({ liked: !liked, count: post.likers.length })
}

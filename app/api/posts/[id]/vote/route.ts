import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Post } from '@/models/Post'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { direction } = await _req.json() // 'up' | 'down'
  const uid = (session.user as any).id

  await connectDB()
  const post = await Post.findById(id)
  if (!post) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const inUp   = post.upvoters.map(String).includes(uid)
  const inDown = post.downvoters.map(String).includes(uid)

  if (direction === 'up') {
    if (inUp) {
      post.upvoters = post.upvoters.filter((u: any) => u.toString() !== uid)
    } else {
      post.upvoters.push(uid)
      post.downvoters = post.downvoters.filter((u: any) => u.toString() !== uid)
    }
  } else {
    if (inDown) {
      post.downvoters = post.downvoters.filter((u: any) => u.toString() !== uid)
    } else {
      post.downvoters.push(uid)
      post.upvoters = post.upvoters.filter((u: any) => u.toString() !== uid)
    }
  }

  await post.save()
  return NextResponse.json({
    upvotes:   post.upvoters.length,
    downvotes: post.downvoters.length,
    userVote:  post.upvoters.map(String).includes(uid) ? 'up'
             : post.downvoters.map(String).includes(uid) ? 'down' : null,
  })
}

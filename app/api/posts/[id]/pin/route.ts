import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Post } from '@/models/Post'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'Solo admins' }, { status: 403 })

  const { id } = await params
  await connectDB()

  const post = await Post.findById(id)
  if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })

  post.isPinned = !post.isPinned
  await post.save()

  return NextResponse.json({ isPinned: post.isPinned })
}

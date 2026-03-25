import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Post } from '@/models/Post'
import { User } from '@/models/User'
import { Notification } from '@/models/Notification'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const { action } = await req.json() // 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action))
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })

  await connectDB()

  const post = await Post.findById(id)
  if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })

  const newStatus = action === 'approve' ? 'published' : 'rejected'
  await Post.findByIdAndUpdate(id, { $set: { status: newStatus } })

  // If approved, update author post count
  if (action === 'approve') {
    await User.findByIdAndUpdate(post.author, { $inc: { postsCount: 1 } })
  }

  // Notify the author
  await Notification.create({
    user: post.author,
    type: action === 'approve' ? 'post_approved' : 'post_rejected',
    from: (session.user as any).id,
    post: post._id,
    text: action === 'approve'
      ? '✅ Tu post fue aprobado y ya está publicado'
      : '❌ Tu post fue rechazado por el equipo de moderación',
  })

  return NextResponse.json({ ok: true, status: newStatus })
}

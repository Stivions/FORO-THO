import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Report } from '@/models/Report'
import { Post } from '@/models/Post'
import { Comment } from '@/models/Comment'
import { User } from '@/models/User'
import { Notification } from '@/models/Notification'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { targetType, targetId, reason, details } = await req.json()
  if (!['user', 'post', 'comment'].includes(targetType) || !mongoose.Types.ObjectId.isValid(targetId)) {
    return NextResponse.json({ error: 'Objetivo invalido' }, { status: 400 })
  }

  if (!reason?.trim()) {
    return NextResponse.json({ error: 'Motivo requerido' }, { status: 400 })
  }

  await connectDB()
  const reporter = (session.user as any).id
  let reportedUser: string | undefined

  if (targetType === 'user') {
    const user = await User.findById(targetId).select('_id').lean()
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    reportedUser = targetId
  } else if (targetType === 'post') {
    const post = await Post.findById(targetId).select('author').lean()
    if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
    reportedUser = String((post as any).author)
  } else {
    const comment = await Comment.findById(targetId).select('author').lean()
    if (!comment) return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 })
    reportedUser = String((comment as any).author)
  }

  const report = await Report.create({
    reporter,
    targetType,
    targetId,
    reportedUser,
    reason: reason.trim().slice(0, 80),
    details: (details ?? '').toString().trim().slice(0, 500),
  })

  const admins = await User.find({ role: 'admin' }).select('_id').lean()
  if (admins.length > 0) {
    await Notification.insertMany(
      admins.map((admin: any) => ({
        user: admin._id,
        type: 'system',
        from: reporter,
        text: `Nuevo reporte: ${targetType} · ${reason.trim().slice(0, 40)}`,
      }))
    ).catch(() => {})
  }

  return NextResponse.json({ ok: true, reportId: report._id }, { status: 201 })
}

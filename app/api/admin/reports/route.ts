import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Report } from '@/models/Report'

export const dynamic = 'force-dynamic'

function isAdmin(session: any) {
  return !!session && ((session.user as any)?.role === 'admin' || (session.user as any)?.role === 'moderator')
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await connectDB()
  const reports = await Report.find()
    .populate('reporter', 'username displayName avatar')
    .populate('reportedUser', 'username displayName avatar')
    .sort({ status: 1, createdAt: -1 })
    .limit(200)
    .lean()

  return NextResponse.json({ reports })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id, status, adminNotes } = await req.json()
  if (!id || !['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
  }

  await connectDB()
  const report = await Report.findByIdAndUpdate(
    id,
    { $set: { status, adminNotes: (adminNotes ?? '').toString().slice(0, 500) } },
    { new: true }
  )

  return NextResponse.json({ report })
}

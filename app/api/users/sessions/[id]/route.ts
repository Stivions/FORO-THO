import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { UserSession } from '@/models/UserSession'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const { reason } = await req.json().catch(() => ({ reason: 'manual_revoke' }))

  await connectDB()
  const doc = await UserSession.findById(id)
  if (!doc) return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })

  if (doc.user.toString() !== (session.user as any).id) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  doc.revokedAt = new Date()
  doc.revokedReason = reason || 'manual_revoke'
  await doc.save()

  return NextResponse.json({ ok: true, revoked: true, sessionId: doc.sessionId })
}

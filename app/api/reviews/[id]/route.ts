import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Review } from '@/models/Review'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const isAdmin = (session.user as any).role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const { id } = await params

  await connectDB()
  await Review.findByIdAndDelete(id)

  return NextResponse.json({ ok: true })
}

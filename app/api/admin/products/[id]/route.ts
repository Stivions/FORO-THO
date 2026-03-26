import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'admin') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })

  await connectDB()
  await Product.findByIdAndDelete(params.id)
  return NextResponse.json({ ok: true })
}

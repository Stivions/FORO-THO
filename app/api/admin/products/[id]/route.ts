import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'admin') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const update: Record<string, unknown> = {}

  if (body.featured !== undefined) update.featured = body.featured === true
  if (body.title !== undefined) update.title = String(body.title).trim().slice(0, 80)
  if (body.description !== undefined) update.description = String(body.description ?? '').slice(0, 300)

  await connectDB()
  const product = await Product.findByIdAndUpdate(id, { $set: update }, { new: true })
  return NextResponse.json({ product })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'admin') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })

  const { id } = await params

  await connectDB()
  await Product.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}

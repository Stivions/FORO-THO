import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { ProductRequest } from '@/models/ProductRequest'

export const dynamic = 'force-dynamic'

function isAdmin(session: any) {
  return !!session && (session.user as any)?.role === 'admin'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await connectDB()
  const requests = await ProductRequest.find()
    .populate('user', 'username displayName email avatar')
    .populate('product', 'title mediaUrl mimeType featured')
    .sort({ status: 1, createdAt: -1 })
    .limit(200)
    .lean()

  return NextResponse.json({ requests })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id, status, adminNotes } = await req.json()
  if (!id || !['pending', 'reviewing', 'approved', 'rejected', 'fulfilled'].includes(status)) {
    return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
  }

  await connectDB()
  const requestDoc = await ProductRequest.findByIdAndUpdate(
    id,
    { $set: { status, adminNotes: (adminNotes ?? '').toString().slice(0, 500) } },
    { new: true }
  )
    .populate('user', 'username displayName email avatar')
    .populate('product', 'title mediaUrl mimeType featured')

  return NextResponse.json({ request: requestDoc })
}

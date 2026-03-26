import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'

export const dynamic = 'force-dynamic'

export async function GET() {
  await connectDB()
  const products = await Product.find()
    .populate('uploadedBy', 'username displayName')
    .sort({ createdAt: -1 })
    .lean()
  return NextResponse.json({ products })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'admin') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })

  const { title, description, mediaUrl, mimeType, thumbnailUrl } = await req.json()
  if (!title?.trim() || !mediaUrl) {
    return NextResponse.json({ error: 'Título y mediaUrl requeridos' }, { status: 400 })
  }

  await connectDB()
  const uid = (session.user as any).id

  const product = await Product.create({
    title:        title.trim().slice(0, 80),
    description:  (description ?? '').slice(0, 300),
    mediaUrl,
    mimeType:     mimeType ?? 'image/jpeg',
    thumbnailUrl: thumbnailUrl ?? '',
    uploadedBy:   uid,
  })

  return NextResponse.json({ product }, { status: 201 })
}

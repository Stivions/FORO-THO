import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { ProductRequest } from '@/models/ProductRequest'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await connectDB()
  const uid = (session.user as any).id
  const requests = await ProductRequest.find({ user: uid })
    .populate('product', 'title mediaUrl mimeType featured')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ requests })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { productId, message } = await req.json()
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return NextResponse.json({ error: 'Producto invalido' }, { status: 400 })
  }

  await connectDB()
  const uid = (session.user as any).id
  const product = await Product.findById(productId).select('title').lean()
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  const existing = await ProductRequest.findOne({
    user: uid,
    product: productId,
    status: { $in: ['pending', 'reviewing', 'approved'] },
  }).sort({ createdAt: -1 })

  if (existing) {
    return NextResponse.json({ request: existing, duplicated: true })
  }

  const requestDoc = await ProductRequest.create({
    user: uid,
    product: productId,
    message: (message ?? '').toString().trim().slice(0, 500),
  })

  const request = await requestDoc.populate([
    { path: 'product', select: 'title mediaUrl mimeType featured' },
    { path: 'user', select: 'username displayName email avatar' },
  ])

  return NextResponse.json({ request }, { status: 201 })
}

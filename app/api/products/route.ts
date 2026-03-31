import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { ProductRequest } from '@/models/ProductRequest'

export const dynamic = 'force-dynamic'

export async function GET() {
  await connectDB()
  const session = await getServerSession(authOptions)
  const uid = (session?.user as any)?.id ?? null

  const [products, myRequests] = await Promise.all([
    Product.find()
      .populate('uploadedBy', 'username displayName avatar sellerVerified')
      .sort({ featured: -1, createdAt: -1 })
      .lean(),
    uid
      ? ProductRequest.find({ user: uid })
          .select('product status createdAt ticket')
          .sort({ createdAt: -1 })
          .lean()
      : [],
  ])

  const requestMap = new Map<string, any>()
  for (const request of myRequests as any[]) {
    const key = String(request.product)
    if (!requestMap.has(key)) requestMap.set(key, request)
  }

  const processed = products.map((product: any) => ({
    ...product,
    likesCount: product.likers?.length ?? 0,
    liked: uid ? (product.likers ?? []).map(String).includes(uid) : false,
    requestStatus: requestMap.get(String(product._id))?.status ?? null,
    requestAt: requestMap.get(String(product._id))?.createdAt ?? null,
    ticketId: requestMap.get(String(product._id))?.ticket ? String(requestMap.get(String(product._id))?.ticket) : null,
    likers: undefined,
  }))

  return NextResponse.json({ products: processed })
}

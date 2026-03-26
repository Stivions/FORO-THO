import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'

export const dynamic = 'force-dynamic'

export async function GET() {
  await connectDB()
  const session = await getServerSession(authOptions)
  const uid = (session?.user as any)?.id ?? null

  const products = await Product.find().sort({ createdAt: -1 }).lean()

  const processed = products.map((p: any) => ({
    ...p,
    likesCount: p.likers?.length ?? 0,
    liked: uid ? (p.likers ?? []).map(String).includes(uid) : false,
    likers: undefined,
  }))

  return NextResponse.json({ products: processed })
}

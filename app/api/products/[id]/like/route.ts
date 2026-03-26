import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const uid = (session.user as any).id

  await connectDB()
  const product = await Product.findById(id)
  if (!product) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const liked = product.likers.map(String).includes(uid)
  if (liked) {
    product.likers = product.likers.filter((l: any) => l.toString() !== uid)
  } else {
    product.likers.push(uid)
  }
  await product.save()

  return NextResponse.json({ liked: !liked, count: product.likers.length })
}

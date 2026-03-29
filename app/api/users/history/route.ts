import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { ProductRequest } from '@/models/ProductRequest'
import { Payment } from '@/models/Payment'
import { Donation } from '@/models/Donation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const uid = (session.user as any).id
  await connectDB()

  const [requests, payments, donations] = await Promise.all([
    ProductRequest.find({ user: uid })
      .populate('product', 'title mediaUrl mimeType')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Payment.find({ user: uid })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Donation.find({ user: uid })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ])

  return NextResponse.json({ requests, payments, donations })
}

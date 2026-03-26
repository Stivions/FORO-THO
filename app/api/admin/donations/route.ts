import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Donation } from '@/models/Donation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await connectDB()
  const donations = await Donation.find({ cryptoTxHash: { $exists: true, $ne: '' } })
    .populate('user', 'username email')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ donations })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { donationId, action } = await req.json()
  if (!donationId || !['approve', 'reject'].includes(action))
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })

  await connectDB()
  const donation = await Donation.findById(donationId)
  if (!donation) return NextResponse.json({ error: 'Donación no encontrada' }, { status: 404 })

  donation.status = action === 'approve' ? 'completed' : 'failed'
  await donation.save()

  return NextResponse.json({ ok: true })
}

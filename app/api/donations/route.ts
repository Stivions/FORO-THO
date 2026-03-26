import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Donation } from '@/models/Donation'

export const dynamic = 'force-dynamic'

export async function GET() {
  await connectDB()
  const donations = await Donation.find({ status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()

  const total = donations.reduce((s, d) => s + d.amount, 0)

  return NextResponse.json({ donations, total })
}

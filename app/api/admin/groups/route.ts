import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { DiscussionGroup } from '@/models/DiscussionGroup'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await connectDB()
  const groups = await DiscussionGroup.find({})
    .populate('owner', 'username displayName avatar email')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ groups })
}

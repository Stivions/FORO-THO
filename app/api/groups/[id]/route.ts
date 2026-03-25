import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { DiscussionGroup } from '@/models/DiscussionGroup'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  await connectDB()
  const group = await DiscussionGroup.findById(id)
    .populate('owner', 'username displayName avatar badges')
    .populate('members', 'username displayName avatar badges')
    .lean()
  if (!group) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json({ group })
}

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json({ users: [] })

  await connectDB()

  const users = await User.find({
    $or: [
      { username:    { $regex: q, $options: 'i' } },
      { displayName: { $regex: q, $options: 'i' } },
    ],
  })
    .select('_id username displayName avatar bio role badges postsCount')
    .limit(10)
    .lean()

  return NextResponse.json({ users })
}

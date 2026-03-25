import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { GroupTyping } from '@/models/GroupTyping'
import { User } from '@/models/User'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

/* GET — who is typing (updated in last 3s) */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  await connectDB()

  const cutoff = new Date(Date.now() - 3000)
  const typing = await GroupTyping.find({ group: id, updatedAt: { $gt: cutoff } }).lean()
  return NextResponse.json({ typing })
}

/* POST — mark self as typing */
export async function POST(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ ok: false })

  const { id } = await params
  const uid = (session.user as any).id
  await connectDB()

  const me = await User.findById(uid).select('username displayName avatar').lean()
  if (!me) return NextResponse.json({ ok: false })

  await GroupTyping.findOneAndUpdate(
    { group: id, user: uid },
    {
      group:       id,
      user:        uid,
      username:    (me as any).username,
      displayName: (me as any).displayName,
      avatar:      (me as any).avatar,
      updatedAt:   new Date(),
    },
    { upsert: true, new: true }
  )

  return NextResponse.json({ ok: true })
}

/* DELETE — stop typing */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ ok: false })

  const { id } = await params
  const uid = (session.user as any).id
  await connectDB()

  await GroupTyping.deleteOne({ group: id, user: uid })
  return NextResponse.json({ ok: true })
}

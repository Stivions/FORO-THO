import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { DiscussionGroup } from '@/models/DiscussionGroup'
import { Notification } from '@/models/Notification'
import { User } from '@/models/User'

export const dynamic = 'force-dynamic'

/* GET — list approved groups */
export async function GET() {
  await connectDB()
  const groups = await DiscussionGroup.find({ status: 'approved' })
    .populate('owner', 'username displayName avatar')
    .sort({ createdAt: -1 })
    .lean()
  return NextResponse.json({ groups })
}

/* POST — request a new group */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const uid = (session.user as any).id
  const { name, description, requestMessage } = await req.json()
  if (!name?.trim() || !description?.trim())
    return NextResponse.json({ error: 'Nombre y descripción son requeridos' }, { status: 400 })

  await connectDB()

  const group = await DiscussionGroup.create({
    name: name.trim(),
    description: description.trim(),
    requestMessage: requestMessage?.trim() ?? '',
    owner: uid,
    members: [uid],
    status: 'pending',
  })

  // Notify all admins
  const admins = await User.find({ role: 'admin' }).select('_id').lean()
  for (const admin of admins) {
    Notification.create({
      user: (admin as any)._id,
      type: 'group_request',
      from: uid,
      text: `Solicitud de grupo: "${name.trim().slice(0, 50)}"`,
    }).catch(() => {})
  }

  return NextResponse.json({ group }, { status: 201 })
}

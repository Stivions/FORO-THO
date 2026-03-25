import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { DiscussionGroup } from '@/models/DiscussionGroup'
import { Notification } from '@/models/Notification'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const { action, rejectionReason } = await req.json() // action: 'approve' | 'reject'

  await connectDB()
  const group = await DiscussionGroup.findById(id)
  if (!group) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  group.status = action === 'approve' ? 'approved' : 'rejected'
  if (action === 'reject' && rejectionReason) group.rejectionReason = rejectionReason
  await group.save()

  // Notify the group owner
  Notification.create({
    user: group.owner,
    type: 'group_update',
    from: (session.user as any).id,
    text: action === 'approve'
      ? `Tu grupo "${group.name}" fue aprobado ✓`
      : `Tu grupo "${group.name}" fue rechazado${rejectionReason ? ': ' + rejectionReason : ''}`,
  }).catch(() => {})

  return NextResponse.json({ group })
}

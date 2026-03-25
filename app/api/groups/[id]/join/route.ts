import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { DiscussionGroup } from '@/models/DiscussionGroup'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const uid = (session.user as any).id
  await connectDB()

  const group = await DiscussionGroup.findById(id)
  if (!group || group.status !== 'approved')
    return NextResponse.json({ error: 'Grupo no disponible' }, { status: 404 })

  const isMember = group.members.map(String).includes(uid)
  if (isMember) {
    group.members = group.members.filter((m: any) => m.toString() !== uid)
  } else {
    group.members.push(uid)
  }
  await group.save()

  return NextResponse.json({ joined: !isMember, memberCount: group.members.length })
}

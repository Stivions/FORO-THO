import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { GroupMessage } from '@/models/GroupMessage'
import { DiscussionGroup } from '@/models/DiscussionGroup'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

/* GET — fetch messages (after= ISO timestamp for polling) */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const after = searchParams.get('after')

  await connectDB()

  const query: any = { group: id }
  if (after) query.createdAt = { $gt: new Date(after) }

  const messages = await GroupMessage.find(query)
    .populate('author', 'username displayName avatar badges')
    .sort({ createdAt: 1 })
    .limit(after ? 50 : 80)
    .lean()

  return NextResponse.json({ messages })
}

/* POST — send a message */
export async function POST(req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const uid = (session.user as any).id
  const { content, imageUrl } = await req.json()

  if (!content?.trim() && !imageUrl)
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })

  await connectDB()

  const group = await DiscussionGroup.findById(id).select('status').lean()
  if (!group || (group as any).status !== 'approved')
    return NextResponse.json({ error: 'Grupo no disponible' }, { status: 404 })

  const msg = await GroupMessage.create({
    group: id,
    author: uid,
    content: content?.trim() ?? '',
    imageUrl: imageUrl ?? null,
  })
  const populated = await msg.populate('author', 'username displayName avatar badges')

  return NextResponse.json({ message: populated }, { status: 201 })
}

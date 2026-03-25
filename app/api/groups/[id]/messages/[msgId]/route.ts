import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { GroupMessage } from '@/models/GroupMessage'

type Ctx = { params: Promise<{ id: string; msgId: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id, msgId } = await params
  await connectDB()

  await GroupMessage.findOneAndDelete({ _id: msgId, group: id })
  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Ticket } from '@/models/Ticket'
import { TicketMessage } from '@/models/TicketMessage'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  await connectDB()
  const uid = (session.user as any).id
  const isAdmin = (session.user as any).role === 'admin'

  const ticket = await Ticket.findById(id).lean() as any
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  if (!isAdmin && String(ticket.user) !== uid) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const filter: any = { ticket: id }
  if (!isAdmin) filter.isInternal = false

  const messages = await TicketMessage.find(filter)
    .populate('sender', 'username avatar displayName')
    .sort({ createdAt: 1 })
    .lean()

  return NextResponse.json({ messages })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  await connectDB()
  const uid = (session.user as any).id
  const isAdmin = (session.user as any).role === 'admin'

  const ticket = await Ticket.findById(id).lean() as any
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  if (!isAdmin && String(ticket.user) !== uid) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const { content, isInternal, attachments } = await req.json()
  if (!content?.trim() && (!attachments?.length)) {
    return NextResponse.json({ error: 'Contenido vacío' }, { status: 400 })
  }

  const internal = isAdmin ? (isInternal === true) : false

  const message = await TicketMessage.create({
    ticket: id,
    sender: uid,
    content: content?.trim() ?? '',
    isInternal: internal,
    attachments: Array.isArray(attachments) ? attachments.slice(0, 5) : [],
  })

  const populated = await message.populate('sender', 'username avatar displayName')

  return NextResponse.json({ message: populated }, { status: 201 })
}

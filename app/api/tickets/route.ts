import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Ticket } from '@/models/Ticket'
import { TicketMessage } from '@/models/TicketMessage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await connectDB()
  const uid = (session.user as any).id
  const isAdmin = (session.user as any).role === 'admin'

  const filter = isAdmin ? {} : { user: uid }
  const tickets = await Ticket.find(filter)
    .populate('user', 'username avatar displayName')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ tickets })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { subject, category, message } = await req.json()
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  await connectDB()
  const uid = (session.user as any).id

  const ticket = await Ticket.create({ subject, category: category || 'support', user: uid })
  await TicketMessage.create({ ticket: ticket._id, sender: uid, content: message, isInternal: false })

  return NextResponse.json({ ticket }, { status: 201 })
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Ticket } from '@/models/Ticket'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await connectDB()
  const uid = (session.user as any).id
  const isAdmin = (session.user as any).role === 'admin'

  const ticket = await Ticket.findById(params.id)
    .populate('user', 'username avatar displayName')
    .lean() as any

  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  if (!isAdmin && String(ticket.user._id ?? ticket.user) !== uid) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  if (!isAdmin) {
    delete ticket.adminNotes
  }

  return NextResponse.json({ ticket })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const isAdmin = (session.user as any).role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await req.json()
  const update: any = {}
  if (body.status !== undefined)     update.status     = body.status
  if (body.priority !== undefined)   update.priority   = body.priority
  if (body.assignedTo !== undefined) update.assignedTo = body.assignedTo
  if (body.adminNotes !== undefined) update.adminNotes = body.adminNotes

  await connectDB()
  const ticket = await Ticket.findByIdAndUpdate(params.id, update, { new: true })
    .populate('user', 'username avatar displayName')
    .lean()

  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  return NextResponse.json({ ticket })
}

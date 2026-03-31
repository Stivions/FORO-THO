import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { ProductRequest } from '@/models/ProductRequest'
import { Ticket } from '@/models/Ticket'
import { TicketMessage } from '@/models/TicketMessage'

export const dynamic = 'force-dynamic'

async function createLinkedTicket(userId: string, productTitle: string, message: string) {
  const ticket = await Ticket.create({
    subject: `Producto: ${productTitle || 'Solicitud'}`.slice(0, 140),
    category: 'support',
    user: userId,
  })
  ticket.roomId = `ticket-${ticket._id}`
  await ticket.save()

  await TicketMessage.create({
    ticket: ticket._id,
    sender: userId,
    content: message,
    isInternal: false,
  })

  return ticket
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await connectDB()
  const uid = (session.user as any).id
  const requests = await ProductRequest.find({ user: uid })
    .populate('product', 'title mediaUrl mimeType featured')
    .populate('ticket', 'subject status')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ requests })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { productId, message } = await req.json()
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return NextResponse.json({ error: 'Producto invalido' }, { status: 400 })
  }

  await connectDB()
  const uid = (session.user as any).id
  const product = await Product.findById(productId).select('title').lean() as { title?: string } | null
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  const trimmedMessage = (message ?? '').toString().trim().slice(0, 500)
  const fallbackMessage = `Quiero solicitar el producto "${product.title ?? 'sin titulo'}".`

  const existing = await ProductRequest.findOne({
    user: uid,
    product: productId,
    status: { $in: ['pending', 'reviewing', 'approved'] },
  })
    .populate('product', 'title mediaUrl mimeType featured')
    .populate('user', 'username displayName email avatar')
    .populate('ticket', 'subject status')
    .sort({ createdAt: -1 })

  if (existing) {
    if (!existing.ticket) {
      const ticket = await createLinkedTicket(uid, product.title ?? 'Solicitud', trimmedMessage || fallbackMessage)
      existing.ticket = ticket._id
      await existing.save()
      await existing.populate('ticket', 'subject status')
      return NextResponse.json({ request: existing, duplicated: true, ticket })
    }
    return NextResponse.json({ request: existing, duplicated: true })
  }

  const requestDoc = await ProductRequest.create({
    user: uid,
    product: productId,
    message: trimmedMessage,
  })

  const ticket = await createLinkedTicket(uid, product.title ?? 'Solicitud', trimmedMessage || fallbackMessage)

  requestDoc.ticket = ticket._id
  await requestDoc.save()

  const request = await requestDoc.populate([
    { path: 'product', select: 'title mediaUrl mimeType featured' },
    { path: 'user', select: 'username displayName email avatar' },
    { path: 'ticket', select: 'subject status' },
  ])

  return NextResponse.json({ request, ticket }, { status: 201 })
}

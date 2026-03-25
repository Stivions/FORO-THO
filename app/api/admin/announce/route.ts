import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { resend, buildAnnouncementEmail, type AnnouncePayload } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body: AnnouncePayload = await req.json()

  if (!body.subject?.trim() || !body.headline?.trim() || !body.message?.trim())
    return NextResponse.json({ error: 'subject, headline y message son requeridos' }, { status: 400 })

  await connectDB()

  // Get all user emails
  const users = await User.find({}, 'email').lean()
  const emails = users.map(u => u.email).filter(Boolean)

  if (emails.length === 0)
    return NextResponse.json({ error: 'No hay usuarios registrados' }, { status: 400 })

  const html = buildAnnouncementEmail(body)
  const from = process.env.RESEND_FROM ?? 'Skill All Show <onboarding@resend.dev>'

  // Resend batch limit is 50/request — chunk to be safe
  const CHUNK = 50
  let sent = 0
  const errors: string[] = []

  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK)
    try {
      await resend.emails.send({
        from,
        to: chunk,
        subject: body.subject,
        html,
      })
      sent += chunk.length
    } catch (err: any) {
      errors.push(err?.message ?? 'error desconocido')
    }
  }

  return NextResponse.json({ ok: true, sent, errors })
}

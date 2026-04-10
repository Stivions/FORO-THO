import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { resend, buildAnnouncementEmail, type AnnouncePayload } from '@/lib/resend'

export const dynamic = 'force-dynamic'

const INVALID_TLDS = new Set(['internal', 'local', 'test', 'invalid'])

function isValidEmail(value: string) {
  const email = String(value || '').trim()
  if (!email || /\s/.test(email)) return false
  const at = email.indexOf('@')
  if (at <= 0) return false
  const domain = email.slice(at + 1)
  if (!domain || domain.startsWith('.') || domain.endsWith('.')) return false
  if (domain.includes('..')) return false
  if (!domain.includes('.')) return false
  const tld = domain.split('.').pop()?.toLowerCase() ?? ''
  if (tld.length < 2 || INVALID_TLDS.has(tld)) return false
  return true
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY no configurado' }, { status: 500 })
  }

  const body: AnnouncePayload = await req.json()

  if (!body.subject?.trim() || !body.headline?.trim() || !body.message?.trim())
    return NextResponse.json({ error: 'subject, headline y message son requeridos' }, { status: 400 })

  await connectDB()

  const users = await User.find({ banned: { $ne: true } }, 'email').lean()
  const emails = users.map(u => u.email).filter(Boolean)

  if (emails.length === 0)
    return NextResponse.json({ error: 'No hay usuarios registrados' }, { status: 400 })

  const from = process.env.RESEND_FROM ?? 'Skill All Show <noreply@stivion.com>'
  const html = buildAnnouncementEmail(body)

  const total = emails.length
  const invalidEmails = emails.filter(e => !isValidEmail(String(e)))
  const validEmails = emails.filter(e => isValidEmail(String(e)))
  const invalidCount = invalidEmails.length

  if (validEmails.length === 0) {
    return NextResponse.json({
      error: 'No hay emails validos para enviar',
      total,
      invalidCount,
      invalidSample: invalidEmails.slice(0, 20),
    }, { status: 400 })
  }

  // Send individually so no recipient sees other emails
  // Resend batch: up to 100 objects per call
  const CHUNK = 100
  let sent = 0
  const errors: string[] = []

  for (let i = 0; i < validEmails.length; i += CHUNK) {
    const chunk = validEmails.slice(i, i + CHUNK)
    try {
      await resend.batch.send(
        chunk.map(to => ({
          from,
          to: [to],
          subject: body.subject,
          html,
        }))
      )
      sent += chunk.length
    } catch (err: any) {
      errors.push(err?.message ?? 'error desconocido')
    }
  }

  const failed = validEmails.length - sent
  const ok = errors.length === 0 && sent === validEmails.length && invalidCount === 0
  const status = ok ? 200 : sent > 0 ? 207 : 500
  return NextResponse.json({
    ok,
    total,
    sent,
    failed,
    errors,
    invalidCount,
    invalidSample: invalidEmails.slice(0, 20),
  }, { status })
}

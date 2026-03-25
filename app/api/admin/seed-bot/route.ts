import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBotUserId } from '@/lib/thobot'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const role = (session.user as any).role
  if (role !== 'admin') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })

  const botId = await getBotUserId()
  return NextResponse.json({ ok: true, botId })
}

// Allow anyone to trigger bot creation via GET (used on first load)
export async function GET() {
  const botId = await getBotUserId()
  return NextResponse.json({ ok: true, botId })
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { revokeUserSession } from '@/lib/user-session'

export const dynamic = 'force-dynamic'

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ ok: true })

  await connectDB()
  await revokeUserSession((session.user as any).sid ?? '', 'logout')
  return NextResponse.json({ ok: true })
}

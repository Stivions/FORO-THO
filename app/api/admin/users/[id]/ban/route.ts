import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { BannedIP } from '@/models/BannedIP'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const { action, reason, banIp } = await req.json()

  await connectDB()
  const target = await User.findById(id)
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Prevent banning another admin
  if (target.role === 'admin')
    return NextResponse.json({ error: 'No puedes banear a otro administrador' }, { status: 403 })

  if (action === 'ban') {
    await User.findByIdAndUpdate(id, {
      $set: { banned: true, bannedReason: reason || '', bannedAt: new Date() },
    })

    // Also ban the IP if requested and we have one
    if (banIp && target.lastKnownIp) {
      await BannedIP.findOneAndUpdate(
        { ip: target.lastKnownIp },
        { $setOnInsert: { ip: target.lastKnownIp, reason: reason || '', bannedBy: (session.user as any).id } },
        { upsert: true, new: true }
      )
    }

    return NextResponse.json({ ok: true, banned: true, ip: banIp ? target.lastKnownIp : null })
  }

  if (action === 'unban') {
    await User.findByIdAndUpdate(id, {
      $set: { banned: false, bannedReason: '', bannedAt: null },
    })
    return NextResponse.json({ ok: true, banned: false })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}

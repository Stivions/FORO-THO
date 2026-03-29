import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { LoginEvent } from '@/models/LoginEvent'

export const dynamic = 'force-dynamic'

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

async function isAdmin(session: any): Promise<boolean> {
  if (!session?.user) return false
  await connectDB()
  const user = await User.findById((session.user as any).id).select('role').lean() as any
  return user?.role === 'admin'
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'users'

  await connectDB()

  if (type === 'logins') {
    const logins = await LoginEvent.find()
      .populate('user', 'username displayName email role')
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean() as any[]

    const lines = [
      ['Fecha', 'Usuario', 'DisplayName', 'Email', 'Rol', 'IP', 'Pais', 'Ciudad', 'Dispositivo', 'Navegador', 'SO', 'Metodo'].join(','),
      ...logins.map(entry => [
        csvEscape(entry.createdAt),
        csvEscape((entry.user as any)?.username),
        csvEscape((entry.user as any)?.displayName),
        csvEscape((entry.user as any)?.email),
        csvEscape((entry.user as any)?.role),
        csvEscape(entry.ip),
        csvEscape(entry.country),
        csvEscape(entry.city),
        csvEscape(entry.device),
        csvEscape(entry.browser),
        csvEscape(entry.os),
        csvEscape(entry.authMethod),
      ].join(',')),
    ]

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="logins.csv"',
      },
    })
  }

  const users = await User.find().select('-password').sort({ createdAt: -1 }).lean() as any[]
  const lines = [
    ['Usuario', 'Email', 'Rol', 'VIP', 'AutoRenew', 'SellerVerified', 'Suspicious', 'SuspiciousReason', 'IP', 'ReputationScore', 'ReputationVotes', 'Logins', 'UltimoAcceso', 'Pais', 'Ciudad', 'Creado'].join(','),
    ...users.map(user => [
      csvEscape(user.username),
      csvEscape(user.email),
      csvEscape(user.role),
      csvEscape(user.vip),
      csvEscape(user.vipAutoRenew),
      csvEscape(user.sellerVerified),
      csvEscape(user.suspicious),
      csvEscape(user.suspiciousReason),
      csvEscape(user.lastKnownIp),
      csvEscape(user.reputationScore),
      csvEscape(user.reputationVotes),
      csvEscape(user.loginCount),
      csvEscape(user.lastLoginAt),
      csvEscape(user.lastLogin?.country),
      csvEscape(user.lastLogin?.city),
      csvEscape(user.createdAt),
    ].join(',')),
  ]

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="users.csv"',
    },
  })
}

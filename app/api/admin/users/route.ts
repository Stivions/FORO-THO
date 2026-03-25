import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

async function isAdmin(session: any): Promise<boolean> {
  if (!session?.user) return false
  await connectDB()
  const u = await User.findById((session.user as any).id).select('role').lean() as any
  return u?.role === 'admin'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await User.find({}).select('-password').sort({ createdAt: -1 })
  return NextResponse.json({ users })
}

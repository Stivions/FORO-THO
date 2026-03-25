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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const user = await User.findById(id).select('-password')
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ user })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { role, badges } = body

  const update: Record<string, unknown> = {}
  if (role)   update.role   = role
  if (badges) update.badges = badges

  await connectDB()
  const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password')
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ user })
}

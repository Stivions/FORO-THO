import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'
import { User } from '@/models/User'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await connectDB()

  const uid = (session.user as any).id

  // Read role from DB so promotions take effect without re-login
  const dbUser = await User.findById(uid).select('role').lean() as any
  const role   = dbUser?.role ?? 'user'

  const category = await Category.findById(id)
  if (!category) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (role !== 'admin' && category.createdBy?.toString() !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await category.deleteOne()
  return NextResponse.json({ message: 'Category deleted' })
}

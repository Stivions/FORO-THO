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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await connectDB()

  const uid = (session.user as any).id
  const dbUser = await User.findById(uid).select('role').lean() as any
  const role = dbUser?.role ?? 'user'

  const category = await Category.findById(id)
  if (!category) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (role !== 'admin' && category.createdBy?.toString() !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const nextName = String(body.name ?? category.name).trim()
  if (!nextName) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  const nextSlug = nextName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const duplicate = await Category.findOne({
    _id: { $ne: category._id },
    $or: [{ name: nextName }, { slug: nextSlug }],
  }).lean()

  if (duplicate) {
    return NextResponse.json({ error: 'Ya existe una categoria con ese nombre' }, { status: 409 })
  }

  category.name = nextName
  category.slug = nextSlug
  if (body.icon !== undefined) category.icon = String(body.icon || category.icon)
  if (body.description !== undefined) category.description = String(body.description || '').slice(0, 200)
  if (body.visibility && ['public', 'vip', 'staff', 'admin'].includes(body.visibility)) {
    ;(category as any).visibility = body.visibility
  }
  if (body.postAccess && ['all', 'vip', 'staff', 'admin'].includes(body.postAccess)) {
    ;(category as any).postAccess = body.postAccess
  }

  await category.save()
  return NextResponse.json({ category })
}

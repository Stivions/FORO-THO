import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'
import { User } from '@/models/User'
import { canReadCategory } from '@/lib/access-control'
import { VIP_CATEGORIES } from '@/lib/categories'

const DEFAULT_CATEGORIES = [
  { name: 'General', slug: 'general', icon: 'MessageSquare', description: 'Discusiones generales', visibility: 'public', postAccess: 'all' },
  { name: 'Tech', slug: 'tech', icon: 'Code', description: 'Tecnologia y programacion', visibility: 'public', postAccess: 'all' },
  { name: 'Gaming', slug: 'gaming', icon: 'Gamepad2', description: 'Videojuegos y entretenimiento', visibility: 'public', postAccess: 'all' },
  { name: 'Recursos', slug: 'recursos', icon: 'BookOpen', description: 'Recursos y aprendizaje', visibility: 'public', postAccess: 'all' },
  { name: 'Mundo', slug: 'mundo', icon: 'Globe', description: 'Noticias del mundo', visibility: 'public', postAccess: 'all' },
  { name: 'Musica', slug: 'musica', icon: 'Music', description: 'Musica y artistas', visibility: 'public', postAccess: 'all' },
  { name: 'Fotografia', slug: 'fotografia', icon: 'Camera', description: 'Fotografia y diseno', visibility: 'public', postAccess: 'all' },
  { name: 'Trabajo', slug: 'trabajo', icon: 'Briefcase', description: 'Empleo y freelance', visibility: 'public', postAccess: 'all' },
]

const DEFAULT_VIP_CATEGORIES = VIP_CATEGORIES.map(name => ({
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
  icon: 'Crown',
  description: 'Sala VIP',
  visibility: 'vip',
  postAccess: 'vip',
}))

export async function GET() {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    const viewerId = (session?.user as any)?.id ?? ''
    const viewer = viewerId
      ? await User.findById(viewerId).select('role vip vipExpiresAt').lean()
      : null

    let categories = await Category.find().sort({ name: 1 }).lean()

    if (categories.length === 0) {
      const { default: mongoose } = await import('mongoose')
      const db = mongoose.connection.db!
      const seeded = await db.collection('settings').findOne({ key: 'categories_seeded' })
      if (!seeded) {
        await Category.insertMany(DEFAULT_CATEGORIES)
        await db.collection('settings').insertOne({ key: 'categories_seeded', at: new Date() })
        const seededCats = await Category.find().sort({ name: 1 }).lean()
        return NextResponse.json({
          categories: seededCats.filter(cat => canReadCategory(cat as any, viewer as any)),
        }, {
          headers: { 'Cache-Control': 'no-store' },
        })
      }
    }

    {
      const { default: mongoose } = await import('mongoose')
      const db = mongoose.connection.db!
      const vipSeeded = await db.collection('settings').findOne({ key: 'vip_categories_seeded' })
      if (!vipSeeded) {
        const existingNames = new Set(categories.map((cat: any) => cat.name))
        const toInsert = DEFAULT_VIP_CATEGORIES.filter(cat => !existingNames.has(cat.name))
        if (toInsert.length > 0) {
          await Category.insertMany(toInsert)
          categories = await Category.find().sort({ name: 1 }).lean()
        }
        await db.collection('settings').insertOne({ key: 'vip_categories_seeded', at: new Date() })
      }
    }

    return NextResponse.json({
      categories: categories.filter(cat => canReadCategory(cat as any, viewer as any)),
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'Error al obtener categorias' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Solo los admins pueden crear categorias' }, { status: 403 })
    }

    const {
      name,
      icon = 'MessageSquare',
      description = '',
      visibility = 'public',
      postAccess = 'all',
    } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    if (!['public', 'vip', 'staff', 'admin'].includes(visibility)) {
      return NextResponse.json({ error: 'Visibilidad invalida' }, { status: 400 })
    }

    if (!['all', 'vip', 'staff', 'admin'].includes(postAccess)) {
      return NextResponse.json({ error: 'Permiso de publicacion invalido' }, { status: 400 })
    }

    const trimmedName = name.trim()
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

    await connectDB()

    const existing = await Category.findOne({ $or: [{ name: trimmedName }, { slug }] })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una categoria con ese nombre' }, { status: 409 })
    }

    const uid = (session.user as any).id
    const category = await Category.create({
      name: trimmedName,
      slug,
      icon,
      description: description.trim(),
      visibility,
      postAccess,
      createdBy: uid,
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear categoria' }, { status: 500 })
  }
}

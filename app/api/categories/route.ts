import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'

// Default categories to seed on first run
const DEFAULT_CATEGORIES = [
  { name: 'General',    slug: 'general',    icon: 'MessageSquare', description: 'Discusiones generales' },
  { name: 'Tech',       slug: 'tech',       icon: 'Code',          description: 'Tecnología y programación' },
  { name: 'Gaming',     slug: 'gaming',     icon: 'Gamepad2',      description: 'Videojuegos y entretenimiento' },
  { name: 'Recursos',   slug: 'recursos',   icon: 'BookOpen',      description: 'Recursos y aprendizaje' },
  { name: 'Mundo',      slug: 'mundo',      icon: 'Globe',         description: 'Noticias del mundo' },
  { name: 'Música',     slug: 'musica',     icon: 'Music',         description: 'Música y artistas' },
  { name: 'Fotografía', slug: 'fotografia', icon: 'Camera',        description: 'Fotografía y diseño' },
  { name: 'Trabajo',    slug: 'trabajo',    icon: 'Briefcase',     description: 'Empleo y freelance' },
]

export async function GET() {
  try {
    await connectDB()

    const categories = await Category.find().sort({ name: 1 }).lean()

    // Seed defaults only once — if collection has never been seeded
    if (categories.length === 0) {
      const { default: mongoose } = await import('mongoose')
      const db = mongoose.connection.db!
      const seeded = await db.collection('settings').findOne({ key: 'categories_seeded' })
      if (!seeded) {
        await Category.insertMany(DEFAULT_CATEGORIES)
        await db.collection('settings').insertOne({ key: 'categories_seeded', at: new Date() })
        const seededCats = await Category.find().sort({ name: 1 }).lean()
        return NextResponse.json({ categories: seededCats })
      }
    }

    return NextResponse.json({ categories })
  } catch {
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { name, icon = 'MessageSquare', description = '' } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const trimmedName = name.trim()
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

    await connectDB()

    const existing = await Category.findOne({ $or: [{ name: trimmedName }, { slug }] })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 })
    }

    const uid = (session.user as any).id
    const category = await Category.create({
      name: trimmedName,
      slug,
      icon,
      description: description.trim(),
      createdBy: uid,
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 })
  }
}

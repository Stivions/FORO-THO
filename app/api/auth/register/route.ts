import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json()

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    await connectDB()

    const exists = await User.findOne({ $or: [{ email }, { username }] })
    if (exists) {
      return NextResponse.json({ error: 'Email o usuario ya en uso' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    // Badge "first_user" a los primeros 10 registrados
    const totalUsers = await User.countDocuments()
    const badges: string[] = totalUsers < 10 ? ['first_user'] : []

    const created = await User.create({ username, email, password: hashed, badges })

    return NextResponse.json({ message: 'Usuario creado', user: { id: created._id.toString() } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { verifyHCaptcha } from '@/lib/hcaptcha'

export async function POST(req: Request) {
  try {
    const { username, email, password, captchaToken } = await req.json()

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    if (!captchaToken || !(await verifyHCaptcha(captchaToken))) {
      return NextResponse.json({ error: 'Captcha inválido' }, { status: 400 })
    }

    await connectDB()

    const exists = await User.findOne({ $or: [{ email }, { username }] })
    if (exists) {
      const field = exists.email === email.toLowerCase() ? 'email' : 'usuario'
      return NextResponse.json({
        error: `Este ${field} ya está registrado`,
        alreadyExists: true,
      }, { status: 409 })
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

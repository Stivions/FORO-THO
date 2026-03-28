import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyHCaptcha } from '@/lib/hcaptcha'
import { resend, buildAuthCodeEmail } from '@/lib/resend'
import { AuthCode } from '@/models/AuthCode'
import { User } from '@/models/User'
import { generateAuthCode, hashAuthCode, maskEmail, normalizeEmail, normalizeUsername, type AuthCodePurpose } from '@/lib/auth-code'

export async function POST(req: Request) {
  try {
    const { email, username = '', captchaToken, mode } = await req.json()
    const purpose = (mode === 'register' ? 'register' : 'login') as AuthCodePurpose
    const normalizedEmail = normalizeEmail(email ?? '')
    const normalizedUsername = normalizeUsername(username ?? '')

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'El correo es requerido' }, { status: 400 })
    }

    if (purpose === 'register' && !normalizedUsername) {
      return NextResponse.json({ error: 'El usuario es requerido' }, { status: 400 })
    }

    if (!captchaToken || !(await verifyHCaptcha(captchaToken))) {
      return NextResponse.json({ error: 'Captcha invalido' }, { status: 400 })
    }

    await connectDB()

    if (purpose === 'register') {
      const existing = await User.findOne({
        $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
      }).lean() as any

      if (existing) {
        const field = existing.email === normalizedEmail ? 'correo' : 'usuario'
        return NextResponse.json({ error: `Este ${field} ya esta registrado` }, { status: 409 })
      }
    } else {
      const user = await User.findOne({ email: normalizedEmail }).select('banned').lean() as any
      if (!user) {
        return NextResponse.json({ error: 'No existe una cuenta con ese correo' }, { status: 404 })
      }
      if (user.banned) {
        return NextResponse.json({ error: 'La cuenta esta bloqueada' }, { status: 403 })
      }
    }

    const code = generateAuthCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await AuthCode.deleteMany({ email: normalizedEmail, purpose })
    await AuthCode.create({
      email: normalizedEmail,
      purpose,
      codeHash: hashAuthCode(normalizedEmail, code),
      username: purpose === 'register' ? normalizedUsername : '',
      expiresAt,
    })

    const send = await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'FOROSAS <onboarding@resend.dev>',
      to: normalizedEmail,
      subject: purpose === 'register' ? 'Tu codigo de verificacion' : 'Tu codigo de acceso',
      html: buildAuthCodeEmail(code, purpose),
    })

    if ((send as any)?.error) {
      await AuthCode.deleteMany({ email: normalizedEmail, purpose })
      return NextResponse.json({ error: 'No se pudo enviar el correo' }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      maskedEmail: maskEmail(normalizedEmail),
      message: purpose === 'register'
        ? 'Te enviamos un codigo para verificar tu correo.'
        : 'Te enviamos un codigo para iniciar sesion.',
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

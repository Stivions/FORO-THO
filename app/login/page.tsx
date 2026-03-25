'use client'

import { useState, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Mode = 'login' | 'register'

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '10000000-ffff-ffff-ffff-000000000001'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha>(null)

  const [form, setForm] = useState({ username: '', email: '', password: '' })

  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!captchaToken) {
      setError('Completa el captcha')
      return
    }

    setLoading(true)

    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, captchaToken }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error)
          captchaRef.current?.resetCaptcha()
          setCaptchaToken(null)
          setLoading(false)
          return
        }
      }

      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        captchaToken,
        redirect: false,
      })

      if (result?.error) {
        setError('Email o contraseña incorrectos')
        captchaRef.current?.resetCaptcha()
        setCaptchaToken(null)
      } else {
        router.push('/')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setCaptchaToken(null)
    captchaRef.current?.resetCaptcha()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                <path d="M4 8h24M4 16h16M4 24h18" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Inicia sesión para continuar' : 'Únete a la comunidad'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                name="username"
                placeholder="tu_usuario"
                value={form.username}
                onChange={handle}
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={handle}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handle}
              required
              minLength={6}
            />
          </div>

          {/* hCaptcha */}
          <div className="flex justify-center">
            <HCaptcha
              ref={captchaRef}
              sitekey={HCAPTCHA_SITE_KEY}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => { setCaptchaToken(null); setError('Error en el captcha, inténtalo de nuevo') }}
              theme="dark"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading || !captchaToken}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Registrarse'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline"
            onClick={switchMode}
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}

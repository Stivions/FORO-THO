'use client'

import { useState, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import HCaptcha from '@hcaptcha/react-hcaptcha'

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
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!captchaToken) { setError('// ERROR: CAPTCHA_NOT_VERIFIED'); return }

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
          setError(`// ERROR: ${data.error?.toUpperCase()}`)
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
        setError('// ERROR: CREDENCIALES_INVALIDAS')
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

  const title = mode === 'login' ? 'NOSOTROS NO MORIMOS' : 'ÚNETE A DEDSEC'

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#000', fontFamily: 'monospace' }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(#00fff508 1px, transparent 1px), linear-gradient(90deg, #00fff508 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }}/>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '2px', background: 'linear-gradient(transparent, #00fff520, transparent)',
          animation: 'scanline 6s linear infinite',
        }}/>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 pointer-events-none" style={{ color: '#00fff530', fontSize: '10px', letterSpacing: '0.1em' }}>
        <div>SYS::DEDSEC_NET</div>
        <div>STATUS: ONLINE</div>
      </div>
      <div className="absolute top-6 right-6 pointer-events-none text-right" style={{ color: '#00fff530', fontSize: '10px' }}>
        <div>NODE_ID: 7734</div>
        <div>ENC: AES-256</div>
      </div>
      <div className="absolute bottom-6 left-6 pointer-events-none" style={{ color: '#00fff320', fontSize: '9px' }}>
        {'> WE_ARE_DEDSEC'}
      </div>
      <div className="absolute bottom-6 right-6 pointer-events-none" style={{ color: '#00fff320', fontSize: '9px' }}>
        {'> CTOS_OFFLINE'}
      </div>

      {/* Main card */}
      <div className="w-full max-w-sm relative z-10" style={{
        border: '1px solid #00fff530',
        background: '#00000099',
        backdropFilter: 'blur(10px)',
        padding: '2.5rem 2rem',
      }}>
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l" style={{ borderColor: '#00fff5' }}/>
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r" style={{ borderColor: '#00fff5' }}/>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l" style={{ borderColor: '#00fff5' }}/>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r" style={{ borderColor: '#00fff5' }}/>

        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div style={{ filter: 'drop-shadow(0 0 16px #00fff5)' }}>
            <img src="/gif.gif" alt="DedSec" className="w-32 h-32 object-contain" />
          </div>
          <h1
            className="dedsec-glitch text-center text-lg font-bold tracking-widest uppercase"
            data-text={title}
            style={{ color: '#00fff5', textShadow: '0 0 8px #00fff5, 0 0 20px #00fff540', letterSpacing: '0.2em' }}
          >
            {title}
          </h1>
          <p style={{ color: '#00fff550', fontSize: '10px', letterSpacing: '0.15em' }}>
            {mode === 'login' ? '> AUTENTICACIÓN REQUERIDA' : '> REGISTRO DE AGENTE'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="flex flex-col gap-1">
              <label style={{ color: '#00fff580', fontSize: '10px', letterSpacing: '0.15em' }}>{'> IDENTIFICADOR'}</label>
              <input
                name="username"
                placeholder="tu_usuario"
                value={form.username}
                onChange={handle}
                required
                className="dedsec-input w-full px-3 py-2 text-sm rounded-none outline-none"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label style={{ color: '#00fff580', fontSize: '10px', letterSpacing: '0.15em' }}>{'> EMAIL'}</label>
            <input
              name="email"
              type="email"
              placeholder="agente@dedsec.net"
              value={form.email}
              onChange={handle}
              required
              className="dedsec-input w-full px-3 py-2 text-sm rounded-none outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label style={{ color: '#00fff580', fontSize: '10px', letterSpacing: '0.15em' }}>{'> CONTRASEÑA'}</label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handle}
              required
              minLength={6}
              className="dedsec-input w-full px-3 py-2 text-sm rounded-none outline-none"
            />
          </div>

          {/* hCaptcha */}
          <div className="flex justify-center mt-1">
            <HCaptcha
              ref={captchaRef}
              sitekey={HCAPTCHA_SITE_KEY}
              onVerify={token => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => { setCaptchaToken(null); setError('// ERROR: CAPTCHA_FAILED') }}
              theme="dark"
            />
          </div>

          {error && (
            <p style={{ color: '#ff003c', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="dedsec-btn w-full py-2.5 text-sm mt-1"
          >
            {loading ? '> PROCESANDO...' : mode === 'login' ? '> ACCEDER AL SISTEMA' : '> REGISTRAR AGENTE'}
          </button>
        </form>

        {/* Switch mode */}
        <div className="mt-6 text-center" style={{ fontSize: '11px', color: '#00fff540' }}>
          {mode === 'login' ? '¿Sin acceso?' : '¿Ya eres agente?'}{' '}
          <button
            type="button"
            onClick={switchMode}
            style={{ color: '#00fff5', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}
          >
            {mode === 'login' ? 'UNIRSE' : 'INGRESAR'}
          </button>
        </div>
      </div>
    </div>
  )
}

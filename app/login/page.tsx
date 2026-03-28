'use client'

import { useState, useRef, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import HCaptcha from '@hcaptcha/react-hcaptcha'

type Mode = 'login' | 'register'

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '10000000-ffff-ffff-ffff-000000000001'
const BG_IMAGES = ['/fondologin.jpg', '/fondologin1.png']
const BG_INTERVAL = 6000

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const captchaRef = useRef<HCaptcha>(null)

  const [form, setForm] = useState({ username: '', email: '', code: '' })
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const [bgIndex, setBgIndex] = useState(0)
  const [bgFading, setBgFading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setBgFading(true)
      setTimeout(() => {
        setBgIndex(i => (i + 1) % BG_IMAGES.length)
        setBgFading(false)
      }, 800)
    }, BG_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0.5
    audio.play().catch(() => {
      const unlock = () => {
        audio.play().catch(() => {})
        document.removeEventListener('click', unlock)
        document.removeEventListener('keydown', unlock)
      }
      document.addEventListener('click', unlock)
      document.addEventListener('keydown', unlock)
    })
    return () => { audio.pause() }
  }, [])

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }

  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const resetFlow = () => {
    setCodeSent(false)
    setCaptchaToken(null)
    setForm(f => ({ ...f, code: '' }))
    captchaRef.current?.resetCaptcha()
  }

  async function sendCode() {
    if (!captchaToken) {
      setError('// ERROR: CAPTCHA_NOT_VERIFIED')
      return
    }

    setLoading(true)
    setError('')
    setInfo('')

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          email: form.email,
          username: form.username,
          captchaToken,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(`// ERROR: ${(data.error ?? 'NO_SE_PUDO_ENVIAR').toUpperCase()}`)
        return
      }

      setCodeSent(true)
      setInfo(`// CODIGO_ENVIADO_A ${String(data.maskedEmail ?? form.email).toUpperCase()}`)
      setCaptchaToken(null)
      captchaRef.current?.resetCaptcha()
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    setLoading(true)
    setError('')
    setInfo('')

    try {
      const result = await signIn('credentials', {
        email: form.email,
        code: form.code,
        mode,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === 'IP_BANNED') {
          setError('// ERROR: IP_BANEADA')
        } else if (result.error === 'ACCOUNT_BANNED') {
          setError('// ERROR: CUENTA_BANEADA')
        } else if (result.error === 'CODE_INVALID') {
          setError('// ERROR: CODIGO_INVALIDO_O_EXPIRADO')
        } else {
          setError('// ERROR: NO_SE_PUDO_INICIAR_SESION')
        }
        return
      }

      router.push('/')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!form.email.trim()) {
      setError('// ERROR: EMAIL_REQUERIDO')
      return
    }

    if (mode === 'register' && !form.username.trim()) {
      setError('// ERROR: USUARIO_REQUERIDO')
      return
    }

    if (!codeSent) {
      await sendCode()
      return
    }

    if (!form.code.trim()) {
      setError('// ERROR: CODIGO_REQUERIDO')
      return
    }

    await verifyCode()
  }

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setInfo('')
    setCaptchaToken(null)
    setCodeSent(false)
    setForm({ username: '', email: '', code: '' })
    captchaRef.current?.resetCaptcha()
  }

  const title = mode === 'login' ? 'ACCESO POR CODIGO' : 'VERIFICA TU CORREO'

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#000', fontFamily: 'monospace' }}
    >
      {BG_IMAGES.map((src, i) => (
        <div
          key={src}
          style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: i === bgIndex ? (bgFading ? 0 : 0.22) : 0,
            transition: 'opacity 0.8s ease-in-out',
            pointerEvents: 'none',
          }}
        />
      ))}

      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(135deg, #000000cc 0%, #050810bb 100%)', pointerEvents: 'none' }} />
      <audio ref={audioRef} src="/cancionlogin.mp3" loop preload="auto" />

      <button
        onClick={toggleMute}
        title={muted ? 'Activar sonido' : 'Silenciar'}
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 999,
          background: 'transparent', border: '1px solid #00fff540',
          color: '#00fff5', fontFamily: 'monospace', fontSize: '10px',
          letterSpacing: '0.1em', padding: '6px 10px', cursor: 'pointer',
        }}
      >
        {muted ? 'SND OFF' : 'SND ON'}
      </button>

      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(#00fff508 1px, transparent 1px), linear-gradient(90deg, #00fff508 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="w-full max-w-sm relative z-10" style={{
        border: '1px solid #00fff530',
        background: '#00000099',
        backdropFilter: 'blur(10px)',
        padding: '2.5rem 2rem',
      }}>
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l" style={{ borderColor: '#00fff5' }} />
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r" style={{ borderColor: '#00fff5' }} />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l" style={{ borderColor: '#00fff5' }} />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r" style={{ borderColor: '#00fff5' }} />

        <div className="flex flex-col items-center mb-8 gap-3">
          <div style={{
            width: '140px', height: '140px', borderRadius: '50%',
            overflow: 'hidden', flexShrink: 0,
            animation: 'orbit-float 6s ease-in-out infinite, glow-ring-pulse 3s ease-in-out infinite',
          }}>
            <img
              src="/gif.gif"
              alt="DedSec"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
            />
          </div>
          <h1
            className="dedsec-glitch text-center text-lg font-bold tracking-widest uppercase"
            data-text={title}
            style={{ color: '#00fff5', textShadow: '0 0 8px #00fff5, 0 0 20px #00fff540', letterSpacing: '0.2em' }}
          >
            {title}
          </h1>
          <p style={{ color: '#00fff550', fontSize: '10px', letterSpacing: '0.15em' }}>
            {mode === 'login' ? '> INGRESA CON TU CORREO Y CODIGO' : '> CREA TU CUENTA CON EMAIL REAL'}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="flex flex-col gap-1">
              <label style={{ color: '#00fff580', fontSize: '10px', letterSpacing: '0.15em' }}>{'> USUARIO'}</label>
              <input
                name="username"
                placeholder="tu_usuario"
                value={form.username}
                onChange={handle}
                disabled={codeSent}
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
              placeholder="usuario@correo.com"
              value={form.email}
              onChange={handle}
              disabled={codeSent}
              required
              className="dedsec-input w-full px-3 py-2 text-sm rounded-none outline-none"
            />
          </div>

          {codeSent && (
            <div className="flex flex-col gap-1">
              <label style={{ color: '#00fff580', fontSize: '10px', letterSpacing: '0.15em' }}>{'> CODIGO'}</label>
              <input
                name="code"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={form.code}
                onChange={handle}
                required
                className="dedsec-input w-full px-3 py-2 text-sm rounded-none outline-none tracking-[0.4em] text-center"
              />
            </div>
          )}

          {!codeSent && (
            <div className="flex justify-center mt-1">
              <HCaptcha
                ref={captchaRef}
                sitekey={HCAPTCHA_SITE_KEY}
                onVerify={token => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => {
                  setCaptchaToken(null)
                  setError('// ERROR: CAPTCHA_FAILED')
                }}
                theme="dark"
              />
            </div>
          )}

          {error && (
            <p style={{ color: '#ff003c', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {error}
            </p>
          )}

          {info && (
            <p style={{ color: '#00ff88', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (!codeSent && !captchaToken)}
            className="dedsec-btn w-full py-2.5 text-sm mt-1"
          >
            {loading
              ? '> PROCESANDO...'
              : codeSent
                ? '> VALIDAR CODIGO'
                : '> ENVIAR CODIGO'}
          </button>

          {codeSent && (
            <button
              type="button"
              onClick={resetFlow}
              className="w-full py-2 text-xs"
              style={{ border: '1px solid #00fff530', color: '#00fff5', background: 'transparent' }}
            >
              {'> CAMBIAR CORREO / REENVIAR'}
            </button>
          )}
        </form>

        <div className="mt-6 text-center" style={{ fontSize: '11px', color: '#00fff540' }}>
          {mode === 'login' ? 'No tienes cuenta?' : 'Ya tienes cuenta?'}{' '}
          <button
            type="button"
            onClick={switchMode}
            style={{ color: '#00fff5', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}
          >
            {mode === 'login' ? 'REGISTRARME' : 'INGRESAR'}
          </button>
        </div>
      </div>
    </div>
  )
}

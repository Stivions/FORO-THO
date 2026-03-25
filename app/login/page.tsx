'use client'

import { useState, useRef, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import HCaptcha from '@hcaptcha/react-hcaptcha'

type Mode = 'login' | 'register'

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '10000000-ffff-ffff-ffff-000000000001'
const BG_IMAGES = ['/fondologin.jpg', '/fondologin1.png']
const BG_INTERVAL = 6000 // ms per image


export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha>(null)

  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [muted, setMuted] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Background image rotation
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

  // Autoplay on mount — if blocked, play on first user interaction
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0.5
    audio.play().then(() => setAudioReady(true)).catch(() => {
      const unlock = () => {
        audio.play().then(() => setAudioReady(true)).catch(() => {})
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
      {/* Rotating background images */}
      {BG_IMAGES.map((src, i) => (
        <div
          key={src}
          style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: i === bgIndex ? (bgFading ? 0 : 0.18) : 0,
            transition: 'opacity 0.8s ease-in-out',
            pointerEvents: 'none',
          }}
        />
      ))}
      {/* Dark overlay to keep DedSec feel */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(135deg, #000000cc 0%, #050810bb 100%)', pointerEvents: 'none' }} />
      {/* Audio */}
      <audio ref={audioRef} src="/cancionlogin.mp3" loop preload="auto" />

      {/* Mute button — bottom right */}
      <button
        onClick={toggleMute}
        title={muted ? 'Activar sonido' : 'Silenciar'}
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 999,
          background: 'transparent', border: '1px solid #00fff540',
          color: '#00fff5', fontFamily: 'monospace', fontSize: '10px',
          letterSpacing: '0.1em', padding: '6px 10px', cursor: 'pointer',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 10px #00fff540')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
      >
        {muted ? '▶ SND OFF' : '♪ SND ON'}
      </button>
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

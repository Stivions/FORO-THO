'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCurrentUser, invalidateCurrentUser } from '@/hooks/use-current-user'
import { Camera, Globe, MapPin, Twitter, Github, Instagram, MessageCircle, Loader2, Eye, EyeOff } from 'lucide-react'

const TABS = ['PERFIL', 'CONTRASEÑA', 'CUENTA'] as const
type Tab = typeof TABS[number]

export default function SettingsPage() {
  const { user, sessionId } = useCurrentUser()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('PERFIL')

  // ── Profile form ──
  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    location: '',
    website: '',
    twitter: '',
    github: '',
    instagram: '',
    discord: '',
    avatar: '',
    bannerUrl: '',
  })
  const [saving, setSaving]               = useState(false)
  const [profileMsg, setProfileMsg]       = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  // ── Password form ──
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')

  useEffect(() => {
    if (user) {
      setForm({
        displayName: (user as any).displayName ?? '',
        bio:         (user as any).bio         ?? '',
        location:    (user as any).location    ?? '',
        website:     (user as any).website     ?? '',
        twitter:     (user as any).socialLinks?.twitter   ?? '',
        github:      (user as any).socialLinks?.github    ?? '',
        instagram:   (user as any).socialLinks?.instagram ?? '',
        discord:     (user as any).socialLinks?.discord   ?? '',
        avatar:      (user as any).avatar    ?? '',
        bannerUrl:   (user as any).bannerUrl ?? '',
      })
    }
  }, [user])

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a14' }}>
        <div className="text-center space-y-3">
          <p className="font-mono" style={{ color: '#ff003c' }}>{'> ACCESO REQUERIDO'}</p>
          <Link href="/login" className="dedsec-btn px-4 py-2 text-xs inline-block">INICIAR SESIÓN</Link>
        </div>
      </div>
    )
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function uploadImg(file: File, field: 'avatar' | 'bannerUrl') {
    const setter = field === 'avatar' ? setUploadingAvatar : setUploadingBanner
    setter(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && (data.url || data.mediaUrl)) {
        setForm(f => ({ ...f, [field]: data.url ?? data.mediaUrl }))
      }
    } finally {
      setter(false)
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setProfileMsg('')
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: form.displayName,
          bio:         form.bio,
          location:    form.location,
          website:     form.website,
          avatar:      form.avatar,
          bannerUrl:   form.bannerUrl,
          socialLinks: {
            twitter:   form.twitter,
            github:    form.github,
            instagram: form.instagram,
            discord:   form.discord,
          },
        }),
      })
      if (res.ok) {
        invalidateCurrentUser()
        setProfileMsg('✓ Perfil actualizado')
        setTimeout(() => setProfileMsg(''), 3000)
      } else {
        const d = await res.json()
        setProfileMsg(d.error ?? 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwErr(''); setPwMsg('')
    if (pwForm.next.length < 6) { setPwErr('La contraseña debe tener al menos 6 caracteres'); return }
    if (pwForm.next !== pwForm.confirm) { setPwErr('Las contraseñas no coinciden'); return }
    setSavingPw(true)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      })
      const data = await res.json()
      if (res.ok) {
        setPwMsg('✓ Contraseña actualizada')
        setPwForm({ current: '', next: '', confirm: '' })
        setTimeout(() => setPwMsg(''), 3000)
      } else {
        setPwErr(data.error ?? 'Error al cambiar contraseña')
      }
    } finally {
      setSavingPw(false)
    }
  }

  const inputCls = 'dedsec-input w-full px-3 py-2 text-sm outline-none font-mono'
  const labelCls = 'block font-mono text-xs mb-1 tracking-widest'

  return (
    <div className="min-h-screen" style={{ background: '#0a0a14', color: '#c8fff8' }}>
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="font-mono text-xs transition-colors" style={{ color: '#00fff560' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
            onMouseLeave={e => (e.currentTarget.style.color = '#00fff560')}
          >
            ← VOLVER
          </Link>
          <span style={{ color: '#00fff520' }}>|</span>
          <h1 className="font-mono font-bold tracking-widest" style={{ color: '#00fff5', letterSpacing: '0.2em' }}>
            {'// AJUSTES'}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid #00fff515' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 font-mono text-xs transition-all"
              style={{
                color: tab === t ? '#00fff5' : '#00fff540',
                borderBottom: tab === t ? '2px solid #00fff5' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── PERFIL tab ── */}
        {tab === 'PERFIL' && (
          <form onSubmit={saveProfile} className="space-y-5">
            {/* Banner */}
            <div>
              <label className={labelCls} style={{ color: '#00fff560' }}>BANNER</label>
              <div
                className="relative h-28 rounded overflow-hidden cursor-pointer group"
                style={{ background: 'linear-gradient(135deg, #00fff510, #0a0a3a)' }}
                onClick={() => bannerRef.current?.click()}
              >
                {form.bannerUrl && (
                  <img src={form.bannerUrl} alt="banner" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingBanner
                    ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                    : <Camera className="w-6 h-6 text-white" />
                  }
                </div>
                <div className="absolute inset-0" style={{ border: '1px solid #00fff520' }} />
              </div>
              <input ref={bannerRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadImg(e.target.files[0], 'bannerUrl')} />
            </div>

            {/* Avatar */}
            <div>
              <label className={labelCls} style={{ color: '#00fff560' }}>AVATAR</label>
              <div className="flex items-center gap-4">
                <div className="relative cursor-pointer group" onClick={() => avatarRef.current?.click()}>
                  <div
                    className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center font-mono font-bold text-lg"
                    style={{ background: '#00fff515', border: '2px solid #00fff530', color: '#00fff5' }}
                  >
                    {form.avatar
                      ? <img src={form.avatar} alt="avatar" className="w-full h-full object-cover" />
                      : ((user as any)?.username ?? 'U').slice(0, 2).toUpperCase()
                    }
                  </div>
                  <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                  </div>
                </div>
                <p className="font-mono text-xs" style={{ color: '#00fff540' }}>Click para cambiar · JPG, PNG</p>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadImg(e.target.files[0], 'avatar')} />
            </div>

            {/* Display Name */}
            <div>
              <label className={labelCls} style={{ color: '#00fff560' }}>NOMBRE A MOSTRAR</label>
              <input value={form.displayName} onChange={set('displayName')} maxLength={50} placeholder={(user as any)?.username ?? ''} className={inputCls} />
            </div>

            {/* Bio */}
            <div>
              <label className={labelCls} style={{ color: '#00fff560' }}>BIO</label>
              <textarea value={form.bio} onChange={set('bio')} maxLength={200} rows={3} placeholder="Cuéntanos algo sobre ti..."
                className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono resize-none" />
              <p className="font-mono text-xs text-right mt-0.5" style={{ color: '#00fff530' }}>{form.bio.length}/200</p>
            </div>

            {/* Location */}
            <div>
              <label className={labelCls} style={{ color: '#00fff560' }}>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> UBICACIÓN</span>
              </label>
              <input value={form.location} onChange={set('location')} maxLength={60} placeholder="Ciudad, País" className={inputCls} />
            </div>

            {/* Website */}
            <div>
              <label className={labelCls} style={{ color: '#00fff560' }}>
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> SITIO WEB</span>
              </label>
              <input value={form.website} onChange={set('website')} maxLength={100} placeholder="https://tusitio.com" className={inputCls} />
            </div>

            {/* Social Links */}
            <div className="space-y-3">
              <label className={labelCls} style={{ color: '#00fff560' }}>REDES SOCIALES</label>
              <div className="flex items-center gap-2">
                <Twitter className="w-4 h-4 shrink-0" style={{ color: '#1d9bf0' }} />
                <input value={form.twitter} onChange={set('twitter')} maxLength={50} placeholder="@usuario de Twitter/X" className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 shrink-0" style={{ color: '#c8fff8' }} />
                <input value={form.github} onChange={set('github')} maxLength={50} placeholder="usuario de GitHub" className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 shrink-0" style={{ color: '#e1306c' }} />
                <input value={form.instagram} onChange={set('instagram')} maxLength={50} placeholder="@usuario de Instagram" className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 shrink-0" style={{ color: '#5865F2' }} />
                <input value={form.discord} onChange={set('discord')} maxLength={100} placeholder="usuario#0000 o enlace de servidor" className={inputCls} />
              </div>
            </div>

            {profileMsg && (
              <p className="font-mono text-sm" style={{ color: profileMsg.startsWith('✓') ? '#00ff88' : '#ff003c' }}>
                {profileMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || uploadingAvatar || uploadingBanner}
              className="dedsec-btn w-full py-2.5 font-mono text-sm"
            >
              {saving ? '> GUARDANDO...' : '> GUARDAR CAMBIOS'}
            </button>
          </form>
        )}

        {/* ── CONTRASEÑA tab ── */}
        {tab === 'CONTRASEÑA' && (
          <form onSubmit={savePassword} className="space-y-4 max-w-md">
            <div>
              <label className={labelCls} style={{ color: '#00fff560' }}>CONTRASEÑA ACTUAL</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  className={inputCls + ' pr-10'}
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#00fff540' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: '#00fff560' }}>NUEVA CONTRASEÑA</label>
              <input type={showPw ? 'text' : 'password'} value={pwForm.next}
                onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                className={inputCls} minLength={6} required />
            </div>
            <div>
              <label className={labelCls} style={{ color: '#00fff560' }}>CONFIRMAR CONTRASEÑA</label>
              <input type={showPw ? 'text' : 'password'} value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                className={inputCls} required />
            </div>
            {pwErr && <p className="font-mono text-sm" style={{ color: '#ff003c' }}>{pwErr}</p>}
            {pwMsg && <p className="font-mono text-sm" style={{ color: '#00ff88' }}>{pwMsg}</p>}
            <button type="submit" disabled={savingPw} className="dedsec-btn w-full py-2.5 font-mono text-sm">
              {savingPw ? '> CAMBIANDO...' : '> CAMBIAR CONTRASEÑA'}
            </button>
          </form>
        )}

        {/* ── CUENTA tab ── */}
        {tab === 'CUENTA' && (
          <div className="space-y-4">
            <div className="p-4 rounded" style={{ background: '#00fff508', border: '1px solid #00fff520' }}>
              <p className="font-mono text-xs mb-1" style={{ color: '#00fff560' }}>USUARIO</p>
              <p className="font-mono text-sm" style={{ color: '#c8fff8' }}>@{(user as any)?.username}</p>
            </div>
            <div className="p-4 rounded" style={{ background: '#00fff508', border: '1px solid #00fff520' }}>
              <p className="font-mono text-xs mb-1" style={{ color: '#00fff560' }}>EMAIL</p>
              <p className="font-mono text-sm" style={{ color: '#c8fff8' }}>{(user as any)?.email}</p>
            </div>
            <div className="p-4 rounded" style={{ background: '#00fff508', border: '1px solid #00fff520' }}>
              <p className="font-mono text-xs mb-1" style={{ color: '#00fff560' }}>ROL</p>
              <p className="font-mono text-sm uppercase" style={{ color: '#ffaa00' }}>{(user as any)?.role}</p>
            </div>
            {(user as any)?.vip && (
              <div className="p-4 rounded" style={{ background: '#ffaa0008', border: '1px solid #ffaa0025' }}>
                <p className="font-mono text-xs mb-1" style={{ color: '#ffaa0060' }}>VIP ACTIVO HASTA</p>
                <p className="font-mono text-sm" style={{ color: '#ffaa00' }}>
                  {(user as any)?.vipExpiresAt ? new Date((user as any).vipExpiresAt).toLocaleDateString('es-ES') : 'Sin expiración'}
                </p>
              </div>
            )}
            <div className="p-4 rounded" style={{ background: '#00fff508', border: '1px solid #00fff520' }}>
              <p className="font-mono text-xs mb-1" style={{ color: '#00fff560' }}>PUNTOS</p>
              <p className="font-mono text-2xl font-bold" style={{ color: '#00fff5' }}>{(user as any)?.points ?? 0}</p>
            </div>
            <div className="mt-6 space-y-2">
              <Link href={`/profile/${sessionId}`} className="dedsec-btn block text-center py-2 text-xs font-mono">
                VER MI PERFIL
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

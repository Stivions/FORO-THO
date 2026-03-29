'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Plus, Trash2, Upload, X, Play, Loader2, Heart, ShoppingCart, Star } from 'lucide-react'

interface Product {
  _id: string
  title: string
  description: string
  mediaUrl: string
  mimeType: string
  thumbnailUrl?: string
  featured?: boolean
  requestStatus?: string | null
  requestAt?: string | null
  uploadedBy?: {
    _id?: string
    username?: string
    displayName?: string
    avatar?: string
    sellerVerified?: boolean
  }
  createdAt: string
  likesCount: number
  liked: boolean
}

function isVideo(mimeType: string) {
  return mimeType.startsWith('video/')
}

export default function ProductsPage() {
  const { user, sessionId } = useCurrentUser()
  const router = useRouter()
  const isAdmin = (user as any)?.role === 'admin'

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<Product | null>(null)

  const [showUpload, setShowUpload] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mimeType, setMimeType] = useState('image/jpeg')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [likingId, setLikingId] = useState<string | null>(null)
  const [requestingId, setRequestingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadErr('')

    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()

      if (res.ok && (data.url || data.mediaUrl)) {
        setMediaUrl(data.url ?? data.mediaUrl)
        setMimeType(file.type || 'image/jpeg')
      } else {
        setUploadErr(data.error ?? 'Error al subir archivo')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !mediaUrl) return

    setSaving(true)

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: desc, mediaUrl, mimeType }),
      })
      const data = await res.json()

      if (res.ok) {
        setProducts(prev => [{ ...data.product, likesCount: 0, liked: false }, ...prev])
        setTitle('')
        setDesc('')
        setMediaUrl('')
        setMimeType('image/jpeg')
        setShowUpload(false)
      } else {
        setUploadErr(data.error ?? 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este producto?')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      if (res.ok) setProducts(prev => prev.filter(p => p._id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const handleLike = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation()
    if (!sessionId) {
      router.push('/login')
      return
    }
    if (likingId === product._id) return

    setLikingId(product._id)
    try {
      const res = await fetch(`/api/products/${product._id}/like`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setProducts(prev => prev.map(p =>
          p._id === product._id ? { ...p, liked: data.liked, likesCount: data.count } : p
        ))
        if (lightbox?._id === product._id) {
          setLightbox(prev => (prev ? { ...prev, liked: data.liked, likesCount: data.count } : prev))
        }
      }
    } finally {
      setLikingId(null)
    }
  }

  const handleRequest = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation()
    if (!sessionId) {
      router.push('/login')
      return
    }
    if (requestingId === product._id) return

    setRequestingId(product._id)
    try {
      const message = window.prompt('Mensaje para la solicitud (opcional)') ?? ''
      const res = await fetch('/api/product-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product._id,
          message,
        }),
      })
      const data = await res.json()
      if (res.ok && data.request?._id) {
        setProducts(prev => prev.map(p =>
          p._id === product._id ? { ...p, requestStatus: data.request.status, requestAt: data.request.createdAt } : p
        ))
        if (lightbox?._id === product._id) {
          setLightbox(prev => prev ? { ...prev, requestStatus: data.request.status, requestAt: data.request.createdAt } : prev)
        }
      }
    } finally {
      setRequestingId(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a14', color: '#c8fff8' }}>
      {lightbox && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full"
            style={{ background: '#ffffff15', color: '#fff' }}
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="max-w-5xl w-full px-4" onClick={e => e.stopPropagation()}>
            {isVideo(lightbox.mimeType) ? (
              <video src={lightbox.mediaUrl} controls autoPlay className="w-full rounded-lg max-h-[70vh] object-contain" />
            ) : (
              <img src={lightbox.mediaUrl} alt={lightbox.title} className="w-full rounded-lg max-h-[70vh] object-contain" />
            )}

            <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {lightbox.featured && <Star className="w-4 h-4" style={{ color: '#ffaa00' }} fill="#ffaa00" />}
                  <h2 className="font-mono font-bold text-lg" style={{ color: '#00fff5' }}>{lightbox.title}</h2>
                </div>
                {lightbox.description && (
                  <p className="font-mono text-sm mt-1 whitespace-pre-line break-words" style={{ color: '#c8fff880' }}>
                    {lightbox.description}
                  </p>
                )}
                {lightbox.uploadedBy && (
                  <p className="font-mono text-xs mt-2" style={{ color: '#00fff560' }}>
                    Subido por {lightbox.uploadedBy.displayName || lightbox.uploadedBy.username || 'admin'}
                    {lightbox.uploadedBy.sellerVerified && <span style={{ color: '#00ff88' }}> · vendedor verificado</span>}
                  </p>
                )}
                {lightbox.requestStatus && (
                  <p className="font-mono text-xs mt-1 uppercase" style={{ color: '#ffaa00' }}>
                    Solicitud: {lightbox.requestStatus}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={e => handleLike(e, lightbox)}
                  disabled={likingId === lightbox._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs transition-all"
                  style={{
                    background: lightbox.liked ? '#ff003c20' : '#ffffff10',
                    border: `1px solid ${lightbox.liked ? '#ff003c60' : '#ffffff20'}`,
                    color: lightbox.liked ? '#ff003c' : '#ffffff80',
                  }}
                >
                  <Heart className="w-3.5 h-3.5" fill={lightbox.liked ? 'currentColor' : 'none'} />
                  {lightbox.likesCount}
                </button>

                <button
                  onClick={e => handleRequest(e, lightbox)}
                  disabled={requestingId === lightbox._id}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded font-mono text-xs transition-all"
                  style={{
                    background: '#00fff515',
                    border: '1px solid #00fff540',
                    color: '#00fff5',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#00fff525')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#00fff515')}
                >
                  {requestingId === lightbox._id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ShoppingCart className="w-3.5 h-3.5" />
                  }
                  {requestingId === lightbox._id ? 'ENVIANDO...' : lightbox.requestStatus ? `SOLICITUD ${lightbox.requestStatus.toUpperCase()}` : 'SOLICITAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-mono text-xs transition-colors"
              style={{ color: '#00fff560' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#00fff560')}
            >
              {'<- VOLVER'}
            </Link>
            <span style={{ color: '#00fff520' }}>|</span>
            <h1 className="font-mono font-bold tracking-widest" style={{ color: '#00fff5', letterSpacing: '0.2em' }}>
              {'// PRODUCTOS'}
            </h1>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2 dedsec-btn px-3 py-1.5 text-xs font-mono"
            >
              {showUpload ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showUpload ? 'CANCELAR' : '+ SUBIR PRODUCTO'}
            </button>
          )}
        </div>

        {isAdmin && showUpload && (
          <div className="relative mb-8 p-5 rounded" style={{ background: '#00fff508', border: '1px solid #00fff525' }}>
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: '#00fff5' }} />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: '#00fff5' }} />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: '#00fff5' }} />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: '#00fff5' }} />

            <h2 className="font-mono text-sm font-semibold mb-4 tracking-widest" style={{ color: '#00fff5' }}>
              {'// SUBIR IMAGEN / VIDEO'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block font-mono text-xs mb-2 tracking-widest" style={{ color: '#00fff560' }}>
                  ARCHIVO (imagen o video)
                </label>
                {!mediaUrl ? (
                  <div
                    className="border-2 border-dashed rounded p-8 text-center cursor-pointer transition-all"
                    style={{ borderColor: '#00fff530' }}
                    onClick={() => fileRef.current?.click()}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#00fff5')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#00fff530')}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00fff5' }} />
                        <p className="font-mono text-xs" style={{ color: '#00fff580' }}>Subiendo...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8" style={{ color: '#00fff540' }} />
                        <p className="font-mono text-xs" style={{ color: '#00fff560' }}>Haz click o arrastra una imagen o video</p>
                        <p className="font-mono text-xs" style={{ color: '#00fff530' }}>JPG, PNG, GIF, MP4, MOV - max 200MB</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative rounded overflow-hidden" style={{ maxHeight: '200px' }}>
                    {isVideo(mimeType) ? (
                      <video src={mediaUrl} className="w-full object-contain" style={{ maxHeight: '200px' }} />
                    ) : (
                      <img src={mediaUrl} alt="preview" className="w-full object-contain" style={{ maxHeight: '200px' }} />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMediaUrl('')
                        setMimeType('image/jpeg')
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full"
                      style={{ background: '#ff003c', color: '#fff' }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
              </div>

              <div>
                <label className="block font-mono text-xs mb-1 tracking-widest" style={{ color: '#00fff560' }}>TITULO *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={80}
                  placeholder="Titulo del producto..."
                  className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-xs mb-1 tracking-widest" style={{ color: '#00fff560' }}>DESCRIPCION</label>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  maxLength={300}
                  rows={6}
                  placeholder="Descripcion opcional... Usa Enter para hacer saltos de linea."
                  className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono resize-y"
                />
              </div>

              {uploadErr && <p className="font-mono text-xs" style={{ color: '#ff003c' }}>{uploadErr}</p>}

              <button
                type="submit"
                disabled={saving || uploading || !mediaUrl || !title.trim()}
                className="dedsec-btn w-full py-2.5 font-mono text-sm"
              >
                {saving ? '> GUARDANDO...' : '> PUBLICAR EN PRODUCTOS'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 font-mono text-sm" style={{ color: '#00fff530' }}>{'> cargando...'}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="font-mono text-2xl" style={{ color: '#00fff520' }}>{'{ }'}</p>
            <p className="font-mono text-sm" style={{ color: '#00fff540' }}>{'> no se han agregado productos todavia'}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map(p => (
              <div
                key={p._id}
                className="relative group rounded overflow-hidden"
                style={{ background: '#00fff508', border: '1px solid #00fff520' }}
              >
                <div
                  className="relative aspect-video bg-black overflow-hidden cursor-pointer"
                  onClick={() => setLightbox(p)}
                >
                  {isVideo(p.mimeType) ? (
                    <>
                      <video src={p.mediaUrl} className="w-full h-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#00fff520', border: '2px solid #00fff560' }}>
                          <Play className="w-5 h-5 ml-0.5" style={{ color: '#00fff5' }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img src={p.mediaUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}

                  {isVideo(p.mimeType) && (
                    <span
                      className="absolute top-2 left-2 font-mono text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: '#00fff530', color: '#00fff5', border: '1px solid #00fff540' }}
                    >
                      VIDEO
                    </span>
                  )}

                  {isAdmin && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleDelete(p._id)
                      }}
                      disabled={deletingId === p._id}
                      className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: '#ff003c', color: '#fff' }}
                      title="Eliminar"
                    >
                      {deletingId === p._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                <div className="p-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    {p.featured && <Star className="w-3.5 h-3.5" style={{ color: '#ffaa00' }} fill="#ffaa00" />}
                    <h3 className="font-mono text-sm font-semibold truncate" style={{ color: '#c8fff8' }}>{p.title}</h3>
                  </div>
                  {p.description && (
                    <p className="font-mono text-xs whitespace-pre-line break-words mb-2" style={{ color: '#c8fff860' }}>
                      {p.description}
                    </p>
                  )}
                  {p.uploadedBy && (
                    <p className="font-mono text-[11px] mb-2" style={{ color: '#00fff560' }}>
                      {p.uploadedBy.displayName || p.uploadedBy.username || 'admin'}
                      {p.uploadedBy.sellerVerified && <span style={{ color: '#00ff88' }}> · verificado</span>}
                    </p>
                  )}
                  {p.requestStatus && (
                    <p className="font-mono text-[11px] uppercase mb-2" style={{ color: '#ffaa00' }}>
                      Solicitud {p.requestStatus}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={e => handleLike(e, p)}
                      disabled={likingId === p._id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded font-mono text-xs transition-all"
                      style={{
                        background: p.liked ? '#ff003c15' : 'transparent',
                        border: `1px solid ${p.liked ? '#ff003c50' : '#00fff520'}`,
                        color: p.liked ? '#ff003c' : '#00fff540',
                      }}
                      onMouseEnter={e => {
                        if (!p.liked) e.currentTarget.style.borderColor = '#ff003c40'
                        e.currentTarget.style.color = p.liked ? '#ff003c' : '#ff003c80'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = p.liked ? '#ff003c50' : '#00fff520'
                        e.currentTarget.style.color = p.liked ? '#ff003c' : '#00fff540'
                      }}
                    >
                      <Heart className="w-3 h-3" fill={p.liked ? 'currentColor' : 'none'} />
                      <span>{p.likesCount}</span>
                    </button>

                    <button
                      onClick={e => handleRequest(e, p)}
                      disabled={requestingId === p._id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1 rounded font-mono text-xs transition-all"
                      style={{
                        background: '#00fff510',
                        border: '1px solid #00fff530',
                        color: '#00fff5',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#00fff520')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#00fff510')}
                    >
                      {requestingId === p._id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <ShoppingCart className="w-3 h-3" />
                      }
                      {requestingId === p._id ? 'ENVIANDO...' : p.requestStatus ? `SOLICITUD ${p.requestStatus.toUpperCase()}` : 'SOLICITAR'}
                    </button>

                    <p className="font-mono text-xs ml-auto" style={{ color: '#00fff530' }}>
                      {new Date(p.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

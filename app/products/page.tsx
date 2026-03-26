'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Plus, Trash2, Upload, X, Play, Image as ImageIcon, Loader2 } from 'lucide-react'

interface Product {
  _id: string
  title: string
  description: string
  mediaUrl: string
  mimeType: string
  thumbnailUrl?: string
  createdAt: string
}

function isVideo(mimeType: string) {
  return mimeType.startsWith('video/')
}

export default function ProductsPage() {
  const { user, sessionId } = useCurrentUser()
  const isAdmin = (user as any)?.role === 'admin'

  const [products, setProducts]     = useState<Product[]>([])
  const [loading, setLoading]       = useState(true)
  const [lightbox, setLightbox]     = useState<Product | null>(null)

  // Admin upload form
  const [showUpload, setShowUpload] = useState(false)
  const [title, setTitle]           = useState('')
  const [desc, setDesc]             = useState('')
  const [mediaUrl, setMediaUrl]     = useState('')
  const [mimeType, setMimeType]     = useState('image/jpeg')
  const [uploading, setUploading]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [uploadErr, setUploadErr]   = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
    setUploading(true); setUploadErr('')
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
        setProducts(prev => [data.product, ...prev])
        setTitle(''); setDesc(''); setMediaUrl(''); setMimeType('image/jpeg')
        setShowUpload(false)
      } else {
        setUploadErr(data.error ?? 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      if (res.ok) setProducts(prev => prev.filter(p => p._id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a14', color: '#c8fff8' }}>
      {/* Lightbox */}
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
              <video src={lightbox.mediaUrl} controls autoPlay className="w-full rounded-lg max-h-[80vh] object-contain" />
            ) : (
              <img src={lightbox.mediaUrl} alt={lightbox.title} className="w-full rounded-lg max-h-[80vh] object-contain" />
            )}
            <div className="mt-3 text-center">
              <h2 className="font-mono font-bold text-lg" style={{ color: '#00fff5' }}>{lightbox.title}</h2>
              {lightbox.description && (
                <p className="font-mono text-sm mt-1" style={{ color: '#c8fff880' }}>{lightbox.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-mono text-xs transition-colors" style={{ color: '#00fff560' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#00fff5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#00fff560')}
            >
              ← VOLVER
            </Link>
            <span style={{ color: '#00fff520' }}>|</span>
            <h1 className="font-mono font-bold tracking-widest" style={{ color: '#00fff5', letterSpacing: '0.2em' }}>
              {'// GALERÍA / PRODUCTOS'}
            </h1>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2 dedsec-btn px-3 py-1.5 text-xs font-mono"
            >
              {showUpload ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showUpload ? 'CANCELAR' : 'SUBIR MEDIA'}
            </button>
          )}
        </div>

        {/* Admin upload form */}
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
              {/* File upload area */}
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
                        <p className="font-mono text-xs" style={{ color: '#00fff560' }}>
                          Haz click o arrastra una imagen o video
                        </p>
                        <p className="font-mono text-xs" style={{ color: '#00fff530' }}>
                          JPG, PNG, GIF, MP4, MOV, WEBM · max 500MB
                        </p>
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
                      onClick={() => { setMediaUrl(''); setMimeType('image/jpeg') }}
                      className="absolute top-2 right-2 p-1 rounded-full"
                      style={{ background: '#ff003c', color: '#fff' }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <div>
                <label className="block font-mono text-xs mb-1 tracking-widest" style={{ color: '#00fff560' }}>TÍTULO *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={80}
                  placeholder="Título del producto o contenido..."
                  className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-xs mb-1 tracking-widest" style={{ color: '#00fff560' }}>DESCRIPCIÓN</label>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Descripción opcional..."
                  className="dedsec-input w-full px-3 py-2 text-sm outline-none font-mono resize-none"
                />
              </div>

              {uploadErr && <p className="font-mono text-xs" style={{ color: '#ff003c' }}>{uploadErr}</p>}

              <button
                type="submit"
                disabled={saving || uploading || !mediaUrl || !title.trim()}
                className="dedsec-btn w-full py-2.5 font-mono text-sm"
              >
                {saving ? '> GUARDANDO...' : '> PUBLICAR EN GALERÍA'}
              </button>
            </form>
          </div>
        )}

        {/* Products grid */}
        {loading ? (
          <div className="text-center py-20 font-mono text-sm" style={{ color: '#00fff530' }}>
            {'> cargando...'}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="font-mono text-2xl" style={{ color: '#00fff520' }}>{'{ }'}</p>
            <p className="font-mono text-sm" style={{ color: '#00fff540' }}>{'> galería vacía'}</p>
            {isAdmin && (
              <p className="font-mono text-xs" style={{ color: '#00fff530' }}>Usa el botón SUBIR MEDIA para agregar contenido</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map(p => (
              <div
                key={p._id}
                className="relative group rounded overflow-hidden cursor-pointer"
                style={{ background: '#00fff508', border: '1px solid #00fff520' }}
                onClick={() => setLightbox(p)}
              >
                {/* Media thumbnail */}
                <div className="relative aspect-video bg-black overflow-hidden">
                  {isVideo(p.mimeType) ? (
                    <>
                      <video
                        src={p.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#00fff520', border: '2px solid #00fff560' }}>
                          <Play className="w-5 h-5 ml-0.5" style={{ color: '#00fff5' }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={p.mediaUrl}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Video badge */}
                  {isVideo(p.mimeType) && (
                    <span
                      className="absolute top-2 left-2 font-mono text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: '#00fff530', color: '#00fff5', border: '1px solid #00fff540' }}
                    >
                      VIDEO
                    </span>
                  )}

                  {/* Admin delete overlay */}
                  {isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(p._id) }}
                      disabled={deletingId === p._id}
                      className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: '#ff003c', color: '#fff' }}
                      title="Eliminar"
                    >
                      {deletingId === p._id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-mono text-sm font-semibold truncate" style={{ color: '#c8fff8' }}>{p.title}</h3>
                  {p.description && (
                    <p className="font-mono text-xs mt-0.5 line-clamp-2" style={{ color: '#c8fff860' }}>{p.description}</p>
                  )}
                  <p className="font-mono text-xs mt-2" style={{ color: '#00fff530' }}>
                    {new Date(p.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
